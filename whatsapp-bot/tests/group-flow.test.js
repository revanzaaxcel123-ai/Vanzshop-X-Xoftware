import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { VanzShopBot } from '../src/bot.js'
import { StateStore } from '../src/state-store.js'
import { jidPhone, messageBuyer } from '../src/message-utils.js'

const group = '120000000000@g.us'
const alice = '628111111111@s.whatsapp.net', bob = '628222222222@s.whatsapp.net'
const lid = '555555555555@lid'
const image = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

function message(id, text, sender = alice, chat = group) {
  return { key: { id, remoteJid: chat, ...(chat.endsWith('@g.us') ? { participant: sender } : {}) }, pushName: 'Pembeli', message: { conversation: text } }
}

async function fixture(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vanz-group-'))
  t.after(() => fs.rm(dir, { recursive: true, force: true }))
  const state = new StateStore(path.join(dir, 'orders.json'))
  const sent = [], calls = []
  let status = 'pending', fulfillment = null
  const api = {
    products: [{ id: 10, code: 'GPT', title: 'AI CHATGPT', thumbnail: '/products/gpt.png', variations: [
      { id: 101, code: 'GPT-GO', title: 'LINK GPT GO 3 BULAN', price: 700, stock: 5 },
      { id: 102, code: 'GPT-PLUS', title: 'PLUS 1 BULAN', price: 6000, stock: 2 },
      { id: 103, code: 'GPT-EMPTY', title: 'PAKET KOSONG', price: 5000, stock: 0 },
    ] }],
    async init() { return { products: structuredClone(this.products) } },
    async createPayment(input) {
      calls.push(input)
      const selected = this.products[0].variations.find(variant => variant.id === input.variationId)
      return { payment: { id: `tx_group_${calls.length}`, reference: `VZ-GROUP-ORDER${calls.length}`, total_payment: input.quantity * selected.price + 155,
        expires_at: '2030-10-05T10:00:00Z', payment_data: { qr_string: 'test-qr' } }, payment_token: 'private.signature',
        order: { product_title: 'AI CHATGPT', variant_title: selected.title, unit_price: selected.price } }
    },
    statusCalls: 0,
    async paymentStatus() { this.statusCalls++; return { status, fulfillment, payment: { payment_data: { qr_string: 'test-qr' } } } },
    async orderLookup() { return { payment_status: 'success', fulfillment_status: 'fulfilled' } },
  }
  const media = { async banner() { return image }, async product(product) { assert.equal(product.thumbnail, '/products/gpt.png'); return image } }
  const socket = { async sendMessage(jid, body) { sent.push({ jid, body }); return { key: { id: `sent-${sent.length}` } } } }
  const config = { baseUrl: 'https://store.test', groupsEnabled: true, webPaymentLinks: true, timezone: 'Asia/Jakarta', sessionTtlMs: 1_800_000, catalogCacheMs: 10_000 }
  const bot = new VanzShopBot({ api, config, stateStore: state, media, logger: { warn() {}, error() {} } })
  bot.attach(socket)
  return { bot, api, calls, state, sent, socket, dir, setResult(nextStatus, nextReceipt) { status = nextStatus; fulfillment = nextReceipt } }
}

async function checkout(bot, sender = alice, suffix = '') {
  for (const [index, text] of ['MENU', '1', '1', '2'].entries()) await bot.handle(message(`checkout-${suffix}-${index}`, text, sender))
}

