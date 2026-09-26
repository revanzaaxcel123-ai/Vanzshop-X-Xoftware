(() => {
'use strict';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const app = $('#app');
const money = n => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n)||0);
const esc = v => String(v ?? '').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const slug = v => String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const emailOk = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v||'').trim());

const state = {
  owner: [], reseller: [], source: 'all', q: '', sort: 'store',
  product: null, variantId: null, qty: 1, busy: false,
  theme: localStorage.getItem('vanz_theme') || 'dark', catalogLoaded: false
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
  'prime video':'primevideo',duolingo:'duolingo',hbo:'hbo',notion:'notion',figma:'figma',
  'adobe':'adobe',steam:'steam',telegram:'telegram',whatsapp:'whatsapp'
};

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
  const candidates = [p?.thumbnail,p?.image,p?.product_image,p?.image_url,p?.imageUrl,p?.photo,p?.cover,p?.banner,p?.picture,p?.logo,
    Array.isArray(p?.images)?p.images[0]:'',Array.isArray(p?.media)?(p.media[0]?.url||p.media[0]?.src||p.media[0]):'',p?.media?.url,p?.media?.src];
  return candidates.find(v=>typeof v==='string' && /^https?:\/\//i.test(v.trim())) || '';
}
function brandImage(p) {
  const b = brandSlug(p?.title || p?.code);
  return b ? `https://cdn.simpleicons.org/${b}` : '';
}
function productPrice(p) {
  const base = Number(p?.price || 0);
  if (base > 0) return base;
  const vars = Array.isArray(p?.variations) ? p.variations : [];
  const nums = vars.map(v=>Number(v?.price)||0).filter(Boolean);
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
  const seen = new Set(); const out = [];
  [...state.owner, ...state.reseller].forEach(p=>{
    const key = `${p.source}:${p.id ?? p.code}`;
    if (!seen.has(key)) { seen.add(key); out.push(p); }
  });
  return out;
}
function routeFor(p) { return `#/produk/${p.source}/${encodeURIComponent(String(p.id ?? p.code))}`; }
function getProduct(source,id) {
  return (source === 'reseller' ? state.reseller : state.owner).find(p=>String(p.id)===String(id)||String(p.code)===String(id));
}

async function api(a, body=null, query={}) {
  const u = new URL('/api/xo', location.origin); u.searchParams.set('a',a);
  Object.entries(query).forEach(([k,v])=>{ if(v!==''&&v!=null) u.searchParams.set(k,v); });
  const res = await fetch(u,{method: body===null?'GET':'POST',headers:body===null?{}:{'content-type':'application/json'},body:body===null?undefined:JSON.stringify(body),cache:'no-store'});
  const text = await res.text(); let j={}; try{j=text?JSON.parse(text):{}}catch{throw new Error('Server tidak mengirim respons yang valid.');}
  if(!res.ok || j.ok===false) throw new Error(j.error || `Request gagal (${res.status}).`);
  return j.data ?? j;
}

function toast(message,bad=false){
  let box=$('.toast-stack'); if(!box){box=document.createElement('div');box.className='toast-stack';document.body.appendChild(box);}
  const t=document.createElement('div'); t.className=`toast ${bad?'bad':''}`; t.textContent=message; box.appendChild(t); setTimeout(()=>t.remove(),4200);
}
function setTheme(theme){ state.theme=theme==='light'?'light':'dark'; document.documentElement.dataset.theme=state.theme; localStorage.setItem('vanz_theme',state.theme); }
setTheme(state.theme);

function shell(content, active='catalog'){
  app.innerHTML=`
  <div class="app-shell">
    <header class="nav-wrap">
      <div class="nav wrap">
        <a class="brand" href="#/" aria-label="VanzShop.com">
          <span class="brand-mark">V</span><span class="brand-text">VANZSHOP<span>.COM</span></span>
        </a>
        <div class="nav-right">
          <a class="nav-link ${active==='catalog'?'active':''}" href="#/">Katalog</a>
          <a class="nav-link ${active==='topup'?'active':''}" href="#/isi-saldo">Isi Saldo</a>
          <a class="nav-link ${active==='orders'?'active':''}" href="#/pesanan">Pesanan</a>
          <button class="icon-btn" id="themeBtn" type="button" aria-label="Tema">${state.theme==='dark'?'☼':'☾'}</button>
        </div>
      </div>
    </header>
    ${content}
    <footer class="footer"><div class="wrap footer-inner"><div><b>VanzShop.com</b><span>Produk digital pilihan untuk kebutuhan kamu.</span></div><div class="footer-note">Live stock · Checkout otomatis · Tanpa daftar akun</div></div></footer>
  </div>`;
  $('#themeBtn').onclick=()=>{setTheme(state.theme==='dark'?'light':'dark'); renderRoute();};
}

