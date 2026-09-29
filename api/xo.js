'use strict';

const crypto = require('crypto');
const SewaPay = require('../lib/sewapay');
const Fulfillment = require('../lib/fulfillment');
const MetadataStore = require('../lib/fulfillment-store');
const Gemini = require('../lib/gemini');

// README.md is the source of truth for this gateway.
const BASE_URL = 'https://backend-s2.xoftware.id';
const API_KEY = String(process.env.XSOFTWARE_API_KEY || '').trim();
function envSecret(v){
  let s=String(v||'').trim();
  if(s.length>=2 && ((s.startsWith('\"')&&s.endsWith('\"'))||(s.startsWith("'")&&s.endsWith("'")))) s=s.slice(1,-1).trim();
  return s;
}
const ADMIN_PASSWORD = envSecret(process.env.ADMIN_PASSWORD);
const TIMEOUT_MS = Math.max(5000, Math.min(60000, Number(process.env.XSOFTWARE_TIMEOUT || 25000)));
const CHECKOUT_IDENTITY_MODE = ['user','shared'].includes(String(process.env.XSOFTWARE_CHECKOUT_MODE || 'user').trim().toLowerCase())
  ? String(process.env.XSOFTWARE_CHECKOUT_MODE || 'user').trim().toLowerCase()
  : 'user';
const SHARED_CHANNEL = String(process.env.XSOFTWARE_SHARED_CHANNEL || 'whatsapp').trim().toLowerCase() === 'telegram' ? 'telegram' : 'whatsapp';
const SHARED_SENDER_RAW = envSecret(process.env.XSOFTWARE_SHARED_SENDER);
const SHARED_NAME = String(process.env.XSOFTWARE_SHARED_NAME || 'VanzShop Checkout').trim().slice(0,120);
const BUILD_ID = 'HARDMAX-v21-THEME-PROFILE';
const PAYMENT_TOKEN_SECRET = envSecret(process.env.PAYMENT_TOKEN_SECRET || process.env.SEWAPAY_SECRET_KEY);
const AI_RATE_LIMIT = Math.max(3,Math.min(60,Number(process.env.GEMINI_RATE_LIMIT_PER_MINUTE||12)||12));
const AI_RATE_WINDOW_MS = 60*1000;
const aiRateBuckets = new Map();

function envList(raw){ return String(raw||'').split(/[\n,]+/).map(v=>String(v).trim()).filter(Boolean); }
function envFont(v, fallback){
  const key=String(v||'').trim().toLowerCase();
  if(key==='inter') return 'Inter';
  if(key==='outfit') return 'Outfit';
  if(key==='sora') return 'Sora';
  if(key==='space-grotesk' || key==='space grotesk') return 'Space Grotesk';
  if(key==='jakarta' || key==='plus jakarta sans') return 'Plus Jakarta Sans';
  if(key==='archivo') return 'Archivo';
  return fallback;
}
const SITE_THEME_KEYS = new Set(['gold','pearl','aurora','galaxy','ocean','sunset','synth','neon','forest','ruby','matrix','mono','sakura','arctic','mint','candy','lavender','desert','paper']);
const ADMIN_THEME_KEYS = new Set(['gold','latte','ocean','emerald','nebula','sunset','neon','graphite','ruby','sakura','arctic','mint','lavender','sand']);
const SITE_THEME_RAW = String(process.env.STORE_SITE_THEME || '').trim().toLowerCase();
const ADMIN_THEME_RAW = String(process.env.STORE_ADMIN_THEME || '').trim().toLowerCase();
const STORE_ACCENT_RAW = String(process.env.STORE_ACCENT || '').trim().toLowerCase();
const LEGACY_THEME = String(process.env.STORE_THEME || 'dark').trim().toLowerCase();
const STORE_COLOR_MODE = String(process.env.STORE_COLOR_MODE || LEGACY_THEME).trim().toLowerCase();

const STORE = Object.freeze({
  name: String(process.env.STORE_NAME || 'VanzShop.com').trim(),
  tagline: String(process.env.STORE_TAGLINE || 'Produk digital pilihan, stok live, checkout otomatis.').trim(),
  support: {
    whatsapp: String(process.env.STORE_WHATSAPP || '0895415204928').trim(),
    telegram: String(process.env.STORE_TELEGRAM || '').trim(),
    email: String(process.env.STORE_EMAIL || '').trim(),
  },
  reseller: {
    whatsapp: String(process.env.STORE_RESELLER_WHATSAPP || process.env.STORE_WHATSAPP || '0895415204928').trim(),
    group_url: String(process.env.STORE_RESELLER_GROUP || 'https://chat.whatsapp.com/DQ2PsowpGt5FxhQDAS2sAz').trim(),
  },
  appearance: {
    theme: ['dark', 'light'].includes(LEGACY_THEME) ? LEGACY_THEME : 'dark',
    color_mode: ['dark', 'light'].includes(STORE_COLOR_MODE) ? STORE_COLOR_MODE : 'dark',
    site_theme: SITE_THEME_KEYS.has(SITE_THEME_RAW) ? SITE_THEME_RAW : (LEGACY_THEME === 'light' ? 'pearl' : 'gold'),
    admin_theme: ADMIN_THEME_KEYS.has(ADMIN_THEME_RAW) ? ADMIN_THEME_RAW : (LEGACY_THEME === 'light' ? 'latte' : 'gold'),
    accent: /^#[0-9a-f]{6}$/i.test(STORE_ACCENT_RAW) ? STORE_ACCENT_RAW : '#f3c74f',
    custom_accent: /^#[0-9a-f]{6}$/i.test(STORE_ACCENT_RAW),
    radius: Math.max(8, Math.min(32, parseInt(String(process.env.STORE_RADIUS || 20), 10) || 20)),
    columns: Math.max(2, Math.min(6, parseInt(String(process.env.STORE_COLUMNS || 4), 10) || 4)),
    density: ['compact', 'comfortable'].includes(String(process.env.STORE_DENSITY || 'comfortable').toLowerCase()) ? String(process.env.STORE_DENSITY || 'comfortable').toLowerCase() : 'comfortable',
    hero: !['0','false','off','no'].includes(String(process.env.STORE_HERO || 'true').toLowerCase()),
    banner_seconds: Math.max(2, Math.min(20, Number(process.env.STORE_BANNER_SECONDS || 4.2) || 4.2)),
    assistant_motion: ['subtle','playful','off'].includes(String(process.env.STORE_VANZCAT_MOTION || 'subtle').trim().toLowerCase()) ? String(process.env.STORE_VANZCAT_MOTION || 'subtle').trim().toLowerCase() : 'subtle',
  },
  branding: {
    mark: String(process.env.STORE_BRAND_MARK || 'V').trim().slice(0,2) || 'V',
    subtitle: String(process.env.STORE_BRAND_SUBTITLE || 'PRODUK DIGITAL').trim().slice(0,60) || 'PRODUK DIGITAL',
    logo_url: String(process.env.STORE_LOGO_URL || '').trim(),
    hero_title: String(process.env.STORE_HERO_TITLE || 'Pusat Premium Digital Termurah').trim(),
    hero_subtitle: String(process.env.STORE_HERO_SUBTITLE || 'Produk digital pilihan dengan stok real-time, checkout ringkas, dan pengiriman akun otomatis setelah pembayaran berhasil.').trim(),
    hero_badges: envList(process.env.STORE_HERO_BADGES || 'Harga bersaing,Stok real-time,Pembayaran aman,Proses otomatis').slice(0,8),
    hero_slides: envList(process.env.STORE_HERO_SLIDES || '/assets/banner/banner1.jpg,/assets/banner/banner2.jpg,/assets/banner/banner3.jpg,/assets/banner/banner4.jpg,/assets/banner/banner5.jpg').slice(0,10),
    assistant_welcome: String(process.env.STORE_VANZCAT_WELCOME || 'Butuh bantuan memilih produk atau mengecek pesanan? Aku siap membantu.').trim().slice(0,280),
    footer_note: String(process.env.STORE_FOOTER_NOTE || 'Produk digital hemat · stok real-time · proses otomatis').trim(),
    receipt_note: String(process.env.STORE_RECEIPT_NOTE || 'Detail akun dikirim otomatis dari stok aktif. Simpan data login dan segera ganti jika diperlukan.').trim(),
    body_font: envFont(process.env.STORE_FONT_BODY, 'Plus Jakarta Sans'),
    display_font: envFont(process.env.STORE_FONT_DISPLAY, 'Archivo'),
  },
});

const ORDER = Object.freeze({
  product: '/v1/product',
  register: '/v1/register',
  balance: '/v1/balance',
  orderBalance: '/v1/order/balance',
  orderQris: '/v1/order/qris',
  deposit: '/v1/deposit',
  orderStatus: '/v1/order/status',
});
const PRODUCTS = '/v1/products';
const LIMITS = Object.freeze({
  product_page: 20,
  stock_page: 100,
  stock_batch: 100,
  variations_per_product: 30,
  title_max: 100,
  desc_max: 5000,
  snk_max: 5000,
  sku_min: 3,
  sku_max: 50,
  deposit_min: 1000,
  deposit_max: 1000000,
  register_per_minute: 3,
});

