import test from 'node:test'
import assert from 'node:assert/strict'
import { DirectVanzShopApi, loadDirectHandler, missingDirectSettings } from '../src/direct-api.js'

test('direct provider validates settings and never silently uses a different inventory store', () => {
  assert.ok(missingDirectSettings({}).includes('XSOFTWARE_API_KEY'))
  assert.ok(missingDirectSettings({}).some(key => key.startsWith('WA_SHARED_STORE_CONFIRMED')))
})

test('same website order can be fulfilled directly from Xoftware exactly once after SewaPay confirmation', async (t) => {
  Object.assign(process.env, { XSOFTWARE_API_KEY: 'test-key', SEWAPAY_API_KEY: 'test-pg', SEWAPAY_SECRET_KEY: 'test-secret', PAYMENT_TOKEN_SECRET: 'test-token', UPSTASH_REDIS_REST_URL: 'https://redis.direct.test', UPSTASH_REDIS_REST_TOKEN: 'test-redis', FULFILLMENT_KEY_PREFIX: 'test:direct' })
  const originalFetch = globalThis.fetch
  t.after(() => { globalThis.fetch = originalFetch })
  const redis = new Map()
  let paid = false, deletes = 0, reference = '', stock = [{ id: 1001, stock_id: 11, value: 'account@example.test|password-test' }]
  const reply = (data, status = 200) => ({ ok: status < 400, status, async text() { return JSON.stringify(data) } })
  globalThis.fetch = async (url, options = {}) => {
    const u = new URL(url), body = options.body ? JSON.parse(options.body) : null
    if (u.hostname === 'redis.direct.test') {
      const [op, key, value, ...rest] = body
      if (op === 'GET') return reply({ result: redis.get(key) ?? null })
      if (op === 'SET') { if (rest.includes('NX') && redis.has(key)) return reply({ result: null }); redis.set(key, value); return reply({ result: 'OK' }) }
      if (op === 'EXPIRE') return reply({ result: redis.has(key) ? 1 : 0 })
      if (op === 'EVAL') { const k = body[3]; return reply({ result: redis.get(k) === body[4] && redis.delete(k) ? 1 : 0 }) }
      if (op === 'DEL') return reply({ result: redis.delete(key) ? 1 : 0 })
      if (op === 'HGETALL') return reply({ result: [] })
      throw new Error(`Unexpected Redis operation ${op}`)
    }
    if (u.hostname === 'backend-s2.xoftware.id') {
      assert.equal(options.headers['x-api-key'], 'test-key')
      if (u.pathname === '/v1/product') return reply({ status: true, data: [{ id: 11, title: 'Product', code: 'PROD', price: 1000, stock: stock.length }] })
      if (u.pathname === '/v1/products/11/stocks') return reply({ data: { stocks: stock, pagination: { total_pages: 1 } } })
      if (u.pathname === '/v1/products/stocks/1001' && options.method === 'DELETE') {
        assert.equal(paid, true)
        deletes++; stock = []; return reply({ status: true })
      }
    }
    if (u.hostname === 'sewapay.id') {
      if (u.pathname.endsWith('/create')) { reference = body.reference; return reply({ id: 'tx_direct', reference, amount: 1000, total_payment: 1188, status: 'PENDING', expires_at: new Date(Date.now() + 1800000).toISOString(), payment_data: { qr_string: 'TEST-QR' } }) }
      if (u.pathname.endsWith('/status')) return reply({ id: 'tx_direct', reference, amount: 1000, status: paid ? 'COMPLETED' : 'PENDING' })
    }
    throw new Error(`Unexpected external endpoint ${u.origin}${u.pathname}`)
  }
  const handler = loadDirectHandler()
  const api = new DirectVanzShopApi('https://website-must-not-be-called.test', handler)
  const created = await api.createPayment({ productId: 11, code: 'PROD', quantity: 1 })
  const args = { id: 'tx_direct', reference, paymentToken: created.payment_token }
  assert.equal((await api.paymentStatus(args)).status, 'pending')
  assert.equal(deletes, 0)
  await assert.rejects(api.paymentStatus({ ...args, paymentToken: 'tampered.signature' }))
  paid = true
  const result = await api.paymentStatus(args)
  assert.equal(result.fulfillment.accounts[0].value, 'account@example.test|password-test')
  assert.equal(deletes, 1)
  // A second process using the shared source and Redis reads the exact same receipt.
  const other = new DirectVanzShopApi('https://website-must-not-be-called.test', handler)
  assert.equal((await other.paymentStatus(args)).fulfillment.status, 'fulfilled')
  assert.equal((await other.fulfillmentStatus(args.paymentToken)).fulfillment.accounts[0].value, result.fulfillment.accounts[0].value)
  assert.equal(deletes, 1, 'never delete a second unit on polling/recovery')
})