function visualMarkup(p, extra=''){
  const direct=productImage(p), icon=brandImage(p), cat=brandCategory(p?.title,p?.code), initial=esc((p?.title||'V').trim().charAt(0).toUpperCase());
  const hasVisual=Boolean(direct||icon);
  return `<div class="product-visual ${extra} ${hasVisual?'has-brand-visual':''}">
    <div class="visual-grid"></div><div class="visual-glow"></div>${hasVisual?'':'<div class="visual-orb"></div>'}
    <div class="visual-media">
      ${direct ? `<img src="${esc(direct)}" alt="${esc(p?.title||'Produk')}" loading="lazy" onerror="this.remove();this.parentNode.querySelector('.brand-fallback').style.display='grid';this.closest('.product-visual').classList.remove('has-brand-visual');if(!this.parentNode.querySelector('.visual-orb')){const o=document.createElement('div');o.className='visual-orb';this.closest('.product-visual').insertBefore(o,this.closest('.product-visual').firstElementChild.nextElementSibling?.nextElementSibling||null)}">` : ''}
      <div class="brand-fallback" style="display:${direct?'none':'grid'}">${icon?`<img src="${esc(icon)}" alt="" loading="lazy" onerror="this.remove();this.parentNode.textContent='${initial}'">`:initial}</div>
    </div>
    <span class="visual-tag">${esc(cat)}</span>
  </div>`;
}
function calcQtyFor(p){ return p?.source==='reseller' ? 20 : (variants(p).length ? 20 : 20); }

