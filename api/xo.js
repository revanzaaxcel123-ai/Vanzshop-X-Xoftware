'use strict';

const BASE_URL = String(process.env.XSOFTWARE_BASE_URL || 'https://backend-s2.xoftware.id').replace(/\/+$/, '');
const API_KEY = String(process.env.XSOFTWARE_API_KEY || '');
const TIMEOUT_MS = Math.max(5000, Number(process.env.XSOFTWARE_TIMEOUT || 25000));
const STORE_NAME = process.env.STORE_NAME || 'VanzShop.com';
const STORE_TAGLINE = process.env.STORE_TAGLINE || 'Produk digital pilihan, stok live, checkout otomatis.';
const CATALOG_SOURCE = String(process.env.CATALOG_SOURCE || 'merged').toLowerCase();
const DEFAULT_SENDER = String(process.env.XSOFTWARE_DEFAULT_SENDER || '').trim();
const DEFAULT_NAME = String(process.env.XSOFTWARE_DEFAULT_NAME || STORE_NAME).trim();

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
function str(v, max = 500) { return String(v ?? '').trim().slice(0, max); }
function int(v, def = 0) { const n = Number.parseInt(String(v ?? ''), 10); return Number.isFinite(n) ? n : def; }
function validId(v) { return /^\d+$/.test(str(v, 30)); }
function isEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '').trim()); }
function bodyOf(req) { return req.body && typeof req.body === 'object' ? req.body : {}; }
function q(params, key, def = '') { return params?.[key] ?? def; }
function method(req, name) { return req.method === name; }
function requireApiKey(res) {
  if (!API_KEY) return fail(res, 'Checkout sedang dikonfigurasi. Coba lagi nanti.', 500);
  return null;
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
      const e = new Error('Layanan mengirim respons yang tidak valid.'); e.status = 502; throw e;
    }
    if (!response.ok) {
      const e = new Error(str(data?.message || data?.error || `Request gagal (${response.status}).`, 500));
      e.status = response.status; e.upstream = data; throw e;
    }
    return data;
  } catch (e) {
    if (e?.name === 'AbortError') { const x = new Error('Request terlalu lama. Silakan coba lagi.'); x.status = 504; throw x; }
    if (e?.status) throw e;
    const x = new Error('Layanan sedang tidak dapat dijangkau. Silakan coba lagi.'); x.status = 502; throw x;
  } finally { clearTimeout(timer); }
}
function imageFrom(p) {
  const candidates = [
    p?.thumbnail, p?.image, p?.img, p?.product_image, p?.image_url, p?.imageUrl, p?.photo,
    p?.cover, p?.banner, p?.picture, p?.logo,
    Array.isArray(p?.images) ? p.images[0] : '',
    Array.isArray(p?.media) ? (p.media[0]?.url || p.media[0]?.src || p.media[0]) : '',
    p?.media?.url, p?.media?.src
  ];
  const found = candidates.find(v => typeof v === 'string' && /^https?:\/\//i.test(v.trim()));
  return found ? found.trim() : '';
}
function normalizeOwner(p) {
  return {
    source: 'owner', id: p?.id ?? null, code: p?.code ?? '', title: p?.title ?? p?.name ?? 'Produk',
    thumbnail: imageFrom(p), price: Number(p?.price ?? 0), original_price: p?.original_price ?? null,
    discount: p?.discount ?? null, point: p?.point ?? null, sold: Number(p?.sold ?? 0),
    stock: p?.stock == null ? null : Number(p.stock), description: p?.description ?? p?.desc ?? '',
    is_variation: Boolean(p?.is_variation), variations: Array.isArray(p?.variations) ? p.variations : [],
    tags: Array.isArray(p?.tags) ? p.tags : [],
  };
}
function normalizeReseller(p) {
  return {
    source: 'reseller', id: p?.id ?? null, code: p?.code ?? '', title: p?.title ?? p?.name ?? 'Produk',
    thumbnail: imageFrom(p), price: Number(p?.price ?? 0), stock: p?.stock == null ? null : Number(p.stock),
    description: p?.desc ?? p?.description ?? '', is_variation: Boolean(p?.is_variation),
    variations: Array.isArray(p?.variations) ? p.variations : [], tags: Array.isArray(p?.tags) ? p.tags : [],
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
  if (action === 'health') return ok(res, { store: STORE_NAME, ready: Boolean(API_KEY), mode: CATALOG_SOURCE });
  const authErr = requireApiKey(res); if (authErr) return authErr;

  try {
    switch (action) {
      case 'init': {
        const warnings = [];
        let owner_products = [], reseller_products = [];
        if (CATALOG_SOURCE === 'owner' || CATALOG_SOURCE === 'merged') {
          try { owner_products = await getOwnerProducts(); } catch (e) { warnings.push('catalog-owner'); }
        }
        if (CATALOG_SOURCE === 'reseller' || CATALOG_SOURCE === 'merged') {
          try { reseller_products = await getResellerProducts(); } catch (e) { warnings.push('catalog-partner'); }
        }
        return ok(res, { store: { name: STORE_NAME, tagline: STORE_TAGLINE }, owner_products, reseller_products, warnings });
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
        if (!method(req, 'POST')) return fail(res, 'Request tidak valid.', 405);
        if (!DEFAULT_SENDER) return fail(res, 'Checkout belum aktif. Hubungi admin toko.', 503);
        const b = bodyOf(req), code = str(b.code, 100), quantity = int(b.quantity, 0), email = str(b.email, 160);
        if (!code || quantity < 1 || quantity > 20 || !isEmail(email)) return fail(res, 'Data pembelian belum lengkap.');
        const data = await xoFetch('/v1/order/qris', { method: 'POST', body: { sender: DEFAULT_SENDER, code, quantity } });
        return ok(res, { ...data, buyer_email: email });
      }

      case 'checkout_balance': {
        if (!method(req, 'POST')) return fail(res, 'Request tidak valid.', 405);
        if (!DEFAULT_SENDER) return fail(res, 'Checkout belum aktif. Hubungi admin toko.', 503);
        const b = bodyOf(req), code = str(b.code, 100), quantity = int(b.quantity, 0), email = str(b.email, 160);
        if (!code || quantity < 1 || quantity > 20 || !isEmail(email)) return fail(res, 'Data pembelian belum lengkap.');
        const data = await xoFetch('/v1/order/balance', { method: 'POST', body: { sender: DEFAULT_SENDER, code, quantity } });
        return ok(res, { ...data, buyer_email: email });
      }

      case 'deposit': {
        if (!method(req, 'POST')) return fail(res, 'Request tidak valid.', 405);
        if (!DEFAULT_SENDER) return fail(res, 'Fitur isi saldo belum aktif. Hubungi admin toko.', 503);
        const b = bodyOf(req);
        const amount = Number(b.amount || 0);
        const email = str(b.email, 160);
        if (!Number.isFinite(amount) || amount < 1000 || amount > 1000000) {
          return fail(res, 'Nominal isi saldo harus Rp1.000 sampai Rp1.000.000.');
        }
        if (email && !isEmail(email)) return fail(res, 'Email tidak valid.');
        const data = await xoFetch('/v1/deposit', { method: 'POST', body: { sender: DEFAULT_SENDER, amount: Math.round(amount) } });
        return ok(res, { ...data, buyer_email: email });
      }

      case 'order_status': {
        const tid = str(q(req.query || {}, 'transaction_id') || bodyOf(req).transaction_id, 150);
        if (!tid) return fail(res, 'Transaksi tidak ditemukan.');
        return ok(res, await xoFetch(`/v1/order/status?${new URLSearchParams({ transaction_id: tid }).toString()}`));
      }

      case 'reseller_balance': return ok(res, await xoFetch('/v1/reseller-api/balance'));

      case 'reseller_order': {
        if (!method(req, 'POST')) return fail(res, 'Request tidak valid.', 405);
        const b = bodyOf(req), stock_id = str(b.stock_id, 30), quantity = int(b.quantity, 0), variation_id = b.variation_id == null || b.variation_id === '' ? '' : str(b.variation_id, 30), email = str(b.email, 160);
        if (!validId(stock_id) || quantity < 1 || quantity > 20 || !isEmail(email)) return fail(res, 'Data pembelian belum lengkap.');
        const body = { stock_id: Number(stock_id), quantity }; if (variation_id) { if (!validId(variation_id)) return fail(res, 'Varian tidak valid.'); body.variation_id = Number(variation_id); }
        const data = await xoFetch('/v1/reseller-api/order', { method: 'POST', body });
        return ok(res, { ...data, buyer_email: email });
      }

      case 'reseller_status': {
        const reff_id = str(q(req.query || {}, 'reff_id') || bodyOf(req).reff_id, 100);
        if (!reff_id) return fail(res, 'Transaksi tidak ditemukan.');
        return ok(res, await xoFetch(`/v1/reseller-api/order/status?${new URLSearchParams({ reff_id }).toString()}`));
      }

      default: return fail(res, 'Aksi tidak tersedia.', 404);
    }
  } catch (e) {
    console.error('[STORE API]', action, e?.message || e);
    return fail(res, e?.message || 'Transaksi gagal diproses.', e?.status || 500);
  }
};
