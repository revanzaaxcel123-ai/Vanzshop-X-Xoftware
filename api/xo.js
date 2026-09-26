'use strict';

const BASE_URL = String(process.env.XSOFTWARE_BASE_URL || 'https://backend-s2.xoftware.id').replace(/\/+$/, '');
const API_KEY = String(process.env.XSOFTWARE_API_KEY || '');
const TIMEOUT_MS = Math.max(5000, Number(process.env.XSOFTWARE_TIMEOUT || 25000));
const STORE_NAME = process.env.STORE_NAME || 'VanzShop.com';
const STORE_TAGLINE = process.env.STORE_TAGLINE || 'Digital store powered by VanzShop & Xoftware';
const CATALOG_SOURCE = String(process.env.CATALOG_SOURCE || 'merged').toLowerCase();
const ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || '');

function send(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  return res.end(JSON.stringify(body));
}
function ok(res, data) { return send(res, 200, { ok: true, data }); }
function fail(res, message, status = 400, extra = undefined) {
  const body = { ok: false, error: String(message) };
  if (extra !== undefined) body.details = extra;
  return send(res, status, body);
}
function method(req, wanted) {
  return req.method === wanted;
}
function bodyOf(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  return {};
}
function str(v, max = 500) { return String(v ?? '').trim().slice(0, max); }
function int(v, def = 0) {
  const n = Number.parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) ? n : def;
}
function bool(v) {
  return v === true || v === 'true' || v === 1 || v === '1';
}
function validId(v) { return /^\d+$/.test(str(v, 30)); }
function requireApiKey(res) {
  if (!API_KEY) return fail(res, 'XSOFTWARE_API_KEY belum diatur di Vercel.', 500);
  return null;
}
function requireAdmin(req, res) {
  if (!ADMIN_PASSWORD) return fail(res, 'ADMIN_PASSWORD belum diatur.', 403);
  const supplied = String(req.headers['x-admin-password'] || '');
  if (supplied !== ADMIN_PASSWORD) return fail(res, 'Admin tidak terotorisasi.', 401);
  return null;
}
async function xoFetch(path, options = {}) {
  if (!API_KEY) throw Object.assign(new Error('XSOFTWARE_API_KEY belum diatur di Vercel.'), { status: 500 });
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
    let data;
    try { data = text ? JSON.parse(text) : {}; } catch {
      const e = new Error(`Respons Xoftware bukan JSON (HTTP ${response.status}).`);
      e.status = 502; throw e;
    }
    if (!response.ok) {
      const e = new Error(str(data?.message || data?.error || `Xoftware HTTP ${response.status}`, 500));
      e.status = response.status; e.upstream = data; throw e;
    }
    return data;
  } catch (e) {
    if (e?.name === 'AbortError') {
      const err = new Error(`Xoftware timeout setelah ${TIMEOUT_MS} ms.`); err.status = 504; throw err;
    }
    if (e?.status) throw e;
    const err = new Error(`Gagal terhubung ke Xoftware: ${e?.message || 'network error'}`); err.status = 502; throw err;
  } finally { clearTimeout(timer); }
}
function q(params, key, def = '') { return params?.[key] ?? def; }
function normalizeOwner(p) {
  return {
    source: 'owner',
    id: p?.id ?? null,
    code: p?.code ?? '',
    title: p?.title ?? p?.name ?? 'Produk',
    thumbnail: p?.thumbnail ?? p?.image ?? p?.img ?? '',
    price: Number(p?.price ?? 0),
    original_price: p?.original_price ?? null,
    discount: p?.discount ?? null,
    point: p?.point ?? null,
    sold: Number(p?.sold ?? 0),
    stock: p?.stock == null ? null : Number(p.stock),
    description: p?.description ?? p?.desc ?? '',
    is_variation: Boolean(p?.is_variation),
    variations: Array.isArray(p?.variations) ? p.variations : [],
  };
}
function normalizeReseller(p) {
  return {
    source: 'reseller',
    id: p?.id ?? null,
    code: p?.code ?? '',
    title: p?.title ?? p?.name ?? 'Produk Star Seller',
    thumbnail: p?.thumbnail ?? p?.image ?? '',
    price: Number(p?.price ?? 0),
    stock: p?.stock == null ? null : Number(p.stock),
    description: p?.desc ?? p?.description ?? '',
    provider_name: p?.provider_name ?? '',
    is_variation: Boolean(p?.is_variation),
    variations: Array.isArray(p?.variations) ? p.variations : [],
  };
}
async function getOwnerProducts() {
  const r = await xoFetch('/v1/product');
  return Array.isArray(r?.data) ? r.data.map(normalizeOwner) : [];
}
async function getResellerProducts() {
  const r = await xoFetch('/v1/reseller-api/product');
  return Array.isArray(r?.data) ? r.data.map(normalizeReseller) : [];
}