async function loadCatalog(){
  state.source='all'; state.q=''; state.sort='store';
  shell(`<main class="page"><section class="hero wrap"><div class="hero-copy"><div class="hero-badge"><i></i>VanzShop · Katalog Live</div><h1>Produk digital yang<br><span>siap dipakai.</span></h1><p>Temukan produk pilihan, lihat stok secara langsung, lalu checkout dengan proses otomatis.</p><div class="hero-trust"><span>✓ Stok live</span><span>✓ Checkout cepat</span><span>✓ Email cukup</span></div></div><div class="hero-card"><div class="hero-card-kicker">VanzShop.com</div><div class="hero-card-big">Simple.</div><div class="hero-card-sub">Cepat. Otomatis.</div><div class="hero-card-glow"></div></div></section>
  <section class="catalog wrap">
    <div class="catalog-head"><div><span class="section-kicker">Koleksi produk</span><h2>Pilih yang kamu butuhkan</h2></div><div class="mini-stats"><span><b id="countProducts">—</b> produk</span><span><b>LIVE</b> stok</span></div></div>
    <div class="filters"><div class="filter-scroll"><button class="chip active" data-filter="all">Semua</button><button class="chip" data-filter="owner">Premium</button><button class="chip" data-filter="reseller">Partner</button></div><label class="search-wrap"><span>⌕</span><input id="search" autocomplete="off" placeholder="Cari produk…"></label><select id="sort" class="sort"><option value="store">Urutan toko</option><option value="sold">Terlaris</option><option value="new">Terbaru</option><option value="low">Harga terendah</option><option value="high">Harga tertinggi</option><option value="name">Nama A–Z</option></select></div>
    <div id="grid" class="grid"><div class="loading-card"><div class="loader"></div><span>Memuat katalog…</span></div></div>
  </section></main>`,'catalog');
  $('#search').oninput=e=>{state.q=e.target.value.toLowerCase();drawGrid();};
  $('#sort').onchange=e=>{state.sort=e.target.value;drawGrid();};
  $$('.chip').forEach(b=>b.onclick=()=>{state.source=b.dataset.filter; $$('.chip').forEach(x=>x.classList.toggle('active',x===b)); drawGrid();});
  try{
    const d=await api('init'); state.owner=Array.isArray(d.owner_products)?d.owner_products:[]; state.reseller=Array.isArray(d.reseller_products)?d.reseller_products:[];
    $('#countProducts').textContent=allProducts().length;
    state.catalogLoaded=true;
    drawGrid();
  }catch(e){ state.catalogLoaded=false; $('#grid').innerHTML=`<div class="error-card"><div class="error-icon">!</div><h3>Katalog sedang diperbarui</h3><p>Silakan tekan coba lagi.</p><button class="btn btn-primary" id="retry">Coba lagi</button></div>`; $('#retry').onclick=loadCatalog; }
}
function drawGrid(){
  let list=allProducts();
  if(state.source!=='all') list=list.filter(p=>p.source===state.source);
  if(state.q) list=list.filter(p=>`${p.title} ${p.code} ${p.description}`.toLowerCase().includes(state.q));
  list=list.slice();
  if(state.sort==='sold') list.sort((a,b)=>(b.sold||0)-(a.sold||0));
  else if(state.sort==='new') list.sort((a,b)=>String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||'')));
  else if(state.sort==='low') list.sort((a,b)=>productPrice(a)-productPrice(b));
  else if(state.sort==='high') list.sort((a,b)=>productPrice(b)-productPrice(a));
  else if(state.sort==='name') list.sort((a,b)=>String(a.title).localeCompare(String(b.title),'id'));
  const grid=$('#grid'); if(!grid) return;
  if(!list.length){grid.innerHTML='<div class="empty-card"><div class="empty-icon">⌕</div><h3>Produk tidak ditemukan</h3><p>Coba kata kunci lain.</p></div>';return;}
  grid.innerHTML=list.map((p,i)=>{
    const stock=productStock(p), price=productPrice(p), badge=(stock===0?'HABIS':stock!=null&&stock<10?'TERBATAS':'READY');
    return `<article class="product-card" data-open="${esc(p.source)}:${esc(p.id??p.code)}" tabindex="0" role="link">
      ${visualMarkup(p)}
      <div class="card-body"><div class="card-top"><span class="cat">${esc(brandCategory(p.title,p.code))}</span><span class="stock-badge ${badge==='HABIS'?'out':''}">${badge}</span></div>
      <h3>${esc(p.title)}</h3><p>${esc(p.description||'Produk digital siap diproses otomatis.')}</p>
      <div class="card-bottom"><div><small>Mulai dari</small><strong>${money(price)}</strong></div><span class="open-btn">Detail <b>↗</b></span></div></div>
    </article>`;}).join('');
  $$('.product-card').forEach(card=>{ const open=()=>{const [src,id]=card.dataset.open.split(':'); location.hash=`#/produk/${src}/${encodeURIComponent(id)}`;}; card.onclick=open; card.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}}; });
}

