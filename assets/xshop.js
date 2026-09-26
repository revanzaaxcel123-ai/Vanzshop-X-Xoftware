(() => {
'use strict';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const app = $('#app');
const money = n => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n)||0);
const esc = v => String(v ?? '').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const emailOk = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v||'').trim());

const state = {
  owner: [], reseller: [], source: 'all', q: '', sort: 'store',
  product: null, variantId: null, qty: 1, busy: false,
  theme: localStorage.getItem('vanz_theme') || 'dark', catalogLoaded: false,
  store: { name: 'VanzShop.com', tagline: 'Produk digital pilihan, stok live, checkout otomatis.' }
};
let timer = null;

const CATEGORY_KEYS = [
  ['ai','AI'],['chatgpt','AI'],['claude','AI'],['gemini','AI'],['perplexity','AI'],
  ['netflix','Streaming'],['youtube','Streaming'],['prime video','Streaming'],['spotify','Musik'],['apple music','Musik'],
  ['canva','Design'],['photoshop','Design'],['capcut','Editing'],['alight','Editing'],
  ['vpn','VPN'],['discord','Community'],['zoom','Productivity'],['microsoft','Productivity'],['office','Productivity']
];
const BRAND_ICONS = {
  chatgpt:'openai',openai:'openai',claude:'anthropic',gemini:'googlegemini',perplexity:'perplexity',
  netflix:'netflix',canva:'canva',spotify:'spotify',youtube:'youtube',capcut:'capcut',
  'alight motion':'alightmotion',discord:'discord',zoom:'zoom',microsoft:'microsoft',office:'microsoft',
  'prime video':'primevideo',duolingo:'duolingo',hbo:'hbomax',notion:'notion',figma:'figma',
  adobe:'adobe',steam:'steam',telegram:'telegram',whatsapp:'whatsapp',scribd:'scribd',apple:'apple'
};

function apiUrl(a, query={}){
  const u = new URL('/api/xo', location.origin);
  u.searchParams.set('a', a);
  Object.entries(query).forEach(([k,v]) => { if(v !== '' && v != null) u.searchParams.set(k, v); });
  return u;
}
async function api(a, body=null, query={}) {
  const res = await fetch(apiUrl(a, query), {
    method: body === null ? 'GET' : 'POST',
    headers: body === null ? {} : { 'content-type': 'application/json' },
    body: body === null ? undefined : JSON.stringify(body),
    cache: 'no-store'
  });
  const text = await res.text();
  let j = {};
  try { j = text ? JSON.parse(text) : {}; } catch { throw new Error('Server tidak mengirim respons yang valid.'); }
  if (!res.ok || j.ok === false) throw new Error(j.error || `Request gagal (${res.status}).`);
  return j.data ?? j;
}

function toast(message,bad=false){
  let box=$('.toast-stack');
  if(!box){ box=document.createElement('div'); box.className='toast-stack'; document.body.appendChild(box); }
  const t=document.createElement('div');
  t.className=`toast ${bad?'bad':''}`;
  t.textContent=message;
  box.appendChild(t);
  setTimeout(()=>t.remove(), 4200);
}
function setTheme(theme){
  state.theme = theme === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.theme = state.theme;
  localStorage.setItem('vanz_theme', state.theme);
}
setTheme(state.theme);

