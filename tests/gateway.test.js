'use strict';

const assert = require('assert');

process.env.XSOFTWARE_API_KEY = 'test-api-key';
process.env.ADMIN_PASSWORD = 'test-admin-password';
process.env.XSOFTWARE_DEFAULT_SENDER = '628999999999';
process.env.CATALOG_SOURCE = 'merged';
process.env.STORE_THEME = 'dark';
process.env.STORE_ACCENT = '#f3c74f';
process.env.STORE_COLUMNS = '5';

const calls = [];
const users = new Map([
  ['628111111111', { id: 1, sender: '628111111111', name: 'Existing User', saldo: 50000, level: 'BASIC' }],
]);
let registrationEnabled = true;

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
  calls.push({ path: u.pathname, query: Object.fromEntries(u.searchParams.entries()), method, body, headers: options.headers || {} });

  if (u.pathname === '/v1/product') {
    return reply(200, { status: true, data: [{ id: 1, title: 'Canva', is_variation: true, variations: [{ id: 11, code: 'CANVA-1Y', title: '1 Tahun', price: 25000, stock_count: 3 }] }] });
  }
  if (u.pathname === '/v1/reseller-api/product') {
    return reply(200, { code: 200, data: [{ id: 105, code: 'NFLX-1M', title: 'Netflix Partner', thumbnail: 'https://example.com/n.jpg', price: 28000, stock: 42 }] });
  }
  if (u.pathname === '/v1/balance' && method === 'POST') {
    const user = users.get(String(body.sender));
    return user ? reply(200, { status: true, data: user }) : reply(200, { status: false, message: 'User not found' });
  }
  if (u.pathname === '/v1/register' && method === 'POST') {
    if (!registrationEnabled) return reply(200, { status: false, message: 'API Registration is disabled for this bot' });
    const user = { id: users.size + 10, sender: String(body.sender), name: String(body.name), saldo: 0, level: 'BASIC' };
    users.set(user.sender, user);
    return reply(200, { status: true, message: 'User registered successfully', data: user });
  }
  if (u.pathname === '/v1/order/qris' && method === 'POST') {
    if (!users.has(String(body.sender))) return reply(200, { status: false, message: 'User not found' });
    return reply(200, { status: true, data: { transaction_id: 'API-TEST123', amount: 25000, total_to_pay: 25700, qr_string: 'QRDATA', status: 'pending' } });
  }
  if (u.pathname === '/v1/deposit' && method === 'POST') {
    if (!users.has(String(body.sender))) return reply(200, { status: false, message: 'User not found' });
    return reply(200, { status: true, data: { transaction_id: 'DEP-TEST123', amount: body.amount, total_to_pay: body.amount + 700, qr_string: 'QRDEP', status: 'pending' } });
  }
  if (u.pathname === '/v1/order/status' && method === 'POST') {
    return reply(200, { status: true, data: { transaction_id: body.transaction_id, status: 'success', total: 25700, accounts: [{ email: 'demo@example.com', pass: 'secret' }] } });
  }
  if (u.pathname === '/v1/reseller-api/order' && method === 'POST') return reply(200, { code: 200, data: { id: 4821, reff_id: 'RAPI-TEST', total_price: 28000, accounts: [{ email: 'r@example.com', password: 'pw' }] } });
  if (u.pathname === '/v1/reseller-api/order' && method === 'GET') return reply(200, { code: 200, data: { total: 0, orders: [] } });
  if (u.pathname === '/v1/reseller-api/balance') return reply(200, { code: 200, data: { reseller_saldo: 1000000 } });
  if (u.pathname === '/v1/products/stocks' && method === 'POST') return reply(201, { code: 201, data: { total_added: body.accounts.length, product_id: body.product_id, variation_id: body.variation_id ?? null } });
  if (u.pathname === '/v1/products/' && method === 'POST') return reply(201, { code: 201, data: { product_id: 108, code: body.code || '', title: body.title, is_variation: Boolean(body.is_variation) } });
  if (u.pathname === '/v1/products/108/variations' && method === 'POST') return reply(201, { code: 201, data: { variation_id: 45, code: body.code, title: body.title } });
  if (u.pathname === '/v1/products/' && method === 'GET') return reply(200, { code: 200, data: { products: [], pagination: { page: 1, limit: 20, total: 0, total_pages: 0 } } });

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

  r = await invoke({ query: { a: 'health' } });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.base_url, 'https://backend-s2.xoftware.id');
  assert.equal(r.body.data.registration.email_is_sender, false);

  r = await invoke({ query: { a: 'init' } });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.owner_products[0].variations[0].code, 'CANVA-1Y');
  assert.equal(r.body.data.reseller_products[0].thumbnail, 'https://example.com/n.jpg');
  assert.equal(r.body.data.store.appearance.columns, 5);

  calls.length = 0;
  r = await invoke({ method: 'POST', query: { a: 'customer_prepare' }, body: { channel: 'whatsapp', sender: '08111111111', name: 'Existing User' } });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.state, 'existing');
  assert.equal(r.body.data.sender, '628111111111');
  assert.equal(calls.filter(x => x.path === '/v1/register').length, 0);

  calls.length = 0;
  r = await invoke({ method: 'POST', query: { a: 'customer_prepare' }, body: { channel: 'whatsapp', sender: '+628222222222', name: 'New User', email: 'new@example.com' } });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.state, 'registered');
  assert.ok(users.has('628222222222'));
  assert.equal(calls.filter(x => x.path === '/v1/balance').length, 1);
  assert.equal(calls.filter(x => x.path === '/v1/register').length, 1);

  calls.length = 0;
  r = await invoke({ method: 'POST', query: { a: 'checkout_qris' }, body: { channel: 'whatsapp', sender: '08222222222', name: 'New User', code: 'CANVA-1Y', quantity: 1, email: 'new@example.com' } });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.buyer_sender, '628222222222');
  assert.equal(r.body.data.transaction.transaction_id, 'API-TEST123');
  assert.match(r.body.data.status_token, /^[a-f0-9]{64}$/);
  const qrisCall = calls.find(x => x.path === '/v1/order/qris');
  assert.deepEqual(qrisCall.body, { sender: '628222222222', code: 'CANVA-1Y', quantity: 1 });
  assert.notEqual(qrisCall.body.sender, process.env.XSOFTWARE_DEFAULT_SENDER, 'public checkout must not silently fall back to the store sender');
  const token = r.body.data.status_token;

  r = await invoke({ method: 'POST', query: { a: 'order_status' }, body: { transaction_id: 'API-TEST123', status_token: token } });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.transaction.status, 'success');
  const statusCall = calls.find(x => x.path === '/v1/order/status');
  assert.equal(statusCall.method, 'POST');

  registrationEnabled = false;
  calls.length = 0;
  r = await invoke({ method: 'POST', query: { a: 'customer_prepare' }, body: { channel: 'whatsapp', sender: '08333333333', name: 'Blocked User' } });
  assert.equal(r.status, 409);
  assert.equal(r.body.details.reason, 'REGISTRATION_DISABLED');
  assert.equal(calls.filter(x => x.path === '/v1/order/qris').length, 0);

  calls.length = 0;
  r = await invoke({ method: 'POST', query: { a: 'checkout_qris' }, body: { channel: 'whatsapp', sender: '08333333333', name: 'Blocked User', code: 'CANVA-1Y', quantity: 1 } });
  assert.equal(r.status, 409);
  assert.equal(calls.filter(x => x.path === '/v1/order/qris').length, 0, 'checkout must stop before order if user cannot be registered');
  registrationEnabled = true;

  r = await invoke({ method: 'POST', query: { a: 'customer_prepare' }, body: { channel: 'telegram', sender: 'telegram-user-id', name: 'Telegram User' } });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.sender, 'telegram-user-id');

  r = await invoke({ query: { a: 'admin_ping' }, headers: { 'x-admin-password': 'wrong' } });
  assert.equal(r.status, 401);
  r = await invoke({ query: { a: 'admin_ping' }, headers: { 'x-admin-password': 'test-admin-password' } });
  assert.equal(r.status, 200);

  r = await invoke({ method: 'POST', query: { a: 'reseller_order' }, body: { stock_id: 105, quantity: 1 } });
  assert.equal(r.status, 401);
  r = await invoke({ method: 'POST', query: { a: 'reseller_order' }, headers: { 'x-admin-password': 'test-admin-password' }, body: { stock_id: 105, quantity: 1 } });
  assert.equal(r.status, 200);

  calls.length = 0;
  const accounts205 = Array.from({ length: 205 }, (_, i) => `user${i}@example.com|pw${i}`);
  r = await invoke({ method: 'POST', query: { a: 'pm_stock_add' }, headers: { 'x-admin-password': 'test-admin-password' }, body: { product_id: 108, accounts: accounts205 } });
  assert.equal(r.status, 201);
  assert.equal(r.body.data.total_added, 205);
  assert.deepEqual(calls.filter(x => x.path === '/v1/products/stocks').map(x => x.body.accounts.length), [100, 100, 5]);

  console.log('PASS gateway.test.js');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
