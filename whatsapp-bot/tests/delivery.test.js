import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { StateStore } from '../src/state-store.js'
import { VanzShopBot } from '../src/bot.js'
import { receiptMessages, parsePaymentLink } from '../src/delivery.js'

const original = { jid: 'buyer@s.whatsapp.net', paymentId: 'tx_paid', paymentToken: 'test.signature', reference: 'VZ-TEST-DELIVERY', productTitle: 'Test Product', variantTitle: '1 Bulan', quantity: 1 }
const receipt = { status: 'fulfilled', quantity: 1, accounts: [{ value: { Email: 'test@example.test', Instruksi: 'Buka link akses sesuai petunjuk; ini bukan password.' } }] }

async function setup(t, result = { status: 'success', fulfillment: receipt }) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vanz-delivery-'))
  t.after(() => fs.rm(dir, { recursive: true, force: true }))
  const state = new StateStore(path.join(dir, 'pending.json'))
  await state.put({ ...original })
  const sent = []
  const api = { calls: 0, async paymentStatus() { this.calls++; return result } }
  const bot = new VanzShopBot({ api, config: { baseUrl: 'https://store.test' }, stateStore: state, logger: { warn() {} } })
  bot.attach({ async sendMessage(jid, message) { sent.push({ jid, text: message.text }) } })
  return { state, sent, api, bot }
}

test('paid order sends actual receipt, survives restart, and HASIL is bound to buyer chat', async (t) => {
  const { state, sent, bot, api } = await setup(t)
  await bot.pollPendingPayments()
  assert.equal(state.list().length, 0)
  assert.match(sent.map(m => m.text).join('\n'), /test@example\.test/)
  assert.doesNotMatch(sent.map(m => m.text).join('\n'), /token=/)
  const reloaded = new StateStore(state.file)
  await reloaded.load()
  bot.stateStore = reloaded
  sent.length = 0
  await bot.sendResult('other@s.whatsapp.net', `HASIL ${original.reference}`)
  assert.doesNotMatch(sent.map(m => m.text).join('\n'), /test@example\.test/)
  sent.length = 0
  await bot.sendResult(original.jid, `HASIL ${original.reference}`)
  assert.match(sent.map(m => m.text).join('\n'), /test@example\.test/)
  assert.equal(api.calls, 1, 'redelivery must not run fulfillment again')
})

test('pending and incomplete fulfillment never send account data or remove order', async (t) => {
  for (const result of [{ status: 'pending', fulfillment: receipt }, { status: 'success', fulfillment: { ...receipt, accounts: [] } }]) {
    const { state, sent, bot } = await setup(t, result)
    await bot.pollPendingPayments()
    assert.equal(state.list().length, 1)
    assert.doesNotMatch(sent.map(m => m.text).join('\n'), /test@example\.test|PESANAN SELESAI/)
  }
})

test('failed WhatsApp send resumes saved receipt after restart, with no second claim', async (t) => {
  const { state, sent, bot, api } = await setup(t, { status: 'success', fulfillment: { ...receipt, accounts: [{ value: 'test@example.test\n' + 'x'.repeat(7200) }] } })
  let sends = 0
  bot.attach({ async sendMessage(jid, message) {
    sends++
    if (sends === 2) throw new Error('socket disconnected')
    sent.push({ jid, text: message.text })
  } })
  await bot.pollPendingPayments()
  assert.equal(state.list().length, 1)
  const reloaded = new StateStore(state.file)
  await reloaded.load()
  bot.stateStore = reloaded
  bot.attach({ async sendMessage(jid, message) { sent.push({ jid, text: message.text }) } })
  await bot.pollPendingPayments()
  assert.equal(reloaded.list().length, 0)
  assert.equal(sent.filter(m => /^✦/.test(m.text)).length, 1)
  assert.match(sent.map(m => m.text).join('\n'), /test@example\.test/)
  assert.equal(api.calls, 1)
})

test('parallel CEK and worker share one delivery job', async (t) => {
  const { bot, api, sent } = await setup(t)
  await Promise.all([bot.processOrder(original), bot.processOrder(original, true)])
  assert.equal(api.calls, 1)
  assert.equal(sent.filter(m => /^✦/.test(m.text)).length, 1)
})

test('legacy link recovery reads receipt only, even when the old bot erased local order', async (t) => {
  const { bot, api, state, sent } = await setup(t)
  await state.remove(original.paymentId)
  api.fulfillmentStatus = async (token) => {
    assert.equal(token, original.paymentToken)
    return { reference: original.reference, fulfillment: receipt }
  }
  await bot.handle({ key: { id: 'recover-quoted', remoteJid: original.jid }, message: { extendedTextMessage: {
    text: 'HASIL', contextInfo: { quotedMessage: { conversation: `Buka hasil: https://store.test/bayar/tx_paid?token=${original.paymentToken}` } },
  } } })
  assert.match(sent.map(m => m.text).join('\n'), /test@example\.test/)
  assert.equal(api.calls, 0, 'recovery must not create or claim more stock')
  assert.ok(state.findFor(original.jid, original.reference).completedAt)
})

test('receipt formatter keeps long supplier instructions, rejects empty/incomplete receipt', () => {
  const text = 'x'.repeat(7200) + 'LAST-INSTRUCTION'
  assert.match(receiptMessages(original, { ...receipt, accounts: [{ value: text }] }).join('\n'), /LAST-INSTRUCTION/)
  assert.deepEqual(receiptMessages(original, { ...receipt, accounts: [{ value: null }] }), [])
  assert.deepEqual(receiptMessages(original, { ...receipt, accounts: [{ value: '   ' }] }), [])
  assert.deepEqual(receiptMessages(original, { ...receipt, quantity: 2 }), [])
  assert.equal(parsePaymentLink('HASIL https://evil.test/bayar/tx_paid?token=abc.def', 'https://store.test'), null)
})

test('short receipt is one minimal message and preserves supplied access data', () => {
  const value = '  Email: buyer@example.test\nLink: https://access.test/activate\nPetunjuk: gunakan kode 001  '
  const messages = receiptMessages(original, { ...receipt, accounts: [{ value }] })
  assert.equal(messages.length, 1)
  assert.match(messages[0], /^✦ \*1 Bulan\*\nJumlah: \*1 item\*/)
  assert.ok(messages[0].includes(value))
  assert.match(messages[0], /📦 \*Produk kamu\*/)
  assert.match(messages[0], /Hubungi admin jika ada kendala\./)
  assert.match(messages[0], /kepercayaannya\._ 🩷$/)
  assert.doesNotMatch(messages[0], /HASIL|INI PRODUKMU|PESANAN SELESAI|Xoftware|Webstore:/)
})

test('state write failures can be retried without losing pending orders', async (t) => {
  const { state } = await setup(t)
  const file = state.file
  state.file = path.join(file, 'invalid-child.json')
  await assert.rejects(state.complete(original))
  assert.equal(state.list().length, 1)
  state.file = file
  await state.complete(original)
  const loaded = new StateStore(file)
  await loaded.load()
  assert.equal(loaded.list().length, 0)
  assert.ok(loaded.findFor(original.jid, original.reference).completedAt)
})