function normalizeMediaUrl(v){
  let s = String(v || '').trim();
  if(!s) return '';
  if(s.startsWith('//')) s = `https:${s}`;
  return /^(https?:\/\/|data:image\/)/i.test(s) ? s : '';
}
function brandSlug(name) {
  const s = String(name||'').toLowerCase();
  for (const [key,val] of Object.entries(BRAND_ICONS)) if (s.includes(key)) return val;
  return '';
}
function brandCategory(name, code='') {
  const s = `${name} ${code}`.toLowerCase();
  for (const [key,val] of CATEGORY_KEYS) if (s.includes(key)) return val;
  return 'Digital';
}
function productImage(p) {
  const candidates = [
    p?.thumbnail,p?.image,p?.product_image,p?.image_url,p?.imageUrl,p?.photo,p?.cover,p?.banner,p?.picture,p?.logo,
    Array.isArray(p?.images)?p.images[0]:'', Array.isArray(p?.media)?(p.media[0]?.url||p.media[0]?.src||p.media[0]):'', p?.media?.url,p?.media?.src
  ];
  return candidates.map(normalizeMediaUrl).find(Boolean) || '';
}
function brandImage(p) {
  const b = brandSlug(`${p?.title || ''} ${p?.code || ''}`);
  return b ? `https://cdn.simpleicons.org/${b}/ffffff` : '';
}
function productPrice(p) {
  const base = Number(p?.price || 0);
  if (base > 0) return base;
  const nums = (Array.isArray(p?.variations) ? p.variations : []).map(v=>Number(v?.price)||0).filter(Boolean);
  return nums.length ? Math.min(...nums) : 0;
}
function productStock(p) {
  if (p?.stock != null) return Number(p.stock);
  const vars = Array.isArray(p?.variations) ? p.variations : [];
  if (!vars.length) return null;
  return vars.reduce((n,v)=>n+Number(v?.stock_count ?? v?.stock ?? 0),0);
}
function variants(p) { return Array.isArray(p?.variations) ? p.variations : []; }
function allProducts() {
  const seen = new Set();
  const out = [];
  [...state.owner, ...state.reseller].forEach(p => {
    const key = `${p.source}:${p.id ?? p.code}`;
    if (!seen.has(key)) { seen.add(key); out.push(p); }
  });
  return out;
}
function getProduct(source,id) {
  return (source === 'reseller' ? state.reseller : state.owner).find(p=>String(p.id)===String(id)||String(p.code)===String(id));
}
function stockLabel(stock){
  if(stock === 0) return { text:'Stok habis', cls:'out' };
  if(stock != null && stock < 5) return { text:`Sisa ${stock}`, cls:'low' };
  if(stock != null) return { text:'Tersedia', cls:'ready' };
  return { text:'Cek detail', cls:'' };
}
function shortDesc(text, fallback='Produk digital siap diproses otomatis.'){
  const s = String(text || fallback).replace(/\s+/g,' ').trim();
  return s.length > 120 ? `${s.slice(0,117)}…` : s;
}

function shell(content, active='catalog'){
  app.innerHTML = `
  <div class="app-shell">
    <header class="site-header">
      <div class="wrap header-inner">
        <a class="brand" href="#/" aria-label="${esc(state.store.name)}">
          <span class="brand-mark">V</span>
          <span class="brand-copy"><strong>${esc(state.store.name)}</strong><small>produk digital</small></span>
        </a>
        <nav class="nav-right">
          <a class="nav-link ${active==='catalog'?'active':''}" href="#/">Katalog</a>
          <a class="nav-link ${active==='topup'?'active':''}" href="#/isi-saldo">Isi Saldo</a>
          <a class="nav-link ${active==='orders'?'active':''}" href="#/pesanan">Pesanan</a>
          <button class="theme-btn" id="themeBtn" type="button" aria-label="Tema">${state.theme==='dark'?'☀':'☾'}</button>
        </nav>
      </div>
    </header>
    ${content}
    <footer class="site-footer">
      <div class="wrap footer-inner">
        <div>
          <b>${esc(state.store.name)}</b>
          <span>${esc(state.store.tagline)}</span>
        </div>
        <small>Live stock · QRIS otomatis · tanpa database toko</small>
      </div>
    </footer>
  </div>`;
  $('#themeBtn').onclick=()=>{ setTheme(state.theme==='dark'?'light':'dark'); renderRoute(); };
}

function visualMarkup(p, extra=''){
  const direct = productImage(p);
  const icon = brandImage(p);
  const cat = brandCategory(p?.title,p?.code);
  const initial = esc((p?.title || 'P').trim().charAt(0).toUpperCase() || 'P');
  return `<div class="product-visual ${extra}">
    <div class="visual-media">
      <div class="visual-fallback">${initial}</div>
      ${direct ? `<img class="visual-img direct" src="${esc(direct)}" alt="${esc(p?.title||'Produk')}" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}
      ${!direct && icon ? `<img class="visual-img icon" src="${esc(icon)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}
    </div>
    <span class="visual-tag">${esc(cat)}</span>
  </div>`;
}

