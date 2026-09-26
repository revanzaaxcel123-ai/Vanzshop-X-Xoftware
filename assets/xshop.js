(() => {
'use strict';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const app = $('#app');
const money = n => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n)||0);
const esc = v => String(v ?? '').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const emailOk = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v||'').trim());
const phoneNormalize = v => {
  let s = String(v||'').trim().replace(/[\s().-]+/g,'');
  if(s.startsWith('+')) s = s.slice(1);
  if(s.startsWith('08')) s = `628${s.slice(2)}`;
  return s;
};
const phoneOk = v => /^\d{7,20}$/.test(phoneNormalize(v));
const telegramOk = v => String(v||'').trim().length > 0 && String(v||'').trim().length <= 160;

const DEFAULT_STORE = {
  name:'VanzShop.com',
  tagline:'Produk digital pilihan, stok live, checkout otomatis.',
  support:{whatsapp:'',telegram:'',email:''},
  appearance:{theme:'dark',accent:'#f3c74f',radius:20,columns:5,density:'compact',hero:true},
  registration:{required_before_order:true,api_permission_required_for_new_users:true,supported_sender_types:['whatsapp','telegram_id'],email_is_sender:false,max_per_minute:3},
  limits:{registration_per_minute:3,deposit_min:1000,deposit_max:1000000,stock_accounts_per_request:100,variations_per_product:30,products_per_page:20,title_max:100,description_max:5000,terms_max:5000,sku_min:3,sku_max:50}
};
const state = {
  owner:[], reseller:[], source:'all', q:'', sort:'store',
  product:null, variantId:null, qty:1, busy:false, catalogLoaded:false,
  store: typeof structuredClone === 'function' ? structuredClone(DEFAULT_STORE) : JSON.parse(JSON.stringify(DEFAULT_STORE))
};
let timer = null;

const CATEGORY_KEYS = [
  ['chatgpt','AI'],['openai','AI'],['claude','AI'],['gemini','AI'],['perplexity','AI'],['ai ','AI'],
  ['netflix','Streaming'],['youtube','Streaming'],['prime video','Streaming'],['vidio','Streaming'],['viu','Streaming'],['hbo','Streaming'],
  ['spotify','Musik'],['apple music','Musik'],['canva','Design'],['photoshop','Design'],['figma','Design'],
  ['capcut','Editing'],['alight','Editing'],['vpn','VPN'],['discord','Community'],['zoom','Productivity'],['microsoft','Productivity'],['office','Productivity'],['paypal','Payment']
];
const BRAND_FILES = [
  ['chatgpt','chatgpt.svg'],['openai','chatgpt.svg'],['netflix','netflix.svg'],['canva','canva.svg'],['spotify','spotify.svg'],
  ['youtube','youtube.svg'],['paypal','paypal.svg'],['capcut','capcut.svg'],['alight','alight-motion.svg'],['vidio','vidio.svg'],
  ['viu','viu.svg'],['apple music','apple-music.svg'],['hbo','hbo-max.svg'],['zoom','zoom.svg'],['scribd','scribd.svg']
];