function send(res, status, body) {
  res.status(status);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.end(JSON.stringify(body));
}
function ok(res, data, status=200){ return send(res,status,{ok:true,data}); }
function fail(res, message, status=400, details){
  const body={ok:false,error:String(message)};
  if(details!==undefined) body.details=details;
  return send(res,status,body);
}
function str(v,max=500){ return String(v??'').trim().slice(0,max); }
function int(v,def=0){ const n=parseInt(String(v??''),10); return Number.isFinite(n)?n:def; }
function num(v,def=0){ const n=Number(v); return Number.isFinite(n)?n:def; }
function bool(v,def=false){ if(typeof v==='boolean')return v; const s=String(v??'').toLowerCase(); if(['1','true'].includes(s))return true; if(['0','false'].includes(s))return false; return def; }
function method(req,name){ return String(req.method||'GET').toUpperCase()===name; }
function bodyOf(req){ return req.body && typeof req.body==='object' && !Array.isArray(req.body) ? req.body : {}; }
function q(req,key,def=''){ return req?.query?.[key] ?? def; }
function object(v){ return v && typeof v==='object' && !Array.isArray(v) ? v : {}; }
function validId(v){ return /^\d+$/.test(String(v??'').trim()); }
function validSku(v){ return /^[A-Za-z0-9-]{3,50}$/.test(String(v??'').trim()); }
function validOrderCode(v){ return /^[A-Za-z0-9_-]{1,100}$/.test(String(v??'').trim()); }
function emailOk(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v||'').trim()); }
function clamp(v,min,max,def){ const n=int(v,def); return Math.max(min,Math.min(max,n)); }
function queryString(values){ const sp=new URLSearchParams(); for(const [k,v] of Object.entries(values||{})){ if(v!==''&&v!==undefined&&v!==null)sp.set(k,String(v)); } const s=sp.toString(); return s?`?${s}`:''; }
function getHeader(req,name){ const h=req?.headers||{}; return String(h[String(name).toLowerCase()] ?? h[name] ?? ''); }
function sameSecret(a,b){ const aa=Buffer.from(String(a||'')), bb=Buffer.from(String(b||'')); return aa.length>0 && aa.length===bb.length && crypto.timingSafeEqual(aa,bb); }
function adminTokenSecret(){ return crypto.createHash('sha256').update(`admin-session:${ADMIN_PASSWORD}`).digest(); }
function issueAdminToken(){
  const payload={v:1,iat:Date.now(),exp:Date.now()+12*60*60*1000,build:BUILD_ID};
  const encoded=Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig=crypto.createHmac('sha256',adminTokenSecret()).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}
function verifyAdminToken(token){
  if(!ADMIN_PASSWORD||!token||!String(token).includes('.')) return false;
  const [encoded,sig]=String(token).split('.',2);
  if(!encoded||!sig) return false;
  const expected=crypto.createHmac('sha256',adminTokenSecret()).update(encoded).digest('base64url');
  if(!sameSecret(sig,expected)) return false;
  try{
    const payload=JSON.parse(Buffer.from(encoded,'base64url').toString('utf8'));
    return payload?.v===1 && Number(payload?.exp)>Date.now();
  }catch{return false;}
}
function bearerToken(req){
  const raw=getHeader(req,'authorization').trim();
  return /^Bearer\s+/i.test(raw)?raw.replace(/^Bearer\s+/i,'').trim():'';
}
function requireAdmin(req,res){
  if(!ADMIN_PASSWORD){ fail(res,'ADMIN_PASSWORD belum dikonfigurasi.',503); return true; }
  const token=bearerToken(req);
  const legacy=getHeader(req,'x-admin-password');
  if(!verifyAdminToken(token) && !sameSecret(legacy,ADMIN_PASSWORD)){ fail(res,'Akses admin ditolak.',401); return true; }
  return false;
}
function aiClientKey(req){
  const forwarded=getHeader(req,'x-forwarded-for').split(',')[0].trim();
  const address=forwarded||getHeader(req,'cf-connecting-ip')||getHeader(req,'x-real-ip')||'unknown';
  return crypto.createHash('sha256').update(`vanzcat:${address}`).digest('hex').slice(0,24);
}
async function enforceAiRate(req){
  const now=Date.now(),key=aiClientKey(req),current=aiRateBuckets.get(key);
  if(MetadataStore.ready()){
    try{
      const windowId=Math.floor(now/AI_RATE_WINDOW_MS),redisKey=MetadataStore.key(`ai-rate:${key}:${windowId}`),count=Number(await MetadataStore.command(['INCR',redisKey]));
      if(count===1)await MetadataStore.command(['EXPIRE',redisKey,75]);
      if(count>AI_RATE_LIMIT)throw Object.assign(new Error('Batas chat VanzCat tercapai. Coba lagi sekitar satu menit.'),{status:429,rate_limited:true});
      return;
    }catch(error){if(error?.rate_limited)throw error;}
  }
  if(aiRateBuckets.size>2000){for(const [bucket,row] of aiRateBuckets)if(now-row.started_at>AI_RATE_WINDOW_MS)aiRateBuckets.delete(bucket);}
  if(!current||now-current.started_at>AI_RATE_WINDOW_MS){aiRateBuckets.set(key,{started_at:now,count:1});return;}
  if(current.count>=AI_RATE_LIMIT)throw Object.assign(new Error('Batas chat VanzCat tercapai. Coba lagi sekitar satu menit.'),{status:429});
  current.count+=1;
}
function signStatus(id){ return crypto.createHmac('sha256',API_KEY).update(`order-status:${String(id)}`).digest('hex'); }
function verifyStatus(id,token){ return Boolean(API_KEY&&id&&token&&sameSecret(signStatus(id),token)); }

function normalizeWhatsApp(v){
  let s=String(v||'').trim().replace(/[\s().-]+/g,'');
  if(s.startsWith('+')) s=s.slice(1);
  if(s.startsWith('08')) s=`628${s.slice(2)}`;
  return s;
}
function normalizeSender(v,channel){ return channel==='telegram' ? String(v||'').trim().slice(0,160) : normalizeWhatsApp(v); }
function validSender(v,channel){ return channel==='telegram' ? String(v||'').trim().length>0 && String(v||'').trim().length<=160 : /^\d{7,20}$/.test(String(v||'')); }
function sharedIdentity(){
  const sender=normalizeSender(SHARED_SENDER_RAW,SHARED_CHANNEL);
  return {mode:CHECKOUT_IDENTITY_MODE,channel:SHARED_CHANNEL,sender,name:SHARED_NAME,configured:validSender(sender,SHARED_CHANNEL)};
}
function maskSender(v){
  const s=String(v||'');
  if(!s) return '';
  if(s.length<=6) return '*'.repeat(s.length);
  return `${s.slice(0,3)}${'*'.repeat(Math.max(3,s.length-6))}${s.slice(-3)}`;
}
function validateCatalogText(p){
  if(p.title!==undefined && String(p.title).length>LIMITS.title_max) throw Object.assign(new Error(`title maksimal ${LIMITS.title_max} karakter.`),{status:400});
  if(p.desc!==undefined && String(p.desc).length>LIMITS.desc_max) throw Object.assign(new Error(`desc maksimal ${LIMITS.desc_max} karakter.`),{status:400});
  if(p.snk!==undefined && String(p.snk).length>LIMITS.snk_max) throw Object.assign(new Error(`snk maksimal ${LIMITS.snk_max} karakter.`),{status:400});
}
function pick(o,keys){ const out={}; for(const k of keys) if(Object.prototype.hasOwnProperty.call(o||{},k) && o[k]!==undefined) out[k]=o[k]; return out; }
function validateAccounts(accounts,max=5000){
  if(!Array.isArray(accounts)||!accounts.length) throw Object.assign(new Error('accounts wajib berupa array dan tidak boleh kosong.'),{status:400});
  if(accounts.length>max) throw Object.assign(new Error(`Terlalu banyak stok dalam satu request gateway (maks ${max}).`),{status:400});
  const out=accounts.map(v=>String(v??'').trim());
  if(out.some(v=>!v)) throw Object.assign(new Error('Setiap stok wajib berupa string non-kosong.'),{status:400});
  return out;
}

async function xoFetch(path,{method='GET',body,headers={}}={}){
  if(!API_KEY) throw Object.assign(new Error('XSOFTWARE_API_KEY belum dikonfigurasi di Vercel.'),{status:500});
  const url=`${BASE_URL}${path.startsWith('/')?'':'/'}${path}`;
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),TIMEOUT_MS);
  try{
    const response=await fetch(url,{
      method,
      headers:{accept:'application/json','x-api-key':API_KEY,...(body!==undefined?{'content-type':'application/json'}:{}),...headers},
      body:body===undefined?undefined:JSON.stringify(body),
      signal:controller.signal,
      redirect:'follow',
    });
    const raw=await response.text();
    let data={};
    try{ data=raw?JSON.parse(raw):{}; }catch{
      const e=new Error(`Xoftware mengirim response non-JSON (HTTP ${response.status}).`); e.status=502; e.upstream={preview:raw.slice(0,300)}; throw e;
    }
    const apiCode=Number(data?.code);
    const apiFailed=data?.status===false || (Number.isFinite(apiCode)&&apiCode>=400);
    if(!response.ok || apiFailed){
      const e=new Error(String(data?.message||data?.error||`Request Xoftware gagal (HTTP ${response.status}).`));
      e.status=!response.ok?response.status:(Number.isFinite(apiCode)&&apiCode>=400?apiCode:400);
      e.upstream=data;
      throw e;
    }
    return data;
  }catch(e){
    if(e?.name==='AbortError') throw Object.assign(new Error('Request ke Xoftware timeout.'),{status:504});
    if(e?.status) throw e;
    throw Object.assign(new Error('Backend Xoftware tidak dapat dijangkau.'),{status:502,cause:e});
  }finally{ clearTimeout(timer); }
}