async function loadCatalog(){
  state.source='all'; state.q=''; state.sort='store';
  shell(`<main class="page">
    <section class="hero wrap">
      <div class="hero-copy">
        <span class="section-kicker">${esc(state.store.name)} · katalog live</span>
        <h1>Produk digital yang <span>siap dipakai.</span></h1>
        <p>${esc(state.store.tagline)}</p>
        <div class="hero-pills"><span>Stok live</span><span>Checkout cepat</span><span>Email cukup</span></div>
      </div>
      <div class="hero-side">
        <div class="hero-card">
          <small>${esc(state.store.name)}</small>
          <strong>Simple.</strong>
          <span>Cepat. Bersih. Minimalis.</span>
        </div>
      </div>
    </section>
    <section class="catalog wrap">
      <div class="catalog-head">
        <div>
          <span class="section-kicker">Koleksi produk</span>
          <h2>Pilih yang kamu butuhkan</h2>
        </div>
        <div class="mini-stats"><span><b id="countProducts">—</b> produk</span><span>stok live</span></div>
      </div>
      <div class="filters">
        <div class="filter-scroll">
          <button class="chip active" data-filter="all">Semua</button>
          <button class="chip" data-filter="owner">Premium</button>
          <button class="chip" data-filter="reseller">Partner</button>
        </div>
        <label class="search-wrap"><span>⌕</span><input id="search" autocomplete="off" placeholder="Cari produk..."></label>
        <select id="sort" class="sort">
          <option value="store">Urutan toko</option>
          <option value="sold">Terlaris</option>
          <option value="new">Terbaru</option>
          <option value="low">Harga terendah</option>
          <option value="high">Harga tertinggi</option>
          <option value="name">Nama A–Z</option>
        </select>
      </div>
      <div id="grid" class="grid"><div class="loading-card"><div class="loader"></div><span>Memuat katalog...</span></div></div>
    </section>
  </main>`, 'catalog');
  $('#search').oninput = e => { state.q = e.target.value.toLowerCase(); drawGrid(); };
  $('#sort').onchange = e => { state.sort = e.target.value; drawGrid(); };
  $$('.chip').forEach(b=>b.onclick=()=>{ state.source=b.dataset.filter; $$('.chip').forEach(x=>x.classList.toggle('active',x===b)); drawGrid(); });
  try{
    const d = await api('init');
    state.owner = Array.isArray(d.owner_products) ? d.owner_products : [];
    state.reseller = Array.isArray(d.reseller_products) ? d.reseller_products : [];
    state.store = d.store || state.store;
    $('#countProducts').textContent = allProducts().length;
    state.catalogLoaded = true;
    drawGrid();
  }catch(e){
    state.catalogLoaded=false;
    $('#grid').innerHTML = `<div class="empty-card"><div class="empty-icon">!</div><h3>Katalog belum bisa dimuat</h3><p>${esc(e.message || 'Silakan coba lagi.')}</p><button class="btn btn-primary" id="retry">Coba lagi</button></div>`;
    $('#retry').onclick = loadCatalog;
  }
}