function safeJsonParse(raw, fallback){ try { return JSON.parse(raw); } catch { return fallback; } }
function profile(){ return safeJsonParse(localStorage.getItem('vanz_profile') || 'null', null); }
function saveProfile(p){ localStorage.setItem('vanz_profile', JSON.stringify(p)); }
function clearProfile(){ localStorage.removeItem('vanz_profile'); }
function localAppearance(){ return safeJsonParse(localStorage.getItem('vanz_appearance_override') || 'null', null); }
function localStoreOverride(){ return safeJsonParse(localStorage.getItem('vanz_store_override') || 'null', null); }
function mergeStore(base){
  const b = base && typeof base === 'object' ? base : DEFAULT_STORE;
  const a = localAppearance();
  const s = localStoreOverride();
  return {
    ...DEFAULT_STORE,
    ...b,
    ...(s || {}),
    support:{...DEFAULT_STORE.support,...(b.support||{}),...(s?.support||{})},
    appearance:{...DEFAULT_STORE.appearance,...(b.appearance||{}),...(a||{})},
    registration:{...DEFAULT_STORE.registration,...(b.registration||{})}
  };
}
function applyAppearance(){
  const a = state.store.appearance || DEFAULT_STORE.appearance;
  document.documentElement.dataset.theme = a.theme === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.density = a.density === 'comfortable' ? 'comfortable' : 'compact';
  document.documentElement.style.setProperty('--accent', /^#[0-9a-f]{6}$/i.test(a.accent||'') ? a.accent : '#f3c74f');
  document.documentElement.style.setProperty('--radius', `${Math.max(8,Math.min(32,Number(a.radius)||20))}px`);
  document.documentElement.style.setProperty('--grid-columns', String(Math.max(2,Math.min(6,Number(a.columns)||5))));
}
applyAppearance();

function apiUrl(a, query={}){
  const u = new URL('/api/xo', location.origin);
  u.searchParams.set('a',a);
  Object.entries(query).forEach(([k,v])=>{ if(v !== '' && v != null) u.searchParams.set(k,v); });
  return u;
}
async function requestApi(a,{method='GET',body=null,query={},adminPassword=''}={}){
  const headers = {};
  if(body !== null) headers['content-type']='application/json';
  if(adminPassword) headers['x-admin-password']=adminPassword;
  const res = await fetch(apiUrl(a,query),{
    method,
    headers,
    body:body === null ? undefined : JSON.stringify(body),
    cache:'no-store'
  });
  const text=await res.text(); let j={};
  try{ j=text?JSON.parse(text):{}; }catch{ throw new Error('Server tidak mengirim JSON yang valid.'); }
  if(!res.ok || j.ok===false){
    const e=new Error(j.error || `Request gagal (${res.status}).`);
    e.status=res.status; e.details=j.details; throw e;
  }
  return j.data ?? j;
}
const api = (a, body=null, query={}) => requestApi(a,{method:body===null?'GET':'POST',body,query});
const adminApi = (a,{method='GET',body=null,query={}}={}) => requestApi(a,{method,body,query,adminPassword:sessionStorage.getItem('vanz_admin_password')||''});

function toast(message,bad=false){
  let box=$('.toast-stack');
  if(!box){ box=document.createElement('div'); box.className='toast-stack'; document.body.appendChild(box); }
  const t=document.createElement('div'); t.className=`toast ${bad?'bad':''}`; t.textContent=message; box.appendChild(t);
  setTimeout(()=>t.remove(),4800);
}
function supportLinks(){
  const s=state.store.support||{}; const out=[];
  if(s.whatsapp){ const n=phoneNormalize(s.whatsapp); if(phoneOk(n)) out.push(`<a class="btn btn-sm" target="_blank" rel="noopener" href="https://wa.me/${esc(n)}">WhatsApp toko</a>`); }
  if(s.telegram){ const t=String(s.telegram).trim().replace(/^@/,''); if(t) out.push(`<a class="btn btn-sm" target="_blank" rel="noopener" href="https://t.me/${esc(t)}">Telegram toko</a>`); }
  if(s.email && emailOk(s.email)) out.push(`<a class="btn btn-sm" href="mailto:${esc(s.email)}">Email toko</a>`);
  return out.join('');
}
function brandCategory(name,code=''){
  const s=`${name} ${code}`.toLowerCase();
  for(const [key,val] of CATEGORY_KEYS) if(s.includes(key)) return val;
  return 'Digital';
}
function normalizeMediaUrl(v){
  let s=String(v||'').trim(); if(!s) return '';
  if(s.startsWith('//')) s=`https:${s}`;
  return /^(https?:\/\/|data:image\/)/i.test(s)?s:'';
}
function productImage(p){
  const c=[p?.thumbnail,p?.image,p?.img,p?.product_image,p?.image_url,p?.imageUrl,p?.photo,p?.cover,p?.banner,p?.picture,p?.logo,
    Array.isArray(p?.images)?p.images[0]:'',Array.isArray(p?.media)?(p.media[0]?.url||p.media[0]?.src||p.media[0]):'',p?.media?.url,p?.media?.src];
  return c.map(normalizeMediaUrl).find(Boolean)||'';
}
function localBrandImage(p){
  const hay=`${p?.title||''} ${p?.code||''}`.toLowerCase();
  const hit=BRAND_FILES.find(([key])=>hay.includes(key));
  return `/assets/brands/${hit?hit[1]:'default.svg'}`;
}
function productPrice(p){
  const base=Number(p?.price||0); if(base>0)return base;
  const nums=(Array.isArray(p?.variations)?p.variations:[]).map(v=>Number(v?.price)||0).filter(Boolean);
  return nums.length?Math.min(...nums):0;
}
function productStock(p){
  if(p?.stock!=null)return Number(p.stock);
  const vs=Array.isArray(p?.variations)?p.variations:[]; if(!vs.length)return null;
  return vs.reduce((n,v)=>n+Number(v?.stock_count??v?.stock??0),0);
}
const variants=p=>Array.isArray(p?.variations)?p.variations:[];
function allProducts(){
  const seen=new Set(), out=[];
  [...state.owner,...state.reseller].forEach(p=>{ const k=`${p.source}:${p.id??p.code}`; if(!seen.has(k)){seen.add(k);out.push(p);} });
  return out;
}
function getProduct(source,id){ return (source==='reseller'?state.reseller:state.owner).find(p=>String(p.id)===String(id)||String(p.code)===String(id)); }
function isOrderSupplier(p){ return p?.source==='owner' && Boolean(p?.is_reseller); }
function sourceLabel(p){ return p?.source==='reseller' ? 'H2H' : (isOrderSupplier(p) ? 'Supplier' : 'Premium'); }
function stockLabel(stock){
  if(stock===0)return{text:'Stok habis',cls:'out'};
  if(stock!=null&&stock<5)return{text:`Sisa ${stock}`,cls:'low'};
  if(stock!=null)return{text:'Tersedia',cls:'ready'};
  return{text:'Cek detail',cls:''};
}
function shortDesc(text,fallback='Produk digital siap diproses otomatis.'){
  const s=String(text||fallback).replace(/\s+/g,' ').trim(); return s.length>128?`${s.slice(0,125)}…`:s;
}
function visualMarkup(p,extra=''){
  const direct=productImage(p), fallback=localBrandImage(p), cat=brandCategory(p?.title,p?.code);
  return `<div class="product-visual ${extra}"><div class="visual-media">
    <img class="visual-img fallback-art" src="${esc(fallback)}" alt="${esc(p?.title||'Produk')}" loading="lazy">
    ${direct?`<img class="visual-img direct-art" src="${esc(direct)}" alt="${esc(p?.title||'Produk')}" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">`:''}
  </div><span class="visual-tag">${esc(cat)}</span></div>`;
}

function shell(content,active='catalog'){
  const p=profile();
  app.innerHTML=`<div class="app-shell">
    <header class="site-header"><div class="wrap header-inner">
      <a class="brand" href="#/"><span class="brand-mark">V</span><span class="brand-copy"><strong>${esc(state.store.name)}</strong><small>produk digital</small></span></a>
      <nav class="nav-right">
        <a class="nav-link ${active==='catalog'?'active':''}" href="#/">Katalog</a>
        <a class="nav-link ${active==='topup'?'active':''}" href="#/isi-saldo">Isi Saldo</a>
        <a class="nav-link ${active==='orders'?'active':''}" href="#/pesanan">Pesanan</a>
        <a class="nav-link ${active==='account'?'active':''}" href="#/akun">${p?.verified?'Akun ✓':'Akun'}</a>
        <a class="icon-link ${active==='admin'?'active':''}" href="#/admin" title="Dashboard admin" aria-label="Dashboard admin">⚙</a>
      </nav>
    </div></header>
    ${content}
    <footer class="site-footer"><div class="wrap footer-inner"><div><b>${esc(state.store.name)}</b><span>${esc(state.store.tagline)}</span></div><small>Live stock · Xoftware Order API · QRIS</small></div></footer>
  </div>`;
}

async function loadCatalog(){
  state.source='all';state.q='';state.sort='store';
  app.innerHTML='<div class="boot-screen"><div class="loader"></div><span>Memuat VanzShop...</span></div>';
  try{
    const d=await api('init');
    state.owner=Array.isArray(d.owner_products)?d.owner_products:[];
    state.reseller=Array.isArray(d.reseller_products)?d.reseller_products:[];
    state.store=mergeStore(d.store||DEFAULT_STORE);
    state.catalogLoaded=true;
    applyAppearance();
  }catch(e){
    state.catalogLoaded=false;
    state.store=mergeStore(DEFAULT_STORE);applyAppearance();
    shell(`<main class="page wrap"><div class="empty-card"><div class="empty-icon">!</div><h3>Katalog belum bisa dimuat</h3><p>${esc(e.message)}</p><button class="btn btn-primary" id="retry">Coba lagi</button></div></main>`,'catalog');
    $('#retry').onclick=loadCatalog;return;
  }
  const hero=state.store.appearance?.hero!==false?`<section class="hero wrap"><div class="hero-copy"><span class="section-kicker">${esc(state.store.name)} · katalog live</span><h1>Produk digital <span>siap dipakai.</span></h1><p>${esc(state.store.tagline)}</p><div class="hero-pills"><span>Stok live</span><span>QRIS otomatis</span><span>User Xoftware</span></div></div><div class="hero-side"><div class="hero-card"><small>${esc(state.store.name)}</small><strong>Simple.</strong><span>Ringkas. Cepat. Jelas.</span></div></div></section>`:'';
  shell(`<main class="page">${hero}<section class="catalog wrap"><div class="catalog-head"><div><span class="section-kicker">Koleksi produk</span><h2>Pilih yang kamu butuhkan</h2></div><div class="mini-stats"><span><b id="countProducts">${allProducts().length}</b> produk</span><span>stok live</span></div></div><div class="filters"><div class="filter-scroll"><button class="chip active" data-filter="all">Semua</button><button class="chip" data-filter="owner">Premium</button><button class="chip" data-filter="reseller">Partner</button></div><label class="search-wrap"><span>⌕</span><input id="search" autocomplete="off" placeholder="Cari produk..."></label><select id="sort" class="sort"><option value="store">Urutan toko</option><option value="sold">Terlaris</option><option value="new">Terbaru</option><option value="low">Harga terendah</option><option value="high">Harga tertinggi</option><option value="name">Nama A–Z</option></select></div><div id="grid" class="grid"></div></section></main>`,'catalog');
  $('#search').oninput=e=>{state.q=e.target.value.toLowerCase();drawGrid();};
  $('#sort').onchange=e=>{state.sort=e.target.value;drawGrid();};
  $$('.chip').forEach(b=>b.onclick=()=>{state.source=b.dataset.filter;$$('.chip').forEach(x=>x.classList.toggle('active',x===b));drawGrid();});
  drawGrid();
}
function drawGrid(){
  let list=allProducts();
  if(state.source!=='all')list=list.filter(p=>p.source===state.source);
  if(state.q)list=list.filter(p=>`${p.title} ${p.code} ${p.description}`.toLowerCase().includes(state.q));
  list=list.slice();
  if(state.sort==='sold')list.sort((a,b)=>(b.sold||0)-(a.sold||0));
  else if(state.sort==='new')list.sort((a,b)=>String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||'')));
  else if(state.sort==='low')list.sort((a,b)=>productPrice(a)-productPrice(b));
  else if(state.sort==='high')list.sort((a,b)=>productPrice(b)-productPrice(a));
  else if(state.sort==='name')list.sort((a,b)=>String(a.title).localeCompare(String(b.title),'id'));
  const grid=$('#grid');if(!grid)return;
  if(!list.length){grid.innerHTML='<div class="empty-card"><div class="empty-icon">⌕</div><h3>Produk tidak ditemukan</h3><p>Coba filter atau kata kunci lain.</p></div>';return;}
  grid.innerHTML=list.map(p=>{const stock=productStock(p),badge=stockLabel(stock),price=productPrice(p);return `<article class="product-card" data-open="${esc(p.source)}:${esc(p.id??p.code)}" tabindex="0">${visualMarkup(p)}<div class="card-body"><div class="card-meta"><span class="meta-source">${sourceLabel(p)}</span><span class="meta-stock ${badge.cls}">${esc(badge.text)}</span></div><h3>${esc(p.title)}</h3><p>${esc(shortDesc(p.description))}</p><div class="card-bottom"><div class="price-block"><small>Mulai dari</small><strong>${money(price)}</strong></div><button class="btn btn-sm" type="button">Detail</button></div></div></article>`;}).join('');
  $$('.product-card').forEach(card=>{const open=()=>{const [src,id]=card.dataset.open.split(':');location.hash=`#/produk/${src}/${encodeURIComponent(id)}`;};card.onclick=open;card.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}};});
}

function profileSummary(){
  const p=profile();
  if(!p?.verified)return `<div class="profile-callout warn"><div><b>Daftar / verifikasi user dulu</b><span>Xoftware mensyaratkan <code>sender</code> terdaftar sebelum order.</span></div><a class="btn btn-sm" href="#/akun">Buka Akun</a></div>`;
  return `<div class="profile-callout good"><div><b>${esc(p.name)}</b><span>${p.channel==='telegram'?'Telegram ID':'WhatsApp'} · ${esc(p.sender)}${p.email?` · ${esc(p.email)}`:''}</span></div><a class="btn btn-sm" href="#/akun">Ganti</a></div>`;
}
function detailHtml(p){
  const vs=variants(p),chosen=state.variantId??(vs[0]?.id??null),v=vs.find(x=>String(x.id)===String(chosen))||vs[0];state.variantId=v?.id??null;
  const price=Number(v?.price||productPrice(p)||0),stock=v?.stock??productStock(p),safeMax=stock==null?20:Math.max(1,Number(stock)||1);state.qty=Math.min(Math.max(1,state.qty),safeMax);
  const isPartner=p.source==='reseller',orderSupplier=isOrderSupplier(p),badge=stockLabel(stock),pReady=Boolean(profile()?.verified);
  shell(`<main class="detail wrap"><div class="crumb"><a href="#/">← Kembali</a><span>/</span><b>${esc(p.title)}</b></div><div class="detail-grid"><section class="detail-main"><div class="detail-product">${visualMarkup(p,'detail-visual')}<div class="detail-info"><div class="detail-head"><div><span class="section-kicker">${esc(brandCategory(p.title,p.code))} · ${isPartner?'reseller-h2h':orderSupplier?'supplier':'premium'}</span><h1>${esc(p.title)}</h1></div><span class="meta-stock ${badge.cls}">${esc(badge.text)}</span></div><p class="detail-desc">${esc(p.description||'Produk digital siap diproses otomatis.')}</p><div class="fact-grid"><div><small>Harga</small><strong>${money(price)}</strong></div><div><small>Stok</small><strong>${stock==null?'—':Number(stock)}</strong></div><div><small>Sumber</small><strong>${isPartner?'Reseller H2H':orderSupplier?'Supplier':'Owner'}</strong></div></div></div></div></section><aside class="buy-panel"><div class="panel-head"><h2>Pembelian</h2><span>${isPartner?'admin only':'otomatis'}</span></div>${profileSummary()}${vs.length?`<div class="step-block"><div class="step-head"><span>1</span><b>Pilih varian</b></div><div class="variant-list">${vs.map(x=>{const active=String(x.id)===String(chosen),out=x.stock!=null&&Number(x.stock)<=0;return `<button type="button" class="variant ${active?'active':''} ${out?'disabled':''}" data-variant="${esc(x.id)}" ${out?'disabled':''}><span>${esc(x.name||x.title||'Varian')}</span><span><small>${x.stock==null?'':`Stok ${Number(x.stock)}`}</small><b>${money(x.price)}</b></span></button>`;}).join('')}</div></div>`:''}<div class="step-block"><div class="step-head"><span>${vs.length?2:1}</span><b>Jumlah</b></div><div class="qty"><button id="qtyMinus" type="button">−</button><b id="qtyVal">${state.qty}</b><button id="qtyPlus" type="button">+</button></div></div><div class="step-block"><div class="step-head"><span>${vs.length?3:2}</span><b>Pembayaran</b></div><div class="payment-card"><div class="payment-icon">QR</div><div><b>${isPartner?'Reseller H2H admin-only':'QRIS'}</b><small>${isPartner?'Endpoint /v1/reseller-api/order langsung memakai reseller_saldo.':orderSupplier?'Produk supplier didukung melalui Xoftware Order API; provider dicek real-time oleh Xoftware.':'Invoice dibuat oleh Xoftware Order API.'}</small></div></div></div><div class="summary"><div><span>${esc(v?.name||v?.title||p.title)}</span><b id="sumUnit">${money(price)}</b></div><div><span>Jumlah</span><b id="sumQty">×${state.qty}</b></div><div class="summary-total"><span>Total</span><strong id="sumTotal">${money(price*state.qty)}</strong></div></div><button class="btn btn-primary btn-buy" id="buyNow" type="button" ${(!pReady||isPartner||stock===0)?'disabled':''}>${!pReady?'Daftar user sebelum checkout':isPartner?'Tidak tersedia untuk publik':stock===0?'Stok habis':'Lanjutkan pembayaran'}</button><div class="secure-note">Sender pembeli diverifikasi ke user Xoftware sebelum order.</div></aside></div></main>`,'catalog');
  $$('.variant').forEach(btn=>btn.onclick=()=>{state.variantId=btn.dataset.variant;state.qty=1;renderRoute();});
  $('#qtyMinus').onclick=()=>{state.qty=Math.max(1,state.qty-1);refreshTotal(p);};
  $('#qtyPlus').onclick=()=>{const raw=v?.stock??productStock(p),max=raw==null?20:Math.max(1,Math.min(20,Number(raw)||1));state.qty=Math.min(max,state.qty+1);refreshTotal(p);};
  $('#buyNow').onclick=()=>startCheckout(p);
}
function refreshTotal(p){const vs=variants(p),v=vs.find(x=>String(x.id)===String(state.variantId))||vs[0],price=Number(v?.price||productPrice(p)||0);$('#qtyVal').textContent=state.qty;$('#sumUnit').textContent=money(price);$('#sumQty').textContent=`×${state.qty}`;$('#sumTotal').textContent=money(price*state.qty);}
function priceFrom(p){const vs=variants(p);return Number(vs.find(x=>String(x.id)===String(state.variantId))?.price||productPrice(p)||0);}
async function startCheckout(p){
  if(p.source==='reseller'){toast('Produk partner memakai Reseller API yang memotong saldo toko, jadi checkout publik sengaja diblokir.',true);return;}
  const prof=profile(); if(!prof?.verified){location.hash='#/akun';return;}
  const vs=variants(p),v=vs.find(x=>String(x.id)===String(state.variantId))||vs[0],sku=String(v?.code||p.code||'').trim();if(!sku){toast('SKU produk/varian tidak tersedia.',true);return;}
  if(state.busy)return;state.busy=true;const btn=$('#buyNow');if(btn){btn.disabled=true;btn.textContent='Memproses...';}
  try{
    const result=await api('checkout_qris',{code:sku,quantity:state.qty,name:prof.name,channel:prof.channel,sender:prof.sender,email:prof.email||''});
    const d=result?.transaction||{},transaction_id=String(d?.transaction_id||'');if(!transaction_id)throw new Error('Transaksi belum mendapatkan transaction_id.');
    saveLocalOrder({type:'owner',transaction_id,status_token:String(result?.status_token||''),sender:prof.sender,channel:prof.channel,email:prof.email||'',product_title:p.title,variant:v?.title||v?.name||'',sku,total:Number(d?.total_to_pay||d?.amount||priceFrom(p)*state.qty),status:d?.status||'pending',qr_string:d?.qr_string||'',link:d?.link||'',expired_at:Number(d?.expired_at||0),created_at:Date.now()});
    location.hash=`#/bayar/${encodeURIComponent(transaction_id)}`;
  }catch(e){
    if(e?.details?.reason==='REGISTRATION_DISABLED'){const old=profile();if(old)saveProfile({...old,verified:false});}
    toast(e.message,true);if(btn){btn.disabled=false;btn.textContent='Lanjutkan pembayaran';}
  }finally{state.busy=false;}
}

function renderAccount(){
  const old=profile()||{channel:'whatsapp',name:'',sender:'',email:'',verified:false};
  shell(`<main class="account-page wrap"><div class="page-head"><div><span class="section-kicker">User Xoftware</span><h1>Daftar / verifikasi akun</h1><p>Order API memakai <code>sender</code> yang sudah terdaftar. Email bukan sender pada dokumentasi API.</p></div><a class="btn" href="#/">← Katalog</a></div><div class="account-grid"><section class="account-card"><div class="channel-tabs"><button class="chip ${old.channel!=='telegram'?'active':''}" data-channel="whatsapp">WhatsApp</button><button class="chip ${old.channel==='telegram'?'active':''}" data-channel="telegram">Telegram ID</button></div><label class="form-field"><span>Nama <em>wajib</em></span><input id="accountName" class="input big" maxlength="120" placeholder="Nama pengguna" value="${esc(old.name)}"></label><label class="form-field"><span id="senderLabel">${old.channel==='telegram'?'Telegram ID':'Nomor WhatsApp'} <em>wajib</em></span><input id="accountSender" class="input big" inputmode="${old.channel==='telegram'?'text':'tel'}" placeholder="${old.channel==='telegram'?'Telegram ID':'08xxxxxxxxxx'}" value="${esc(old.sender)}"></label><label class="form-field"><span>Email <small>(opsional, hanya disimpan di browser)</small></span><input id="accountEmail" class="input big" type="email" placeholder="nama@email.com" value="${esc(old.email||'')}"></label><button id="prepareUser" class="btn btn-primary btn-buy" type="button">Cek / daftarkan user</button><div id="registrationStatus">${old.verified?`<div class="status-card good"><b>User terverifikasi</b><span>${esc(old.name)} · ${esc(old.sender)}</span></div>`:''}</div></section><aside class="account-info"><h2>Alur yang benar</h2><ol><li>Masukkan WhatsApp atau Telegram ID.</li><li>Website mengecek user lewat <code>/v1/balance</code>.</li><li>Kalau belum ada, website mencoba <code>/v1/register</code>.</li><li>Kalau API Registration bot dinonaktifkan, user harus didaftarkan lewat alur resmi Xoftware / izin API Registration harus diaktifkan.</li><li>Registrasi API dibatasi maksimal 3 registrasi per menit.</li><li>Setelah user valid, checkout QRIS memakai sender user tersebut.</li></ol><div class="doc-note"><b>Email tidak dipakai sebagai sender</b><span>Dokumentasi Order API hanya menyebut nomor WhatsApp atau ID Telegram untuk <code>sender</code>.</span></div><div class="support-actions">${supportLinks()||'<span class="muted">Kontak toko belum dikonfigurasi.</span>'}</div></aside></div></main>`,'account');
  let channel=old.channel==='telegram'?'telegram':'whatsapp';
  $$('.channel-tabs .chip').forEach(b=>b.onclick=()=>{channel=b.dataset.channel;$$('.channel-tabs .chip').forEach(x=>x.classList.toggle('active',x===b));$('#senderLabel').innerHTML=`${channel==='telegram'?'Telegram ID':'Nomor WhatsApp'} <em>wajib</em>`;const inp=$('#accountSender');inp.placeholder=channel==='telegram'?'Telegram ID':'08xxxxxxxxxx';inp.inputMode=channel==='telegram'?'text':'tel';});
  $('#prepareUser').onclick=async()=>{
    const name=String($('#accountName').value||'').trim(),raw=String($('#accountSender').value||'').trim(),email=String($('#accountEmail').value||'').trim().toLowerCase();
    const sender=channel==='telegram'?raw:phoneNormalize(raw);
    if(!name){toast('Nama wajib diisi.',true);return;}
    if(channel==='telegram'?!telegramOk(sender):!phoneOk(sender)){toast(channel==='telegram'?'Telegram ID wajib diisi.':'Nomor WhatsApp tidak valid.',true);return;}
    if(email&&!emailOk(email)){toast('Email tidak valid.',true);return;}
    const btn=$('#prepareUser');btn.disabled=true;btn.textContent='Memeriksa user...';
    try{
      const r=await api('customer_prepare',{channel,sender,name,email});
      saveProfile({channel,sender:r.sender||sender,name:r.user?.name||name,email,verified:true,user_id:r.user?.id??null,level:r.user?.level||'',checked_at:Date.now()});
      toast(r.state==='registered'?'User berhasil didaftarkan.':'User sudah terdaftar dan siap checkout.');
      renderAccount();
    }catch(e){
      saveProfile({channel,sender,name,email,verified:false,checked_at:Date.now()});
      const reason=e?.details?.reason;
      const slot=$('#registrationStatus');
      const actions=supportLinks();
      if(slot){
        if(reason==='REGISTRATION_DISABLED') slot.innerHTML=`<div class="registration-blocked"><b>Izin API Registration Xoftware nonaktif</b><span>Endpoint /v1/register tersedia, tetapi dokumentasi menyatakan fitur ini memerlukan aktivasi izin khusus di tingkat penyedia layanan. Kode toko tidak dapat membypass izin tersebut.</span>${actions?`<div class="support-actions">${actions}</div>`:''}</div>`;
        else if(reason==='REGISTRATION_RATE_LIMIT' || e.status===429) slot.innerHTML=`<div class="registration-blocked"><b>Rate limit registrasi tercapai</b><span>Xoftware membatasi maksimal 3 registrasi per menit. Tunggu sampai jendela limit lewat lalu coba lagi.</span></div>`;
        else slot.innerHTML=`<div class="registration-blocked"><b>Registrasi / verifikasi gagal</b><span>${esc(e.message)}</span></div>`;
      }
      btn.disabled=false;btn.textContent='Cek / daftarkan user';
    }
  };
}

function renderTopup(){
  const prof=profile();
  shell(`<main class="topup wrap"><div class="page-head"><div><span class="section-kicker">Isi saldo</span><h1>Top up saldo user</h1><p>Deposit Xoftware juga mensyaratkan sender user yang sudah terdaftar.</p></div><a class="btn" href="#/">← Katalog</a></div><div class="topup-grid"><section class="topup-card">${profileSummary()}<div class="topup-kicker">Nominal</div><div class="amount-input"><span>Rp</span><input id="topupAmount" inputmode="numeric" type="number" min="1000" max="1000000" step="1000" value="50000"></div><div class="amount-presets"><button type="button" data-amt="50000">50k</button><button type="button" data-amt="100000">100k</button><button type="button" data-amt="250000">250k</button><button type="button" data-amt="500000">500k</button><button type="button" data-amt="1000000">1jt</button></div><button id="topupBuy" class="btn btn-primary btn-buy" type="button" ${prof?.verified?'':'disabled'}>${prof?.verified?'Buat pembayaran':'Daftar user dulu'}</button></section><aside class="topup-info"><div class="info-icon">+</div><h2>Deposit via QRIS</h2><p>Nominal resmi API: minimum Rp1.000 dan maksimum Rp1.000.000.</p><div class="info-row"><span>Sender</span><b>${prof?.verified?esc(prof.sender):'Belum ada'}</b></div><div class="info-row"><span>Metode</span><b>QRIS</b></div></aside></div></main>`,'topup');
  $$('.amount-presets button').forEach(b=>b.onclick=()=>{$('#topupAmount').value=b.dataset.amt;});
  if($('#topupBuy'))$('#topupBuy').onclick=async()=>{
    const p=profile();if(!p?.verified){location.hash='#/akun';return;}const amount=Math.round(Number($('#topupAmount').value||0));if(amount<1000||amount>1000000){toast('Nominal harus Rp1.000 sampai Rp1.000.000.',true);return;}
    const btn=$('#topupBuy');btn.disabled=true;btn.textContent='Membuat pembayaran...';
    try{const result=await api('deposit',{amount,name:p.name,channel:p.channel,sender:p.sender,email:p.email||''});const d=result?.transaction||{},transaction_id=String(d?.transaction_id||'');if(!transaction_id)throw new Error('Deposit tidak mengembalikan transaction_id.');saveLocalOrder({type:'deposit',transaction_id,status_token:String(result?.status_token||''),sender:p.sender,channel:p.channel,email:p.email||'',product_title:'Isi Saldo',variant:'Saldo user',total:Number(d?.total_to_pay||d?.amount||amount),status:d?.status||'pending',qr_string:d?.qr_string||'',link:d?.link||'',expired_at:Number(d?.expired_at||0),created_at:Date.now()});location.hash=`#/bayar/${encodeURIComponent(transaction_id)}`;}catch(e){toast(e.message,true);btn.disabled=false;btn.textContent='Buat pembayaran';}
  };
}

function orders(){return safeJsonParse(localStorage.getItem('vanz_orders')||'[]',[]);}
function saveLocalOrder(o){const xs=orders().filter(x=>x.transaction_id!==o.transaction_id);xs.unshift(o);localStorage.setItem('vanz_orders',JSON.stringify(xs.slice(0,40)));}
function renderOrders(){
  const list=orders();shell(`<main class="orders wrap"><div class="page-head"><div><span class="section-kicker">Riwayat</span><h1>Pesanan kamu</h1><p>Riwayat disimpan lokal di browser.</p></div><a class="btn" href="#/">← Katalog</a></div><div class="order-list">${list.length?list.map(o=>`<button type="button" class="order-row" data-tx="${esc(o.transaction_id)}"><div class="order-art">${esc((o.product_title||'P')[0])}</div><div class="order-info"><b>${esc(o.product_title)}</b><span>${esc(o.variant||'')}${o.sender?` · ${esc(o.sender)}`:''}</span></div><div class="order-right"><strong>${money(o.total)}</strong><small>${o.status==='success'?'Selesai':o.status==='pending'?'Menunggu':'Gagal'}</small></div></button>`).join(''):`<div class="empty-card"><div class="empty-icon">□</div><h3>Belum ada pesanan</h3><p>Pesanan baru akan muncul di sini.</p></div>`}</div></main>`,'orders');
  $$('.order-row').forEach(b=>b.onclick=()=>{const o=list.find(x=>x.transaction_id===b.dataset.tx);if(o)location.hash=`#/bayar/${encodeURIComponent(o.transaction_id)}`;});
}
async function renderPayment(txid){
  const o=orders().find(x=>String(x.transaction_id)===String(txid));if(!o){toast('Pesanan tidak ditemukan.',true);location.hash='#/pesanan';return;}const isDeposit=o.type==='deposit';
  shell(`<main class="invoice wrap"><div class="crumb"><a href="#/pesanan">← Pesanan</a><span>/</span><b>${isDeposit?'Isi saldo':'Pembayaran'}</b></div><div class="invoice-grid"><section class="invoice-main"><div class="invoice-badge" id="invoiceBadge">MENUNGGU PEMBAYARAN</div><h1>${esc(isDeposit?'Isi Saldo':o.product_title)}</h1><p>${esc(isDeposit?'Saldo user':(o.variant||''))}${o.sender?` · ${esc(o.sender)}`:''}</p><div class="payment-box">${o.qr_string?'<div class="qr" id="qr"></div>':''}<div class="pay-data"><span>Total</span><strong>${money(o.total)}</strong><small>Scan QRIS atau buka halaman pembayaran.</small></div>${o.link?`<a class="btn btn-primary" target="_blank" rel="noopener" href="${esc(o.link)}">Buka pembayaran</a>`:''}</div></section><aside class="invoice-side"><div><span>Referensi</span><b>${esc(o.transaction_id)}</b></div><div><span>Sender</span><b>${esc(o.sender||'—')}</b></div><div><span>Status</span><b id="invoiceStatus">Menunggu</b></div><button class="btn" id="checkNow">Cek status</button></aside></div></main>`,'orders');
  if(o.qr_string&&window.QRCode&&$('#qr')){try{new QRCode($('#qr'),{text:o.qr_string,width:220,height:220,colorDark:'#111',colorLight:'#fff'});}catch{}}
  $('#checkNow').onclick=()=>refreshInvoice(o);if(timer)clearInterval(timer);timer=setInterval(()=>refreshInvoice(o),5000);refreshInvoice(o);
}
async function refreshInvoice(o){
  try{if(!o.status_token)throw new Error('Pesanan lama tidak memiliki token status.');const data=await api('order_status',{transaction_id:o.transaction_id,status_token:o.status_token}),d=data?.transaction||{},status=String(d?.status||'').toLowerCase();if(status){o.status=status;o.accounts=d?.accounts||[];if(d?.total!=null||d?.total_to_pay!=null)o.total=Number(d?.total??d?.total_to_pay);saveLocalOrder(o);}const el=$('#invoiceStatus');if(el)el.textContent=status==='success'?'Selesai':status==='fail'?'Gagal':'Menunggu';if(status==='success'){clearInterval(timer);timer=null;showSuccess(o,d?.accounts||[]);}else if(status==='fail'){clearInterval(timer);timer=null;toast('Pembayaran gagal atau dibatalkan.',true);}}catch(e){if(String(e.message).toLowerCase().includes('token')){if(timer){clearInterval(timer);timer=null;}toast(e.message,true);}}
}
function formatAccount(a){if(typeof a==='string')return a;return Object.entries(a||{}).map(([k,v])=>`${k}: ${v}`).join('\n');}
function showSuccess(o,accountsOverride){
  if(timer){clearInterval(timer);timer=null;}const acc=accountsOverride||o.accounts||[],isDeposit=o.type==='deposit';
  shell(`<main class="success wrap"><div class="success-card"><div class="success-mark">✓</div><span class="section-kicker">${isDeposit?'Saldo diproses':'Pesanan berhasil'}</span><h1>${isDeposit?'Pembayaran diterima':'Pesanan selesai'}</h1><p>${isDeposit?'Permintaan deposit sudah terkonfirmasi.':'Detail produk sudah tersedia.'}</p><div class="success-meta"><span>${esc(isDeposit?'Isi Saldo':o.product_title)}</span><span>${money(o.total)}</span></div>${acc.length?`<div class="accounts"><div class="accounts-head"><b>Detail produk</b><button class="btn btn-sm" id="copyAll">Salin semua</button></div>${acc.map(a=>`<div class="account-row"><pre>${esc(formatAccount(a))}</pre></div>`).join('')}</div>`:''}<div class="success-actions"><a class="btn btn-primary" href="#/pesanan">Pesanan</a><a class="btn" href="#/">Katalog</a></div></div></main>`,'orders');
  const b=$('#copyAll');if(b)b.onclick=async()=>{try{await navigator.clipboard.writeText(acc.map(formatAccount).join('\n\n'));toast('Detail disalin.');}catch{toast('Gagal menyalin otomatis.',true);}};
}

function adminPass(){return sessionStorage.getItem('vanz_admin_password')||'';}
function adminTabs(active){
  const tabs=[['overview','Ringkasan'],['users','User'],['products','Produk'],['stock','Stok'],['reseller','Reseller H2H'],['appearance','Tampilan']];
  return `<div class="admin-tabs">${tabs.map(([id,label])=>`<a class="${active===id?'active':''}" href="#/admin/${id}">${label}</a>`).join('')}</div>`;
}
async function renderAdmin(section='overview'){
  if(!adminPass())return renderAdminLogin();
  shell(`<main class="admin wrap"><div class="admin-head"><div><span class="section-kicker">Dashboard Admin</span><h1>Kontrol VanzShop</h1><p>Operasi produk/user langsung ke Xoftware. Pengaturan tampilan dapat dipreview dan diekspor ke env Vercel.</p></div><button class="btn" id="adminLogout">Keluar</button></div>${adminTabs(section)}<div id="adminContent" class="admin-content"><div class="loading-card"><div class="loader"></div><span>Memuat dashboard...</span></div></div></main>`,'admin');
  $('#adminLogout').onclick=()=>{sessionStorage.removeItem('vanz_admin_password');renderAdminLogin();};
  try{await adminApi('admin_ping');}catch(e){sessionStorage.removeItem('vanz_admin_password');toast(e.message,true);return renderAdminLogin();}
  if(section==='users')return adminUsers();
  if(section==='products')return adminProducts();
  if(section==='stock')return adminStock();
  if(section==='reseller')return adminReseller();
  if(section==='appearance')return adminAppearance();
  return adminOverview();
}
function renderAdminLogin(){
  shell(`<main class="admin-login wrap"><section class="login-card"><span class="section-kicker">Admin</span><h1>Dashboard toko</h1><p>Password ini dibandingkan dengan <code>ADMIN_PASSWORD</code> di server.</p><label class="form-field"><span>Admin password</span><input id="adminPassword" class="input big" type="password" autocomplete="current-password" placeholder="Masukkan password"></label><button id="adminLoginBtn" class="btn btn-primary btn-buy">Masuk dashboard</button></section></main>`,'admin');
  $('#adminLoginBtn').onclick=async()=>{const pw=String($('#adminPassword').value||'');if(!pw){toast('Password wajib diisi.',true);return;}sessionStorage.setItem('vanz_admin_password',pw);try{await adminApi('admin_ping');location.hash='#/admin/overview';renderAdmin('overview');}catch(e){sessionStorage.removeItem('vanz_admin_password');toast(e.message,true);}};
}
async function adminOverview(){
  const box=$('#adminContent');
  const h=await api('health');
  box.innerHTML=`<div class="admin-grid"><section class="admin-panel"><h2>Status integrasi</h2><div class="kv"><span>Base URL</span><b>${esc(h.base_url)}</b></div><div class="kv"><span>API key</span><b>${h.ready?'Configured':'Missing'}</b></div><div class="kv"><span>Admin password</span><b>${h.admin_ready?'Configured':'Missing'}</b></div><div class="kv"><span>Catalog source</span><b>${esc(h.mode)}</b></div></section><section class="admin-panel"><h2>Endpoint resmi</h2><div class="kv"><span>Order</span><b>/v1/</b></div><div class="kv"><span>Produk</span><b>/v1/products</b></div><div class="kv"><span>Reseller</span><b>/v1/reseller-api/</b></div><div class="kv"><span>Register</span><b>/v1/register</b></div></section><section class="admin-panel wide"><h2>Aturan dokumentasi Xoftware</h2><p class="muted">Checkout memverifikasi <code>sender</code> lewat <code>/v1/balance</code>. Jika belum ada, <code>/v1/register</code> dipanggil. Registrasi membutuhkan izin khusus provider dan dibatasi 3 registrasi/menit. Deposit Rp1.000–Rp1.000.000. Stok maks 100 akun/request, variasi maks 30/produk, daftar produk maks 20/page, judul maks 100 karakter, desc/snk maks 5.000, SKU 3–50 huruf/angka/dash.</p><p class="muted"><b>Produk supplier/reseller pada Order API:</b> field <code>is_reseller=true</code> tetap dapat dibeli lewat Order API; Xoftware melakukan pengecekan provider real-time. Ini berbeda dari endpoint Reseller H2H yang memakai <code>reseller_saldo</code>.</p></section></div>`;
}
function adminUsers(){
  const box=$('#adminContent');box.innerHTML=`<div class="admin-grid"><section class="admin-panel"><h2>Register user</h2><label class="form-field"><span>Channel</span><select id="auChannel" class="input big"><option value="whatsapp">WhatsApp</option><option value="telegram">Telegram ID</option></select></label><label class="form-field"><span>Sender</span><input id="auSender" class="input big" placeholder="08... / Telegram ID"></label><label class="form-field"><span>Nama</span><input id="auName" class="input big" placeholder="Nama user"></label><button id="auRegister" class="btn btn-primary">Register ke Xoftware</button></section><section class="admin-panel"><h2>Cek user / saldo</h2><label class="form-field"><span>Sender</span><input id="auCheckSender" class="input big" placeholder="Sender terdaftar"></label><button id="auCheck" class="btn">Cek /v1/balance</button><div id="auResult" class="admin-result"></div></section></div>`;
  $('#auRegister').onclick=async()=>{try{const channel=$('#auChannel').value,raw=$('#auSender').value,sender=channel==='whatsapp'?phoneNormalize(raw):String(raw).trim(),name=$('#auName').value.trim();const r=await adminApi('owner_register',{method:'POST',body:{channel,sender,name}});toast(r?.message||'User berhasil diregistrasi.');}catch(e){toast(e.message,true);}};
  $('#auCheck').onclick=async()=>{try{const sender=$('#auCheckSender').value.trim();const r=await adminApi('owner_balance',{method:'POST',body:{sender}});$('#auResult').innerHTML=`<pre>${esc(JSON.stringify(r,null,2))}</pre>`;}catch(e){$('#auResult').innerHTML=`<div class="status-card bad">${esc(e.message)}</div>`;}};
}
async function adminProducts(){
  const box=$('#adminContent');box.innerHTML=`<div class="admin-toolbar"><input id="apSearch" class="input big" placeholder="Cari produk / SKU"><button id="apLoad" class="btn">Refresh</button><button id="apNew" class="btn btn-primary">Produk baru</button></div><div id="apForm"></div><div id="apList" class="admin-table-wrap"><div class="loading-card"><div class="loader"></div></div></div>`;
  const load=async()=>{try{const r=await adminApi('pm_products',{query:{page:1,limit:20,search:$('#apSearch').value.trim()}}),data=r?.data??r,items=Array.isArray(data?.products)?data.products:(Array.isArray(r?.products)?r.products:[]);$('#apList').innerHTML=`<table class="admin-table"><thead><tr><th>ID</th><th>Produk</th><th>SKU</th><th>Harga</th><th>Stok</th><th></th></tr></thead><tbody>${items.map(x=>`<tr><td>${esc(x.id)}</td><td><b>${esc(x.title)}</b><small>${x.is_variation?'Variasi':'Tunggal'}</small></td><td>${esc(x.code||'—')}</td><td>${money(x.price)}</td><td>${esc(x.stock_count??'—')}</td><td><button class="btn btn-sm ap-edit" data-json="${esc(encodeURIComponent(JSON.stringify(x)))}">Edit</button></td></tr>`).join('')}</tbody></table>`;$$('.ap-edit').forEach(b=>b.onclick=()=>showProductForm(JSON.parse(decodeURIComponent(b.dataset.json))));}catch(e){$('#apList').innerHTML=`<div class="status-card bad">${esc(e.message)}</div>`;}};
  const showProductForm=(x=null)=>{const edit=Boolean(x?.id);$('#apForm').innerHTML=`<section class="admin-panel wide"><div class="panel-title"><h2>${edit?'Edit produk':'Produk baru'}</h2>${edit?`<button id="apDelete" class="btn danger">Hapus</button>`:''}</div><div class="form-grid"><label class="form-field"><span>Title</span><input id="apTitle" class="input big" value="${esc(x?.title||'')}"></label><label class="form-field"><span>SKU</span><input id="apCode" class="input big" value="${esc(x?.code||'')}"></label><label class="form-field"><span>Harga</span><input id="apPrice" class="input big" type="number" min="0" value="${esc(x?.price??'')}"></label><label class="check-field"><input id="apVar" type="checkbox" ${x?.is_variation?'checked':''}><span>Produk variasi</span></label></div><label class="form-field"><span>Deskripsi</span><textarea id="apDesc" class="input textarea">${esc(x?.desc||x?.description||'')}</textarea></label><button id="apSave" class="btn btn-primary">${edit?'Simpan perubahan':'Buat produk'}</button></section>`;
    $('#apSave').onclick=async()=>{try{const body={title:$('#apTitle').value.trim(),code:$('#apCode').value.trim(),price:Number($('#apPrice').value||0),desc:$('#apDesc').value.trim(),is_variation:$('#apVar').checked};if(edit)await adminApi('pm_product_update',{method:'POST',body:{id:x.id,...body}});else await adminApi('pm_product_create',{method:'POST',body});toast(edit?'Produk diperbarui.':'Produk dibuat.');$('#apForm').innerHTML='';load();}catch(e){toast(e.message,true);}};
    if(edit)$('#apDelete').onclick=async()=>{if(!confirm(`Hapus produk ${x.title}? Stok dan variasinya juga dapat ikut terhapus di Xoftware.`))return;try{await adminApi('pm_product_delete',{method:'POST',body:{id:x.id}});toast('Produk dihapus.');$('#apForm').innerHTML='';load();}catch(e){toast(e.message,true);}};
  };
  $('#apLoad').onclick=load;$('#apSearch').onkeydown=e=>{if(e.key==='Enter')load();};$('#apNew').onclick=()=>showProductForm();load();
}
function adminStock(){
  const box=$('#adminContent');box.innerHTML=`<div class="admin-grid"><section class="admin-panel"><h2>Tambah stok</h2><label class="form-field"><span>Product ID</span><input id="asProduct" class="input big" inputmode="numeric"></label><label class="form-field"><span>Variation ID <small>(opsional)</small></span><input id="asVariation" class="input big" inputmode="numeric"></label><label class="form-field"><span>Accounts — satu baris satu stok</span><textarea id="asAccounts" class="input textarea tall" placeholder="email|password\nemail2|password2"></textarea></label><button id="asAdd" class="btn btn-primary">Tambah stok</button></section><section class="admin-panel"><h2>Lihat stok aktif</h2><label class="form-field"><span>Product ID</span><input id="asListProduct" class="input big" inputmode="numeric"></label><label class="form-field"><span>Variation ID <small>(opsional)</small></span><input id="asListVariation" class="input big" inputmode="numeric"></label><button id="asLoad" class="btn">Muat stok</button><div id="asResult" class="admin-result"></div></section></div>`;
  $('#asAdd').onclick=async()=>{try{const accounts=$('#asAccounts').value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);const r=await adminApi('pm_stock_add',{method:'POST',body:{product_id:$('#asProduct').value.trim(),variation_id:$('#asVariation').value.trim(),accounts}});toast(`Stok ditambahkan: ${r.total_added??accounts.length}`);}catch(e){toast(e.message,true);}};
  $('#asLoad').onclick=async()=>{try{const r=await adminApi('pm_stocks',{query:{product_id:$('#asListProduct').value.trim(),variation_id:$('#asListVariation').value.trim(),page:1,limit:100}}),data=r?.data??r,stocks=data?.stocks||[];$('#asResult').innerHTML=stocks.length?`<div class="stock-list">${stocks.map(s=>`<div class="stock-row"><span>#${esc(s.id)} · ${esc(JSON.stringify(s.value||s))}</span><button class="btn btn-sm danger as-delete" data-id="${esc(s.id)}">Hapus</button></div>`).join('')}</div>`:'<span class="muted">Stok kosong.</span>';$$('.as-delete').forEach(b=>b.onclick=async()=>{if(!confirm(`Hapus stok #${b.dataset.id}?`))return;try{await adminApi('pm_stock_delete',{method:'POST',body:{id:b.dataset.id}});b.closest('.stock-row').remove();toast('Stok dihapus.');}catch(e){toast(e.message,true);}});}catch(e){$('#asResult').innerHTML=`<div class="status-card bad">${esc(e.message)}</div>`;}};
}
async function adminReseller(){
  const box=$('#adminContent');box.innerHTML=`<div class="admin-grid"><section class="admin-panel"><h2>Saldo reseller</h2><button id="arBalance" class="btn">Cek reseller_saldo</button><div id="arBalanceResult" class="admin-result"></div></section><section class="admin-panel"><h2>Riwayat reseller</h2><button id="arHistory" class="btn">Muat transaksi</button><div id="arHistoryResult" class="admin-result"></div></section><section class="admin-panel wide"><h2>Catatan keamanan</h2><p class="muted">Tab ini khusus <code>/v1/reseller-api</code> H2H: order langsung memakai <code>reseller_saldo</code> dan dapat terikat IP whitelist. Produk supplier yang muncul dari <code>/v1/product</code> dengan <code>is_reseller=true</code> berbeda: dokumentasi menyatakan produk tersebut didukung melalui Order API dan tetap boleh checkout QRIS.</p></section></div>`;
  $('#arBalance').onclick=async()=>{try{const r=await adminApi('reseller_balance');$('#arBalanceResult').innerHTML=`<pre>${esc(JSON.stringify(r,null,2))}</pre>`;}catch(e){toast(e.message,true);}};
  $('#arHistory').onclick=async()=>{try{const r=await adminApi('reseller_orders',{query:{page:1,limit:20}});$('#arHistoryResult').innerHTML=`<pre>${esc(JSON.stringify(r,null,2))}</pre>`;}catch(e){toast(e.message,true);}};
}
function adminAppearance(){
  const a={...DEFAULT_STORE.appearance,...(state.store.appearance||{})},s=state.store.support||{};
  const box=$('#adminContent');box.innerHTML=`<div class="admin-grid"><section class="admin-panel wide"><h2>Tampilan & identitas toko</h2><div class="form-grid"><label class="form-field"><span>Nama toko</span><input id="aaName" class="input big" value="${esc(state.store.name)}"></label><label class="form-field"><span>Tagline</span><input id="aaTagline" class="input big" value="${esc(state.store.tagline)}"></label><label class="form-field"><span>Theme</span><select id="aaTheme" class="input big"><option value="dark" ${a.theme==='dark'?'selected':''}>Dark</option><option value="light" ${a.theme==='light'?'selected':''}>Light</option></select></label><label class="form-field"><span>Accent</span><input id="aaAccent" class="input big" type="color" value="${esc(a.accent||'#f3c74f')}"></label><label class="form-field"><span>Radius (${esc(a.radius)})</span><input id="aaRadius" type="range" min="8" max="32" value="${esc(a.radius)}"></label><label class="form-field"><span>Kolom desktop</span><input id="aaColumns" type="number" min="2" max="6" class="input big" value="${esc(a.columns)}"></label><label class="form-field"><span>Density</span><select id="aaDensity" class="input big"><option value="compact" ${a.density==='compact'?'selected':''}>Compact</option><option value="comfortable" ${a.density==='comfortable'?'selected':''}>Comfortable</option></select></label><label class="check-field"><input id="aaHero" type="checkbox" ${a.hero!==false?'checked':''}><span>Tampilkan hero</span></label><label class="form-field"><span>WhatsApp toko</span><input id="aaWa" class="input big" value="${esc(s.whatsapp||'')}"></label><label class="form-field"><span>Telegram toko</span><input id="aaTg" class="input big" value="${esc(s.telegram||'')}"></label><label class="form-field"><span>Email toko</span><input id="aaEmail" class="input big" value="${esc(s.email||'')}"></label></div><div class="button-row"><button id="aaPreview" class="btn btn-primary">Simpan preview lokal</button><button id="aaReset" class="btn">Reset preview</button><button id="aaEnv" class="btn">Generate ENV Vercel</button></div><div id="aaEnvBox"></div></section><section class="admin-panel wide"><h2>Kenapa setting global pakai ENV?</h2><p class="muted">Project ini tidak memakai database. Vercel Function tidak bisa menyimpan perubahan dashboard secara permanen ke file deployment. Preview disimpan di browser admin; untuk semua pengunjung, copy ENV yang dihasilkan ke Vercel lalu redeploy.</p></section></div>`;
  const get=()=>({store:{name:$('#aaName').value.trim(),tagline:$('#aaTagline').value.trim(),support:{whatsapp:$('#aaWa').value.trim(),telegram:$('#aaTg').value.trim(),email:$('#aaEmail').value.trim()}},appearance:{theme:$('#aaTheme').value,accent:$('#aaAccent').value,radius:Number($('#aaRadius').value),columns:Number($('#aaColumns').value),density:$('#aaDensity').value,hero:$('#aaHero').checked}});
  $('#aaPreview').onclick=()=>{const x=get();localStorage.setItem('vanz_appearance_override',JSON.stringify(x.appearance));localStorage.setItem('vanz_store_override',JSON.stringify(x.store));state.store=mergeStore({...state.store,...x.store,appearance:x.appearance});applyAppearance();toast('Preview disimpan di browser ini.');renderAdmin('appearance');};
  $('#aaReset').onclick=()=>{localStorage.removeItem('vanz_appearance_override');localStorage.removeItem('vanz_store_override');toast('Preview lokal dihapus. Reload katalog untuk nilai deployment.');location.hash='#/';};
  $('#aaEnv').onclick=async()=>{const x=get(),lines=[`STORE_NAME=${x.store.name}`,`STORE_TAGLINE=${x.store.tagline}`,`STORE_THEME=${x.appearance.theme}`,`STORE_ACCENT=${x.appearance.accent}`,`STORE_RADIUS=${x.appearance.radius}`,`STORE_COLUMNS=${x.appearance.columns}`,`STORE_DENSITY=${x.appearance.density}`,`STORE_HERO=${x.appearance.hero?'true':'false'}`,`STORE_WHATSAPP=${x.store.support.whatsapp}`,`STORE_TELEGRAM=${x.store.support.telegram}`,`STORE_EMAIL=${x.store.support.email}`],txt=lines.join('\n');$('#aaEnvBox').innerHTML=`<div class="env-box"><pre>${esc(txt)}</pre><button id="copyEnv" class="btn btn-sm">Salin ENV</button></div>`;$('#copyEnv').onclick=async()=>{try{await navigator.clipboard.writeText(txt);toast('ENV disalin.');}catch{toast('Clipboard tidak tersedia.',true);}};};
}

async function ensureInit(){
  if(state.catalogLoaded)return;
  try{const d=await api('init');state.owner=Array.isArray(d.owner_products)?d.owner_products:[];state.reseller=Array.isArray(d.reseller_products)?d.reseller_products:[];state.store=mergeStore(d.store||DEFAULT_STORE);state.catalogLoaded=true;applyAppearance();}catch{}
}
async function renderRoute(){
  if(timer){clearInterval(timer);timer=null;}const h=location.hash||'#/';
  if(h==='#/akun'){await ensureInit();return renderAccount();}
  const admin=h.match(/^#\/admin(?:\/([^/]+))?$/);if(admin){await ensureInit();return renderAdmin(admin[1]||'overview');}
  const m=h.match(/^#\/produk\/([^/]+)\/(.+)$/);if(m){await ensureInit();const p=getProduct(m[1],decodeURIComponent(m[2]));if(!p){toast('Produk tidak ditemukan.',true);location.hash='#/';return;}state.product=p;return detailHtml(p);}
  const pay=h.match(/^#\/bayar\/(.+)$/);if(pay){await ensureInit();return renderPayment(decodeURIComponent(pay[1]));}
  if(h==='#/isi-saldo'){await ensureInit();return renderTopup();}
  if(/^#\/pesanan/.test(h)){await ensureInit();return renderOrders();}
  await loadCatalog();
}
window.addEventListener('hashchange',renderRoute);window.addEventListener('beforeunload',()=>{if(timer)clearInterval(timer);});renderRoute();
})();
