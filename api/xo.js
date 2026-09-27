'use strict';

const crypto = require('crypto');

// README.md is the source of truth for this gateway.
const BASE_URL = 'https://backend-s2.xoftware.id';
const API_KEY = String(process.env.XSOFTWARE_API_KEY || '').trim();
const ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || '').trim();
const TIMEOUT_MS = Math.max(5000, Math.min(60000, Number(process.env.XSOFTWARE_TIMEOUT || 25000)));

const STORE = Object.freeze({
  name: String(process.env.STORE_NAME || 'VanzShop.com').trim(),
  tagline: String(process.env.STORE_TAGLINE || 'Produk digital pilihan, stok live, checkout otomatis.').trim(),
  support: {
    whatsapp: String(process.env.STORE_WHATSAPP || '').trim(),
    telegram: String(process.env.STORE_TELEGRAM || '').trim(),
    email: String(process.env.STORE_EMAIL || '').trim(),
  },
  appearance: {
    theme: ['dark', 'light'].includes(String(process.env.STORE_THEME || 'dark').toLowerCase()) ? String(process.env.STORE_THEME || 'dark').toLowerCase() : 'dark',
    accent: /^#[0-9a-f]{6}$/i.test(String(process.env.STORE_ACCENT || '')) ? String(process.env.STORE_ACCENT).toLowerCase() : '#f3c74f',
    radius: Math.max(8, Math.min(32, parseInt(String(process.env.STORE_RADIUS || 20), 10) || 20)),
    columns: Math.max(2, Math.min(6, parseInt(String(process.env.STORE_COLUMNS || 5), 10) || 5)),
    density: ['compact', 'comfortable'].includes(String(process.env.STORE_DENSITY || 'compact').toLowerCase()) ? String(process.env.STORE_DENSITY || 'compact').toLowerCase() : 'compact',
    hero: !['0','false','off','no'].includes(String(process.env.STORE_HERO || 'true').toLowerCase()),
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
function requireAdmin(req,res){
  if(!ADMIN_PASSWORD){ fail(res,'ADMIN_PASSWORD belum dikonfigurasi.',503); return true; }
  if(!sameSecret(getHeader(req,'x-admin-password'),ADMIN_PASSWORD)){ fail(res,'Akses admin ditolak.',401); return true; }
  return false;
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
  const candidates=[p?.thumbnail,p?.image,p?.img,p?.image_url,p?.imageUrl,p?.cover,p?.banner,p?.logo];
  const x=candidates.find(v=>typeof v==='string'&&/^https?:\/\//i.test(v.trim()));
  return x?x.trim():'';
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
    price:Number(x.price??0),
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
    price:Number(x.price??0),
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
      const products=r.data.map(normalizeOrderProduct);
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
    return ok(res,{ready:Boolean(API_KEY),admin_ready:Boolean(ADMIN_PASSWORD),base_url:BASE_URL,catalog_endpoint:ORDER.product,product_management:PRODUCTS,documented_limits:LIMITS,readme_source_of_truth:true});
  }
  if(action==='webhook'){
    if(!method(req,'POST')) return fail(res,'Method tidak diizinkan.',405);
    const b=bodyOf(req); const event=str(b.event,80), transaction_id=str(b.transaction_id,160);
    if(!event||!transaction_id) return fail(res,'Payload webhook tidak lengkap.',400);
    return ok(res,{received:true,event,transaction_id});
  }
  if(!API_KEY) return fail(res,'XSOFTWARE_API_KEY belum dikonfigurasi di Vercel.',500);

  try{
    switch(action){
      case 'init': {
        const c=await fetchCatalog();
        return ok(res,{store:{...STORE,registration:{required_for_new_users:true,endpoint:ORDER.register,sender_types:['whatsapp','telegram'],email_is_sender:false},limits:LIMITS},products:c.products,catalog:c.summary});
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
        const prepared=await ensureUser(sender,name);
        return ok(res,{...prepared,channel,sender,email});
      }
      case 'checkout_qris': {
        if(!method(req,'POST')) return fail(res,'Method tidak diizinkan.',405);
        const b=bodyOf(req), channel=str(b.channel||'whatsapp',20).toLowerCase();
        const sender=normalizeSender(b.sender,channel), name=str(b.name,120), code=str(b.code,100), quantity=int(b.quantity,0), email=str(b.email,160).toLowerCase();
        if(!['whatsapp','telegram'].includes(channel)) return fail(res,'channel harus whatsapp atau telegram.');
        if(!validSender(sender,channel)||!name) return fail(res,'User/sender belum valid.');
        if(!validOrderCode(code)||quantity<1) return fail(res,'SKU atau quantity tidak valid.');
        if(email&&!emailOk(email)) return fail(res,'Email tidak valid.');
        const prepared=await ensureUser(sender,name);
        const r=await xoFetch(ORDER.orderQris,{method:'POST',body:{sender,code,quantity}});
        const transaction=object(r?.data||r), id=str(transaction.transaction_id,160);
        if(!id) return fail(res,'Xoftware tidak mengembalikan transaction_id.',502,r);
        return ok(res,{transaction,status_token:signStatus(id),buyer_sender:sender,buyer_channel:channel,buyer_email:email,user_state:prepared.state,message:r?.message||''});
      }
      case 'deposit': {
        if(!method(req,'POST')) return fail(res,'Method tidak diizinkan.',405);
        const b=bodyOf(req), channel=str(b.channel||'whatsapp',20).toLowerCase();
        const sender=normalizeSender(b.sender,channel), name=str(b.name,120), amount=num(b.amount,0), email=str(b.email,160).toLowerCase();
        if(!Number.isInteger(amount)||amount<LIMITS.deposit_min||amount>LIMITS.deposit_max) return fail(res,'Nominal deposit harus Rp1.000 sampai Rp1.000.000.');
        if(!validSender(sender,channel)||!name) return fail(res,'User/sender belum valid.');
        if(email&&!emailOk(email)) return fail(res,'Email tidak valid.');
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
      case 'admin_ping': {
        if(requireAdmin(req,res)) return;
        return ok(res,{authenticated:true,store:STORE.name,base_url:BASE_URL});
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
        const b=bodyOf(req), sender=str(q(req,'sender')||b.sender,160);
        if(!sender) return fail(res,'sender wajib diisi.');
        if(method(req,'POST')) return ok(res,await xoFetch(ORDER.balance,{method:'POST',body:{sender}}));
        if(method(req,'GET')) return ok(res,await xoFetch(`${ORDER.balance}${queryString({sender})}`));
        return fail(res,'Method tidak diizinkan.',405);
      }
      case 'checkout_balance': {
        if(requireAdmin(req,res)) return;
        if(!method(req,'POST')) return fail(res,'Method tidak diizinkan.',405);
        const b=bodyOf(req), sender=str(b.sender,160), code=str(b.code,100), quantity=int(b.quantity,0);
        if(!sender||!validOrderCode(code)||quantity<1) return fail(res,'sender, code, quantity wajib valid.');
        await fetchUser(sender);
        return ok(res,await xoFetch(ORDER.orderBalance,{method:'POST',body:{sender,code,quantity}}));
      }
      case 'pm_forms': {
        if(requireAdmin(req,res)) return;
        return ok(res,await xoFetch(`${PRODUCTS}/forms`));
      }
      case 'pm_products': {
        if(requireAdmin(req,res)) return;
        const page=clamp(q(req,'page'),1,1000000,1), limit=clamp(q(req,'limit'),1,LIMITS.product_page,LIMITS.product_page), search=str(q(req,'search'),200), raw=q(req,'is_variation','');
        const is_variation=raw===''?'':bool(raw);
        return ok(res,await xoFetch(`${PRODUCTS}/${queryString({page,limit,search,is_variation})}`));
      }
      case 'pm_product': {
        if(requireAdmin(req,res)) return;
        const id=str(q(req,'id'),30); if(!validId(id)) return fail(res,'id produk tidak valid.');
        return ok(res,await xoFetch(`${PRODUCTS}/${Number(id)}`));
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