function drawGrid(){
  let list = allProducts();
  if(state.source !== 'all') list = list.filter(p=>p.source===state.source);
  if(state.q) list = list.filter(p=>`${p.title} ${p.code} ${p.description}`.toLowerCase().includes(state.q));
  list = list.slice();
  if(state.sort==='sold') list.sort((a,b)=>(b.sold||0)-(a.sold||0));
  else if(state.sort==='new') list.sort((a,b)=>String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||'')));
  else if(state.sort==='low') list.sort((a,b)=>productPrice(a)-productPrice(b));
  else if(state.sort==='high') list.sort((a,b)=>productPrice(b)-productPrice(a));
  else if(state.sort==='name') list.sort((a,b)=>String(a.title).localeCompare(String(b.title),'id'));

  const grid = $('#grid');
  if(!grid) return;
  if(!list.length){
    grid.innerHTML = '<div class="empty-card"><div class="empty-icon">⌕</div><h3>Produk tidak ditemukan</h3><p>Coba kata kunci atau filter lain.</p></div>';
    return;
  }
  grid.innerHTML = list.map(p => {
    const stock = productStock(p);
    const badge = stockLabel(stock);
    const price = productPrice(p);
    return `<article class="product-card" data-open="${esc(p.source)}:${esc(p.id??p.code)}" tabindex="0" role="link">
      ${visualMarkup(p)}
      <div class="card-body">
        <div class="card-meta"><span class="meta-source">${p.source==='reseller'?'Partner':'Premium'}</span><span class="meta-stock ${badge.cls}">${esc(badge.text)}</span></div>
        <h3>${esc(p.title)}</h3>
        <p>${esc(shortDesc(p.description))}</p>
        <div class="card-bottom">
          <div class="price-block"><small>Mulai dari</small><strong>${money(price)}</strong></div>
          <button class="btn btn-sm" type="button">Detail</button>
        </div>
      </div>
    </article>`;
  }).join('');
  $$('.product-card').forEach(card=>{
    const open=()=>{ const [src,id]=card.dataset.open.split(':'); location.hash=`#/produk/${src}/${encodeURIComponent(id)}`; };
    card.onclick=open;
    card.onkeydown=e=>{ if(e.key==='Enter' || e.key===' '){ e.preventDefault(); open(); } };
  });
}

