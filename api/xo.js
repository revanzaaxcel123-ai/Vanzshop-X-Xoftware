'use strict';

const crypto = require('crypto');

// Xoftware official production endpoint. Keep the API key server-side only.
const BASE_URL = 'https://backend-s2.xoftware.id';
const API_KEY = String(process.env.XSOFTWARE_API_KEY || '').trim();
const ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || '').trim();
const TIMEOUT_MS = Math.max(5000, Number(process.env.XSOFTWARE_TIMEOUT || 25000));
const STORE_NAME = process.env.STORE_NAME || 'VanzShop.com';
const STORE_TAGLINE = process.env.STORE_TAGLINE || 'Produk digital pilihan, stok live, checkout otomatis.';
const CATALOG_SOURCE = ['owner', 'reseller', 'merged'].includes(String(process.env.CATALOG_SOURCE || 'owner').toLowerCase())
  ? String(process.env.CATALOG_SOURCE || 'owner').toLowerCase()
  : 'owner';
const DEFAULT_SENDER = String(process.env.XSOFTWARE_DEFAULT_SENDER || '').trim();
const DEFAULT_NAME = String(process.env.XSOFTWARE_DEFAULT_NAME || STORE_NAME).trim();

const ORDER = Object.freeze({
  product: '/v1/product',
  register: '/v1/register',
  balance: '/v1/balance',
  orderBalance: '/v1/order/balance',
  orderQris: '/v1/order/qris',
  orderStatus: '/v1/order/status',
  deposit: '/v1/deposit',
});
const RESELLER = Object.freeze({
  balance: '/v1/reseller-api/balance',
  product: '/v1/reseller-api/product',
  order: '/v1/reseller-api/order',
  orderStatus: '/v1/reseller-api/order/status',
});
const PRODUCTS = '/v1/products';

