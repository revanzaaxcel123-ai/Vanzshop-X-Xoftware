'use strict';

const crypto = require('crypto');

const BASE_URL = 'https://sewapay.id';

function cleanSecret(v){
  let s = String(v || '').trim();
  if(s.length >= 2 && ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'")))) s = s.slice(1,-1).trim();
  return s;
}

const API_KEY = cleanSecret(process.env.SEWAPAY_API_KEY);
const SECRET_KEY = cleanSecret(process.env.SEWAPAY_SECRET_KEY);
const TIMEOUT_MS = Math.max(5000, Math.min(60000, Number(process.env.SEWAPAY_TIMEOUT || 25000)));

function ready(){ return Boolean(API_KEY && SECRET_KEY); }
function sign(timestamp, bodyString=''){
  if(!SECRET_KEY) throw Object.assign(new Error('SEWAPAY_SECRET_KEY belum dikonfigurasi.'), { status: 500 });
  return crypto.createHmac('sha256', SECRET_KEY).update(`${timestamp}.${bodyString}`).digest('hex');
}

async function request(path, { method='GET', body, includeGetSignature=false } = {}){
  if(!API_KEY || !SECRET_KEY) throw Object.assign(new Error('SEWAPAY_API_KEY / SEWAPAY_SECRET_KEY belum dikonfigurasi di Vercel.'), { status: 500 });
  const timestamp = Math.floor(Date.now()/1000);
  const bodyString = body === undefined ? '' : JSON.stringify(body);
  const headers = {
    accept: 'application/json',
    'X-PG-API-Key': API_KEY,
    'X-PG-Timestamp': String(timestamp),
  };
  if(body !== undefined){
    headers['content-type'] = 'application/json';
    headers['X-PG-Signature'] = sign(timestamp, bodyString);
  } else if(includeGetSignature){
    headers['X-PG-Signature'] = sign(timestamp, '');
  }

  const controller = new AbortController();
  const timer = setTimeout(()=>controller.abort(), TIMEOUT_MS);
  try{
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : bodyString,
      signal: controller.signal,
      redirect: 'follow',
    });
    const raw = await res.text();
    let data = {};
    try{ data = raw ? JSON.parse(raw) : {}; }
    catch{
      const e = new Error(`Sewa Pay mengirim response non-JSON (HTTP ${res.status}).`);
      e.status = 502; e.upstream = { preview: raw.slice(0,400) }; throw e;
    }
    if(!res.ok){
      const e = new Error(String(data?.message || data?.error || `Sewa Pay request gagal (${res.status}).`));
      e.status = res.status; e.upstream = data; throw e;
    }
    return data;
  }catch(e){
    if(e?.name === 'AbortError') throw Object.assign(new Error('Request ke Sewa Pay timeout.'), { status: 504 });
    if(e?.status) throw e;
    throw Object.assign(new Error('Sewa Pay sedang tidak dapat dijangkau.'), { status: 502 });
  }finally{ clearTimeout(timer); }
}

async function createPayment({ amount, method='QRIS', reference, description }){
  const body = { amount, method, reference };
  if(description) body.description = description;
  return request('/api/v1/payments/create', { method:'POST', body });
}

async function getStatus({ id, reference }){
  const sp = new URLSearchParams();
  if(id) sp.set('id', id);
  else if(reference) sp.set('reference', reference);
  else throw Object.assign(new Error('id atau reference wajib diisi.'), { status: 400 });
  // Endpoint-specific docs say status GET does not require signature.
  return request(`/api/v1/payments/status?${sp.toString()}`, { method:'GET' });
}

async function cancelPayment(id){
  if(!id) throw Object.assign(new Error('id payment wajib diisi.'), { status: 400 });
  return request('/api/v1/payments/cancel', { method:'POST', body:{ id } });
}

async function verifyBinance(id, binance_order_id){
  if(!id || !binance_order_id) throw Object.assign(new Error('id dan binance_order_id wajib diisi.'), { status: 400 });
  return request('/api/v1/payments/verify-binance', { method:'POST', body:{ id, binance_order_id } });
}

async function getMethods(){
  // General authentication docs specify signing GET with an empty body.
  return request('/api/v1/payments/methods', { method:'GET', includeGetSignature:true });
}

function verifyWebhook(rawBody, timestamp, signature, { maxSkewSeconds=900 } = {}){
  if(!SECRET_KEY) return { ok:false, reason:'SECRET_NOT_CONFIGURED' };
  const ts = Number(timestamp);
  if(!Number.isFinite(ts)) return { ok:false, reason:'INVALID_TIMESTAMP' };
  if(maxSkewSeconds > 0 && Math.abs(Math.floor(Date.now()/1000) - ts) > maxSkewSeconds) return { ok:false, reason:'TIMESTAMP_OUT_OF_RANGE' };
  const expected = sign(ts, rawBody);
  const aa = Buffer.from(String(signature||''));
  const bb = Buffer.from(expected);
  const ok = aa.length === bb.length && aa.length > 0 && crypto.timingSafeEqual(aa,bb);
  return { ok, reason: ok ? '' : 'INVALID_SIGNATURE' };
}

module.exports = {
  BASE_URL,
  ready,
  sign,
  createPayment,
  getStatus,
  cancelPayment,
  verifyBinance,
  getMethods,
  verifyWebhook,
};