module.exports = async function handler(req, res) {
  const action = str(q(req.query || {}, 'a'), 80);
  if (action === 'webhook') {
    if (req.method !== 'POST') return fail(res, 'Gunakan POST.', 405);
    console.log('[XSOFTWARE WEBHOOK]', JSON.stringify(bodyOf(req)));
    return ok(res, { received: true, persisted: false });
  }
  const authErr = requireApiKey(res);
  if (authErr) return authErr;

  try {
    switch (action) {
      case 'init': {
        const warnings = [];
        let ownerProducts = [], resellerProducts = [];
        if (CATALOG_SOURCE === 'owner' || CATALOG_SOURCE === 'merged') {
          try { ownerProducts = await getOwnerProducts(); }
          catch (e) { warnings.push(`Owner catalog: ${e.message}`); }
        }
        if (CATALOG_SOURCE === 'reseller' || CATALOG_SOURCE === 'merged') {
          try { resellerProducts = await getResellerProducts(); }
          catch (e) { warnings.push(`Reseller catalog: ${e.message}`); }
        }
        return ok(res, {
          store: { name: STORE_NAME, tagline: STORE_TAGLINE },
          catalog_source: CATALOG_SOURCE,
          owner_products: ownerProducts,
          reseller_products: resellerProducts,
          warnings,
        });
      }

      case 'owner_product': {
        const code = str(q(req.query || {}, 'code'), 100);
        const all = await getOwnerProducts();
        if (!code) return ok(res, all);
        const p = all.find(x => String(x.code) === code || String(x.id) === code);
        if (!p) return fail(res, 'Produk owner tidak ditemukan.', 404);
        return ok(res, p);
      }

      case 'register': {
        if (!method(req, 'POST')) return fail(res, 'Gunakan POST.', 405);
        const b = bodyOf(req);
        const sender = str(b.sender, 100), name = str(b.name, 100);
        if (!sender || !name) return fail(res, 'sender dan name wajib diisi.');
        return ok(res, await xoFetch('/v1/register', { method: 'POST', body: { sender, name } }));
      }

      case 'balance': {
        const b = bodyOf(req);
        const sender = str(b.sender || q(req.query || {}, 'sender'), 100);
        if (!sender) return fail(res, 'sender wajib diisi.');
        if (req.method === 'GET') return ok(res, await xoFetch(`/v1/balance?${new URLSearchParams({ sender }).toString()}`));
        return ok(res, await xoFetch('/v1/balance', { method: 'POST', body: { sender } }));
      }

      case 'order_balance': {
        if (!method(req, 'POST')) return fail(res, 'Gunakan POST.', 405);
        const b = bodyOf(req), sender = str(b.sender, 100), code = str(b.code, 100), quantity = int(b.quantity, 0);
        if (!sender || !code || quantity < 1) return fail(res, 'sender, code, quantity wajib diisi.');
        return ok(res, await xoFetch('/v1/order/balance', { method: 'POST', body: { sender, code, quantity } }));
      }

      case 'order_qris': {
        if (!method(req, 'POST')) return fail(res, 'Gunakan POST.', 405);
        const b = bodyOf(req), sender = str(b.sender, 100), code = str(b.code, 100), quantity = int(b.quantity, 0);
        if (!sender || !code || quantity < 1) return fail(res, 'sender, code, quantity wajib diisi.');
        return ok(res, await xoFetch('/v1/order/qris', { method: 'POST', body: { sender, code, quantity } }));
      }

      case 'order_status': {
        if (!method(req, 'GET') && !method(req, 'POST')) return fail(res, 'Gunakan GET atau POST.', 405);
        const b = bodyOf(req), transaction_id = str(b.transaction_id || q(req.query || {}, 'transaction_id'), 150);
        if (!transaction_id) return fail(res, 'transaction_id wajib diisi.');
        const payload = { transaction_id };
        if (req.method === 'GET') return ok(res, await xoFetch(`/v1/order/status?${new URLSearchParams(payload).toString()}`));
        return ok(res, await xoFetch('/v1/order/status', { method: 'POST', body: payload }));
      }

      case 'deposit': {
        if (!method(req, 'POST')) return fail(res, 'Gunakan POST.', 405);
        const b = bodyOf(req), sender = str(b.sender, 100), amount = int(b.amount, 0);
        if (!sender || amount < 1000 || amount > 1000000) return fail(res, 'sender dan amount valid wajib diisi (1.000–1.000.000).');
        return ok(res, await xoFetch('/v1/deposit', { method: 'POST', body: { sender, amount } }));
      }

      case 'reseller_balance': {
        return ok(res, await xoFetch('/v1/reseller-api/balance'));
      }

      case 'reseller_product': {
        const all = await getResellerProducts();
        return ok(res, all);
      }

      case 'reseller_order': {
        if (!method(req, 'POST')) return fail(res, 'Gunakan POST.', 405);
        const b = bodyOf(req);
        const stock_id = str(b.stock_id, 30), quantity = int(b.quantity, 0);
        const variation_id = b.variation_id == null || b.variation_id === '' ? '' : str(b.variation_id, 30);
        if (!validId(stock_id) || quantity < 1) return fail(res, 'stock_id dan quantity wajib valid.');
        const payload = { stock_id: Number(stock_id), quantity };
        if (variation_id) {
          if (!validId(variation_id)) return fail(res, 'variation_id harus berupa angka.');
          payload.variation_id = Number(variation_id);
        }
        return ok(res, await xoFetch('/v1/reseller-api/order', { method: 'POST', body: payload }));
      }

      case 'reseller_orders': {
        const page = Math.max(1, int(q(req.query || {}, 'page', 1), 1));
        const limit = Math.min(100, Math.max(1, int(q(req.query || {}, 'limit', 20), 20)));
        const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
        return ok(res, await xoFetch(`/v1/reseller-api/order?${qs.toString()}`));
      }

      case 'reseller_status': {
        const reff_id = str(q(req.query || {}, 'reff_id') || bodyOf(req).reff_id, 100);
        if (!reff_id) return fail(res, 'reff_id wajib diisi.');
        return ok(res, await xoFetch(`/v1/reseller-api/order/status?${new URLSearchParams({ reff_id }).toString()}`));
      }

      // ------------------------- Product Management API -----------------
      case 'admin_forms':
      case 'admin_products':
      case 'admin_product_detail':
      case 'admin_product_create':
      case 'admin_product_update':
      case 'admin_product_delete':
      case 'admin_variation_create':
      case 'admin_variation_get':
      case 'admin_variation_update':
      case 'admin_variation_delete':
      case 'admin_stocks_add':
      case 'admin_stocks':
      case 'admin_stock_delete': {
        const ae = requireAdmin(req, res); if (ae) return ae;
        if (action === 'admin_forms') return ok(res, await xoFetch('/v1/products/forms'));
        if (action === 'admin_products') {
          const page = Math.max(1, int(q(req.query || {}, 'page', 1), 1));
          const limit = Math.min(20, Math.max(1, int(q(req.query || {}, 'limit', 20), 20)));
          const params = new URLSearchParams({ page: String(page), limit: String(limit) });
          const search = str(q(req.query || {}, 'search'), 100); if (search) params.set('search', search);
          if (q(req.query || {}, 'is_variation') !== '') params.set('is_variation', bool(q(req.query || {}, 'is_variation')) ? 'true' : 'false');
          return ok(res, await xoFetch(`/v1/products/?${params.toString()}`));
        }
        if (action === 'admin_product_detail') {
          const id = str(q(req.query || {}, 'id'), 30); if (!validId(id)) return fail(res, 'id produk wajib berupa angka.');
          return ok(res, await xoFetch(`/v1/products/${encodeURIComponent(id)}`));
        }
        if (!method(req, 'POST') && ['admin_product_create','admin_product_update','admin_product_delete','admin_variation_create','admin_variation_update','admin_variation_delete','admin_stocks_add','admin_stock_delete'].includes(action)) return fail(res, 'Gunakan POST.', 405);
        if (action === 'admin_product_create') return ok(res, await xoFetch('/v1/products/', { method: 'POST', body: bodyOf(req) }));
        if (action === 'admin_product_update') { const id=str(q(req.query||{},'id'),30); if(!validId(id)) return fail(res,'id produk wajib berupa angka.'); return ok(res, await xoFetch(`/v1/products/${encodeURIComponent(id)}`, {method:'PUT', body:bodyOf(req)})); }
        if (action === 'admin_product_delete') { const id=str(q(req.query||{},'id'),30); if(!validId(id)) return fail(res,'id produk wajib berupa angka.'); return ok(res, await xoFetch(`/v1/products/${encodeURIComponent(id)}`, {method:'DELETE'})); }
        if (action === 'admin_variation_create') { const id=str(q(req.query||{},'id'),30); if(!validId(id)) return fail(res,'id produk induk wajib berupa angka.'); return ok(res, await xoFetch(`/v1/products/${encodeURIComponent(id)}/variations`, {method:'POST', body:bodyOf(req)})); }
        if (action === 'admin_variation_get') { const id=str(q(req.query||{},'id'),30); if(!validId(id)) return fail(res,'id variasi wajib berupa angka.'); return ok(res, await xoFetch(`/v1/products/variations/${encodeURIComponent(id)}`)); }
        if (action === 'admin_variation_update') { const id=str(q(req.query||{},'id'),30); if(!validId(id)) return fail(res,'id variasi wajib berupa angka.'); return ok(res, await xoFetch(`/v1/products/variations/${encodeURIComponent(id)}`, {method:'PUT', body:bodyOf(req)})); }
        if (action === 'admin_variation_delete') { const id=str(q(req.query||{},'id'),30); if(!validId(id)) return fail(res,'id variasi wajib berupa angka.'); return ok(res, await xoFetch(`/v1/products/variations/${encodeURIComponent(id)}`, {method:'DELETE'})); }
        if (action === 'admin_stocks_add') return ok(res, await xoFetch('/v1/products/stocks', {method:'POST', body:bodyOf(req)}));
        if (action === 'admin_stocks') { const id=str(q(req.query||{},'id'),30); if(!validId(id)) return fail(res,'id produk wajib berupa angka.'); const page=Math.max(1,int(q(req.query||{},'page',1),1)); const limit=Math.min(100,Math.max(1,int(q(req.query||{},'limit',50),50))); const params=new URLSearchParams({page:String(page),limit:String(limit)}); const variation=str(q(req.query||{},'variation_id'),30); if(variation) params.set('variation_id',variation); return ok(res, await xoFetch(`/v1/products/${encodeURIComponent(id)}/stocks?${params.toString()}`)); }
        if (action === 'admin_stock_delete') { const id=str(q(req.query||{},'id'),30); if(!validId(id)) return fail(res,'id stok wajib berupa angka.'); return ok(res, await xoFetch(`/v1/products/stocks/${encodeURIComponent(id)}`, {method:'DELETE'})); }
        return fail(res, 'Aksi admin tidak dikenali.', 404);
      }

      default:
        return fail(res, 'Aksi tidak dikenal.', 404);
    }
  } catch (e) {
    console.error('[XSOFTWARE API]', action, e?.message || e, e?.upstream || '');
    return fail(res, e?.message || 'Terjadi kesalahan saat mengakses Xoftware.', e?.status || 500);
  }
};