function maybeImage(p){
  const candidates=[
    p?.thumbnail,p?.image,p?.img,p?.image_url,p?.imageUrl,p?.product_image,p?.productImage,p?.photo,p?.picture,p?.cover,p?.banner,p?.logo,
    Array.isArray(p?.images)?p.images[0]:'',Array.isArray(p?.media)?p.media[0]:'',p?.media?.url,p?.media?.src,p?.asset?.url,p?.asset?.src
  ];
  for(const candidate of candidates){
    const raw=typeof candidate==='string'?candidate:(candidate?.url||candidate?.src||'');
    const value=String(raw||'').trim();
    if(!value)continue;
    if(/^https?:\/\//i.test(value))return value;
    if(/^\/(?!\/)/.test(value)){try{return new URL(value,BASE_URL).href;}catch{}}
  }
  return '';
}
function positiveCatalogNumber(x,fields){
  const values=fields.map(field=>Number(x?.[field])).filter(n=>Number.isFinite(n));
  return values.find(n=>n>0)??values[0]??0;
}
function catalogPrice(x){return positiveCatalogNumber(x,['price','final_price','selling_price','sell_price','sale_price','harga','amount']);}
function catalogProfit(x){return positiveCatalogNumber(x,['profit','margin','keuntungan']);}
function productMinimumPrice(p){
  const direct=catalogPrice(p); if(direct>0)return direct;
  const prices=(Array.isArray(p?.variations)?p.variations:[]).map(catalogPrice).filter(n=>n>0);
  return prices.length?Math.min(...prices):0;
}
function normalizeVariation(v){
  const x=object(v);
  const rawStock=x.stock ?? x.stock_count;
  return {
    ...x,
    id:x.id ?? x.variation_id ?? null,
    code:String(x.code??''),
    title:String(x.title??x.name??'Varian'),
    name:String(x.name??x.title??'Varian'),
    price:catalogPrice(x),
    profit:catalogProfit(x),
    stock:rawStock==null?null:Number(rawStock),
    stock_count:rawStock==null?null:Number(rawStock),
  };
}
function normalizeOrderProduct(p){
  const x=object(p);
  const rawStock=x.stock ?? x.stock_count;
  const variations=Array.isArray(x.variations)?x.variations.map(normalizeVariation):[];
  return {
    source:'xoftware-order',
    id:x.id??null,
    title:String(x.title??'Produk'),
    code:String(x.code??''),
    is_reseller:Boolean(x.is_reseller),
    price:catalogPrice(x),
    profit:catalogProfit(x),
    original_price:x.original_price==null?null:Number(x.original_price),
    discount:x.discount==null?null:Number(x.discount),
    point:x.point==null?null:Number(x.point),
    sold:Number(x.sold??0),
    stock:rawStock==null?null:Number(rawStock),
    description:String(x.description??x.desc??''),
    is_variation:Boolean(x.is_variation),
    variations,
    thumbnail:maybeImage(x),
    public_checkout:'qris',
  };
}
const PRODUCT_MEDIA_KEY='catalog:product-media';
function mediaFieldForProduct(p){
  const id=p?.id??p?.product_id;
  if(id!==null&&id!==undefined&&String(id)!=='')return `id:${String(id)}`;
  const code=String(p?.code||'').trim().toUpperCase();
  return code?`code:${code}`:'';
}
function parseMediaHash(raw){
  const out={};
  if(Array.isArray(raw))for(let i=0;i+1<raw.length;i+=2){try{out[String(raw[i])]=JSON.parse(String(raw[i+1]));}catch{}}
  else if(raw&&typeof raw==='object')for(const [key,value] of Object.entries(raw)){try{out[key]=typeof value==='string'?JSON.parse(value):value;}catch{}}
  return out;
}
async function productMediaMap(){
  if(!MetadataStore.ready())return {};
  try{return parseMediaHash(await MetadataStore.command(['HGETALL',MetadataStore.key(PRODUCT_MEDIA_KEY)]));}
  catch(e){console.warn('[XOFTWARE] product media store unavailable:',e?.message||e);return {};}
}
function validProductImage(value){
  const s=String(value||'').trim();
  if(!s||s.length>200000)return false;
  return /^https?:\/\/[^\s]+$/i.test(s)||/^data:image\/(?:jpeg|jpg|png|webp|avif);base64,[a-z0-9+/=]+$/i.test(s)||/^\/(?!\/)[^\s]+$/.test(s);
}
async function saveProductMedia({id,code,image_url}){
  if(!MetadataStore.ready())throw Object.assign(new Error('Penyimpanan gambar membutuhkan UPSTASH_REDIS_REST_URL dan UPSTASH_REDIS_REST_TOKEN.'),{status:503});
  const field=mediaFieldForProduct({id,code}); if(!field)throw Object.assign(new Error('ID atau SKU produk wajib ada.'),{status:400});
  if(!validProductImage(image_url))throw Object.assign(new Error('Gambar harus berupa URL HTTPS/path lokal atau file JPG/PNG/WebP teroptimasi maksimal sekitar 145 KB.'),{status:400});
  const record={image_url:String(image_url).trim(),product_id:id??null,code:str(code,LIMITS.sku_max),source:String(image_url).startsWith('data:image/')?'upload':'url',updated_at:new Date().toISOString()};
  const args=['HSET',MetadataStore.key(PRODUCT_MEDIA_KEY),field,JSON.stringify(record)];
  const codeField=String(code||'').trim()?`code:${String(code).trim().toUpperCase()}`:'';
  if(codeField&&codeField!==field)args.push(codeField,JSON.stringify(record));
  await MetadataStore.command(args); return record;
}
async function deleteProductMedia({id,code}){
  if(!MetadataStore.ready())throw Object.assign(new Error('Penyimpanan gambar belum dikonfigurasi.'),{status:503});
  const fields=[mediaFieldForProduct({id,code}),String(code||'').trim()?`code:${String(code).trim().toUpperCase()}`:''].filter(Boolean);
  if(!fields.length)throw Object.assign(new Error('ID atau SKU produk wajib ada.'),{status:400});
  await MetadataStore.command(['HDEL',MetadataStore.key(PRODUCT_MEDIA_KEY),...new Set(fields)]); return {removed:true};
}
async function applyProductMedia(products){
  const map=await productMediaMap();
  return products.map(product=>{
    const keys=[mediaFieldForProduct(product),String(product.code||'').trim()?`code:${String(product.code).trim().toUpperCase()}`:''].filter(Boolean);
    const media=keys.map(key=>map[key]).find(Boolean);
    return media?.image_url?{...product,provider_thumbnail:product.thumbnail||'',thumbnail:media.image_url,media_source:media.source||'manual',media_updated_at:media.updated_at||null}:product;
  });
}
function catalogMatch(product,catalog){
  const id=String(product?.id??product?.product_id??''),code=String(product?.code||'').trim().toUpperCase(),title=String(product?.title||'').trim().toLowerCase();
  return catalog.find(x=>(id&&String(x.id)===id)||(code&&String(x.code||'').trim().toUpperCase()===code)||(title&&String(x.title||'').trim().toLowerCase()===title));
}
function enrichManagedProduct(product,catalog){
  const forwarded=catalogMatch(product,catalog); if(!forwarded)return {...product,storefront_price:productMinimumPrice(product),display_price:productMinimumPrice(product),price_source:'product-management'};
  const storefrontPrice=productMinimumPrice(forwarded);
  return {...product,storefront_price:storefrontPrice,display_price:storefrontPrice||productMinimumPrice(product),price_source:'forwarded-catalog',thumbnail:forwarded.thumbnail||maybeImage(product),provider_thumbnail:forwarded.provider_thumbnail||'',media_source:forwarded.media_source||'api',storefront_stock:forwarded.stock,storefront_variations:forwarded.variations||[]};
}
async function enrichManagedResponse(response){
  let catalog=[]; try{catalog=(await fetchCatalog()).products;}catch{}
  if(Array.isArray(response?.data?.products))return {...response,data:{...response.data,products:response.data.products.map(x=>enrichManagedProduct(x,catalog))}};
  if(response?.data&&typeof response.data==='object')return {...response,data:enrichManagedProduct(response.data,catalog)};
  return response;
}
function catalogSummary(products,methodUsed){
  let knownStock=0, unknownStock=0, supplierCount=0, variations=0;
  for(const p of products){
    if(p.is_reseller)supplierCount++;
    variations += Array.isArray(p.variations)?p.variations.length:0;
    if(p.stock==null) unknownStock++; else knownStock += Math.max(0,Number(p.stock)||0);
  }
  return {endpoint:ORDER.product,method:methodUsed,count:products.length,known_stock_total:knownStock,unknown_stock_products:unknownStock,supplier_products:supplierCount,variation_count:variations,fetched_at:new Date().toISOString()};
}
async function fetchCatalog(){
  let firstError;
  for(const attempt of [{method:'GET'},{method:'POST',body:{}}]){
    try{
      const r=await xoFetch(ORDER.product,attempt);
      if(!Array.isArray(r?.data)){
        const e=new Error('Format katalog Xoftware tidak sesuai README: field data harus berupa array.'); e.status=502; e.upstream=r; throw e;
      }
      const products=await applyProductMedia(r.data.map(normalizeOrderProduct));
      return {products,summary:catalogSummary(products,attempt.method)};
    }catch(e){
      if(!firstError) firstError=e;
      if([401,403].includes(Number(e?.status))) throw e;
    }
  }
  throw firstError || Object.assign(new Error('Katalog Xoftware gagal dimuat.'),{status:502});
}

function errorText(e){ return `${e?.message||''} ${JSON.stringify(e?.upstream||{})}`.toLowerCase(); }
function isMissingUser(e){ const s=errorText(e); return s.includes('user not found')||s.includes('sender not found')||s.includes('not registered')||s.includes('pengguna tidak ditemukan'); }
function isRegDisabled(e){ const s=errorText(e); return s.includes('registration is disabled')||s.includes('registration disabled')||(s.includes('registrasi')&&(s.includes('disabled')||s.includes('nonaktif')||s.includes('dinonaktifkan'))); }
async function fetchUser(sender){ const r=await xoFetch(ORDER.balance,{method:'POST',body:{sender}}); return object(r?.data||r); }
function publicUser(u){ const x=object(u); return {id:x.id??null,name:str(x.name,120),sender:str(x.sender,160),saldo:Number(x.saldo??0),level:str(x.level,80),point:Number(x.point??0),buytotal:Number(x.buytotal??0)}; }
async function ensureUser(sender,name){
  try{ return {state:'existing',user:publicUser(await fetchUser(sender))}; }
  catch(e){ if(!isMissingUser(e)) throw e; }
  try{
    const r=await xoFetch(ORDER.register,{method:'POST',body:{sender,name}});
    return {state:'registered',user:publicUser(r?.data||r)};
  }catch(e){
    if(Number(e?.status)===409){
      try{return {state:'existing',user:publicUser(await fetchUser(sender))};}catch{}
    }
    if(Number(e?.status)===429){
      const x=new Error('Rate limit registrasi Xoftware tercapai (maksimal 3 registrasi per menit).'); x.status=429; x.upstream={reason:'REGISTRATION_RATE_LIMIT',provider:e.upstream}; throw x;
    }
    if(isRegDisabled(e)){
      const x=new Error('API Registration Xoftware untuk bot/API key ini dinonaktifkan oleh provider. Katalog tetap bisa dipakai, tetapi user baru tidak bisa dibuat dari website sampai izin /v1/register diaktifkan.'); x.status=409; x.upstream={reason:'REGISTRATION_DISABLED',provider:e.upstream}; throw x;
    }
    throw e;
  }
}


function paymentTokenSecret(){
  if(!PAYMENT_TOKEN_SECRET) throw Object.assign(new Error('PAYMENT_TOKEN_SECRET / SEWAPAY_SECRET_KEY belum dikonfigurasi.'),{status:500});
  return crypto.createHash('sha256').update(`vanzshop-payment:${PAYMENT_TOKEN_SECRET}`).digest();
}
function issuePaymentToken(payload){
  const data={v:1,...payload};
  const encoded=Buffer.from(JSON.stringify(data)).toString('base64url');
  const sig=crypto.createHmac('sha256',paymentTokenSecret()).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}
function verifyPaymentToken(token){
  if(!token||!String(token).includes('.')) return null;
  const [encoded,sig]=String(token).split('.',2);
  if(!encoded||!sig) return null;
  const expected=crypto.createHmac('sha256',paymentTokenSecret()).update(encoded).digest('base64url');
  if(!sameSecret(sig,expected)) return null;
  try{
    const data=JSON.parse(Buffer.from(encoded,'base64url').toString('utf8'));
    if(data?.v!==1 || Number(data?.exp||0)<Date.now()) return null;
    return data;
  }catch{return null;}
}
function effectiveProductStock(product,variation){
  if(variation) return variation.stock==null ? null : Number(variation.stock);
  if(product.stock!=null) return Number(product.stock);
  const vs=Array.isArray(product.variations)?product.variations:[];
  if(!vs.length) return null;
  return vs.reduce((n,v)=>n+Number(v?.stock??v?.stock_count??0),0);
}
async function resolveCatalogSelection({product_id,variation_id,code}){
  const c=await fetchCatalog();
  let product=null, variation=null;
  const pid=String(product_id??'').trim();
  const vid=String(variation_id??'').trim();
  const sku=String(code??'').trim();
  if(pid) product=c.products.find(p=>String(p.id)===pid) || null;
  if(!product && sku){
    product=c.products.find(p=>String(p.code)===sku || (Array.isArray(p.variations)&&p.variations.some(v=>String(v.code)===sku))) || null;
  }
  if(!product) throw Object.assign(new Error('Produk tidak ditemukan di katalog Xoftware.'),{status:404});
  const vars=Array.isArray(product.variations)?product.variations:[];
  if(vid) variation=vars.find(v=>String(v.id)===vid)||null;
  if(!variation && sku) variation=vars.find(v=>String(v.code)===sku)||null;
  if(vars.length && !variation) throw Object.assign(new Error('Produk memiliki variasi; variation_id/SKU variasi wajib dipilih.'),{status:400});
  const unitPrice=Number(variation?.price ?? product.price ?? 0);
  if(!Number.isFinite(unitPrice) || unitPrice<=0) throw Object.assign(new Error('Harga produk/variasi tidak valid.'),{status:409});
  const stock=effectiveProductStock(product,variation);
  return {product,variation,unitPrice,stock,sku:String(variation?.code||product.code||sku),catalog:c.summary};
}
function normalizeSewaStatus(status){
  const s=String(status||'').toUpperCase();
  if(s==='COMPLETED') return 'success';
  if(s==='FAILED') return 'fail';
  if(s==='CANCELLED') return 'cancelled';
  return 'pending';
}
function checkoutBuyer(value){
  const buyer=object(value),name=str(buyer.name,100),rawWhatsapp=normalizeWhatsApp(buyer.whatsapp),email=str(buyer.email,160).toLowerCase();
  return {
    name,
    whatsapp:rawWhatsapp&&/^\d{7,20}$/.test(rawWhatsapp)?rawWhatsapp:'',
    email:email&&emailOk(email)?email:'',
  };
}
function maskedBuyer(value){
  const buyer=object(value),wa=String(buyer.whatsapp||''),email=String(buyer.email||'');
  const maskedEmail=email.includes('@')?`${email.slice(0,Math.min(2,email.indexOf('@')))}***@${email.split('@').pop()}`:'';
  return {name:str(buyer.name,100),whatsapp:wa?maskSender(wa):'',email:maskedEmail};
}
async function safeOrderLookup(rawReference){
  const reference=str(rawReference,200).toUpperCase();
  if(!/^VZ-[A-Z0-9-]{8,190}$/.test(reference))throw Object.assign(new Error('Format reference pesanan tidak valid.'),{status:400});
  if(!Fulfillment.ready())throw Object.assign(new Error('Pusat pesanan belum terhubung ke penyimpanan.'),{status:503});
  const [order,receipt]=await Promise.all([Fulfillment.getOrder(reference),Fulfillment.getReceipt(reference)]);
  if(!order&&!receipt)throw Object.assign(new Error('Reference pesanan tidak ditemukan.'),{status:404});
  let payment=null,paymentStatus='unknown';
  if(order?.payment_id&&SewaPay.ready()){
    try{payment=await SewaPay.getStatus({id:order.payment_id,reference});paymentStatus=normalizeSewaStatus(payment?.status);}catch{paymentStatus='unavailable';}
  }
  return {
    reference,
    payment_id:order?.payment_id||null,
    product_title:order?.product_title||receipt?.product_title||'',
    variant_title:order?.variant_title||receipt?.variant_title||'',
    quantity:Number(order?.quantity??receipt?.quantity??0),
    amount:Number(payment?.total_payment??payment?.amount??order?.amount??0),
    method:order?.method||payment?.method||'',
    payment_status:paymentStatus,
    fulfillment_status:receipt?.status||(paymentStatus==='success'?'processing':'waiting_payment'),
    delivered_items:Array.isArray(receipt?.accounts)?receipt.accounts.length:0,
    has_delivery:Boolean(receipt?.status==='fulfilled'&&Array.isArray(receipt?.accounts)&&receipt.accounts.length),
    buyer:maskedBuyer(order?.buyer),
    created_at:order?.created_at||receipt?.created_at||null,
    fulfilled_at:receipt?.fulfilled_at||null,
    last_error:receipt?.last_error||null,
  };
}
function paymentReference(){
  return `VZ-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
}

async function addStockBatches(productId,variationId,accounts){
  const clean=validateAccounts(accounts);
  const batches=[]; let total=0;
  for(let i=0;i<clean.length;i+=LIMITS.stock_batch){
    const chunk=clean.slice(i,i+LIMITS.stock_batch);
    const body={product_id:Number(productId),accounts:chunk};
    if(variationId!==''&&variationId!=null) body.variation_id=Number(variationId);
    const r=await xoFetch(`${PRODUCTS}/stocks`,{method:'POST',body});
    const added=Number(r?.data?.total_added??chunk.length);
    total += Number.isFinite(added)?added:chunk.length;
    batches.push({size:chunk.length,response:r});
  }
  return {total_added:total,batch_sizes:batches.map(x=>x.size),batches};
}

module.exports=async function handler(req,res){
  const action=str(q(req,'a'),80);

  if(action==='health'){
    const shared=sharedIdentity();
    return ok(res,{build:BUILD_ID,ready:Boolean(API_KEY),admin_ready:Boolean(ADMIN_PASSWORD),base_url:BASE_URL,catalog_endpoint:ORDER.product,product_management:PRODUCTS,documented_limits:LIMITS,readme_source_of_truth:true,ai:{...Gemini.status(),rate_limit_per_minute:AI_RATE_LIMIT},payment:{provider:'sewapay',ready:SewaPay.ready(),base_url:SewaPay.BASE_URL},fulfillment:Fulfillment.status(),checkout:{mode:'sewapay',legacy_xoftware_mode:CHECKOUT_IDENTITY_MODE,shared_sender_configured:shared.configured,shared_channel:shared.channel}});
  }
  if(action==='webhook'){
    if(!method(req,'POST')) return fail(res,'Method tidak diizinkan.',405);
    const b=bodyOf(req); const event=str(b.event,80), transaction_id=str(b.transaction_id,160);
    if(!event||!transaction_id) return fail(res,'Payload webhook tidak lengkap.',400);
    return ok(res,{received:true,event,transaction_id});
  }
  if(action==='admin_login'){
    if(!method(req,'POST')) return fail(res,'Method tidak diizinkan.',405);
    if(!ADMIN_PASSWORD) return fail(res,'ADMIN_PASSWORD belum dikonfigurasi.',503);
    const supplied=envSecret(bodyOf(req).password);
    if(!sameSecret(supplied,ADMIN_PASSWORD)) return fail(res,'Akses admin ditolak.',401);
    return ok(res,{authenticated:true,token:issueAdminToken(),expires_in:43200,build:BUILD_ID});
  }
  if(!API_KEY) return fail(res,'XSOFTWARE_API_KEY belum dikonfigurasi di Vercel.',500);

  try{
    switch(action){
      case 'init': {
        const c=await fetchCatalog();
        const shared=sharedIdentity();
        return ok(res,{store:{...STORE,registration:{required_for_new_users:false,endpoint:ORDER.register,sender_types:['whatsapp','telegram'],email_is_sender:false,otp_endpoint_documented:false},payment:{provider:'sewapay',configured:SewaPay.ready(),base_url:SewaPay.BASE_URL},checkout:{mode:'sewapay',fulfillment:Fulfillment.ready()?'automatic-xoftware-stock':'disabled-until-redis-configured',legacy_xoftware_mode:CHECKOUT_IDENTITY_MODE,shared_sender_configured:shared.configured,shared_channel:shared.channel,shared_sender_masked:shared.configured?maskSender(shared.sender):''},limits:LIMITS},products:c.products,catalog:c.summary});
      }
      case 'catalog_refresh': {
        const c=await fetchCatalog();
        return ok(res,c);
      }
      case 'catalog_probe': {
        if(requireAdmin(req,res)) return;
        const c=await fetchCatalog();
        return ok(res,{summary:c.summary,products:c.products});
      }
      case 'customer_prepare': {
        if(!method(req,'POST')) return fail(res,'Method tidak diizinkan.',405);
        const b=bodyOf(req), channel=str(b.channel||'whatsapp',20).toLowerCase();
        if(!['whatsapp','telegram'].includes(channel)) return fail(res,'channel harus whatsapp atau telegram.');
        const sender=normalizeSender(b.sender,channel), name=str(b.name,120), email=str(b.email,160).toLowerCase();
        if(!name) return fail(res,'Nama wajib diisi.');
        if(!validSender(sender,channel)) return fail(res,channel==='telegram'?'Telegram ID tidak valid.':'Nomor WhatsApp tidak valid.');
        if(email&&!emailOk(email)) return fail(res,'Email tidak valid.');
        if(CHECKOUT_IDENTITY_MODE==='shared'){
          const shared=sharedIdentity();
          if(!shared.configured) return fail(res,'Mode shared aktif tetapi XSOFTWARE_SHARED_SENDER belum valid.',503,{reason:'SHARED_SENDER_MISSING'});
          try{ await fetchUser(shared.sender); }
          catch(e){ return fail(res,'Sender checkout bersama belum terdaftar/valid di Xoftware.',409,{reason:'SHARED_SENDER_NOT_REGISTERED',provider:e?.upstream||null}); }
          return ok(res,{state:'shared',user:{id:null,name,sender,saldo:0,level:'SHARED'},channel,sender,email,checkout_mode:'shared'});
        }
        const prepared=await ensureUser(sender,name);
        return ok(res,{...prepared,channel,sender,email,checkout_mode:'user'});
      }
      case 'payment_methods': {
        const response=await SewaPay.getMethods();
        return ok(res,{provider:'sewapay',response});
      }
      case 'payment_create': {
        if(!method(req,'POST')) return fail(res,'Method tidak diizinkan.',405);
        if(!SewaPay.ready()) return fail(res,'Sewa Pay belum dikonfigurasi di Vercel.',503);
        if(!Fulfillment.ready()) return fail(res,'Auto-fulfillment belum siap. Hubungkan Redis/Upstash dulu agar payment sukses dapat claim stok tepat satu kali.',503,Fulfillment.status());
        const b=bodyOf(req), quantity=int(b.quantity,0), paymentMethod=str(b.method||'QRIS',20).toUpperCase(),buyer=checkoutBuyer(b.buyer);
        if(!['QRIS','BINANCE'].includes(paymentMethod)) return fail(res,'Metode payment harus QRIS atau BINANCE.');
        if(quantity<1||quantity>20) return fail(res,'quantity wajib 1-20.');
        const sel=await resolveCatalogSelection({product_id:b.product_id,variation_id:b.variation_id,code:b.code});
        if(sel.stock!=null && sel.stock<quantity) return fail(res,'Stok Xoftware tidak mencukupi.',409,{stock:sel.stock,requested:quantity});
        const amount=Math.round(sel.unitPrice*quantity);
        const reference=paymentReference();
        const description=str(`${sel.product.title}${sel.variation?` - ${sel.variation.title||sel.variation.name}`:''} x${quantity}`,160);

        // v15: soft-reserve record stok SEBELUM invoice dibuat. Ini mencegah dua buyer
        // membuat payment untuk record stok yang sama di storefront ini.
        const held=await Fulfillment.reserveCheckoutStock({reference,product_id:sel.product.id,variation_id:sel.variation?.id??null,quantity});
        let payment;
        try{
          payment=await SewaPay.createPayment({amount,method:paymentMethod,reference,description});
        }catch(e){
          for(const x of held) await Fulfillment.releaseReservation(x.record_id,reference).catch(()=>{});
          throw e;
        }
        const paymentId=str(payment?.id,160);
        if(!paymentId){
          for(const x of held) await Fulfillment.releaseReservation(x.record_id,reference).catch(()=>{});
          return fail(res,'Sewa Pay tidak mengembalikan payment id.',502,payment);
        }
        const orderRecord={
          reference,payment_id:paymentId,product_id:sel.product.id,variation_id:sel.variation?.id??null,code:sel.sku,
          quantity,amount,method:paymentMethod,product_title:sel.product.title,variant_title:sel.variation?.title||sel.variation?.name||'',unit_price:sel.unitPrice,
          stock_at_checkout:sel.stock,reserved_stock_record_ids:held.map(x=>x.record_id),buyer,created_at:new Date().toISOString(),
        };
        try{ await Fulfillment.saveOrder(orderRecord); }
        catch(e){
          try{await SewaPay.cancelPayment(paymentId);}catch{}
          for(const x of held) await Fulfillment.releaseReservation(x.record_id,reference).catch(()=>{});
          throw e;
        }
        const expiresAt=Date.parse(String(payment?.expires_at||''));
        const token=issuePaymentToken({
          payment_id:paymentId,reference,product_id:sel.product.id,variation_id:sel.variation?.id??null,
          code:sel.sku,quantity,amount,method:paymentMethod,
          exp:Number.isFinite(expiresAt)?expiresAt+24*60*60*1000:Date.now()+48*60*60*1000,
        });
        return ok(res,{
          provider:'sewapay',payment,payment_token:token,
          order:{product_id:sel.product.id,variation_id:sel.variation?.id??null,code:sel.sku,product_title:sel.product.title,variant_title:sel.variation?.title||sel.variation?.name||'',quantity,unit_price:sel.unitPrice,stock_at_checkout:sel.stock},
          fulfillment:{mode:'automatic',store:'redis',status:'waiting-payment'}
        },201);
      }
      case 'payment_status': {
        const b=bodyOf(req), token=str(b.payment_token||q(req,'payment_token'),5000), paymentId=str(b.id||q(req,'id'),160), reference=str(b.reference||q(req,'reference'),160);
        let signed;
        try{ signed=verifyPaymentToken(token); }catch(e){ return fail(res,e.message,e.status||500); }
        if(!signed) return fail(res,'Payment token tidak valid/kedaluwarsa.',401);
        if(paymentId && paymentId!==String(signed.payment_id)) return fail(res,'Payment id tidak cocok dengan token.',401);
        if(reference && reference!==String(signed.reference)) return fail(res,'Reference tidak cocok dengan token.',401);
        const response=await SewaPay.getStatus({id:signed.payment_id,reference:signed.reference});
        const status=normalizeSewaStatus(response?.status);
        let fulfillment={status:'not-ready',automatic:Fulfillment.ready(),accounts:[]};
        if(['fail','cancelled'].includes(status) && Fulfillment.ready()){
          await Fulfillment.releaseOrderReservations(signed.reference).catch(()=>{});
        }
        if(status==='success'){
          if(!Fulfillment.ready()){
            fulfillment={status:'store-not-configured',automatic:false,accounts:[],error:'Redis/Upstash fulfillment store belum dikonfigurasi.'};
          }else{
            try{
              let stored=await Fulfillment.getOrder(signed.reference);
              if(!stored){
                const sel=await resolveCatalogSelection({product_id:signed.product_id,variation_id:signed.variation_id,code:signed.code});
                stored=await Fulfillment.saveOrder({reference:signed.reference,payment_id:signed.payment_id,product_id:signed.product_id,variation_id:signed.variation_id??null,code:signed.code,quantity:signed.quantity,amount:signed.amount,method:signed.method||'QRIS',product_title:sel.product.title,variant_title:sel.variation?.title||sel.variation?.name||'',unit_price:sel.unitPrice,stock_at_checkout:sel.stock,created_at:new Date().toISOString(),migrated_from_token:true});
              }
              const receipt=await Fulfillment.claimPaidOrder({reference:signed.reference,payment:response,source:'status-poll'});
              fulfillment={...Fulfillment.publicReceipt(receipt),automatic:true};
            }catch(e){
              const existing=await Fulfillment.getReceipt(signed.reference).catch(()=>null);
              fulfillment={...(Fulfillment.publicReceipt(existing)||{status:'retryable_error',accounts:[]}),automatic:true,error:String(e?.message||'Fulfillment gagal.'),code:e?.details?.code||e?.code||null};
            }
          }
        }
        return ok(res,{provider:'sewapay',payment:response,status,order:{product_id:signed.product_id,variation_id:signed.variation_id,code:signed.code,quantity:signed.quantity,amount:signed.amount},fulfillment});
      }
      case 'order_lookup': {
        return ok(res,await safeOrderLookup(q(req,'reference')||bodyOf(req).reference));
      }
      case 'vanzcat_chat': {
        if(!method(req,'POST'))return fail(res,'Method tidak diizinkan.',405);
        await enforceAiRate(req);
        const b=bodyOf(req),message=str(b.message,700),history=Array.isArray(b.history)?b.history.slice(-8):[];
        if(!message)return fail(res,'Pesan VanzCat tidak boleh kosong.',400);
        const match=message.toUpperCase().match(/VZ-[A-Z0-9-]{8,190}/);
        let orderContext=null;
        if(match){
          try{
            const order=await safeOrderLookup(match[0]);
            orderContext={
              reference:order.reference,
              product_title:order.product_title,
              variant_title:order.variant_title,
              quantity:order.quantity,
              amount:order.amount,
              method:order.method,
              payment_status:order.payment_status,
              fulfillment_status:order.fulfillment_status,
              delivered_items:order.delivered_items,
              has_delivery:order.has_delivery,
              created_at:order.created_at,
              fulfilled_at:order.fulfilled_at,
            };
          }catch(error){orderContext={reference:match[0],lookup_error:String(error?.message||'Reference tidak ditemukan.')};}
        }
        let products=[];
        try{products=(await fetchCatalog()).products;}catch{}
        const answer=await Gemini.generate({message,history,products,orderContext,storeName:STORE.name});
        return ok(res,{answer:answer.text,provider:'gemini',model:answer.model,finish_reason:answer.finish_reason||null});
      }
      case 'admin_ai_status': {
        if(requireAdmin(req,res))return;
        return ok(res,{...Gemini.status(),rate_limit_per_minute:AI_RATE_LIMIT,public_endpoint:'vanzcat_chat',key_exposed:false});
      }
      case 'admin_ai_test': {
        if(requireAdmin(req,res))return;
        if(!method(req,'POST'))return fail(res,'Method tidak diizinkan.',405);
        const message=str(bodyOf(req).message||'Perkenalkan dirimu sebagai VanzCat dalam dua kalimat.',700);
        let products=[];
        try{products=(await fetchCatalog()).products;}catch{}
        const answer=await Gemini.generate({message,history:[],products,storeName:STORE.name});
        return ok(res,{answer:answer.text,provider:'gemini',model:answer.model,usage:answer.usage||null,finish_reason:answer.finish_reason||null});
      }
      case 'payment_cancel': {
        if(!method(req,'POST')) return fail(res,'Method tidak diizinkan.',405);
        const b=bodyOf(req); let signed;
        try{ signed=verifyPaymentToken(str(b.payment_token,5000)); }catch(e){ return fail(res,e.message,e.status||500); }
        if(!signed) return fail(res,'Payment token tidak valid/kedaluwarsa.',401);
        const response=await SewaPay.cancelPayment(String(signed.payment_id));
        if(Fulfillment.ready()) await Fulfillment.releaseOrderReservations(signed.reference).catch(()=>{});
        return ok(res,{provider:'sewapay',response});
      }
      case 'payment_verify_binance': {
        if(!method(req,'POST')) return fail(res,'Method tidak diizinkan.',405);
        const b=bodyOf(req); let signed;
        try{ signed=verifyPaymentToken(str(b.payment_token,5000)); }catch(e){ return fail(res,e.message,e.status||500); }
        if(!signed) return fail(res,'Payment token tidak valid/kedaluwarsa.',401);
        const response=await SewaPay.verifyBinance(String(signed.payment_id),str(b.binance_order_id,200));
        return ok(res,{provider:'sewapay',response});
      }
      case 'fulfillment_status': {
        const b=bodyOf(req), token=str(b.payment_token||q(req,'payment_token'),5000); let signed;
        try{signed=verifyPaymentToken(token);}catch(e){return fail(res,e.message,e.status||500);}
        if(!signed)return fail(res,'Payment token tidak valid/kedaluwarsa.',401);
        if(!Fulfillment.ready())return fail(res,'Fulfillment store belum dikonfigurasi.',503,Fulfillment.status());
        return ok(res,{fulfillment:Fulfillment.publicReceipt(await Fulfillment.getReceipt(signed.reference)),reference:signed.reference});
      }
      case 'fulfillment_retry': {
        if(!method(req,'POST'))return fail(res,'Method tidak diizinkan.',405);
        const b=bodyOf(req), token=str(b.payment_token,5000); let signed;
        try{signed=verifyPaymentToken(token);}catch(e){return fail(res,e.message,e.status||500);}
        if(!signed)return fail(res,'Payment token tidak valid/kedaluwarsa.',401);
        const payment=await SewaPay.getStatus({id:signed.payment_id,reference:signed.reference});
        if(normalizeSewaStatus(payment?.status)!=='success')return fail(res,'Payment belum COMPLETED.',409,{status:payment?.status});
        let stored=await Fulfillment.getOrder(signed.reference);
        if(!stored){
          const sel=await resolveCatalogSelection({product_id:signed.product_id,variation_id:signed.variation_id,code:signed.code});
          stored=await Fulfillment.saveOrder({reference:signed.reference,payment_id:signed.payment_id,product_id:signed.product_id,variation_id:signed.variation_id??null,code:signed.code,quantity:signed.quantity,amount:signed.amount,method:signed.method||'QRIS',product_title:sel.product.title,variant_title:sel.variation?.title||sel.variation?.name||'',unit_price:sel.unitPrice,stock_at_checkout:sel.stock,created_at:new Date().toISOString(),migrated_from_token:true});
        }
        const receipt=await Fulfillment.claimPaidOrder({reference:signed.reference,payment,source:'manual-retry'});
        return ok(res,{fulfillment:Fulfillment.publicReceipt(receipt)});
      }

      case 'admin_fulfillment_list': {
        if(requireAdmin(req,res)) return;
        const limit=clamp(q(req,'limit'),1,500,100);
        const [stats,receipts,orders]=await Promise.all([Fulfillment.fulfillmentStats(500),Fulfillment.listReceipts(limit),Fulfillment.listOrders(limit)]);
        return ok(res,{stats,receipts:receipts.map(Fulfillment.publicReceipt),orders,engine:Fulfillment.status()});
      }
      case 'admin_fulfillment_get': {
        if(requireAdmin(req,res)) return;
        const reference=str(q(req,'reference')||bodyOf(req).reference,200);
        if(!reference) return fail(res,'reference wajib diisi.');
        const [order,receipt]=await Promise.all([Fulfillment.getOrder(reference),Fulfillment.getReceipt(reference)]);
        if(!order&&!receipt) return fail(res,'Order/receipt tidak ditemukan.',404);
        let payment=null;
        if(order?.payment_id&&SewaPay.ready()){try{payment=await SewaPay.getStatus({id:order.payment_id,reference});}catch{}}
        return ok(res,{order,payment,payment_status:payment?normalizeSewaStatus(payment.status):'unavailable',receipt:Fulfillment.publicReceipt(receipt)});
      }
      case 'admin_fulfillment_retry': {
        if(requireAdmin(req,res)) return;
        if(!method(req,'POST')) return fail(res,'Method tidak diizinkan.',405);
        const reference=str(bodyOf(req).reference,200);
        if(!reference) return fail(res,'reference wajib diisi.');
        const order=await Fulfillment.getOrder(reference);
        if(!order) return fail(res,'Order record tidak ditemukan.',404);
        const payment=await SewaPay.getStatus({id:order.payment_id,reference});
        const receipt=await Fulfillment.claimPaidOrder({reference,payment,source:'admin-retry'});
        return ok(res,{payment,fulfillment:Fulfillment.publicReceipt(receipt)});
      }
      case 'admin_stock_claim': {
        if(requireAdmin(req,res)) return;
        const id=str(q(req,'id')||bodyOf(req).id,40);
        return ok(res,await Fulfillment.stockClaimInfo(id));
      }
      case 'admin_sewapay_probe': {
        if(requireAdmin(req,res)) return;
        const methods=await SewaPay.getMethods();
        return ok(res,{configured:SewaPay.ready(),base_url:SewaPay.BASE_URL,methods,fulfillment:Fulfillment.status()});
      }
      case 'xo_checkout_qris': {
        if(!method(req,'POST')) return fail(res,'Method tidak diizinkan.',405);
        const b=bodyOf(req), channel=str(b.channel||'whatsapp',20).toLowerCase();
        const sender=normalizeSender(b.sender,channel), name=str(b.name,120), code=str(b.code,100), quantity=int(b.quantity,0), email=str(b.email,160).toLowerCase();
        if(!['whatsapp','telegram'].includes(channel)) return fail(res,'channel harus whatsapp atau telegram.');
        if(!validSender(sender,channel)||!name) return fail(res,'User/sender belum valid.');
        if(!validOrderCode(code)||quantity<1) return fail(res,'SKU atau quantity tidak valid.');
        if(email&&!emailOk(email)) return fail(res,'Email tidak valid.');
        let xoSender=sender, userState='existing';
        if(CHECKOUT_IDENTITY_MODE==='shared'){
          const shared=sharedIdentity();
          if(!shared.configured) return fail(res,'Mode shared aktif tetapi XSOFTWARE_SHARED_SENDER belum valid.',503,{reason:'SHARED_SENDER_MISSING'});
          try{ await fetchUser(shared.sender); }
          catch(e){ return fail(res,'Sender checkout bersama belum terdaftar/valid di Xoftware.',409,{reason:'SHARED_SENDER_NOT_REGISTERED',provider:e?.upstream||null}); }
          xoSender=shared.sender; userState='shared';
        }else{
          const prepared=await ensureUser(sender,name); userState=prepared.state;
        }
        const r=await xoFetch(ORDER.orderQris,{method:'POST',body:{sender:xoSender,code,quantity}});
        const transaction=object(r?.data||r), id=str(transaction.transaction_id,160);
        if(!id) return fail(res,'Xoftware tidak mengembalikan transaction_id.',502,r);
        return ok(res,{transaction,status_token:signStatus(id),buyer_sender:sender,buyer_channel:channel,buyer_email:email,user_state:userState,checkout_mode:CHECKOUT_IDENTITY_MODE,message:r?.message||''});
      }
      case 'deposit': {
        if(!method(req,'POST')) return fail(res,'Method tidak diizinkan.',405);
        const b=bodyOf(req), channel=str(b.channel||'whatsapp',20).toLowerCase();
        const sender=normalizeSender(b.sender,channel), name=str(b.name,120), amount=num(b.amount,0), email=str(b.email,160).toLowerCase();
        if(!Number.isInteger(amount)||amount<LIMITS.deposit_min||amount>LIMITS.deposit_max) return fail(res,'Nominal deposit harus Rp1.000 sampai Rp1.000.000.');
        if(!validSender(sender,channel)||!name) return fail(res,'User/sender belum valid.');
        if(email&&!emailOk(email)) return fail(res,'Email tidak valid.');
        if(CHECKOUT_IDENTITY_MODE==='shared') return fail(res,'Isi saldo publik dinonaktifkan pada mode shared karena deposit akan masuk ke akun sender bersama, bukan akun pembeli.',409,{reason:'SHARED_MODE_DEPOSIT_DISABLED'});
        const prepared=await ensureUser(sender,name);
        const r=await xoFetch(ORDER.deposit,{method:'POST',body:{sender,amount}});
        const transaction=object(r?.data||r), id=str(transaction.transaction_id,160);
        if(!id) return fail(res,'Xoftware tidak mengembalikan transaction_id.',502,r);
        return ok(res,{transaction,status_token:signStatus(id),buyer_sender:sender,user_state:prepared.state,message:r?.message||''});
      }
      case 'order_status': {
        const b=bodyOf(req), id=str(q(req,'transaction_id')||b.transaction_id,160), token=str(q(req,'status_token')||b.status_token,200);
        const isAdmin=ADMIN_PASSWORD&&sameSecret(getHeader(req,'x-admin-password'),ADMIN_PASSWORD);
        if(!id) return fail(res,'transaction_id wajib diisi.');
        if(!isAdmin&&!verifyStatus(id,token)) return fail(res,'Token status transaksi tidak valid.',401);
        const r=await xoFetch(ORDER.orderStatus,{method:'POST',body:{transaction_id:id}});
        return ok(res,{transaction:r?.data||r,message:r?.message||''});
      }
      case 'shared_sender_probe': {
        if(requireAdmin(req,res)) return;
        const shared=sharedIdentity();
        if(!shared.configured) return fail(res,'XSOFTWARE_SHARED_SENDER belum dikonfigurasi/valid.',400,{reason:'SHARED_SENDER_MISSING'});
        try{
          const user=await fetchUser(shared.sender);
          return ok(res,{configured:true,valid:true,channel:shared.channel,sender_masked:maskSender(shared.sender),user:publicUser(user)});
        }catch(e){
          return fail(res,'Shared sender tidak ditemukan/ditolak Xoftware.',409,{reason:'SHARED_SENDER_NOT_REGISTERED',provider:e?.upstream||null,sender_masked:maskSender(shared.sender)});
        }
      }
      case 'admin_ping': {
        if(requireAdmin(req,res)) return;
        const shared=sharedIdentity();
        return ok(res,{authenticated:true,build:BUILD_ID,store:STORE.name,base_url:BASE_URL,payment_provider:'sewapay',sewapay_ready:SewaPay.ready(),checkout_mode:'sewapay',legacy_xoftware_checkout_mode:CHECKOUT_IDENTITY_MODE,shared_sender_configured:shared.configured,shared_sender_masked:shared.configured?maskSender(shared.sender):''});
      }

      case 'diag_product': {
        if(requireAdmin(req,res)) return;
        let firstError = null;
        for(const attempt of [{method:'GET'},{method:'POST',body:{}}]){
          try{
            const response = await xoFetch(ORDER.product, attempt);
            const products = Array.isArray(response?.data) ? response.data.map(normalizeOrderProduct) : [];
            return ok(res,{
              request:{method:attempt.method,path:ORDER.product,body:attempt.body ?? null},
              response,
              normalized_summary:catalogSummary(products,attempt.method),
              normalized_preview:products.slice(0,5),
            });
          }catch(e){
            if(!firstError) firstError=e;
            if([401,403].includes(Number(e?.status))) throw e;
          }
        }
        throw firstError || Object.assign(new Error('Diagnostic /v1/product gagal.'),{status:502});
      }
      case 'diag_balance': {
        if(requireAdmin(req,res)) return;
        if(!method(req,'POST')) return fail(res,'Method tidak diizinkan.',405);
        const b=bodyOf(req), channel=str(b.channel||'whatsapp',20).toLowerCase(), sender=normalizeSender(b.sender,channel);
        if(!['whatsapp','telegram'].includes(channel)||!validSender(sender,channel)) return fail(res,'sender diagnostic tidak valid.');
        const response=await xoFetch(ORDER.balance,{method:'POST',body:{sender}});
        return ok(res,{request:{method:'POST',path:ORDER.balance,body:{sender}},response});
      }
      case 'diag_register': {
        if(requireAdmin(req,res)) return;
        if(!method(req,'POST')) return fail(res,'Method tidak diizinkan.',405);
        const b=bodyOf(req), channel=str(b.channel||'whatsapp',20).toLowerCase(), sender=normalizeSender(b.sender,channel), name=str(b.name,120);
        if(!['whatsapp','telegram'].includes(channel)||!validSender(sender,channel)||!name) return fail(res,'sender/name diagnostic tidak valid.');
        const response=await xoFetch(ORDER.register,{method:'POST',body:{sender,name}});
        return ok(res,{warning:'Endpoint ini membuat user baru dan terkena rate limit registrasi.',request:{method:'POST',path:ORDER.register,body:{sender,name}},response});
      }
      case 'diag_qris': {
        if(requireAdmin(req,res)) return;
        if(!method(req,'POST')) return fail(res,'Method tidak diizinkan.',405);
        const b=bodyOf(req), channel=str(b.channel||'whatsapp',20).toLowerCase(), sender=normalizeSender(b.sender,channel), code=str(b.code,100), quantity=int(b.quantity,0);
        if(!['whatsapp','telegram'].includes(channel)||!validSender(sender,channel)||!validOrderCode(code)||quantity<1) return fail(res,'sender, code, atau quantity diagnostic tidak valid.');
        const payload={sender,code,quantity};
        const response=await xoFetch(ORDER.orderQris,{method:'POST',body:payload});
        return ok(res,{warning:'Endpoint ini membuat invoice QRIS nyata.',request:{method:'POST',path:ORDER.orderQris,body:payload},response});
      }
      case 'diag_order_status': {
        if(requireAdmin(req,res)) return;
        if(!method(req,'POST')) return fail(res,'Method tidak diizinkan.',405);
        const b=bodyOf(req), transaction_id=str(b.transaction_id,160);
        if(!transaction_id) return fail(res,'transaction_id wajib diisi.');
        const payload={transaction_id};
        const response=await xoFetch(ORDER.orderStatus,{method:'POST',body:payload});
        return ok(res,{request:{method:'POST',path:ORDER.orderStatus,body:payload},response});
      }
      case 'owner_register': {
        if(requireAdmin(req,res)) return;
        if(!method(req,'POST')) return fail(res,'Method tidak diizinkan.',405);
        const b=bodyOf(req), channel=str(b.channel||'whatsapp',20).toLowerCase(), sender=normalizeSender(b.sender,channel), name=str(b.name||STORE.name,120);
        if(!['whatsapp','telegram'].includes(channel)||!validSender(sender,channel)||!name) return fail(res,'sender/name tidak valid.');
        return ok(res,await xoFetch(ORDER.register,{method:'POST',body:{sender,name}}));
      }
      case 'owner_balance': {
        if(requireAdmin(req,res)) return;
        const b=bodyOf(req), channel=str(b.channel||q(req,'channel')||'',20).toLowerCase(), raw=q(req,'sender')||b.sender;
        const sender=channel?normalizeSender(raw,channel):str(raw,160);
        if(!sender) return fail(res,'sender wajib diisi.');
        if(method(req,'POST')) return ok(res,await xoFetch(ORDER.balance,{method:'POST',body:{sender}}));
        if(method(req,'GET')) return ok(res,await xoFetch(`${ORDER.balance}${queryString({sender})}`));
        return fail(res,'Method tidak diizinkan.',405);
      }
      case 'checkout_balance': {
        if(requireAdmin(req,res)) return;
        if(!method(req,'POST')) return fail(res,'Method tidak diizinkan.',405);
        const b=bodyOf(req), channel=str(b.channel||'',20).toLowerCase(), sender=channel?normalizeSender(b.sender,channel):str(b.sender,160), code=str(b.code,100), quantity=int(b.quantity,0);
        if(!sender||!validOrderCode(code)||quantity<1) return fail(res,'sender, code, quantity wajib valid.');
        await fetchUser(sender);
        return ok(res,await xoFetch(ORDER.orderBalance,{method:'POST',body:{sender,code,quantity}}));
      }
      case 'admin_order_qris': {
        if(requireAdmin(req,res)) return;
        if(!method(req,'POST')) return fail(res,'Method tidak diizinkan.',405);
        const b=bodyOf(req), channel=str(b.channel||'whatsapp',20).toLowerCase(), sender=normalizeSender(b.sender,channel), code=str(b.code,100), quantity=int(b.quantity,0);
        if(!['whatsapp','telegram'].includes(channel)||!validSender(sender,channel)||!validOrderCode(code)||quantity<1) return fail(res,'sender, code, quantity wajib valid.');
        await fetchUser(sender);
        return ok(res,await xoFetch(ORDER.orderQris,{method:'POST',body:{sender,code,quantity}}));
      }
      case 'admin_deposit': {
        if(requireAdmin(req,res)) return;
        if(!method(req,'POST')) return fail(res,'Method tidak diizinkan.',405);
        const b=bodyOf(req), channel=str(b.channel||'whatsapp',20).toLowerCase(), sender=normalizeSender(b.sender,channel), amount=num(b.amount,0);
        if(!['whatsapp','telegram'].includes(channel)||!validSender(sender,channel)) return fail(res,'sender tidak valid.');
        if(!Number.isInteger(amount)||amount<LIMITS.deposit_min||amount>LIMITS.deposit_max) return fail(res,'Nominal deposit harus Rp1.000 sampai Rp1.000.000.');
        await fetchUser(sender);
        return ok(res,await xoFetch(ORDER.deposit,{method:'POST',body:{sender,amount}}));
      }
      case 'admin_order_status': {
        if(requireAdmin(req,res)) return;
        if(!method(req,'POST')&&!method(req,'GET')) return fail(res,'Method tidak diizinkan.',405);
        const b=bodyOf(req), id=str(q(req,'transaction_id')||b.transaction_id,160);
        if(!id) return fail(res,'transaction_id wajib diisi.');
        if(method(req,'GET')) return ok(res,await xoFetch(`${ORDER.orderStatus}${queryString({transaction_id:id})}`));
        return ok(res,await xoFetch(ORDER.orderStatus,{method:'POST',body:{transaction_id:id}}));
      }
      case 'pm_forms': {
        if(requireAdmin(req,res)) return;
        return ok(res,await xoFetch(`${PRODUCTS}/forms`));
      }
      case 'pm_products': {
        if(requireAdmin(req,res)) return;
        const page=clamp(q(req,'page'),1,1000000,1), limit=clamp(q(req,'limit'),1,LIMITS.product_page,LIMITS.product_page), search=str(q(req,'search'),200), raw=q(req,'is_variation','');
        const is_variation=raw===''?'':bool(raw);
        return ok(res,await enrichManagedResponse(await xoFetch(`${PRODUCTS}/${queryString({page,limit,search,is_variation})}`)));
      }
      case 'pm_product': {
        if(requireAdmin(req,res)) return;
        const id=str(q(req,'id'),30); if(!validId(id)) return fail(res,'id produk tidak valid.');
        return ok(res,await enrichManagedResponse(await xoFetch(`${PRODUCTS}/${Number(id)}`)));
      }
      case 'pm_product_create': {
        if(requireAdmin(req,res)) return;
        if(!method(req,'POST')) return fail(res,'Method tidak diizinkan.',405);
        const b=bodyOf(req), payload=pick(b,['code','title','price','profit','desc','snk','form','is_variation','wholesale_tiers']);
        validateCatalogText(payload); payload.title=str(payload.title,LIMITS.title_max); payload.is_variation=bool(payload.is_variation,false);
        if(!payload.title) return fail(res,'title wajib diisi.');
        if(!payload.is_variation){ payload.code=str(payload.code,LIMITS.sku_max); if(!validSku(payload.code))return fail(res,'code wajib 3-50 karakter huruf/angka/dash.'); if(!Number.isFinite(Number(payload.price))||Number(payload.price)<0)return fail(res,'price tidak valid.'); payload.price=Number(payload.price); }
        else{ delete payload.code; delete payload.price; }
        const stocks=Array.isArray(b.stocks)?validateAccounts(b.stocks):[]; if(stocks.length) payload.stocks=stocks.slice(0,LIMITS.stock_batch);
        const created=await xoFetch(`${PRODUCTS}/`,{method:'POST',body:payload});
        let stock_result=null; const productId=created?.data?.product_id;
        if(stocks.length>LIMITS.stock_batch){ if(!validId(productId))return fail(res,'Produk dibuat tetapi product_id tidak tersedia untuk batching stok.',502,created); stock_result=await addStockBatches(productId,'',stocks.slice(LIMITS.stock_batch)); }
        return ok(res,{created,stock_result},201);
      }
      case 'pm_product_update': {
        if(requireAdmin(req,res)) return;
        if(!method(req,'POST')&&!method(req,'PUT')) return fail(res,'Method tidak diizinkan.',405);
        const b=bodyOf(req), id=str(q(req,'id')||b.id,30); if(!validId(id))return fail(res,'id produk tidak valid.');
        const payload=pick(b,['code','title','price','profit','desc','snk','form','is_variation','is_show','wholesale_tiers']); validateCatalogText(payload);
        if(payload.code!==undefined&&!validSku(payload.code))return fail(res,'code tidak valid.'); if(!Object.keys(payload).length)return fail(res,'Tidak ada field yang diperbarui.');
        return ok(res,await xoFetch(`${PRODUCTS}/${Number(id)}`,{method:'PUT',body:payload}));
      }
      case 'pm_product_delete': {
        if(requireAdmin(req,res)) return;
        const b=bodyOf(req), id=str(q(req,'id')||b.id,30); if(!validId(id))return fail(res,'id produk tidak valid.');
        return ok(res,await xoFetch(`${PRODUCTS}/${Number(id)}`,{method:'DELETE'}));
      }
      case 'pm_product_media_set': {
        if(requireAdmin(req,res)) return;
        if(!method(req,'POST')&&!method(req,'PUT')) return fail(res,'Method tidak diizinkan.',405);
        const b=bodyOf(req),id=str(b.id,30),code=str(b.code,LIMITS.sku_max),image_url=String(b.image_url||'').trim();
        if(id&&!validId(id))return fail(res,'id produk tidak valid.');
        return ok(res,await saveProductMedia({id,code,image_url}));
      }
      case 'pm_product_media_delete': {
        if(requireAdmin(req,res)) return;
        const b=bodyOf(req),id=str(q(req,'id')||b.id,30),code=str(q(req,'code')||b.code,LIMITS.sku_max);
        if(id&&!validId(id))return fail(res,'id produk tidak valid.');
        return ok(res,await deleteProductMedia({id,code}));
      }
      case 'pm_variation': {
        if(requireAdmin(req,res)) return;
        const id=str(q(req,'id'),30); if(!validId(id))return fail(res,'id variasi tidak valid.');
        return ok(res,await xoFetch(`${PRODUCTS}/variations/${Number(id)}`));
      }
      case 'pm_variation_create': {
        if(requireAdmin(req,res)) return;
        if(!method(req,'POST'))return fail(res,'Method tidak diizinkan.',405);
        const b=bodyOf(req), productId=str(q(req,'product_id')||b.product_id,30); if(!validId(productId))return fail(res,'product_id tidak valid.');
        const payload=pick(b,['code','title','price','profit','desc','snk','form']); validateCatalogText(payload); payload.code=str(payload.code,LIMITS.sku_max); payload.title=str(payload.title,LIMITS.title_max);
        if(!validSku(payload.code)||!payload.title||!Number.isFinite(Number(payload.price)))return fail(res,'code, title, price variasi wajib valid.'); payload.price=Number(payload.price);
        const stocks=Array.isArray(b.stocks)?validateAccounts(b.stocks):[]; if(stocks.length)payload.stocks=stocks.slice(0,LIMITS.stock_batch);
        const created=await xoFetch(`${PRODUCTS}/${Number(productId)}/variations`,{method:'POST',body:payload}); let stock_result=null; const variationId=created?.data?.variation_id;
        if(stocks.length>LIMITS.stock_batch){ if(!validId(variationId))return fail(res,'Variasi dibuat tetapi variation_id tidak tersedia untuk batching.',502,created); stock_result=await addStockBatches(productId,variationId,stocks.slice(LIMITS.stock_batch)); }
        return ok(res,{created,stock_result},201);
      }
      case 'pm_variation_update': {
        if(requireAdmin(req,res)) return;
        const b=bodyOf(req), id=str(q(req,'id')||b.id,30); if(!validId(id))return fail(res,'id variasi tidak valid.');
        const payload=pick(b,['code','title','price','profit','desc','snk','form']); validateCatalogText(payload); if(payload.code!==undefined&&!validSku(payload.code))return fail(res,'code variasi tidak valid.'); if(!Object.keys(payload).length)return fail(res,'Tidak ada field yang diperbarui.');
        return ok(res,await xoFetch(`${PRODUCTS}/variations/${Number(id)}`,{method:'PUT',body:payload}));
      }
      case 'pm_variation_delete': {
        if(requireAdmin(req,res)) return;
        const b=bodyOf(req), id=str(q(req,'id')||b.id,30); if(!validId(id))return fail(res,'id variasi tidak valid.');
        return ok(res,await xoFetch(`${PRODUCTS}/variations/${Number(id)}`,{method:'DELETE'}));
      }
      case 'pm_stock_add': {
        if(requireAdmin(req,res)) return;
        if(!method(req,'POST'))return fail(res,'Method tidak diizinkan.',405);
        const b=bodyOf(req), productId=str(b.product_id,30), variationId=b.variation_id==null||b.variation_id===''?'':str(b.variation_id,30);
        if(!validId(productId)||(variationId&&!validId(variationId)))return fail(res,'product_id/variation_id tidak valid.');
        return ok(res,await addStockBatches(productId,variationId,b.accounts),201);
      }
      case 'pm_stocks': {
        if(requireAdmin(req,res)) return;
        const productId=str(q(req,'product_id'),30), variationId=str(q(req,'variation_id'),30), page=clamp(q(req,'page'),1,1000000,1), limit=clamp(q(req,'limit'),1,LIMITS.stock_page,50);
        if(!validId(productId)||(variationId&&!validId(variationId)))return fail(res,'product_id/variation_id tidak valid.');
        return ok(res,await xoFetch(`${PRODUCTS}/${Number(productId)}/stocks${queryString({variation_id:variationId,page,limit})}`));
      }
      case 'pm_stock_delete': {
        if(requireAdmin(req,res)) return;
        const b=bodyOf(req), id=str(q(req,'id')||b.id,30); if(!validId(id))return fail(res,'id stok tidak valid.');
        return ok(res,await xoFetch(`${PRODUCTS}/stocks/${Number(id)}`,{method:'DELETE'}));
      }
      default: return fail(res,'Aksi tidak tersedia.',404);
    }
  }catch(e){
    console.error('[XOFTWARE]',action,e?.message||e);
    return fail(res,e?.message||'Request gagal.',e?.status||500,e?.upstream);
  }
};