function detailHtml(p){
  const vs=variants(p);
  const chosen = state.variantId ?? (vs[0]?.id ?? null);
  const v = vs.find(x=>String(x.id)===String(chosen)) || vs[0];
  state.variantId = v?.id ?? null;
  const price = Number(v?.price || productPrice(p) || 0);
  const stock = v?.stock ?? productStock(p);
  const safeMax = stock == null ? 20 : Math.max(1, Number(stock) || 1);
  state.qty = Math.min(Math.max(1, state.qty), safeMax);
  const isPartner = p.source === 'reseller';
  const badge = stockLabel(stock);
  shell(`<main class="detail wrap">
    <div class="crumb"><a href="#/">← Kembali</a><span>/</span><b>${esc(p.title)}</b></div>
    <div class="detail-grid">
      <section class="detail-main">
        ${visualMarkup(p,'detail-visual')}
        <div class="detail-info">
          <div class="detail-head">
            <div>
              <span class="section-kicker">${esc(brandCategory(p.title,p.code))} · ${isPartner?'partner':'premium'}</span>
              <h1>${esc(p.title)}</h1>
            </div>
            <span class="meta-stock ${badge.cls}">${esc(badge.text)}</span>
          </div>
          <p class="detail-desc">${esc(p.description || 'Produk digital siap diproses otomatis.')}</p>
          <div class="fact-grid">
            <div><small>Harga</small><strong>${money(price)}</strong></div>
            <div><small>Stok</small><strong>${stock == null ? '—' : Number(stock)}</strong></div>
            <div><small>Sumber</small><strong>${isPartner ? 'Partner' : 'Owner'}</strong></div>
          </div>
        </div>
      </section>
      <aside class="buy-panel">
        <div class="panel-head"><h2>Pembelian</h2><span>${isPartner ? 'manual' : 'otomatis'}</span></div>
        ${vs.length ? `<div class="step-block"><div class="step-head"><span>1</span><b>Pilih varian</b></div><div class="variant-list">${vs.map(x=>{ const active=String(x.id)===String(chosen); const out=x.stock!=null && Number(x.stock)<=0; return `<button type="button" class="variant ${active?'active':''} ${out?'disabled':''}" data-variant="${esc(x.id)}" ${out?'disabled':''}><span>${esc(x.name||x.title||'Varian')}</span><span><small>${x.stock==null?'':`Stok ${Number(x.stock)}`}</small><b>${money(x.price)}</b></span></button>`; }).join('')}</div></div>` : ''}
        <div class="step-block"><div class="step-head"><span>${vs.length?2:1}</span><b>Email pembeli</b></div><input id="buyerEmail" class="input big" type="email" inputmode="email" autocomplete="email" placeholder="nama@email.com" value="${esc(localStorage.getItem('vanz_email')||'')}"><p class="field-hint">Pesanan dan status transaksi ditampilkan di menu Pesanan.</p></div>
        <div class="step-block"><div class="step-head"><span>${vs.length?3:2}</span><b>Jumlah</b></div><div class="qty"><button type="button" id="qtyMinus">−</button><b id="qtyVal">${state.qty}</b><button type="button" id="qtyPlus">+</button></div></div>
        <div class="step-block"><div class="step-head"><span>${vs.length?4:3}</span><b>Pembayaran</b></div><div class="payment-card"><div class="payment-icon">⌁</div><div><b>${isPartner ? 'Checkout partner dinonaktifkan' : 'QRIS'}</b><small>${isPartner ? 'Produk partner harus diproses admin setelah pembayaran customer terpisah.' : 'Scan dari e-wallet atau mobile banking.'}</small></div></div></div>
        <div class="summary"><div><span>${esc(v?.name||v?.title||p.title)}</span><b id="sumUnit">${money(price)}</b></div><div><span>Jumlah</span><b id="sumQty">×${state.qty}</b></div><div class="summary-total"><span>Total</span><strong id="sumTotal">${money(price*state.qty)}</strong></div></div>
        <button class="btn btn-primary btn-buy" id="buyNow" type="button" ${(isPartner||stock===0)?'disabled':''}>${isPartner?'Tidak tersedia untuk publik':stock===0?'Stok habis':'Lanjutkan pembayaran'}</button>
        <div class="secure-note">Data order hanya disimpan di browser ini.</div>
      </aside>
    </div>
  </main>`, 'catalog');
  $$('.variant').forEach(btn=>btn.onclick=()=>{ state.variantId=btn.dataset.variant; state.qty=1; renderRoute(); });
  $('#qtyMinus').onclick=()=>{ state.qty=Math.max(1,state.qty-1); refreshTotal(p); };
  $('#qtyPlus').onclick=()=>{ const raw=v?.stock??productStock(p); const max=raw==null?20:Math.max(1,Math.min(20,Number(raw)||1)); state.qty=Math.min(max,state.qty+1); refreshTotal(p); };
  $('#buyNow').onclick=()=>startCheckout(p);
}
function refreshTotal(p){
  const vs=variants(p), v=vs.find(x=>String(x.id)===String(state.variantId))||vs[0];
  const price=Number(v?.price||productPrice(p)||0);
  $('#qtyVal').textContent=state.qty;
  $('#sumUnit').textContent=money(price);
  $('#sumQty').textContent=`×${state.qty}`;
  $('#sumTotal').textContent=money(price*state.qty);
}
async function startCheckout(p){
  if(p.source==='reseller'){
    toast('Checkout partner dinonaktifkan: endpoint reseller memotong saldo toko.',true);
    return;
  }
  const email=String($('#buyerEmail')?.value||'').trim().toLowerCase();
  if(!emailOk(email)){ $('#buyerEmail')?.focus(); toast('Masukkan email yang aktif.',true); return; }
  if(state.busy) return;
  const vs=variants(p), v=vs.find(x=>String(x.id)===String(state.variantId))||vs[0];
  const sku=String(v?.code||p.code||'').trim();
  if(!sku){ toast('SKU produk/varian tidak tersedia.',true); return; }
  state.busy=true;
  const btn=$('#buyNow');
  if(btn){ btn.disabled=true; btn.innerHTML='Memproses...'; }
  try{
    const result=await api('checkout_qris',{code:sku,quantity:state.qty,email});
    const d=result?.transaction||{};
    const transaction_id=String(d?.transaction_id||'');
    if(!transaction_id) throw new Error('Transaksi belum mendapatkan nomor referensi.');
    saveLocalOrder({
      type:'owner', transaction_id, status_token:String(result?.status_token||''), email,
      product_title:p.title, variant:v?.title||v?.name||'', sku,
      total:Number(d?.total_to_pay||d?.amount||priceFrom(p)*state.qty), status:d?.status||'pending',
      qr_string:d?.qr_string||'', link:d?.link||'', expired_at:Number(d?.expired_at||0), created_at:Date.now()
    });
    localStorage.setItem('vanz_email',email);
    location.hash=`#/bayar/${encodeURIComponent(transaction_id)}`;
  }catch(e){
    toast(e.message,true);
    if(btn){ btn.disabled=false; btn.innerHTML='Lanjutkan pembayaran'; }
  }finally{ state.busy=false; }
}
function priceFrom(p){ const vs=variants(p); return Number(vs.find(x=>String(x.id)===String(state.variantId))?.price||productPrice(p)||0); }