function detailHtml(p){
  const vs=variants(p), hasVar=vs.length>0, chosen=state.variantId ?? (vs[0]?.id ?? null), v=vs.find(x=>String(x.id)===String(chosen)) || vs[0];
  state.variantId=v?.id ?? null;
  const price=Number(v?.price||productPrice(p)||0), stock=v?.stock ?? productStock(p), qty=Math.min(state.qty,Math.max(1,Number(stock??99)));
  state.qty=qty;
  const isPartner=p.source==='reseller';
  shell(`<main class="detail wrap"><div class="crumb"><a href="#/">← Kembali</a><span>Katalog</span><span>/</span><b>${esc(p.title)}</b></div>
    <div class="detail-grid">
      <section class="detail-main">${visualMarkup(p,'detail-visual')}
        <div class="detail-info"><div class="detail-eyebrow">${esc(brandCategory(p.title,p.code))} · ${isPartner?'PARTNER':'PREMIUM'}</div><h1>${esc(p.title)}</h1><p class="detail-desc">${esc(p.description||'Produk digital pilihan VanzShop.')}</p>
          <div class="fact-grid"><div><small>Mulai dari</small><strong>${money(price)}</strong></div><div><small>Stok</small><strong>${stock==null?'—':Number(stock)}</strong></div><div><small>Status</small><strong>${stock===0?'Habis':'Ready'}</strong></div></div>
        </div>
      </section>
      <aside class="buy-panel"><div class="steps-title">Pembelian <span>aman & cepat</span></div>
        ${hasVar?`<div class="step-block"><div class="step-head"><span>1</span><b>Pilih varian</b></div><div class="variant-list">${vs.map(x=>{const active=String(x.id)===String(chosen), st=x.stock, out=st!=null&&Number(st)<=0; return `<button type="button" class="variant ${active?'active':''} ${out?'disabled':''}" data-variant="${esc(x.id)}" ${out?'disabled':''}><span><i></i>${esc(x.name||x.title||'Varian')}</span><span><small>${st==null?'':`Stok ${Number(st)}`}</small><b>${money(x.price)}</b></span></button>`;}).join('')}</div></div>`:''}
        <div class="step-block"><div class="step-head"><span>${hasVar?2:1}</span><b>Email pembeli</b></div><input id="buyerEmail" class="input big" type="email" inputmode="email" autocomplete="email" placeholder="nama@email.com" value="${esc(localStorage.getItem('vanz_email')||'')}"><p class="field-hint">Hasil transaksi dan detail pesanan tampil di halaman pesanan.</p></div>
        <div class="step-block"><div class="step-head"><span>${hasVar?3:2}</span><b>Jumlah</b></div><div class="qty"><button type="button" id="qtyMinus">−</button><b id="qtyVal">${state.qty}</b><button type="button" id="qtyPlus">+</button></div></div>
        <div class="step-block"><div class="step-head"><span>${hasVar?4:3}</span><b>Pembayaran</b></div><div class="payment-card"><div class="payment-icon">⌁</div><div><b>${isPartner?'Belum tersedia untuk checkout publik':'QRIS'}</b><small>${isPartner?'Produk partner memakai saldo reseller toko dan harus diproses admin setelah pembayaran customer terpisah.':'Scan dari e-wallet atau m-banking.'}</small></div><span>${isPartner?'!':'✓'}</span></div></div>
        <div class="summary"><div><span>${esc(v?.name||p.title)}</span><b id="sumUnit">${money(price)}</b></div><div><span>Jumlah</span><b id="sumQty">×${state.qty}</b></div><div class="summary-total"><span>Total</span><strong id="sumTotal">${money(price*state.qty)}</strong></div></div>
        <button class="btn btn-primary btn-buy" id="buyNow" type="button" ${(isPartner||stock===0)?'disabled':''}>${isPartner?'Checkout partner dinonaktifkan':stock===0?'Stok habis':'Lanjutkan Pembayaran'} <span>→</span></button>
        <div class="secure-note">🔒 Data pembayaran tidak disimpan sebagai database toko.</div>
      </aside>
    </div>
  </main>`,'catalog');
  $$('.variant').forEach(btn=>btn.onclick=()=>{state.variantId=btn.dataset.variant; state.qty=1; renderRoute();});
  $('#qtyMinus').onclick=()=>{state.qty=Math.max(1,state.qty-1);refreshTotal(p);};
  $('#qtyPlus').onclick=()=>{const raw=v?.stock??productStock(p);const max=raw==null?20:Math.max(1,Math.min(20,Number(raw)||1));state.qty=Math.min(max,state.qty+1);refreshTotal(p);};
  $('#buyNow').onclick=()=>startCheckout(p);
}
function refreshTotal(p){ const vs=variants(p), v=vs.find(x=>String(x.id)===String(state.variantId))||vs[0]; const price=Number(v?.price||productPrice(p)||0); $('#qtyVal').textContent=state.qty;$('#sumUnit').textContent=money(price);$('#sumQty').textContent='×'+state.qty;$('#sumTotal').textContent=money(price*state.qty); }