function send(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.end(JSON.stringify(body));
}
function ok(res, data, status = 200) { return send(res, status, { ok: true, data }); }
function fail(res, message, status = 400, extra = undefined) {
  const body = { ok: false, error: String(message) };
  if (extra !== undefined) body.details = extra;
  return send(res, status, body);
}
function str(v, max = 500) { return String(v ?? '').trim().slice(0, max); }
function int(v, def = 0) { const n = Number.parseInt(String(v ?? ''), 10); return Number.isFinite(n) ? n : def; }
function num(v, def = 0) { const n = Number(v); return Number.isFinite(n) ? n : def; }
function bool(v, def = false) {
  if (typeof v === 'boolean') return v;
  if (String(v).toLowerCase() === 'true' || String(v) === '1') return true;
  if (String(v).toLowerCase() === 'false' || String(v) === '0') return false;
  return def;
}
function validId(v) { return /^\d+$/.test(str(v, 30)); }
function validSku(v) { return /^[A-Za-z0-9-]{3,50}$/.test(str(v, 50)); }
function validOrderCode(v) { return /^[A-Za-z0-9_-]{1,100}$/.test(str(v, 100)); }
function isEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '').trim()); }
function bodyOf(req) { return req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {}; }
function q(params, key, def = '') { return params?.[key] ?? def; }
function method(req, name) { return String(req.method || '').toUpperCase() === name; }
function getHeader(req, name) {
  const wanted = String(name).toLowerCase();
  const headers = req?.headers || {};
  const direct = headers[wanted] ?? headers[name] ?? headers[String(name).toUpperCase()];
  if (Array.isArray(direct)) return String(direct[0] || '');
  return String(direct || '');
}
function sameSecret(a, b) {
  const aa = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  return aa.length === bb.length && aa.length > 0 && crypto.timingSafeEqual(aa, bb);
}
function requireApiKey(res) {
  if (!API_KEY) { fail(res, 'XSOFTWARE_API_KEY belum dikonfigurasi di server.', 500); return true; }
  return false;
}
function requireAdmin(req, res) {
  if (!ADMIN_PASSWORD) { fail(res, 'ADMIN_PASSWORD belum dikonfigurasi; aksi sensitif dinonaktifkan.', 503); return true; }
  if (!sameSecret(getHeader(req, 'x-admin-password'), ADMIN_PASSWORD)) { fail(res, 'Akses admin ditolak.', 401); return true; }
  return false;
}
function signStatus(transactionId) {
  return crypto.createHmac('sha256', API_KEY).update(`order-status:${String(transactionId)}`).digest('hex');
}
function verifyStatusToken(transactionId, token) {
  if (!transactionId || !token || !API_KEY) return false;
  return sameSecret(signStatus(transactionId), String(token));
}
function clamp(v, min, max, def) {
  const n = int(v, def);
  return Math.max(min, Math.min(max, n));
}
function buildQuery(values) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(values || {})) if (v !== '' && v !== undefined && v !== null) sp.set(k, String(v));
  const s = sp.toString();
  return s ? `?${s}` : '';
}
function pick(obj, keys) {
  const out = {};
  for (const k of keys) if (Object.prototype.hasOwnProperty.call(obj || {}, k) && obj[k] !== undefined) out[k] = obj[k];
  return out;
}
function ensureObject(v) { return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; }
function validateAccounts(accounts, max = 5000) {
  if (!Array.isArray(accounts) || accounts.length < 1) throw Object.assign(new Error('accounts wajib berupa array dan tidak boleh kosong.'), { status: 400 });
  if (accounts.length > max) throw Object.assign(new Error(`Terlalu banyak akun dalam satu request gateway (maks ${max}).`), { status: 400 });
  const cleaned = accounts.map(v => str(v, 10000));
  if (cleaned.some(v => !v)) throw Object.assign(new Error('Setiap data akun stok wajib berupa string non-kosong.'), { status: 400 });
  return cleaned;
}
async function xoFetch(path, options = {}) {
  if (!API_KEY) throw Object.assign(new Error('Upstream configuration missing'), { status: 500 });
  const url = `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  const headers = {
    accept: 'application/json',
    'x-api-key': API_KEY,
    ...(options.body !== undefined ? { 'content-type': 'application/json' } : {}),
    ...(options.headers || {}),
  };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
      redirect: 'follow',
    });
    const text = await response.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch {
      const e = new Error('Xoftware mengirim respons non-JSON.'); e.status = 502; throw e;
    }
    if (!response.ok) {
      const e = new Error(str(data?.message || data?.error || `Request Xoftware gagal (${response.status}).`, 500));
      e.status = response.status;
      e.upstream = data;
      throw e;
    }
    return data;
  } catch (e) {
    if (e?.name === 'AbortError') { const x = new Error('Request ke Xoftware timeout. Silakan coba lagi.'); x.status = 504; throw x; }
    if (e?.status) throw e;
    const x = new Error('Layanan Xoftware sedang tidak dapat dijangkau.'); x.status = 502; throw x;
  } finally { clearTimeout(timer); }
}

function imageFrom(p) {
  const candidates = [
    p?.thumbnail, p?.image, p?.img, p?.product_image, p?.image_url, p?.imageUrl, p?.photo,
    p?.cover, p?.banner, p?.picture, p?.logo,
    Array.isArray(p?.images) ? p.images[0] : '',
    Array.isArray(p?.media) ? (p.media[0]?.url || p.media[0]?.src || p.media[0]) : '',
    p?.media?.url, p?.media?.src,
  ];
  const found = candidates.find(v => typeof v === 'string' && /^https?:\/\//i.test(v.trim()));
  return found ? found.trim() : '';
}
function normalizeVariation(v) {
  return {
    ...ensureObject(v),
    id: v?.id ?? v?.variation_id ?? null,
    code: v?.code ?? '',
    title: v?.title ?? v?.name ?? 'Varian',
    name: v?.name ?? v?.title ?? 'Varian',
    price: Number(v?.price ?? 0),
    stock: v?.stock == null ? (v?.stock_count == null ? null : Number(v.stock_count)) : Number(v.stock),
    stock_count: v?.stock_count == null ? (v?.stock == null ? null : Number(v.stock)) : Number(v.stock_count),
  };
}
function normalizeOwner(p) {
  return {
    source: 'owner',
    id: p?.id ?? null,
    code: p?.code ?? '',
    title: p?.title ?? p?.name ?? 'Produk',
    thumbnail: imageFrom(p),
    price: Number(p?.price ?? 0),
    original_price: p?.original_price ?? null,
    discount: p?.discount ?? null,
    point: p?.point ?? null,
    sold: Number(p?.sold ?? 0),
    stock: p?.stock == null ? (p?.stock_count == null ? null : Number(p.stock_count)) : Number(p.stock),
    description: p?.description ?? p?.desc ?? '',
    is_variation: Boolean(p?.is_variation),
    variations: Array.isArray(p?.variations) ? p.variations.map(normalizeVariation) : [],
    tags: Array.isArray(p?.tags) ? p.tags : [],
    createdAt: p?.createdAt ?? null,
    updatedAt: p?.updatedAt ?? null,
    public_checkout: 'qris',
  };
}
function normalizeReseller(p) {
  return {
    source: 'reseller',
    id: p?.id ?? null,
    code: p?.code ?? '',
    title: p?.title ?? p?.name ?? 'Produk',
    thumbnail: imageFrom(p),
    price: Number(p?.price ?? 0),
    stock: p?.stock == null ? (p?.stock_count == null ? null : Number(p.stock_count)) : Number(p.stock),
    description: p?.desc ?? p?.description ?? '',
    is_variation: Boolean(p?.is_variation),
    variations: Array.isArray(p?.variations) ? p.variations.map(normalizeVariation) : [],
    tags: Array.isArray(p?.tags) ? p.tags : [],
    provider_name: p?.provider_name ?? '',
    createdAt: p?.createdAt ?? null,
    updatedAt: p?.updatedAt ?? null,
    // Reseller H2H spends reseller_saldo directly. It is intentionally NOT a public checkout method.
    public_checkout: 'disabled',
  };
}
async function getOwnerProducts() {
  const r = await xoFetch(ORDER.product);
  return Array.isArray(r?.data) ? r.data.map(normalizeOwner) : [];
}
async function getResellerProducts() {
  const r = await xoFetch(RESELLER.product);
  return Array.isArray(r?.data) ? r.data.map(normalizeReseller) : [];
}
async function addStockBatches(productId, variationId, accounts) {
  const clean = validateAccounts(accounts);
  const batches = [];
  let totalAdded = 0;
  for (let i = 0; i < clean.length; i += 100) {
    const chunk = clean.slice(i, i + 100);
    const body = { product_id: Number(productId), accounts: chunk };
    if (variationId !== '' && variationId !== undefined && variationId !== null) body.variation_id = Number(variationId);
    const r = await xoFetch(`${PRODUCTS}/stocks`, { method: 'POST', body });
    const added = Number(r?.data?.total_added ?? chunk.length);
    totalAdded += Number.isFinite(added) ? added : chunk.length;
    batches.push({ size: chunk.length, response: r });
  }
  return { total_added: totalAdded, batches };
}

module.exports = async function handler(req, res) {
  const action = str(q(req.query || {}, 'a'), 80);

  if (action === 'health') {
    return ok(res, {
      store: STORE_NAME,
      ready: Boolean(API_KEY),
      admin_ready: Boolean(ADMIN_PASSWORD),
      mode: CATALOG_SOURCE,
      base_url: BASE_URL,
    });
  }

  // Incoming webhook receiver: docs provide payload fields but no signature/secret scheme.
  // We acknowledge it without persisting or trusting it for fulfillment.
  if (action === 'webhook') {
    if (!method(req, 'POST')) return fail(res, 'Method tidak diizinkan.', 405);
    const b = bodyOf(req);
    const event = str(b.event, 80);
    const transaction_id = str(b.transaction_id, 160);
    if (!event || !transaction_id) return fail(res, 'Payload webhook tidak lengkap.');
    return ok(res, { received: true, event, transaction_id });
  }

  const authErr = requireApiKey(res);
  if (authErr) return authErr;

  try {
    switch (action) {
      // ---------------- Public storefront ----------------
      case 'init': {
        const warnings = [];
        let owner_products = [];
        let reseller_products = [];
        if (CATALOG_SOURCE === 'owner' || CATALOG_SOURCE === 'merged') {
          try { owner_products = await getOwnerProducts(); } catch { warnings.push('catalog-owner'); }
        }
        if (CATALOG_SOURCE === 'reseller' || CATALOG_SOURCE === 'merged') {
          try { reseller_products = await getResellerProducts(); } catch { warnings.push('catalog-reseller'); }
        }
        return ok(res, {
          store: { name: STORE_NAME, tagline: STORE_TAGLINE },
          owner_products,
          reseller_products,
          warnings,
        });
      }

      case 'owner_product': {
        const id = str(q(req.query || {}, 'id'), 100);
        const all = await getOwnerProducts();
        return ok(res, all.find(x => String(x.id) === id || String(x.code) === id) || null);
      }

      case 'reseller_product': {
        const id = str(q(req.query || {}, 'id'), 100);
        const all = await getResellerProducts();
        return ok(res, all.find(x => String(x.id) === id || String(x.code) === id) || null);
      }

      case 'checkout_qris': {
        if (!method(req, 'POST')) return fail(res, 'Method tidak diizinkan.', 405);
        if (!DEFAULT_SENDER) return fail(res, 'XSOFTWARE_DEFAULT_SENDER belum dikonfigurasi.', 503);
        const b = bodyOf(req);
        const code = str(b.code, 50);
        const quantity = int(b.quantity, 0);
        const email = str(b.email, 160).toLowerCase();
        if (!validOrderCode(code) || quantity < 1 || !isEmail(email)) return fail(res, 'Data pembelian belum lengkap atau SKU tidak valid.');
        const upstream = await xoFetch(ORDER.orderQris, { method: 'POST', body: { sender: DEFAULT_SENDER, code, quantity } });
        const transaction = ensureObject(upstream?.data || upstream);
        const transactionId = str(transaction.transaction_id, 160);
        if (!transactionId) return fail(res, 'Xoftware tidak mengembalikan transaction_id.', 502);
        return ok(res, {
          transaction,
          status_token: signStatus(transactionId),
          buyer_email: email,
          message: upstream?.message || '',
        });
      }

      case 'deposit': {
        if (!method(req, 'POST')) return fail(res, 'Method tidak diizinkan.', 405);
        if (!DEFAULT_SENDER) return fail(res, 'XSOFTWARE_DEFAULT_SENDER belum dikonfigurasi.', 503);
        const b = bodyOf(req);
        const amount = num(b.amount, 0);
        const email = str(b.email, 160).toLowerCase();
        if (!Number.isInteger(amount) || amount < 1000 || amount > 1000000) return fail(res, 'Nominal isi saldo harus Rp1.000 sampai Rp1.000.000.');
        if (email && !isEmail(email)) return fail(res, 'Email tidak valid.');
        const upstream = await xoFetch(ORDER.deposit, { method: 'POST', body: { sender: DEFAULT_SENDER, amount } });
        const transaction = ensureObject(upstream?.data || upstream);
        const transactionId = str(transaction.transaction_id, 160);
        if (!transactionId) return fail(res, 'Xoftware tidak mengembalikan transaction_id.', 502);
        return ok(res, {
          transaction,
          status_token: signStatus(transactionId),
          buyer_email: email,
          message: upstream?.message || '',
        });
      }

      case 'order_status': {
        const b = bodyOf(req);
        const transactionId = str(q(req.query || {}, 'transaction_id') || b.transaction_id, 160);
        const token = str(q(req.query || {}, 'status_token') || b.status_token, 200);
        const admin = ADMIN_PASSWORD && sameSecret(getHeader(req, 'x-admin-password'), ADMIN_PASSWORD);
        if (!transactionId) return fail(res, 'transaction_id wajib diisi.');
        if (!admin && !verifyStatusToken(transactionId, token)) return fail(res, 'Token status transaksi tidak valid.', 401);
        const upstream = await xoFetch(`${ORDER.orderStatus}${buildQuery({ transaction_id: transactionId })}`);
        return ok(res, { transaction: upstream?.data || upstream, message: upstream?.message || '' });
      }

      // ---------------- Admin: Order API ----------------
      case 'owner_register': {
        const ae = requireAdmin(req, res); if (ae) return ae;
        if (!method(req, 'POST')) return fail(res, 'Method tidak diizinkan.', 405);
        const b = bodyOf(req);
        const sender = str(b.sender, 160);
        const name = str(b.name || DEFAULT_NAME, 120);
        if (!sender || !name) return fail(res, 'sender dan name wajib diisi.');
        return ok(res, await xoFetch(ORDER.register, { method: 'POST', body: { sender, name } }));
      }

      case 'owner_balance': {
        const ae = requireAdmin(req, res); if (ae) return ae;
        const b = bodyOf(req);
        const sender = str(q(req.query || {}, 'sender') || b.sender || DEFAULT_SENDER, 160);
        if (!sender) return fail(res, 'sender wajib diisi.');
        if (method(req, 'POST')) return ok(res, await xoFetch(ORDER.balance, { method: 'POST', body: { sender } }));
        if (!method(req, 'GET')) return fail(res, 'Method tidak diizinkan.', 405);
        return ok(res, await xoFetch(`${ORDER.balance}${buildQuery({ sender })}`));
      }

      case 'checkout_balance': {
        const ae = requireAdmin(req, res); if (ae) return ae;
        if (!method(req, 'POST')) return fail(res, 'Method tidak diizinkan.', 405);
        const b = bodyOf(req);
        const sender = str(b.sender || DEFAULT_SENDER, 160);
        const code = str(b.code, 50);
        const quantity = int(b.quantity, 0);
        if (!sender || !validOrderCode(code) || quantity < 1) return fail(res, 'sender, code, dan quantity wajib valid.');
        return ok(res, await xoFetch(ORDER.orderBalance, { method: 'POST', body: { sender, code, quantity } }));
      }

      // ---------------- Admin: Reseller H2H ----------------
      case 'reseller_balance': {
        const ae = requireAdmin(req, res); if (ae) return ae;
        if (!method(req, 'GET') && !method(req, 'POST')) return fail(res, 'Method tidak diizinkan.', 405);
        return ok(res, await xoFetch(RESELLER.balance, method(req, 'POST') ? { method: 'POST', body: {} } : { method: 'GET' }));
      }

      case 'reseller_order': {
        const ae = requireAdmin(req, res); if (ae) return ae;
        if (!method(req, 'POST')) return fail(res, 'Method tidak diizinkan.', 405);
        const b = bodyOf(req);
        const stockId = str(b.stock_id, 30);
        const variationId = b.variation_id == null || b.variation_id === '' ? '' : str(b.variation_id, 30);
        const quantity = int(b.quantity, 0);
        if (!validId(stockId) || quantity < 1) return fail(res, 'stock_id dan quantity wajib valid.');
        const payload = { stock_id: Number(stockId), quantity };
        if (variationId) {
          if (!validId(variationId)) return fail(res, 'variation_id tidak valid.');
          payload.variation_id = Number(variationId);
        }
        return ok(res, await xoFetch(RESELLER.order, { method: 'POST', body: payload }));
      }

      case 'reseller_orders': {
        const ae = requireAdmin(req, res); if (ae) return ae;
        if (!method(req, 'GET')) return fail(res, 'Method tidak diizinkan.', 405);
        const page = clamp(q(req.query || {}, 'page'), 1, 1000000, 1);
        const limit = clamp(q(req.query || {}, 'limit'), 1, 100, 20);
        return ok(res, await xoFetch(`${RESELLER.order}${buildQuery({ page, limit })}`));
      }

      case 'reseller_status': {
        const ae = requireAdmin(req, res); if (ae) return ae;
        if (!method(req, 'GET')) return fail(res, 'Method tidak diizinkan.', 405);
        const reffId = str(q(req.query || {}, 'reff_id'), 100);
        if (!reffId) return fail(res, 'reff_id wajib diisi.');
        return ok(res, await xoFetch(`${RESELLER.orderStatus}${buildQuery({ reff_id: reffId })}`));
      }

      // ---------------- Admin: Product Management ----------------
      case 'pm_forms': {
        const ae = requireAdmin(req, res); if (ae) return ae;
        if (!method(req, 'GET')) return fail(res, 'Method tidak diizinkan.', 405);
        return ok(res, await xoFetch(`${PRODUCTS}/forms`));
      }

      case 'pm_products': {
        const ae = requireAdmin(req, res); if (ae) return ae;
        if (!method(req, 'GET')) return fail(res, 'Method tidak diizinkan.', 405);
        const page = clamp(q(req.query || {}, 'page'), 1, 1000000, 1);
        const limit = clamp(q(req.query || {}, 'limit'), 1, 20, 20);
        const search = str(q(req.query || {}, 'search'), 200);
        const variationRaw = q(req.query || {}, 'is_variation', '');
        const isVariation = variationRaw === '' ? '' : bool(variationRaw);
        return ok(res, await xoFetch(`${PRODUCTS}/${buildQuery({ page, limit, search, is_variation: isVariation })}`));
      }

      case 'pm_product': {
        const ae = requireAdmin(req, res); if (ae) return ae;
        if (!method(req, 'GET')) return fail(res, 'Method tidak diizinkan.', 405);
        const id = str(q(req.query || {}, 'id'), 30);
        if (!validId(id)) return fail(res, 'id produk tidak valid.');
        return ok(res, await xoFetch(`${PRODUCTS}/${Number(id)}`));
      }

      case 'pm_product_create': {
        const ae = requireAdmin(req, res); if (ae) return ae;
        if (!method(req, 'POST')) return fail(res, 'Method tidak diizinkan.', 405);
        const b = bodyOf(req);
        const payload = pick(b, ['code', 'title', 'price', 'profit', 'desc', 'snk', 'form', 'is_variation', 'wholesale_tiers']);
        payload.title = str(payload.title, 100);
        payload.is_variation = bool(payload.is_variation, false);
        if (!payload.title) return fail(res, 'title wajib diisi.');
        if (!payload.is_variation) {
          payload.code = str(payload.code, 50);
          if (!validSku(payload.code)) return fail(res, 'code wajib 3-50 karakter: huruf, angka, atau dash.');
          if (!Number.isFinite(Number(payload.price)) || Number(payload.price) < 0) return fail(res, 'price wajib berupa angka valid.');
          payload.price = Number(payload.price);
        } else {
          delete payload.code;
          delete payload.price;
        }
        const stocks = Array.isArray(b.stocks) ? validateAccounts(b.stocks) : [];
        if (stocks.length) payload.stocks = stocks.slice(0, 100);
        const created = await xoFetch(`${PRODUCTS}/`, { method: 'POST', body: payload });
        const productId = created?.data?.product_id;
        let stock_result = null;
        if (stocks.length > 100) {
          if (!validId(productId)) return fail(res, 'Produk dibuat, tetapi Xoftware tidak mengembalikan product_id untuk batching stok lanjutan.', 502, created);
          stock_result = await addStockBatches(productId, '', stocks.slice(100));
        }
        return ok(res, { created, stock_result }, 201);
      }

      case 'pm_product_update': {
        const ae = requireAdmin(req, res); if (ae) return ae;
        if (!method(req, 'PUT') && !method(req, 'POST')) return fail(res, 'Method tidak diizinkan.', 405);
        const id = str(q(req.query || {}, 'id') || bodyOf(req).id, 30);
        if (!validId(id)) return fail(res, 'id produk tidak valid.');
        const b = bodyOf(req);
        const payload = pick(b, ['code', 'title', 'price', 'profit', 'desc', 'snk', 'form', 'is_variation', 'is_show', 'wholesale_tiers']);
        delete payload.id;
        if (payload.code !== undefined && !validSku(payload.code)) return fail(res, 'code wajib 3-50 karakter: huruf, angka, atau dash.');
        if (payload.title !== undefined) payload.title = str(payload.title, 100);
        if (!Object.keys(payload).length) return fail(res, 'Tidak ada field produk yang diperbarui.');
        return ok(res, await xoFetch(`${PRODUCTS}/${Number(id)}`, { method: 'PUT', body: payload }));
      }

      case 'pm_product_delete': {
        const ae = requireAdmin(req, res); if (ae) return ae;
        if (!method(req, 'DELETE') && !method(req, 'POST')) return fail(res, 'Method tidak diizinkan.', 405);
        const id = str(q(req.query || {}, 'id') || bodyOf(req).id, 30);
        if (!validId(id)) return fail(res, 'id produk tidak valid.');
        return ok(res, await xoFetch(`${PRODUCTS}/${Number(id)}`, { method: 'DELETE' }));
      }

      case 'pm_variation_create': {
        const ae = requireAdmin(req, res); if (ae) return ae;
        if (!method(req, 'POST')) return fail(res, 'Method tidak diizinkan.', 405);
        const b = bodyOf(req);
        const productId = str(q(req.query || {}, 'product_id') || b.product_id, 30);
        if (!validId(productId)) return fail(res, 'product_id tidak valid.');
        const payload = pick(b, ['code', 'title', 'price', 'profit', 'desc', 'snk', 'form']);
        payload.code = str(payload.code, 50);
        payload.title = str(payload.title, 100);
        if (!validSku(payload.code) || !payload.title || !Number.isFinite(Number(payload.price))) return fail(res, 'code, title, dan price varian wajib valid.');
        payload.price = Number(payload.price);
        const stocks = Array.isArray(b.stocks) ? validateAccounts(b.stocks) : [];
        if (stocks.length) payload.stocks = stocks.slice(0, 100);
        const created = await xoFetch(`${PRODUCTS}/${Number(productId)}/variations`, { method: 'POST', body: payload });
        const variationId = created?.data?.variation_id;
        let stock_result = null;
        if (stocks.length > 100) {
          if (!validId(variationId)) return fail(res, 'Variasi dibuat, tetapi Xoftware tidak mengembalikan variation_id untuk batching stok lanjutan.', 502, created);
          stock_result = await addStockBatches(productId, variationId, stocks.slice(100));
        }
        return ok(res, { created, stock_result }, 201);
      }

      case 'pm_variation': {
        const ae = requireAdmin(req, res); if (ae) return ae;
        if (!method(req, 'GET')) return fail(res, 'Method tidak diizinkan.', 405);
        const id = str(q(req.query || {}, 'id'), 30);
        if (!validId(id)) return fail(res, 'id variasi tidak valid.');
        return ok(res, await xoFetch(`${PRODUCTS}/variations/${Number(id)}`));
      }

      case 'pm_variation_update': {
        const ae = requireAdmin(req, res); if (ae) return ae;
        if (!method(req, 'PUT') && !method(req, 'POST')) return fail(res, 'Method tidak diizinkan.', 405);
        const b = bodyOf(req);
        const id = str(q(req.query || {}, 'id') || b.id, 30);
        if (!validId(id)) return fail(res, 'id variasi tidak valid.');
        const payload = pick(b, ['code', 'title', 'price', 'profit', 'desc', 'snk', 'form']);
        delete payload.id;
        if (payload.code !== undefined && !validSku(payload.code)) return fail(res, 'code variasi tidak valid.');
        if (payload.title !== undefined) payload.title = str(payload.title, 100);
        if (!Object.keys(payload).length) return fail(res, 'Tidak ada field variasi yang diperbarui.');
        return ok(res, await xoFetch(`${PRODUCTS}/variations/${Number(id)}`, { method: 'PUT', body: payload }));
      }

      case 'pm_variation_delete': {
        const ae = requireAdmin(req, res); if (ae) return ae;
        if (!method(req, 'DELETE') && !method(req, 'POST')) return fail(res, 'Method tidak diizinkan.', 405);
        const id = str(q(req.query || {}, 'id') || bodyOf(req).id, 30);
        if (!validId(id)) return fail(res, 'id variasi tidak valid.');
        return ok(res, await xoFetch(`${PRODUCTS}/variations/${Number(id)}`, { method: 'DELETE' }));
      }

      case 'pm_stock_add': {
        const ae = requireAdmin(req, res); if (ae) return ae;
        if (!method(req, 'POST')) return fail(res, 'Method tidak diizinkan.', 405);
        const b = bodyOf(req);
        const productId = str(b.product_id, 30);
        const variationId = b.variation_id == null || b.variation_id === '' ? '' : str(b.variation_id, 30);
        if (!validId(productId)) return fail(res, 'product_id tidak valid.');
        if (variationId && !validId(variationId)) return fail(res, 'variation_id tidak valid.');
        const result = await addStockBatches(productId, variationId, b.accounts);
        return ok(res, result, 201);
      }

      case 'pm_stocks': {
        const ae = requireAdmin(req, res); if (ae) return ae;
        if (!method(req, 'GET')) return fail(res, 'Method tidak diizinkan.', 405);
        const productId = str(q(req.query || {}, 'product_id'), 30);
        const variationId = str(q(req.query || {}, 'variation_id'), 30);
        const page = clamp(q(req.query || {}, 'page'), 1, 1000000, 1);
        const limit = clamp(q(req.query || {}, 'limit'), 1, 100, 50);
        if (!validId(productId)) return fail(res, 'product_id tidak valid.');
        if (variationId && !validId(variationId)) return fail(res, 'variation_id tidak valid.');
        return ok(res, await xoFetch(`${PRODUCTS}/${Number(productId)}/stocks${buildQuery({ variation_id: variationId, page, limit })}`));
      }

      case 'pm_stock_delete': {
        const ae = requireAdmin(req, res); if (ae) return ae;
        if (!method(req, 'DELETE') && !method(req, 'POST')) return fail(res, 'Method tidak diizinkan.', 405);
        const id = str(q(req.query || {}, 'id') || bodyOf(req).id, 30);
        if (!validId(id)) return fail(res, 'id stok tidak valid.');
        return ok(res, await xoFetch(`${PRODUCTS}/stocks/${Number(id)}`, { method: 'DELETE' }));
      }

      default:
        return fail(res, 'Aksi tidak tersedia.', 404);
    }
  } catch (e) {
    console.error('[XOFTWARE GATEWAY]', action, e?.message || e);
    return fail(res, e?.message || 'Transaksi gagal diproses.', e?.status || 500, e?.upstream);
  }
};