function renderTopup(){
  shell(`<main class="topup wrap">
    <div class="page-head"><div><span class="section-kicker">Isi saldo</span><h1>Top up saldo toko</h1><p>Buat pembayaran otomatis untuk isi saldo. Tidak perlu daftar akun baru.</p></div><a class="btn" href="#/">← Kembali</a></div>
    <div class="topup-grid">
      <section class="topup-card">
        <div class="topup-kicker">Nominal</div>
        <div class="amount-input"><span>Rp</span><input id="topupAmount" inputmode="numeric" type="number" min="1000" max="1000000" step="1000" value="50000"></div>
        <div class="amount-presets"><button type="button" data-amt="50000">50k</button><button type="button" data-amt="100000">100k</button><button type="button" data-amt="250000">250k</button><button type="button" data-amt="500000">500k</button><button type="button" data-amt="1000000">1jt</button></div>
        <label class="topup-field"><span>Email notifikasi <small>(opsional)</small></span><input id="topupEmail" class="input big" type="email" autocomplete="email" placeholder="nama@email.com" value="${esc(localStorage.getItem('vanz_email')||'')}"></label>
        <div class="topup-note">Minimum Rp1.000 dan maksimum Rp1.000.000.</div>
        <button id="topupBuy" class="btn btn-primary btn-buy" type="button">Buat pembayaran</button>
      </section>
      <aside class="topup-info">
        <div class="info-icon">+</div>
        <h2>Pembayaran otomatis</h2>
        <p>Status pembayaran akan dicek otomatis sampai selesai.</p>
        <div class="info-row"><span>Metode</span><b>QRIS</b></div>
        <div class="info-row"><span>Riwayat</span><b>Browser ini</b></div>
        <div class="info-row"><span>Keamanan</span><b>No DB</b></div>
      </aside>
    </div>
  </main>`, 'topup');
  $$('.amount-presets button').forEach(b=>b.onclick=()=>{ $('#topupAmount').value=b.dataset.amt; });
  $('#topupBuy').onclick=async()=>{
    const amount=Math.round(Number($('#topupAmount').value||0));
    const email=String($('#topupEmail').value||'').trim().toLowerCase();
    if(amount<1000||amount>1000000){ toast('Nominal harus Rp1.000 sampai Rp1.000.000.',true); return; }
    if(email && !emailOk(email)){ toast('Email tidak valid.',true); $('#topupEmail').focus(); return; }
    if(state.busy) return;
    state.busy=true;
    const btn=$('#topupBuy'); btn.disabled=true; btn.innerHTML='Membuat pembayaran...';
    try{
      const result=await api('deposit',{amount,email});
      const d=result?.transaction||{};
      const transaction_id=String(d?.transaction_id||'');
      if(!transaction_id) throw new Error('Pembayaran belum mendapatkan nomor referensi.');
      saveLocalOrder({ type:'deposit', transaction_id, status_token:String(result?.status_token||''), email, product_title:'Isi Saldo', variant:'Saldo toko', total:Number(d?.total_to_pay||d?.amount||amount), status:d?.status||'pending', qr_string:d?.qr_string||'', link:d?.link||'', expired_at:Number(d?.expired_at||0), created_at:Date.now() });
      if(email) localStorage.setItem('vanz_email',email);
      location.hash=`#/bayar/${encodeURIComponent(transaction_id)}`;
    }catch(e){ toast(e.message,true); btn.disabled=false; btn.innerHTML='Buat pembayaran'; }
    finally{ state.busy=false; }
  };
}

