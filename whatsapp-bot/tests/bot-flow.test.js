import assert from 'node:assert/strict'
import test from 'node:test'
import { VanzShopBot } from '../src/bot.js'
import sharp from 'sharp'

function inbound(id, text) {
  return {
    key: { id, remoteJid: '6281234567890@s.whatsapp.net', fromMe: false },
    pushName: 'Kak Vanz',
    message: { conversation: text },
  }
}

test('number one selects alphabetical product ID, not original provider position', async () => {
  const products = [
    { id: 30, title: 'YOUTUBE', price: 3000 },
    { id: 10, title: 'ADOBE CREATIVE CLOUD', variations: [{ id: 101, title: 'PAKET ADOBE', price: 3000, stock: 3 }] },
    { id: 20, title: 'CANVA', price: 3000 },
  ]
  const sent = []
  const bot = new VanzShopBot({
    api: { async init() { return { products } } },
    config: { baseUrl: 'https://store.test', timezone: 'Asia/Jakarta' }, stateStore: {},
    media: { async banner() { return null }, async product() { return null } },
  })
  bot.attach({ async sendMessage(jid, message) { sent.push(message) } })
  await bot.handle(inbound('sorted-menu', 'MENU'))
  assert.match(sent[0].text, /1\. \*Adobe Creative Cloud\*\n2\. \*Canva\*\n3\. \*Youtube\*/)
  await bot.handle(inbound('sorted-choice', '1'))
  const session = bot.session('6281234567890@s.whatsapp.net|6281234567890@s.whatsapp.net')
  assert.equal(session.product.id, 10)
  assert.equal(session.variants[0].id, 101)
  assert.equal(products[0].id, 30, 'provider catalog is not mutated')
})

test('alur katalog → variasi → invoice berjalan melalui backend VanzShop', async () => {
  const sent = []
  const pending = []
  let checkout
  const socket = {
    user: { id: '628999999999@s.whatsapp.net' },
    async sendMessage(jid, message) { sent.push({ kind: 'text', jid, message }); return { key: { id: `s-${sent.length}` } } },
    async relayMessage(jid, message) { sent.push({ kind: 'interactive', jid, message }) },
  }
  const api = {
    async init() {
      return { products: [{ id: 10, code: 'GPT', title: 'ChatGPT', variations: [{ id: 101, code: 'GPT-1M', title: '1 Bulan', price: 6000, stock: 4 }] }] }
    },
    async createPayment(input) {
      checkout = input
      return {
        payment: { id: 'tx_bot_1', reference: 'VZ-BOT-12345678', total_payment: 6100, expires_at: '2030-10-04T10:00:00.000Z', payment_data: { qr_string: '00020101021226680016ID.CO.TEST.WWW011893600000000000000002150000000000000520400005303360540461005802ID5910VANZSHOP6007JAKARTA6304ABCD' } },
        payment_token: 'header.signature',
        order: { product_title: 'ChatGPT', variant_title: '1 Bulan' },
      }
    },
  }
  const stateStore = { async put(order) { pending.push(order) }, list() { return [] } }
  const bot = new VanzShopBot({
    api,
    stateStore,
    config: {
      baseUrl: 'https://vanzshop.com', timezone: 'Asia/Jakarta', sessionTtlMs: 1_800_000,
      catalogCacheMs: 30_000, supportUrl: 'https://wa.me/62895415204928', warrantyUrl: 'https://ketentuan-garansi.vanzshop.com',
    },
    logger: { error() {}, warn() {} },
  })
  bot.attach(socket)

  await bot.handle(inbound('m1', 'halo'))
  assert.match(sent[0].message.text, /1\. \*Chatgpt\*/)

  await bot.handle(inbound('m2', '1'))
  assert.match(sent.at(-1).message.text, /Ketik \*nomor paket\*/)

  await bot.handle(inbound('m3', '1'))
  assert.equal(checkout, undefined, 'choosing a package must not create a payment yet')
  await bot.handle(inbound('m4', '1'))
  assert.equal(checkout.productId, 10)
  assert.equal(checkout.variationId, 101)
  assert.equal(checkout.buyer.whatsapp, '6281234567890')
  assert.equal(pending.length, 1)
  assert.equal(pending[0].paymentUrl, 'https://vanzshop.com/#/bayar/tx_bot_1?token=header.signature')
  assert.doesNotMatch(JSON.stringify(sent), /token=header.signature/)
  assert.equal(pending[0].reference, 'VZ-BOT-12345678')
  assert.doesNotMatch(JSON.stringify(sent), /VZ-BOT-12345678|CEK PESANANMU|Ketik \*BAYAR\*/)
  assert.equal(sent.some((item) => Buffer.isBuffer(item.message.image)), true)
  assert.equal(sent.filter((item) => item.message.image).length, 1)
  const qr = sent.find((item) => item.message.image).message
  assert.match(qr.caption, /Detail produk dikirim ke chat ini/)
  assert.doesNotMatch(qr.caption, /CEK|http|SILAKAN BAYAR|👤/)
  const dimensions = await sharp(qr.image).metadata()
  assert.deepEqual([dimensions.width, dimensions.height], [512, 512])
})