async function startCheckout(p){
  if(p.source==='reseller'){
    toast('Checkout partner dinonaktifkan: endpoint reseller memotong saldo toko, bukan pembayaran customer.',true);
    return;
  }
  const email=String($('#buyerEmail')?.value||'').trim().toLowerCase();
  if(!emailOk(email)){ $('#buyerEmail')?.focus(); toast('Masukkan email yang aktif.',true); return; }
  if(state.busy) return;
  const vs=variants(p), v=vs.find(x=>String(x.id)===String(state.variantId))||vs[0];
  const sku=String(v?.code||p.code||'').trim();
  if(!sku){toast('SKU produk/varian tidak tersedia.',true);return;}
  state.busy=true;
  const btn=$('#buyNow'); if(btn){btn.disabled=true;btn.innerHTML='<span class="loader mini"></span> Memproses…';}
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
    if(btn){btn.disabled=false;btn.innerHTML='Lanjutkan Pembayaran <span>→</span>';}
  } finally{state.busy=false;}
}
function priceFrom(p){const vs=variants(p);return Number(vs.find(x=>String(x.id)===String(state.variantId))?.price||productPrice(p)||0);}


function renderTopup(){
  shell(`<main class="topup wrap"><div class="topup-head"><div><span class="section-kicker">Isi saldo</span><h1>Top up saldo toko</h1><p>Gunakan halaman ini untuk membuat pembayaran isi saldo. Tidak ada akun tambahan yang perlu dibuat.</p></div><a class="btn" href="#/">← Kembali belanja</a></div>
    <div class="topup-grid"><section class="topup-card"><div class="topup-kicker">Nominal</div><div class="amount-input"><span>Rp</span><input id="topupAmount" inputmode="numeric" type="number" min="1000" max="1000000" step="1000" value="50000" aria-label="Nominal isi saldo"></div><div class="amount-presets"><button type="button" data-amt="50000">Rp50.000</button><button type="button" data-amt="100000">Rp100.000</button><button type="button" data-amt="250000">Rp250.000</button><button type="button" data-amt="500000">Rp500.000</button><button type="button" data-amt="1000000">Rp1.000.000</button></div><label class="topup-field"><span>Email notifikasi <small>(opsional)</small></span><input id="topupEmail" class="input big" type="email" autocomplete="email" placeholder="nama@email.com" value="${esc(localStorage.getItem('vanz_email')||'')}"></label><div class="topup-note">Nominal mengikuti batas layanan isi saldo. Email hanya dipakai sebagai kontak pesanan di perangkat ini.</div><button id="topupBuy" class="btn btn-primary btn-buy" type="button">Buat pembayaran <span>→</span></button></section><aside class="topup-info"><div class="info-icon">+</div><h2>Bayar sekali, proses otomatis</h2><p>Setelah pembayaran berhasil, status akan diperiksa otomatis sampai transaksi selesai.</p><div class="info-row"><span>Minimum</span><b>Rp1.000</b></div><div class="info-row"><span>Maksimum</span><b>Rp1.000.000</b></div><div class="info-row"><span>Data tersimpan</span><b>Di perangkat</b></div></aside></div></main>`,'topup');
  $$('.amount-presets button').forEach(b=>b.onclick=()=>{$('#topupAmount').value=b.dataset.amt;});
  $('#topupBuy').onclick=async()=>{
    const amount=Math.round(Number($('#topupAmount').value||0)); const email=String($('#topupEmail').value||'').trim().toLowerCase();
    if(amount<1000||amount>1000000){toast('Nominal harus Rp1.000 sampai Rp1.000.000.',true);return;}
    if(email && !emailOk(email)){toast('Email tidak valid.',true);$('#topupEmail').focus();return;}
    if(state.busy)return; state.busy=true; const btn=$('#topupBuy'); btn.disabled=true;btn.innerHTML='<span class="loader mini"></span> Membuat pembayaran…';
    try{
      const result=await api('deposit',{amount,email}); const d=result?.transaction||{}; const transaction_id=String(d?.transaction_id||'');
      if(!transaction_id) throw new Error('Pembayaran belum mendapatkan nomor referensi.');
      saveLocalOrder({type:'deposit',transaction_id,status_token:String(result?.status_token||''),email,product_title:'Isi Saldo',variant:'Saldo toko',total:Number(d?.total_to_pay||d?.amount||amount),status:d?.status||'pending',qr_string:d?.qr_string||'',link:d?.link||'',expired_at:Number(d?.expired_at||0),created_at:Date.now()});
      if(email)localStorage.setItem('vanz_email',email); location.hash=`#/bayar/${encodeURIComponent(transaction_id)}`;
    }catch(e){toast(e.message,true);btn.disabled=false;btn.innerHTML='Buat pembayaran <span>→</span>';} finally{state.busy=false;}
  };
}