function orders(){ try{ return JSON.parse(localStorage.getItem('vanz_orders')||'[]'); }catch{ return []; } }
function saveLocalOrder(o){ const xs=orders().filter(x=>x.transaction_id!==o.transaction_id); xs.unshift(o); localStorage.setItem('vanz_orders',JSON.stringify(xs.slice(0,40))); }

function renderOrders(){
  const list=orders();
  shell(`<main class="orders wrap">
    <div class="page-head"><div><span class="section-kicker">Riwayat</span><h1>Pesanan kamu</h1><p>Semua riwayat tersimpan di browser ini.</p></div><a class="btn" href="#/">← Kembali</a></div>
    <div class="order-list">${list.length ? list.map(o=>`<button type="button" class="order-row" data-tx="${esc(o.transaction_id)}"><div class="order-art">${esc((o.product_title||'P')[0])}</div><div class="order-info"><b>${esc(o.product_title)}</b><span>${esc(o.variant||'')}${o.email?` · ${esc(o.email)}`:''}</span></div><div class="order-right"><strong>${money(o.total)}</strong><small>${o.status==='success'?'Selesai':o.status==='pending'?'Menunggu':'Gagal'}</small></div></button>`).join('') : `<div class="empty-card"><div class="empty-icon">□</div><h3>Belum ada pesanan</h3><p>Pesanan yang kamu buat akan muncul di sini.</p></div>`}</div>
  </main>`, 'orders');
  $$('.order-row').forEach(b=>b.onclick=()=>{ const o=list.find(x=>x.transaction_id===b.dataset.tx); if(!o) return; if(o.type==='owner'||o.type==='deposit') location.hash=`#/bayar/${encodeURIComponent(o.transaction_id)}`; else showSuccess(o); });
}

