'use strict';

const assert = require('assert');

process.env.XSOFTWARE_API_KEY = 'test-api-key';
process.env.ADMIN_PASSWORD = 'test-admin';
process.env.XSOFTWARE_DEFAULT_SENDER = '628123456789';
process.env.CATALOG_SOURCE = 'merged';

const calls = [];
let requireRegistration = true;
function reply(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async text() { return JSON.stringify(body); },
  };
}

global.fetch = async (url, options = {}) => {
  const u = new URL(url);
  const method = String(options.method || 'GET').toUpperCase();
  const body = options.body ? JSON.parse(options.body) : undefined;
  calls.push({ path: u.pathname, query: Object.fromEntries(u.searchParams.entries()), method, body });

  if (u.pathname === '/v1/product') return reply(200, { status: true, data: [{ id: 1, title: 'Canva', is_variation: true, variations: [{ id: 11, code: 'CANVA-1Y', title: '1 Tahun', price: 25000, stock_count: 3 }] }] });
  if (u.pathname === '/v1/reseller-api/product') return reply(200, { code: 200, data: [{ id: 105, code: 'NFLX-1M', title: 'Netflix Partner', price: 28000, stock: 42 }] });
  if (u.pathname === '/v1/register' && method === 'POST') { requireRegistration = false; return reply(200, { status: true, message: 'User registered successfully', data: { sender: body.sender, name: body.name } }); }
  if (u.pathname === '/v1/order/qris' && method === 'POST') {
    if (requireRegistration) return reply(404, { status: false, message: 'User not found' });
    return reply(200, { status: true, data: { transaction_id: 'API-TEST123', amount: 25000, total_to_pay: 25700, qr_string: 'QRDATA', status: 'pending' } });
  }
  if (u.pathname === '/v1/order/status') return reply(200, { status: true, data: { transaction_id: u.searchParams.get('transaction_id'), status: 'success', total: 25700, accounts: [{ email: 'demo@example.com', pass: 'secret' }] } });
  if (u.pathname === '/v1/reseller-api/order' && method === 'POST') return reply(200, { code: 200, data: { id: 4821, reff_id: 'RAPI-TEST', total_price: 28000, accounts: [{ email: 'r@example.com', password: 'pw' }] } });
  if (u.pathname === '/v1/products/stocks' && method === 'POST') return reply(201, { code: 201, data: { total_added: body.accounts.length, product_id: body.product_id, variation_id: body.variation_id ?? null } });
  if (u.pathname === '/v1/products/' && method === 'POST') return reply(201, { code: 201, data: { product_id: 108, code: body.code || '', title: body.title, is_variation: Boolean(body.is_variation) } });
  if (u.pathname === '/v1/products/108/variations' && method === 'POST') return reply(201, { code: 201, data: { variation_id: 45, code: body.code, title: body.title } });
  if (u.pathname === '/v1/reseller-api/balance') return reply(200, { code: 200, data: { reseller_saldo: 1000000 } });

  return reply(200, { code: 200, message: 'OK', data: {} });
};

const handler = require('../api/xo.js');

function invoke({ method = 'GET', query = {}, body = undefined, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const req = { method, query, body, headers };
    const res = {
      statusCode: 200,
      headers: {},
      status(code) { this.statusCode = code; return this; },
      setHeader(k, v) { this.headers[k.toLowerCase()] = v; return this; },
      end(payload) {
        try { resolve({ status: this.statusCode, body: JSON.parse(payload), headers: this.headers }); }
        catch (e) { reject(e); }
      },
    };
    Promise.resolve(handler(req, res)).catch(reject);
  });
}

(async () => {
  let r;

  r = await invoke({ query: { a: 'init' } });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.owner_products[0].variations[0].code, 'CANVA-1Y');
  assert.equal(r.body.data.owner_products[0].variations[0].stock, 3);
  assert.equal(r.body.data.reseller_products[0].public_checkout, 'disabled');

  r = await invoke({ method: 'POST', query: { a: 'checkout_qris' }, body: { code: 'LEGACY_SKU_1', quantity: 1, email: 'buyer@example.com' } });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.transaction.transaction_id, 'API-TEST123');
  assert.match(r.body.data.status_token, /^[a-f0-9]{64}$/);
  const token = r.body.data.status_token;
  const registerCall = calls.find(x => x.path === '/v1/register');
  assert.ok(registerCall, 'default sender should auto-register when upstream says user not found');
  const qrisCalls = calls.filter(x => x.path === '/v1/order/qris');
  assert.equal(qrisCalls.length, 2);
  assert.deepEqual(qrisCalls.at(-1).body, { sender: '628123456789', code: 'LEGACY_SKU_1', quantity: 1 });

  r = await invoke({ query: { a: 'order_status', transaction_id: 'API-TEST123', status_token: token } });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.transaction.status, 'success');

  r = await invoke({ query: { a: 'order_status', transaction_id: 'API-TEST123', status_token: 'wrong' } });
  assert.equal(r.status, 401);

  r = await invoke({ method: 'POST', query: { a: 'reseller_order' }, body: { stock_id: 105, quantity: 1 } });
  assert.equal(r.status, 401);

  r = await invoke({ method: 'POST', query: { a: 'reseller_order' }, headers: { 'x-admin-password': 'test-admin' }, body: { stock_id: 105, quantity: 1 } });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.data.reff_id, 'RAPI-TEST');

  calls.length = 0;
  const accounts205 = Array.from({ length: 205 }, (_, i) => `user${i}@example.com|pw${i}`);
  r = await invoke({ method: 'POST', query: { a: 'pm_stock_add' }, headers: { 'x-admin-password': 'test-admin' }, body: { product_id: 108, accounts: accounts205 } });
  assert.equal(r.status, 201);
  assert.equal(r.body.data.total_added, 205);
  const stockCalls = calls.filter(x => x.path === '/v1/products/stocks');
  assert.deepEqual(stockCalls.map(x => x.body.accounts.length), [100, 100, 5]);

  calls.length = 0;
  r = await invoke({ method: 'POST', query: { a: 'pm_product_create' }, headers: { 'x-admin-password': 'test-admin' }, body: { code: 'SPOTIFY-IND', title: 'Spotify', price: 18000, stocks: accounts205 } });
  assert.equal(r.status, 201);
  const productCreate = calls.find(x => x.path === '/v1/products/' && x.method === 'POST');
  assert.equal(productCreate.body.stocks.length, 100);
  assert.deepEqual(calls.filter(x => x.path === '/v1/products/stocks').map(x => x.body.accounts.length), [100, 5]);

  calls.length = 0;
  r = await invoke({ method: 'POST', query: { a: 'pm_variation_create', product_id: 108 }, headers: { 'x-admin-password': 'test-admin' }, body: { code: 'CANVA-1TH', title: 'Canva 1 Tahun', price: 25000, stocks: accounts205 } });
  assert.equal(r.status, 201);
  const variationCreate = calls.find(x => x.path === '/v1/products/108/variations');
  assert.equal(variationCreate.body.stocks.length, 100);
  assert.deepEqual(calls.filter(x => x.path === '/v1/products/stocks').map(x => x.body.accounts.length), [100, 5]);

  r = await invoke({ method: 'POST', query: { a: 'reseller_balance' }, headers: { 'x-admin-password': 'test-admin' }, body: {} });
  assert.equal(r.status, 200);

  console.log('PASS gateway.test.js');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