function orders(){try{return JSON.parse(localStorage.getItem('vanz_orders')||'[]');}catch{return[];}}
function saveLocalOrder(o){const xs=orders().filter(x=>x.transaction_id!==o.transaction_id);xs.unshift(o);localStorage.setItem('vanz_orders',JSON.stringify(xs.slice(0,40)));}
function renderOrders(){
  const list=orders();
  shell(`<main class="orders wrap"><div class="orders-head"><div><span class="section-kicker">Riwayat</span><h1>Pesanan kamu</h1><p>Riwayat tersimpan di perangkat ini tanpa database toko.</p></div><a class="btn" href="#/">← Kembali belanja</a></div>
  <div class="order-list">${list.length?list.map(o=>`<button type="button" class="order-row" data-tx="${esc(o.transaction_id)}"><div class="order-art">${esc((o.product_title||'P')[0])}</div><div class="order-info"><b>${esc(o.product_title)}</b><span>${esc(o.variant||'')}${o.email?` · ${esc(o.email)}`:''}</span></div><div class="order-right"><strong>${money(o.total)}</strong><small>${o.status==='success'?'Selesai':o.status==='pending'?'Menunggu pembayaran':'Gagal'}</small></div></button>`).join(''):`<div class="empty-card"><div class="empty-icon">□</div><h3>Belum ada pesanan</h3><p>Pesanan yang kamu buat akan muncul di sini.</p></div>`}</div></main>`,'orders');
  $$('.order-row').forEach(b=>b.onclick=()=>{const o=list.find(x=>x.transaction_id===b.dataset.tx); if(!o)return; if(o.type==='owner'||o.type==='deposit') location.hash=`#/bayar/${encodeURIComponent(o.transaction_id)}`; else showSuccess(o);});
}