test('group checkout: supplier IDs, banner/product image, quantity, QR in group and receipt only to buyer', async t => {
  const f = await fixture(t)
  await checkout(f.bot)
  assert.equal(f.calls.length, 1)
  assert.deepEqual([f.calls[0].productId, f.calls[0].variationId, f.calls[0].code, f.calls[0].quantity], [10, 101, 'GPT-GO', 2])
  assert.equal(f.calls[0].buyer.whatsapp, '628111111111')
  const images = f.sent.filter(item => item.body.image)
  assert.equal(images.length, 3, 'banner, supplier product image and QR')
  assert.ok(images.every(item => item.jid === group))
  assert.match(images[1].body.caption, /Stok:/)
  assert.doesNotMatch(images[1].body.caption, /GPT-GO|#buynow|QRIS/)
  assert.match(images[2].body.caption, /Total bayar/)
  assert.doesNotMatch(JSON.stringify(f.sent), /Pilihan untuk|👤 Untuk|CEK PESANANMU|Ketik \*BAYAR\*/)
  assert.doesNotMatch(JSON.stringify(f.sent.filter(item => item.jid === group)), /token=|private\.signature/)
  const receipt = { status: 'fulfilled', quantity: 2, accounts: [{ value: 'SECRET-ALICE-1' }, { value: 'SECRET-ALICE-2' }] }
  f.setResult('pending', receipt)
  await f.bot.pollPendingPayments()
  assert.doesNotMatch(JSON.stringify(f.sent), /SECRET-ALICE|YEAY/)
  f.setResult('success', receipt)
  await f.bot.pollPendingPayments()
  const groupMessages = f.sent.filter(item => item.jid === group)
  assert.doesNotMatch(JSON.stringify(groupMessages), /SECRET-ALICE|private\.signature/)
  assert.equal(groupMessages.filter(item => item.body.text?.includes('YEAY')).length, 1)
  assert.equal(groupMessages.filter(item => item.body.text?.includes('PESANANMU SUDAH TERKIRIM')).length, 0)
  assert.ok(f.sent.findIndex(item => item.body.text?.includes('YEAY')) > f.sent.findIndex(item => item.body.text?.includes('SECRET-ALICE-2')))
  assert.match(JSON.stringify(f.sent.filter(item => item.jid === alice)), /SECRET-ALICE-1.*SECRET-ALICE-2/)
  assert.equal(f.state.list().length, 0)
  await f.bot.pollPendingPayments()
  assert.equal(f.api.statusCalls, 2)
  f.sent.length = 0
  await f.bot.handle(message('other-result', 'HASIL VZ-GROUP-ORDER1', bob))
  assert.doesNotMatch(JSON.stringify(f.sent), /SECRET-ALICE/)
  f.sent.length = 0
  await f.bot.handle(message('owner-result', 'HASIL VZ-GROUP-ORDER1'))
  assert.match(JSON.stringify(f.sent.filter(item => item.jid === alice)), /SECRET-ALICE/)
  assert.doesNotMatch(JSON.stringify(f.sent.filter(item => item.jid === group)), /SECRET-ALICE/)
})

test('two members choose numbers independently; unknown group chatter ignored; below-minimum/empty packages do not charge', async t => {
  const f = await fixture(t)
  await f.bot.handle(message('chatter', 'halo semua'))
  await f.bot.handle(message('random-number', '1', bob))
  assert.equal(f.sent.length, 0)
  await f.bot.handle(message('a-menu', 'MENU'))
  await f.bot.handle(message('b-menu', 'MENU', bob))
  await f.bot.handle(message('a-product', '1'))
  await f.bot.handle(message('b-product', '1', bob))
  await f.bot.handle(message('a-package', '1'))
  await f.bot.handle(message('b-package', '2', bob))
  const aSession = f.bot.session(`${group}|${alice}`), bSession = f.bot.session(`${group}|${bob}`)
  assert.equal(aSession.variant.id, 101)
  assert.equal(bSession.variant.id, 102)
  await f.bot.handle(message('a-low', '1'))
  assert.match(f.sent.at(-1).body.text, /minimal \*2\*/)
  assert.equal(f.calls.length, 0)
  await f.bot.handle(message('a-back', 'KEMBALI'))
  await f.bot.handle(message('a-empty', '3'))
  assert.match(f.sent.at(-1).body.text, /sudah habis/)
  assert.equal(f.calls.length, 0)
})

test('failed private preflight prevents charge; duplicate quantity creates one payment', async t => {
  const f = await fixture(t)
  f.bot.attach({ async sendMessage(jid, body) { if (jid === alice) throw new Error('cannot DM'); return f.socket.sendMessage(jid, body) } })
  await checkout(f.bot)
  assert.equal(f.calls.length, 0)
  assert.match(f.sent.at(-1).body.text, /START/)
  f.bot.attach(f.socket)
  await Promise.all([f.bot.handle(message('pay-a', '2')), f.bot.handle(message('pay-b', '2'))])
  assert.equal(f.calls.length, 1)
})

test('price/stock refresh uses latest price and retains original supplier variation ID', async t => {
  const f = await fixture(t)
  for (const [i, text] of ['MENU', '1', '1'].entries()) await f.bot.handle(message(`price-${i}`, text))
  f.api.products[0].variations[0].price = 900
  await f.bot.handle(message('changed-pay', '2'))
  assert.equal(f.calls.length, 1)
  assert.match(f.sent.at(-1).body.caption, /Harga: Rp 1\.800/)
  assert.equal(f.calls[0].variationId, 101)
  assert.equal(f.calls[0].quantity, 2)
})

test('stock that runs out before quantity is submitted never creates a QR payment', async t => {
  const f = await fixture(t)
  for (const [i, text] of ['MENU', '1', '1'].entries()) await f.bot.handle(message(`stock-${i}`, text))
  f.api.products[0].variations[0].stock = 0
  await f.bot.handle(message('sold-out-now', '2'))
  assert.equal(f.calls.length, 0)
  assert.equal(f.state.list().length, 0)
  assert.match(f.sent.at(-1).body.text, /Stok terbaru hanya 0/)
  assert.equal(f.bot.session(`${group}|${alice}`).step, 'quantity')
})

test('paid processing notification once; failed delivery resumes after restart before group success', async t => {
  const f = await fixture(t)
  await checkout(f.bot)
  f.setResult('success', { status: 'processing', accounts: [] })
  await f.bot.pollPendingPayments()
  await f.bot.pollPendingPayments()
  assert.equal(f.sent.filter(item => item.body.text?.includes('YEAY')).length, 0)
  assert.equal(f.sent.filter(item => item.body.text?.includes('Produk masih disiapkan')).length, 1)
  assert.equal(f.sent.filter(item => item.body.text?.includes('PESANANMU SUDAH TERKIRIM')).length, 0)
  f.setResult('success', { status: 'fulfilled', quantity: 2, accounts: [{ value: 'SECRET-ONE' + 'x'.repeat(3000) }, { value: 'SECRET-TWO' }] })
  f.bot.attach({ async sendMessage(jid, body) { if (body.text?.includes('SECRET-TWO')) throw new Error('disconnect'); return f.socket.sendMessage(jid, body) } })
  await f.bot.pollPendingPayments()
  assert.equal(f.sent.filter(item => item.body.text?.includes('YEAY')).length, 0)
  assert.equal(f.sent.filter(item => item.body.text?.includes('PESANANMU SUDAH TERKIRIM')).length, 0)
  const callsBeforeRestart = f.api.statusCalls
  const reloaded = new StateStore(f.state.file); await reloaded.load()
  f.bot.stateStore = reloaded; f.bot.attach(f.socket)
  await f.bot.pollPendingPayments()
  assert.equal(f.api.statusCalls, callsBeforeRestart, 'resume must not claim stock again')
  assert.equal(f.sent.filter(item => item.body.text?.includes('SECRET-ONE')).length, 1)
  assert.equal(f.sent.filter(item => item.body.text?.includes('YEAY')).length, 1)
  assert.equal(reloaded.list().length, 0)
})

test('LID privacy ID is never a phone number; trusted PN alias allows group → private HASIL', async t => {
  const f = await fixture(t)
  const key = message('lid-check', 'MENU', lid).key
  key.participantAlt = alice
  assert.equal(jidPhone(lid), '')
  const actor = await messageBuyer({ key }, {})
  assert.equal(actor.buyerJid, alice)
  assert.equal(actor.phone, '628111111111')
  assert.deepEqual(new Set(actor.buyerAliases), new Set([lid, alice]))
  const fallback = await messageBuyer(message('lid-only', 'MENU', lid), { signalRepository: { lidMapping: { async getPNForLID() { return alice } } } })
  assert.equal(fallback.buyerJid, alice)
  for (const [i, text] of ['MENU', '1', '1', '2'].entries()) {
    const inbound = message(`lid-order-${i}`, text, lid); inbound.key.participantAlt = alice
    await f.bot.handle(inbound)
  }
  f.setResult('success', { status: 'fulfilled', quantity: 2, accounts: [{ value: 'LID-SECRET-1' }, { value: 'LID-SECRET-2' }] })
  await f.bot.pollPendingPayments()
  f.sent.length = 0
  const privateMessage = message('lid-private-result', 'HASIL VZ-GROUP-ORDER1', '', lid)
  privateMessage.key.remoteJidAlt = alice
  await f.bot.handle(privateMessage)
  assert.match(JSON.stringify(f.sent), /LID-SECRET/)
  assert.ok(f.sent.every(item => item.jid === alice))
})

test('group bearer link cannot recover another buyer receipt; optional group disable works', async t => {
  const f = await fixture(t)
  f.api.fulfillmentStatus = async () => { throw new Error('must not be called from group') }
  await f.bot.handle(message('unsafe-result', 'HASIL https://store.test/#/bayar/tx_old?token=private.signature', bob))
  assert.match(f.sent.at(-1).body.text, /pemilik pesanan/)
  f.bot.config.groupsEnabled = false
  f.sent.length = 0
  await f.bot.handle(message('disabled-menu', 'MENU'))
  assert.equal(f.sent.length, 0)
})

test('failed group notification does not prevent private delivery; notices resume without re-claiming stock', async t => {
  const f = await fixture(t)
  await checkout(f.bot)
  f.setResult('success', { status: 'fulfilled', quantity: 2, accounts: [{ value: 'PRIVATE-DATA-1' }, { value: 'PRIVATE-DATA-2' }] })
  f.bot.attach({ async sendMessage(jid, body) { if (jid === group) throw new Error('group unavailable'); return f.socket.sendMessage(jid, body) } })
  await f.bot.pollPendingPayments()
  assert.match(JSON.stringify(f.sent.filter(item => item.jid === alice)), /PRIVATE-DATA-2/)
  assert.equal(f.state.list().length, 1, 'notifications remain queued')
  const statusCalls = f.api.statusCalls
  f.bot.attach(f.socket)
  await f.bot.pollPendingPayments()
  assert.equal(f.api.statusCalls, statusCalls)
  assert.equal(f.sent.filter(item => item.body.text?.includes('PRIVATE-DATA-1')).length, 1)
  assert.equal(f.sent.filter(item => item.body.text?.includes('YEAY')).length, 1)
  assert.equal(f.sent.filter(item => item.body.text?.includes('PESANANMU SUDAH TERKIRIM')).length, 0)
  assert.equal(f.state.list().length, 0)
})