async function renderPayment(txid){
  const o=orders().find(x=>String(x.transaction_id)===String(txid));
  if(!o){ toast('Pesanan tidak ditemukan.',true); location.hash='#/pesanan'; return; }
  const isDeposit=o.type==='deposit';
  shell(`<main class="invoice wrap">
    <div class="crumb"><a href="#/pesanan">← Pesanan</a><span>/</span><b>${isDeposit?'Isi saldo':'Pembayaran'}</b></div>
    <div class="invoice-grid">
      <section class="invoice-main">
        <div class="invoice-badge pending" id="invoiceBadge">MENUNGGU PEMBAYARAN</div>
        <h1>${esc(isDeposit?'Isi Saldo':o.product_title)}</h1>
        <p>${esc(isDeposit?'Saldo toko':(o.variant||''))}${o.email?` · ${esc(o.email)}`:''}</p>
        <div class="payment-box" id="paymentBox">
          ${o.qr_string?'<div class="qr" id="qr"></div>':''}
          <div class="pay-data"><span>Total</span><strong>${money(o.total)}</strong><small>Scan QR atau buka halaman pembayaran.</small></div>
          ${o.link?`<a class="btn btn-primary" target="_blank" rel="noopener" href="${esc(o.link)}">Buka pembayaran</a>`:''}
        </div>
      </section>
      <aside class="invoice-side">
        <div><span>Referensi</span><b>${esc(o.transaction_id)}</b></div>
        ${o.email?`<div><span>Email</span><b>${esc(o.email)}</b></div>`:''}
        <div><span>Status</span><b id="invoiceStatus">Menunggu</b></div>
        <button class="btn" id="checkNow">Cek status</button>
      </aside>
    </div>
  </main>`, 'orders');
  if(o.qr_string && window.QRCode && $('#qr')) { try{ new QRCode($('#qr'),{text:o.qr_string,width:220,height:220,colorDark:'#111',colorLight:'#fff'}); }catch{} }
  $('#checkNow').onclick=()=>refreshInvoice(o);
  if(timer) clearInterval(timer);
  timer=setInterval(()=>refreshInvoice(o),5000);
  refreshInvoice(o);
}
async function refreshInvoice(o){
  try{
    if(!o.status_token) throw new Error('Pesanan lama tidak memiliki token status. Buat transaksi baru untuk pengecekan aman.');
    const data=await api('order_status',{transaction_id:o.transaction_id,status_token:o.status_token});
    const d=data?.transaction||{};
    const status=String(d?.status||'').toLowerCase();
    if(status){
      o.status=status;
      o.accounts=d?.accounts||[];
      if(d?.total!=null||d?.total_to_pay!=null) o.total=Number(d?.total??d?.total_to_pay);
      saveLocalOrder(o);
    }
    const statusEl=$('#invoiceStatus'); if(statusEl) statusEl.textContent=status==='success'?'Selesai':status==='fail'?'Gagal':'Menunggu';
    if(status==='success'){ clearInterval(timer); timer=null; showSuccess(o,d?.accounts||[]); }
    else if(status==='fail'){ clearInterval(timer); timer=null; toast('Pembayaran gagal atau dibatalkan.',true); }
  }catch(e){
    if(String(e.message||'').toLowerCase().includes('token')){ if(timer){ clearInterval(timer); timer=null; } toast(e.message,true); }
  }
}
function showSuccess(o, accountsOverride){
  if(timer){ clearInterval(timer); timer=null; }
  const acc=accountsOverride || o.accounts || [];
  const isDeposit=o.type==='deposit';
  shell(`<main class="success wrap"><div class="success-card"><div class="success-mark">✓</div><span class="section-kicker">${isDeposit?'Saldo diproses':'Pesanan berhasil'}</span><h1>${isDeposit?'Pembayaran diterima':'Pesanan selesai'}</h1><p>${isDeposit?'Permintaan isi saldo sudah terkonfirmasi.':'Detail pesanan kamu sudah siap.'}</p><div class="success-meta"><span>${esc(isDeposit?'Isi Saldo VanzShop':o.product_title)}</span>${o.email?`<span>${esc(o.email)}</span>`:''}<span>${money(o.total)}</span></div>${acc.length?`<div class="accounts"><div class="accounts-head"><b>Detail produk</b><button class="btn btn-sm" id="copyAll">Salin semua</button></div>${acc.map(a=>`<div class="account-row"><pre>${esc(formatAccount(a))}</pre></div>`).join('')}</div>`:''}<div class="success-actions"><a class="btn btn-primary" href="#/pesanan">Lihat pesanan</a><a class="btn" href="#/">Belanja lagi</a></div></div></main>`, 'orders');
  const b=$('#copyAll'); if(b)b.onclick=async()=>{ const txt=acc.map(formatAccount).join('\n\n'); try{ await navigator.clipboard.writeText(txt); toast('Detail berhasil disalin.'); }catch{ toast('Tidak bisa menyalin otomatis.',true); } };
}
function formatAccount(a){ if(typeof a==='string') return a; return Object.entries(a||{}).map(([k,v])=>`${k}: ${v}`).join('\n'); }

async function renderRoute(){
  if(timer){ clearInterval(timer); timer=null; }
  const h=location.hash||'#/';
  const m=h.match(/^#\/produk\/([^/]+)\/(.+)$/);
  if(m){
    let p=getProduct(m[1],decodeURIComponent(m[2]));
    if(!p){ try{ await loadCatalog(); }catch{} p=getProduct(m[1],decodeURIComponent(m[2])); }
    if(!p){ toast('Produk tidak ditemukan.',true); location.hash='#/'; return; }
    state.product=p; detailHtml(p); return;
  }
  const pay=h.match(/^#\/bayar\/(.+)$/); if(pay){ renderPayment(decodeURIComponent(pay[1])); return; }
  if(h==='#/isi-saldo'){ renderTopup(); return; }
  if(h==='#/sukses'){ const o=orders()[0]; if(o) showSuccess(o); else renderOrders(); return; }
  if(/^#\/pesanan/.test(h)){ renderOrders(); return; }
  await loadCatalog();
}
window.addEventListener('hashchange',renderRoute);
window.addEventListener('beforeunload',()=>{ if(timer) clearInterval(timer); });
renderRoute();
})();