async function renderPayment(txid){
  const o=orders().find(x=>String(x.transaction_id)===String(txid));
  if(!o){toast('Pesanan tidak ditemukan.',true);location.hash='#/pesanan';return;}
  const isDeposit=o.type==='deposit';
  shell(`<main class="invoice wrap"><div class="crumb"><a href="#/pesanan">← Pesanan</a><span>•</span><b>${isDeposit?'Isi Saldo':'Pembayaran'}</b></div><div class="invoice-grid"><section class="invoice-main"><div class="invoice-badge pending" id="invoiceBadge">MENUNGGU PEMBAYARAN</div><h1>${esc(isDeposit?'Isi Saldo':o.product_title)}</h1><p>${esc(isDeposit?'Saldo toko':(o.variant||''))}${o.email?` · ${esc(o.email)}`:''}</p><div class="payment-box" id="paymentBox">${o.qr_string?'<div class="qr" id="qr"></div>':''}<div class="pay-data"><span>Total</span><strong>${money(o.total)}</strong><small>Scan kode pembayaran untuk menyelesaikan transaksi.</small></div>${o.link?`<a class="btn btn-primary" target="_blank" rel="noopener" href="${esc(o.link)}">Buka pembayaran</a>`:''}</div><div class="invoice-note">Status pembayaran akan diperiksa otomatis.</div></section><aside class="invoice-side"><div><span>Referensi</span><b>${esc(o.transaction_id)}</b></div>${o.email?`<div><span>Email</span><b>${esc(o.email)}</b></div>`:''}<div><span>Status</span><b id="invoiceStatus">Menunggu</b></div><button class="btn" id="checkNow">Cek status</button></aside></div></main>`,'orders');
  if(o.qr_string && window.QRCode && $('#qr')) { try{ new QRCode($('#qr'),{text:o.qr_string,width:260,height:260,colorDark:'#111',colorLight:'#fff'}); }catch{} }
  $('#checkNow').onclick=()=>refreshInvoice(o);
  if(timer)clearInterval(timer); timer=setInterval(()=>refreshInvoice(o),5000); refreshInvoice(o);
}
async function refreshInvoice(o){
  try{
    if(!o.status_token) throw new Error('Pesanan lama tidak memiliki token status. Buat transaksi baru untuk pengecekan aman.');
    const data=await api('order_status',{transaction_id:o.transaction_id,status_token:o.status_token});
    const d=data?.transaction||{};
    const status=String(d?.status||'').toLowerCase();
    if(status){
      o.status=status; o.accounts=d?.accounts||[];
      if(d?.total!=null||d?.total_to_pay!=null)o.total=Number(d?.total??d?.total_to_pay);
      saveLocalOrder(o);
    }
    const statusEl=$('#invoiceStatus'); if(statusEl)statusEl.textContent=status==='success'?'Selesai':status==='fail'?'Gagal':'Menunggu';
    if(status==='success'){clearInterval(timer);timer=null;showSuccess(o,d?.accounts||[]);}
    else if(status==='fail'){clearInterval(timer);timer=null;toast('Pembayaran gagal atau dibatalkan.',true);}
  }catch(e){
    if(String(e.message||'').toLowerCase().includes('token')){if(timer){clearInterval(timer);timer=null;}toast(e.message,true);}
  }
}
function showSuccess(o, accountsOverride){
  if(timer){clearInterval(timer);timer=null;}
  const acc=accountsOverride || o.accounts || [];
  const isDeposit=o.type==='deposit';
  shell(`<main class="success wrap"><div class="success-card"><div class="success-mark">✓</div><span class="section-kicker">${isDeposit?'Saldo diproses':'Pesanan berhasil'}</span><h1>${isDeposit?'Pembayaran diterima.':'Terima kasih.'}</h1><p>${isDeposit?'Permintaan isi saldo kamu sudah terkonfirmasi.':'Detail pesanan kamu sudah siap.'}</p><div class="success-meta"><span>${esc(isDeposit?'Isi Saldo VanzShop':o.product_title)}</span>${o.email?`<span>${esc(o.email)}</span>`:''}<span>${money(o.total)}</span></div>${acc.length?`<div class="accounts"><div class="accounts-head"><b>Detail produk</b><button class="btn btn-sm" id="copyAll">Salin semua</button></div>${acc.map(a=>`<div class="account-row"><pre>${esc(formatAccount(a))}</pre></div>`).join('')}</div>`:''}<div class="success-actions"><a class="btn btn-primary" href="#/pesanan">Lihat pesanan</a><a class="btn" href="#/">Belanja lagi</a></div></div></main>`,'orders');
  const b=$('#copyAll'); if(b)b.onclick=async()=>{const txt=acc.map(formatAccount).join('\n\n');try{await navigator.clipboard.writeText(txt);toast('Detail berhasil disalin.');}catch{toast('Tidak bisa menyalin otomatis.',true);}};
}
function formatAccount(a){if(typeof a==='string')return a;return Object.entries(a||{}).map(([k,v])=>`${k}: ${v}`).join('\n');}

async function renderRoute(){
  if(timer){clearInterval(timer);timer=null;}
  const h=location.hash||'#/', m=h.match(/^#\/produk\/([^/]+)\/(.+)$/);
  if(m){
    let p=getProduct(m[1],decodeURIComponent(m[2]));
    if(!p){ try{ await loadCatalog(); }catch{} p=getProduct(m[1],decodeURIComponent(m[2])); }
    if(!p){toast('Produk tidak ditemukan.',true);location.hash='#/';return;}
    state.product=p; detailHtml(p); return;
  }
  const pay=h.match(/^#\/bayar\/(.+)$/); if(pay){renderPayment(decodeURIComponent(pay[1]));return;}
  if(h==='#/isi-saldo'){renderTopup();return;}
  if(h==='#/sukses'){ const o=orders()[0]; if(o)showSuccess(o); else renderOrders(); return; }
  if(/^#\/pesanan/.test(h)){renderOrders();return;}
  await loadCatalog();
}
window.addEventListener('hashchange',renderRoute);
window.addEventListener('beforeunload',()=>{if(timer)clearInterval(timer);});
renderRoute();
})();
