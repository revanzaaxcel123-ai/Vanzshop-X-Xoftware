(() => {
'use strict';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const app = $('#app');
const BUILD_ID = 'HARDMAX-v14-BRANDING';
window.__VANZSHOP_BUILD__ = BUILD_ID;
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
  branding:{
    mark:'V',
    subtitle:'PRODUK DIGITAL',
    logo_url:'',
    hero_title:'Produk digital premium, instant delivery, full branding.',
    hero_subtitle:'Katalog live dari Xoftware, pembayaran otomatis SewaPay, dan auto-claim akun setelah payment berhasil.',
    hero_badges:['Stok live','Auto claim','Checkout cepat','Full branding'],
    hero_slides:['/assets/showcase/chatgpt.jpg','/assets/showcase/canva.jpg','/assets/showcase/netflix.jpg','/assets/showcase/spotify.jpg','/assets/showcase/youtube.jpg'],
    footer_note:'Live stock · auto claim · pembayaran instan',
    receipt_note:'Detail akun dikirim otomatis dari stok aktif. Simpan data login dan segera ganti jika diperlukan.',
    body_font:'Plus Jakarta Sans',
    display_font:'Archivo'
  },
  registration:{required_before_order:true,api_permission_required_for_new_users:true,supported_sender_types:['whatsapp','telegram_id'],email_is_sender:false,max_per_minute:3,otp_endpoint_documented:false},
  payment:{provider:'sewapay',configured:false,base_url:'https://sewapay.id'},
  checkout:{mode:'sewapay',fulfillment:'disabled-until-redis-configured',shared_sender_configured:false,shared_channel:'whatsapp',shared_sender_masked:''},
  limits:{registration_per_minute:3,deposit_min:1000,deposit_max:1000000,stock_accounts_per_request:100,variations_per_product:30,products_per_page:20,title_max:100,description_max:5000,terms_max:5000,sku_min:3,sku_max:50}
};
const state = {
  owner:[], source:'all', q:'', sort:'store', catalogSummary:null,
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
const FONT_PRESETS = {
  'plus jakarta sans':{body:"'Plus Jakarta Sans',system-ui,-apple-system,'Segoe UI',sans-serif",display:"Archivo,system-ui,sans-serif"},
  'inter':{body:"Inter,system-ui,-apple-system,'Segoe UI',sans-serif",display:"Sora,Inter,system-ui,sans-serif"},
  'outfit':{body:"Outfit,system-ui,-apple-system,'Segoe UI',sans-serif",display:"Outfit,system-ui,sans-serif"},
  'sora':{body:"Sora,system-ui,-apple-system,'Segoe UI',sans-serif",display:"Sora,system-ui,sans-serif"},
  'space grotesk':{body:"'Space Grotesk',system-ui,-apple-system,'Segoe UI',sans-serif",display:"'Space Grotesk',system-ui,sans-serif"},
  'archivo':{body:"'Plus Jakarta Sans',system-ui,-apple-system,'Segoe UI',sans-serif",display:"Archivo,system-ui,sans-serif"}
};

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
    branding:{...DEFAULT_STORE.branding,...(b.branding||{}),...(s?.branding||{})},
    registration:{...DEFAULT_STORE.registration,...(b.registration||{})},
    checkout:{...DEFAULT_STORE.checkout,...(b.checkout||{})}
  };
}
function fontPreset(name, type='body'){
  const key=String(name||'').trim().toLowerCase();
  const preset=FONT_PRESETS[key] || FONT_PRESETS['plus jakarta sans'];
  return preset[type] || preset.body;
}
function applyAppearance(){
  const a = state.store.appearance || DEFAULT_STORE.appearance;
  const b = state.store.branding || DEFAULT_STORE.branding;
  document.documentElement.dataset.theme = a.theme === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.density = a.density === 'comfortable' ? 'comfortable' : 'compact';
  document.documentElement.style.setProperty('--accent', /^#[0-9a-f]{6}$/i.test(a.accent||'') ? a.accent : '#f3c74f');
  document.documentElement.style.setProperty('--radius', `${Math.max(8,Math.min(32,Number(a.radius)||20))}px`);
  document.documentElement.style.setProperty('--grid-columns', String(Math.max(2,Math.min(6,Number(a.columns)||5))));
  document.documentElement.style.setProperty('--font', fontPreset(b.body_font,'body'));
  document.documentElement.style.setProperty('--display', fontPreset(b.display_font,'display'));
}
applyAppearance();

function apiUrl(a, query={}){
  const u = new URL('/api/xo', location.origin);
  u.searchParams.set('a',a);
  Object.entries(query).forEach(([k,v])=>{ if(v !== '' && v != null) u.searchParams.set(k,v); });
  return u;
}
async function requestApi(a,{method='GET',body=null,query={},adminToken='',adminPassword=''}={}){
  const headers = {};
  if(body !== null) headers['content-type']='application/json';
  if(adminToken) headers['authorization']=`Bearer ${adminToken}`;
  else if(adminPassword) headers['x-admin-password']=adminPassword;
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
function readAdminLogs(){ return safeJsonParse(localStorage.getItem('vanz_admin_logs')||'[]',[]); }
function adminLog(action,status='ok',meta={}){
  const rows=readAdminLogs();
  rows.unshift({time:new Date().toISOString(),action:String(action||''),status:String(status||''),method:String(meta.method||'GET'),note:String(meta.note||'').slice(0,180)});
  localStorage.setItem('vanz_admin_logs',JSON.stringify(rows.slice(0,200)));
}
async function adminApi(a,{method='GET',body=null,query={}}={}){
  try{
    const out=await requestApi(a,{method,body,query,adminToken:sessionStorage.getItem('vanz_admin_token')||''});
    adminLog(a,'ok',{method});
    return out;
  }catch(e){
    adminLog(a,'error',{method,note:e.message});
    throw e;
  }
}

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
function allProducts(){ return state.owner.slice(); }
function getProduct(source,id){ return state.owner.find(p=>String(p.id)===String(id)||String(p.code)===String(id)); }
function isOrderSupplier(p){ return Boolean(p?.is_reseller); }
function sourceLabel(p){ return isOrderSupplier(p) ? 'Supplier' : 'Owner'; }
function stockLabel(stock){
  if(stock===0)return{text:'Stok habis',cls:'out'};
  if(stock!=null&&stock<5)return{text:`Sisa ${stock}`,cls:'low'};
  if(stock!=null)return{text:'Tersedia',cls:'ready'};
  return{text:'Cek detail',cls:''};
}
function shortDesc(text,fallback='Produk digital siap diproses otomatis.'){
  const s=String(text||fallback).replace(/\s+/g,' ').trim(); return s.length>128?`${s.slice(0,125)}…`:s;
}
function slidesList(){
  const slides=Array.isArray(state.store?.branding?.hero_slides)?state.store.branding.hero_slides:[];
  return slides.map(normalizeMediaUrl).filter(Boolean).length?slides.map(normalizeMediaUrl).filter(Boolean):DEFAULT_STORE.branding.hero_slides;
}
function brandMark(){ return String(state.store?.branding?.mark || state.store?.name?.[0] || 'V').trim().slice(0,2) || 'V'; }
function brandSubtitle(){ return String(state.store?.branding?.subtitle || 'PRODUK DIGITAL').trim() || 'PRODUK DIGITAL'; }
function brandLogo(){ return normalizeMediaUrl(state.store?.branding?.logo_url || ''); }
function heroBadges(){ return Array.isArray(state.store?.branding?.hero_badges) && state.store.branding.hero_badges.length ? state.store.branding.hero_badges : DEFAULT_STORE.branding.hero_badges; }
function heroTitle(){ return String(state.store?.branding?.hero_title || state.store?.tagline || DEFAULT_STORE.branding.hero_title).trim(); }
function heroSubtitle(){ return String(state.store?.branding?.hero_subtitle || state.store?.tagline || DEFAULT_STORE.branding.hero_subtitle).trim(); }
function footerNote(){ return String(state.store?.branding?.footer_note || DEFAULT_STORE.branding.footer_note).trim(); }
function receiptNote(){ return String(state.store?.branding?.receipt_note || DEFAULT_STORE.branding.receipt_note).trim(); }
function cleanText(v){ return String(v ?? '').replace(/[_-]+/g,' ').replace(/\s+/g,' ').trim(); }
function parseDeliveryItem(item){
  if(typeof item==='string'){
    const raw=item.trim();
    if(!raw) return {raw:''};
    try { return parseDeliveryItem(JSON.parse(raw)); } catch {}
    const parts=raw.split('|').map(x=>x.trim());
    if(parts.length>=2){
      return {title:parts[0].startsWith('http')?'Link akses':'Akun siap pakai', primary_label:parts[0].startsWith('http')?'Link':'Email / Username', primary:parts[0], secondary_label:'Password', secondary:parts[1], note:parts.slice(2).join(' | '), raw};
    }
    return {title:'Detail produk', note:raw, raw};
  }
  if(item && typeof item==='object'){
    if(Object.prototype.hasOwnProperty.call(item,'value')) return parseDeliveryItem(item.value);
    const primary = item.email || item.username || item.user || item.login || item.url || item.link || '';
    const secondary = item.password || item.pass || item.pw || item.pin || item.code || '';
    const note = item.note || item.catatan || item.description || item.desc || item.message || '';
    const extra = Object.entries(item).filter(([k])=>!['email','username','user','login','url','link','password','pass','pw','pin','code','note','catatan','description','desc','message'].includes(k)).map(([k,v])=>`${cleanText(k)}: ${typeof v==='object'?JSON.stringify(v):v}`);
    return {
      title: item.url || item.link ? 'Link akses' : 'Akun siap pakai',
      primary_label: item.url || item.link ? 'Link' : 'Email / Username',
      primary: primary ? String(primary) : '',
      secondary_label: secondary ? 'Password' : '',
      secondary: secondary ? String(secondary) : '',
      note: [note,...extra].filter(Boolean).join('\n'),
      raw: JSON.stringify(item)
    };
  }
  return {raw:String(item ?? '')};
}
function formatAccount(a){
  const p=parseDeliveryItem(a);
  const rows=[];
  if(p.primary) rows.push(`${p.primary_label}: ${p.primary}`);
  if(p.secondary) rows.push(`${p.secondary_label}: ${p.secondary}`);
  if(p.note) rows.push(`Catatan: ${p.note}`);
  return rows.length?rows.join('\n'):p.raw||'';
}
function renderCredentialCard(a, idx){
  const p=parseDeliveryItem(a);
  const copy=formatAccount(a);
  return `<article class="credential-card"><div class="credential-top"><div><span class="credential-chip">ITEM ${idx+1}</span><h3>${esc(p.title || 'Detail akun')}</h3></div><button class="btn btn-sm credential-copy" data-copy="${esc(copy)}">Salin</button></div>${p.primary?`<div class="credential-field"><span>${esc(p.primary_label||'Akun')}</span><strong>${esc(p.primary)}</strong></div>`:''}${p.secondary?`<div class="credential-field"><span>${esc(p.secondary_label||'Password')}</span><strong>${esc(p.secondary)}</strong></div>`:''}${p.note?`<div class="credential-note">${esc(p.note).replace(/\n/g,'<br>')}</div>`:''}</article>`;
}
function mountHeroSlider(){
  const root=$('[data-hero-slider]');
  if(!root) return;
  const track=$('.hero-slider-track',root), slides=$$('.hero-slide',root); if(!track||slides.length<2) return;
  let index=0;
  const update=()=>{ slides.forEach((el,i)=>el.classList.toggle('is-center',i===index)); track.style.transform=`translateX(calc(${(100/slides.length)*(-index)}% + ${index*6}px))`; };
  const next=()=>{ index=(index+1)%slides.length; update(); };
  const prev=()=>{ index=(index-1+slides.length)%slides.length; update(); };
  $('[data-slider-next]',root)?.addEventListener('click',next);
  $('[data-slider-prev]',root)?.addEventListener('click',prev);
  update();
  let t=setInterval(next,3500);
  root.addEventListener('mouseenter',()=>clearInterval(t));
  root.addEventListener('mouseleave',()=>{clearInterval(t); t=setInterval(next,3500);});
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
  const logo=brandLogo();
  app.innerHTML=`<div class="app-shell">
    <header class="site-header"><div class="wrap header-inner">
      <a class="brand" href="#/">${logo?`<span class="brand-logo"><img src="${esc(logo)}" alt="${esc(state.store.name)}"></span>`:`<span class="brand-mark">${esc(brandMark())}</span>`}<span class="brand-copy"><strong>${esc(state.store.name)}</strong><small>${esc(brandSubtitle())}</small></span></a>
      <nav class="nav-right">
        <a class="nav-link ${active==='catalog'?'active':''}" href="#/">Katalog</a>
        ${state.store.checkout?.mode==='shared'?'':`<a class="nav-link ${active==='topup'?'active':''}" href="#/isi-saldo">Isi Saldo</a>`}
        <a class="nav-link ${active==='orders'?'active':''}" href="#/pesanan">Pesanan</a>
        <a class="nav-link ${active==='account'?'active':''}" href="#/akun">${p?.verified?'Akun ✓':'Akun'}</a>
        <a class="icon-link ${active==='admin'?'active':''}" href="#/admin" title="Dashboard admin" aria-label="Dashboard admin">⚙</a>
      </nav>
    </div></header>
    ${content}
    <footer class="site-footer"><div class="wrap footer-inner"><div><b>${esc(state.store.name)}</b><span>${esc(state.store.tagline)}</span></div><small>${esc(footerNote())}</small></div></footer>
  </div>`;
}

async function loadCatalog(){
  state.source='all';state.q='';state.sort='store';
  app.innerHTML='<div class="boot-screen"><div class="loader"></div><span>Memuat VanzShop...</span></div>';
  try{
    const d=await api('init');
    state.owner=Array.isArray(d.products)?d.products:[];
    state.catalogSummary=d.catalog||null;
    state.store=mergeStore(d.store||DEFAULT_STORE);
    state.catalogLoaded=true;
    applyAppearance();
  }catch(e){
    state.catalogLoaded=false;
    state.store=mergeStore(DEFAULT_STORE);applyAppearance();
    shell(`<main class="page wrap"><div class="empty-card"><div class="empty-icon">!</div><h3>Katalog belum bisa dimuat</h3><p>${esc(e.message)}</p><button class="btn btn-primary" id="retry">Coba lagi</button></div></main>`,'catalog');
    $('#retry').onclick=loadCatalog;return;
  }
  const slides=slidesList();
  const hero=state.store.appearance?.hero!==false?`<section class="hero hero-brand wrap"><div class="hero-copy hero-copy-rich"><span class="section-kicker">${esc(state.store.name)} · full branding</span><h1>${esc(heroTitle()).replace(/\n/g,'<br>')}</h1><p>${esc(heroSubtitle())}</p><div class="hero-pills">${heroBadges().map(x=>`<span>${esc(x)}</span>`).join('')}</div><div class="hero-cta"><a class="btn btn-primary" href="#/akun">Isi data pembeli</a><a class="btn" href="#/pesanan">Lihat pesanan</a></div><div class="hero-metrics"><div><strong>${allProducts().length}</strong><span>produk aktif</span></div><div><strong>${esc(state.catalogSummary?.known_stock_total??'—')}</strong><span>stok live</span></div><div><strong>${esc(state.catalogSummary?.method||'GET')}</strong><span>sinkron katalog</span></div></div></div><div class="hero-showcase" data-hero-slider><button class="hero-arrow left" data-slider-prev aria-label="Slide sebelumnya">‹</button><div class="hero-slider-window"><div class="hero-slider-track">${slides.map((src,i)=>`<article class="hero-slide ${i===0?'is-center':''}"><img src="${esc(src)}" alt="Banner ${i+1}"></article>`).join('')}</div></div><button class="hero-arrow right" data-slider-next aria-label="Slide berikutnya">›</button></div></section>`:'';
  shell(`<main class="page">${hero}<section class="catalog wrap"><div class="catalog-head"><div><span class="section-kicker">Koleksi produk</span><h2>Pilih yang kamu butuhkan</h2></div><div class="mini-stats"><span><b id="countProducts">${allProducts().length}</b> produk</span><span><b>${esc(state.catalogSummary?.known_stock_total??'—')}</b> stok terhitung</span><span>${esc(state.catalogSummary?.method||'GET')} /v1/product</span></div></div><div class="filters"><div class="filter-scroll"><button class="chip active" data-filter="all">Semua</button><button class="chip" data-filter="owner">Owner</button><button class="chip" data-filter="supplier">Supplier</button></div><label class="search-wrap"><span>⌕</span><input id="search" autocomplete="off" placeholder="Cari produk..."></label><select id="sort" class="sort"><option value="store">Urutan toko</option><option value="sold">Terlaris</option><option value="new">Terbaru</option><option value="low">Harga terendah</option><option value="high">Harga tertinggi</option><option value="name">Nama A–Z</option></select></div><div id="grid" class="grid"></div></section></main>`,'catalog');
  $('#search').oninput=e=>{state.q=e.target.value.toLowerCase();drawGrid();};
  $('#sort').onchange=e=>{state.sort=e.target.value;drawGrid();};
  $$('.chip').forEach(b=>b.onclick=()=>{state.source=b.dataset.filter;$$('.chip').forEach(x=>x.classList.toggle('active',x===b));drawGrid();});
  drawGrid();
  mountHeroSlider();
}
function drawGrid(){
  let list=allProducts();
  if(state.source==='owner')list=list.filter(p=>!p.is_reseller);
  else if(state.source==='supplier')list=list.filter(p=>Boolean(p.is_reseller));
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
  if(!p?.verified) return `<div class="profile-callout warn"><div><b>Data pembeli opsional</b><span>Sewa Pay tidak membutuhkan user Xoftware. Simpan WhatsApp/Telegram hanya untuk kontak order lokal.</span></div><a class="btn btn-sm" href="#/akun">Isi data</a></div>`;
  return `<div class="profile-callout good"><div><b>${esc(p.name||'Pembeli')}</b><span>${p.channel==='telegram'?'Telegram ID':'WhatsApp'} · ${esc(p.sender||'—')}${p.email?` · ${esc(p.email)}`:''}</span></div><a class="btn btn-sm" href="#/akun">Ganti</a></div>`;
}
function detailHtml(p){
  const vs=variants(p),chosen=state.variantId??(vs[0]?.id??null),v=vs.find(x=>String(x.id)===String(chosen))||vs[0];state.variantId=v?.id??null;
  const price=Number(v?.price||productPrice(p)||0),stock=v?.stock??productStock(p),safeMax=stock==null?20:Math.max(1,Number(stock)||1);state.qty=Math.min(Math.max(1,state.qty),safeMax);
  const orderSupplier=isOrderSupplier(p),badge=stockLabel(stock),paymentReady=state.store.payment?.configured!==false,fulfillmentReady=state.store.checkout?.fulfillment==='automatic-xoftware-stock';
  shell(`<main class="detail wrap"><div class="crumb"><a href="#/">← Kembali</a><span>/</span><b>${esc(p.title)}</b></div><div class="detail-grid"><section class="detail-main"><div class="detail-product">${visualMarkup(p,'detail-visual')}<div class="detail-info"><div class="detail-head"><div><span class="section-kicker">${esc(brandCategory(p.title,p.code))} · ${orderSupplier?'supplier':'owner'}</span><h1>${esc(p.title)}</h1></div><span class="meta-stock ${badge.cls}">${esc(badge.text)}</span></div><p class="detail-desc">${esc(p.description||'Produk digital siap diproses otomatis.')}</p><div class="fact-grid"><div><small>Harga</small><strong>${money(price)}</strong></div><div><small>Stok Xoftware</small><strong>${stock==null?'—':Number(stock)}</strong></div><div><small>Pembayaran</small><strong>Sewa Pay</strong></div></div></div></div></section><aside class="buy-panel"><div class="panel-head"><h2>Pembelian</h2><span>Sewa Pay</span></div>${profileSummary()}${vs.length?`<div class="step-block"><div class="step-head"><span>1</span><b>Pilih varian</b></div><div class="variant-list">${vs.map(x=>{const active=String(x.id)===String(chosen),out=x.stock!=null&&Number(x.stock)<=0;return `<button type="button" class="variant ${active?'active':''} ${out?'disabled':''}" data-variant="${esc(x.id)}" ${out?'disabled':''}><span>${esc(x.name||x.title||'Varian')}</span><span><small>${x.stock==null?'':`Stok ${Number(x.stock)}`}</small><b>${money(x.price)}</b></span></button>`;}).join('')}</div></div>`:''}<div class="step-block"><div class="step-head"><span>${vs.length?2:1}</span><b>Jumlah</b></div><div class="qty"><button id="qtyMinus" type="button">−</button><b id="qtyVal">${state.qty}</b><button id="qtyPlus" type="button">+</button></div></div><div class="step-block"><div class="step-head"><span>${vs.length?3:2}</span><b>Pembayaran</b></div><div class="payment-card"><div class="payment-icon">QR</div><div><b>QRIS · Sewa Pay</b><small>Nominal dihitung server dari harga katalog Xoftware. Fee gateway ditambahkan oleh Sewa Pay pada invoice.</small></div></div></div><div class="summary"><div><span>${esc(v?.name||v?.title||p.title)}</span><b id="sumUnit">${money(price)}</b></div><div><span>Jumlah</span><b id="sumQty">×${state.qty}</b></div><div class="summary-total"><span>Subtotal</span><strong id="sumTotal">${money(price*state.qty)}</strong></div></div><button class="btn btn-primary btn-buy" id="buyNow" type="button" ${(!paymentReady||!fulfillmentReady||stock===0)?'disabled':''}>${!paymentReady?'Sewa Pay belum dikonfigurasi':!fulfillmentReady?'Auto-delivery belum dikonfigurasi':stock===0?'Stok habis':'Bayar dengan QRIS'}</button><div class="secure-note">Katalog + stok dari Xoftware · pembayaran Sewa Pay · setelah COMPLETED akun di-claim otomatis dari stok aktif Xoftware.</div></aside></div></main>`,'catalog');
  $$('.variant').forEach(btn=>btn.onclick=()=>{state.variantId=btn.dataset.variant;state.qty=1;renderRoute();});
  $('#qtyMinus').onclick=()=>{state.qty=Math.max(1,state.qty-1);refreshTotal(p);};
  $('#qtyPlus').onclick=()=>{const raw=v?.stock??productStock(p),max=raw==null?20:Math.max(1,Math.min(20,Number(raw)||1));state.qty=Math.min(max,state.qty+1);refreshTotal(p);};
  $('#buyNow').onclick=()=>startCheckout(p);
}
function refreshTotal(p){const vs=variants(p),v=vs.find(x=>String(x.id)===String(state.variantId))||vs[0],price=Number(v?.price||productPrice(p)||0);$('#qtyVal').textContent=state.qty;$('#sumUnit').textContent=money(price);$('#sumQty').textContent=`×${state.qty}`;$('#sumTotal').textContent=money(price*state.qty);}
function priceFrom(p){const vs=variants(p);return Number(vs.find(x=>String(x.id)===String(state.variantId))?.price||productPrice(p)||0);}
async function startCheckout(p){
  const prof=profile()||{};
  const vs=variants(p),v=vs.find(x=>String(x.id)===String(state.variantId))||vs[0],sku=String(v?.code||p.code||'').trim();
  if(!sku){toast('SKU produk/varian tidak tersedia.',true);return;}
  if(state.busy)return;state.busy=true;const btn=$('#buyNow');if(btn){btn.disabled=true;btn.textContent='Membuat invoice Sewa Pay...';}
  try{
    const result=await api('payment_create',{product_id:p.id,variation_id:v?.id??null,code:sku,quantity:state.qty,method:'QRIS'});
    const d=result?.payment||{},paymentId=String(d?.id||'');if(!paymentId)throw new Error('Sewa Pay tidak mengembalikan payment id.');
    saveLocalOrder({type:'sewapay',provider:'sewapay',transaction_id:paymentId,reference:String(d?.reference||''),payment_token:String(result?.payment_token||''),sender:prof.sender||'',channel:prof.channel||'',email:prof.email||'',product_id:result?.order?.product_id??p.id,variation_id:result?.order?.variation_id??v?.id??null,sku:result?.order?.code||sku,product_title:result?.order?.product_title||p.title,variant:result?.order?.variant_title||v?.title||v?.name||'',quantity:result?.order?.quantity||state.qty,unit_price:Number(result?.order?.unit_price||priceFrom(p)),amount:Number(d?.amount||result?.order?.unit_price*state.qty||0),fee:Number(d?.fee||0),total:Number(d?.total_payment||d?.amount||priceFrom(p)*state.qty),status:String(d?.status||'PENDING').toLowerCase()==='completed'?'success':'pending',qr_string:d?.payment_data?.qr_string||'',expires_at:d?.expires_at||'',fulfillment:'pending',created_at:Date.now()});
    location.hash=`#/bayar/${encodeURIComponent(paymentId)}`;
  }catch(e){toast(e.message,true);if(btn){btn.disabled=false;btn.textContent='Bayar dengan QRIS';}}
  finally{state.busy=false;}
}

function renderAccount(){
  const old=profile()||{channel:'whatsapp',sender:'',name:'',email:''};
  shell(`<main class="account-page wrap"><div class="page-head"><div><span class="section-kicker">Data Pembeli</span><h1>Kontak order</h1><p>Sewa Pay tidak membutuhkan registrasi Xoftware. Data ini opsional dan disimpan lokal di browser untuk memudahkan kontak.</p></div><a class="btn" href="#/">← Katalog</a></div><div class="account-grid"><section class="account-card"><div class="channel-tabs"><button class="chip ${old.channel!=='telegram'?'active':''}" data-channel="whatsapp">WhatsApp</button><button class="chip ${old.channel==='telegram'?'active':''}" data-channel="telegram">Telegram ID</button></div><label class="form-field"><span>Nama</span><input id="accountName" class="input big" maxlength="120" placeholder="Nama pembeli" value="${esc(old.name||'')}"></label><label class="form-field"><span id="senderLabel">${old.channel==='telegram'?'Telegram ID':'Nomor WhatsApp'}</span><input id="accountSender" class="input big" placeholder="${old.channel==='telegram'?'Telegram ID':'08xxxxxxxxxx'}" value="${esc(old.sender||'')}"></label><label class="form-field"><span>Email <small>(opsional)</small></span><input id="accountEmail" class="input big" type="email" placeholder="nama@email.com" value="${esc(old.email||'')}"></label><button id="prepareUser" class="btn btn-primary btn-buy" type="button">Simpan data</button><div id="registrationStatus">${old.verified?`<div class="status-card good"><b>Data tersimpan</b><span>${esc(old.name||'Pembeli')} · ${esc(old.sender||'—')}</span></div>`:''}</div></section><aside class="account-info"><h2>Tidak ada registrasi Xoftware</h2><ol><li>Katalog dan stok tetap dibaca dari <code>/v1/product</code>.</li><li>Invoice dibuat lewat Sewa Pay.</li><li>Status pembayaran dicek ke Sewa Pay.</li><li>User Xoftware tidak diperlukan untuk membuat invoice.</li></ol><div class="doc-note"><b>Auto fulfillment</b><span>Sesudah Sewa Pay COMPLETED, backend mengklaim akun dari stok aktif Xoftware dan menghapus record stok tersebut dengan idempotency Redis agar payment yang sama tidak mengambil stok dua kali.</span></div></aside></div></main>`,'account');
  let channel=old.channel==='telegram'?'telegram':'whatsapp';
  $$('.channel-tabs .chip').forEach(b=>b.onclick=()=>{channel=b.dataset.channel;$$('.channel-tabs .chip').forEach(x=>x.classList.toggle('active',x===b));$('#senderLabel').textContent=channel==='telegram'?'Telegram ID':'Nomor WhatsApp';});
  $('#prepareUser').onclick=()=>{
    const name=String($('#accountName').value||'').trim(),raw=String($('#accountSender').value||'').trim(),email=String($('#accountEmail').value||'').trim().toLowerCase();
    const sender=channel==='telegram'?raw:phoneNormalize(raw);
    if(email&&!emailOk(email)){toast('Email tidak valid.',true);return;}
    if(sender && (channel==='telegram'?!telegramOk(sender):!phoneOk(sender))){toast(channel==='telegram'?'Telegram ID tidak valid.':'Nomor WhatsApp tidak valid.',true);return;}
    saveProfile({channel,sender,name:name||'Pembeli',email,verified:true,checkout_mode:'sewapay',checked_at:Date.now()});
    toast('Data pembeli disimpan di browser.');renderAccount();
  };
}

function renderTopup(){
  if(state.store.checkout?.mode==='shared'){shell(`<main class="topup wrap"><div class="empty-card"><div class="empty-icon">!</div><h3>Isi saldo publik dimatikan pada mode shared</h3><p>Deposit Xoftware akan masuk ke akun shared sender, bukan saldo pembeli. Karena itu fitur ini sengaja tidak ditampilkan ke customer.</p><a class="btn btn-primary" href="#/">Kembali ke katalog</a></div></main>`,'topup');return;}
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
  const o=orders().find(x=>String(x.transaction_id)===String(txid));if(!o){toast('Pesanan tidak ditemukan.',true);location.hash='#/pesanan';return;}
  const provider=o.provider||'xoftware';
  shell(`<main class="invoice wrap"><div class="crumb"><a href="#/pesanan">← Pesanan</a><span>/</span><b>Pembayaran</b></div><div class="invoice-grid"><section class="invoice-main"><div class="invoice-badge" id="invoiceBadge">MENUNGGU PEMBAYARAN</div><h1>${esc(o.product_title)}</h1><p>${esc(o.variant||'')} · ${esc(provider==='sewapay'?'Sewa Pay':'Xoftware')}</p><div class="payment-box">${o.qr_string?'<div class="qr" id="qr"></div>':''}<div class="pay-data"><span>Total dibayar</span><strong>${money(o.total)}</strong><small>${o.fee?`Subtotal ${money(o.amount)} + fee ${money(o.fee)}`:'Scan QRIS untuk menyelesaikan pembayaran.'}</small></div></div></section><aside class="invoice-side"><div><span>Payment ID</span><b>${esc(o.transaction_id)}</b></div><div><span>Reference</span><b>${esc(o.reference||'—')}</b></div><div><span>Status</span><b id="invoiceStatus">Menunggu</b></div><div><span>Fulfillment</span><b id="fulfillmentStatus">${esc(o.fulfillment||'Menunggu payment')}</b></div><button class="btn" id="checkNow">Cek status</button>${provider==='sewapay'?'<button class="btn" id="cancelPayment">Batalkan</button>':''}</aside></div></main>`,'orders');
  if(o.qr_string&&window.QRCode&&$('#qr')){try{new QRCode($('#qr'),{text:o.qr_string,width:220,height:220,colorDark:'#111',colorLight:'#fff'});}catch{}}
  $('#checkNow').onclick=()=>refreshInvoice(o);
  const cancel=$('#cancelPayment');if(cancel)cancel.onclick=async()=>{if(!confirm('Batalkan payment yang masih PENDING?'))return;try{await api('payment_cancel',{payment_token:o.payment_token});o.status='cancelled';saveLocalOrder(o);toast('Payment dibatalkan.');renderPayment(o.transaction_id);}catch(e){toast(e.message,true);}};
  if(timer)clearInterval(timer);timer=setInterval(()=>refreshInvoice(o),5000);refreshInvoice(o);
}
async function refreshInvoice(o){
  try{
    if(o.provider==='sewapay'){
      if(!o.payment_token) throw new Error('Pesanan tidak memiliki payment token.');
      const data=await api('payment_status',{id:o.transaction_id,reference:o.reference||'',payment_token:o.payment_token});
      const d=data?.payment||{},status=String(data?.status||'pending').toLowerCase(),f=data?.fulfillment||{};
      o.status=status;o.fee=Number(d?.fee??o.fee??0);o.amount=Number(d?.amount??o.amount??0);o.total=Number(d?.total_payment??(o.amount+o.fee)??o.total);o.fulfillment=f?.status||o.fulfillment;o.accounts=Array.isArray(f?.accounts)?f.accounts.map(x=>x?.value??x):o.accounts||[];o.fulfillment_error=f?.error||f?.last_error||'';saveLocalOrder(o);
      const el=$('#invoiceStatus');if(el)el.textContent=status==='success'?'Pembayaran berhasil':status==='fail'?'Gagal':status==='cancelled'?'Dibatalkan':'Menunggu';
      const fe=$('#fulfillmentStatus');if(fe)fe.textContent=o.fulfillment==='fulfilled'?'Akun sudah di-claim':status==='success'?(o.fulfillment_error||'Mengambil stok Xoftware...'):'Menunggu payment';
      if(status==='success'&&o.fulfillment==='fulfilled'){clearInterval(timer);timer=null;showSuccess(o,o.accounts||[]);}else if(['fail','cancelled'].includes(status)){clearInterval(timer);timer=null;}
      return;
    }
    if(!o.status_token)throw new Error('Pesanan lama tidak memiliki token status.');const data=await api('order_status',{transaction_id:o.transaction_id,status_token:o.status_token}),d=data?.transaction||{},status=String(d?.status||'').toLowerCase();if(status){o.status=status;o.accounts=d?.accounts||[];if(d?.total!=null||d?.total_to_pay!=null)o.total=Number(d?.total??d?.total_to_pay);saveLocalOrder(o);}const el=$('#invoiceStatus');if(el)el.textContent=status==='success'?'Selesai':status==='fail'?'Gagal':'Menunggu';if(status==='success'){clearInterval(timer);timer=null;showSuccess(o,d?.accounts||[]);}else if(status==='fail'){clearInterval(timer);timer=null;toast('Pembayaran gagal atau dibatalkan.',true);}
  }catch(e){if(String(e.message).toLowerCase().includes('token')){if(timer){clearInterval(timer);timer=null;}}toast(e.message,true);}
}
function showSuccess(o,accountsOverride){
  if(timer){clearInterval(timer);timer=null;}
  const acc=Array.isArray(accountsOverride)&&accountsOverride.length?accountsOverride:(Array.isArray(o.accounts)?o.accounts:[]);
  const sewa=o.provider==='sewapay';
  shell(`<main class="success wrap"><div class="success-card success-card-rich"><div class="success-mark">✓</div><span class="section-kicker">${sewa?'Payment + fulfillment completed':'Pesanan berhasil'}</span><h1>${sewa?'Pesanan siap dikirim':'Pesanan selesai'}</h1><p>${sewa?'Pembayaran Sewa Pay sudah selesai dan stok akun Xoftware sudah di-claim untuk transaksi ini.':'Detail produk sudah tersedia.'}</p><div class="success-meta"><span>${esc(o.product_title)}</span><span>${money(o.total)}</span>${sewa?`<span>Reference: ${esc(o.reference||'—')}</span>`:''}</div>${acc.length?`<div class="accounts"><div class="accounts-head"><div><b>Detail akun / produk</b><small>${esc(receiptNote())}</small></div><button class="btn btn-sm" id="copyAll">Salin semua</button></div><div class="credential-grid">${acc.map((a,i)=>renderCredentialCard(a,i)).join('')}</div></div>`:`<div class="registration-blocked"><b>Fulfillment belum selesai</b><span>${esc(o.fulfillment_error||'Cek status lagi. Jika stok aktif Xoftware tersedia, sistem akan retry claim tanpa mengambil dua kali.')}</span><button class="btn btn-sm" id="retryFulfillment">Retry claim</button></div>`}<div class="success-actions"><a class="btn btn-primary" href="#/pesanan">Pesanan</a><a class="btn" href="#/">Katalog</a></div></div></main>`,'orders');
  const b=$('#copyAll');if(b)b.onclick=async()=>{try{await navigator.clipboard.writeText(acc.map(formatAccount).join('\n\n'));toast('Detail disalin.');}catch{toast('Gagal menyalin otomatis.',true);}};
  $$('.credential-copy').forEach(btn=>btn.onclick=async()=>{try{await navigator.clipboard.writeText(btn.dataset.copy||'');toast('Detail akun disalin.');}catch{toast('Clipboard gagal.',true);}});
  const retry=$('#retryFulfillment');if(retry)retry.onclick=async()=>{retry.disabled=true;retry.textContent='Claiming...';try{const r=await api('fulfillment_retry',{payment_token:o.payment_token});const a=(r?.fulfillment?.accounts||[]).map(x=>x?.value??x);o.accounts=a;o.fulfillment=r?.fulfillment?.status||'pending';o.fulfillment_error=r?.fulfillment?.last_error||'';saveLocalOrder(o);if(o.fulfillment==='fulfilled')showSuccess(o,a);else{toast(o.fulfillment_error||'Fulfillment belum selesai.',true);retry.disabled=false;retry.textContent='Retry claim';}}catch(e){toast(e.message,true);retry.disabled=false;retry.textContent='Retry claim';}};
}

function adminToken(){return sessionStorage.getItem('vanz_admin_token')||'';}
function adminTabs(active){
  const groups=[
    ['System', [['overview','Overview'],['api','API Health'],['payment','Sewa Pay'],['diagnostics','Endpoint Lab'],['endpoint-map','API Map'],['limits','Limits']]],
    ['Order API', [['catalog','Catalog'],['supplier','Supplier'],['users','User Tools'],['balance','Balance'],['register','Register'],['qris','QRIS'],['balance-order','Order Saldo'],['deposit-admin','Deposit'],['status-admin','Status'],['browser-orders','Browser Orders'],['webhook-info','Webhook']]],
    ['Product Management', [['products','Products'],['product-detail','Product Detail'],['variations','Variations'],['stock','Stock'],['forms','Forms']]],
    ['Store Tools', [['pricing','Pricing'],['appearance','Theme'],['environment','Environment'],['security','Security'],['logs','Logs']]],
  ];
  return `<aside class="admin-sidebar">${groups.map(([title,items])=>`<div class="admin-nav-group"><b>${title}</b>${items.map(([id,label])=>`<a class="${active===id?'active':''}" href="#/admin/${id}">${label}</a>`).join('')}</div>`).join('')}</aside>`;
}
async function renderAdmin(section='overview'){
  if(!adminToken())return renderAdminLogin();
  shell(`<main class="admin wrap"><div class="admin-head"><div><span class="section-kicker">Dashboard Admin · ${BUILD_ID}</span><h1>VanzShop Control Center</h1><p>Semua endpoint yang terdokumentasi di README + tool operasional toko, tanpa mengarang endpoint provider.</p></div><div class="button-row"><a class="btn" href="#/">Buka toko</a><button class="btn" id="adminLogout">Keluar</button></div></div><div class="admin-layout">${adminTabs(section)}<div id="adminContent" class="admin-content"><div class="loading-card"><div class="loader"></div><span>Memuat dashboard...</span></div></div></div></main>`,'admin');
  $('#adminLogout').onclick=()=>{sessionStorage.removeItem('vanz_admin_token');renderAdminLogin();};
  try{await adminApi('admin_ping');}catch(e){sessionStorage.removeItem('vanz_admin_token');toast(e.message,true);return renderAdminLogin();}
  const routes={
    overview:adminOverview, api:adminApiHealth, payment:adminSewaPay, diagnostics:adminDiagnostics, 'endpoint-map':adminEndpointMap, limits:adminLimits,
    catalog:adminCatalog, supplier:adminSuppliers, users:adminUsers, balance:adminBalance, register:adminRegister,
    qris:adminQris, 'balance-order':adminBalanceOrder, 'deposit-admin':adminDeposit, 'status-admin':adminStatus,
    'browser-orders':adminBrowserOrders, 'webhook-info':adminWebhook,
    products:adminProducts, 'product-detail':adminProductDetail, variations:adminVariations, stock:adminStock, forms:adminForms,
    pricing:adminPricing, appearance:adminAppearance, environment:adminEnvironment, security:adminSecurity, logs:adminLogsView,
  };
  return (routes[section]||adminOverview)();
}
function renderAdminLogin(){
  shell(`<main class="admin-login wrap"><section class="login-card"><span class="section-kicker">Admin</span><h1>Dashboard toko</h1><p>Password ini dibandingkan dengan <code>ADMIN_PASSWORD</code> di server.</p><label class="form-field"><span>Admin password</span><input id="adminPassword" class="input big" type="password" autocomplete="current-password" placeholder="Masukkan password"></label><button id="adminLoginBtn" class="btn btn-primary btn-buy">Masuk dashboard</button></section></main>`,'admin');
  $('#adminLoginBtn').onclick=async()=>{
    const pw=String($('#adminPassword').value||'').trim();
    if(!pw){toast('Password wajib diisi.',true);return;}
    const btn=$('#adminLoginBtn'); btn.disabled=true; btn.textContent='Memeriksa...';
    try{
      const login=await requestApi('admin_login',{method:'POST',body:{password:pw}});
      if(!login?.token) throw new Error('Server tidak mengembalikan admin token.');
      sessionStorage.setItem('vanz_admin_token',login.token);
      location.hash='#/admin/overview';
      await renderAdmin('overview');
    }catch(e){
      sessionStorage.removeItem('vanz_admin_token');
      toast(e.message,true);
      btn.disabled=false; btn.textContent='Masuk dashboard';
    }
  };
  $('#adminPassword').onkeydown=e=>{if(e.key==='Enter')$('#adminLoginBtn').click();};
}
async function adminOverview(){
  const box=$('#adminContent');
  box.innerHTML='<div class="loading-card"><div class="loader"></div><span>Menguji koneksi /v1/product...</span></div>';
  try{
    const [h,c]=await Promise.all([api('health'),adminApi('catalog_probe')]);
    const m=c?.summary||{};
    box.innerHTML=`<div class="admin-grid">
      <section class="admin-panel"><h2>Koneksi Xoftware</h2><div class="kv"><span>Build aktif</span><b>${esc(h.build||BUILD_ID)}</b></div><div class="kv"><span>Base URL</span><b>${esc(h.base_url)}</b></div><div class="kv"><span>API key</span><b>${h.ready?'Configured':'Missing'}</b></div><div class="kv"><span>Katalog publik</span><b>${esc(h.catalog_endpoint)}</b></div><div class="kv"><span>Method berhasil</span><b>${esc(m.method||'—')}</b></div></section>
      <section class="admin-panel"><h2>Sinkron katalog</h2><div class="kv"><span>Produk</span><b>${esc(m.count??0)}</b></div><div class="kv"><span>Stok terhitung</span><b>${esc(m.known_stock_total??0)}</b></div><div class="kv"><span>Stok unknown</span><b>${esc(m.unknown_stock_products??0)}</b></div><div class="kv"><span>Supplier is_reseller</span><b>${esc(m.supplier_products??0)}</b></div></section>
      <section class="admin-panel wide"><div class="panel-title"><h2>Source of truth</h2><button id="probeAgain" class="btn btn-primary">Refresh /v1/product</button></div><p class="muted">Storefront hanya membaca katalog Order API yang terdokumentasi di README: <code>GET/POST /v1/product</code>. Produk supplier ditandai oleh field <code>is_reseller</code>. Endpoint <code>/v1/reseller-api/*</code> tidak dipakai karena detail kontraknya tidak ada di README project ini.</p><p class="muted">Manajemen katalog owner memakai <code>/v1/products</code>; stok aktif dapat dilihat lewat <code>/v1/products/:id/stocks</code>. Batas README: 20 produk/page, 100 stok/request, 30 variasi/produk.</p></section>
      <section class="admin-panel wide"><h2>Preview data normalisasi</h2><pre>${esc(JSON.stringify((c?.products||[]).slice(0,5),null,2))}</pre></section>
    </div>`;
    $('#probeAgain').onclick=()=>adminOverview();
  }catch(e){
    box.innerHTML=`<div class="status-card bad"><b>Koneksi katalog gagal</b><span>${esc(e.message)}</span></div>`;
  }
}

function diagnosticError(e){
  return {ok:false,message:String(e?.message||'Diagnostic gagal.'),status:Number(e?.status||0)||null,details:e?.details??null};
}
function diagnosticOutput(id,data,bad=false){
  const el=$(`#${id}`); if(!el)return;
  el.innerHTML=`<pre class="${bad?'diag-bad':''}">${esc(JSON.stringify(data,null,2))}</pre>`;
}
function adminDiagnostics(){
  const p=profile()||{};
  const defaultSku=String(state.owner?.[0]?.variations?.[0]?.code||state.owner?.[0]?.code||'');
  const box=$('#adminContent');
  box.innerHTML=`<div class="admin-grid diag-grid">
    <section class="admin-panel wide"><div class="panel-title"><div><h2>Endpoint Lab · 11 test panels</h2><p class="muted">Read-only endpoint dapat dites langsung. Register/QRIS meminta konfirmasi karena membuat data/invoice nyata.</p></div><span class="build-chip">${BUILD_ID}</span></div></section>
    <section class="admin-panel"><h2>1 · /v1/product</h2><p class="muted">GET → fallback POST.</p><button id="diagProduct" class="btn btn-primary">Test katalog</button><div id="diagProductOut" class="admin-result"></div></section>
    <section class="admin-panel"><h2>2 · /v1/balance</h2><label class="form-field"><span>Channel</span><select id="diagBalanceChannel" class="input big"><option value="whatsapp">WhatsApp</option><option value="telegram">Telegram</option></select></label><label class="form-field"><span>Sender</span><input id="diagBalanceSender" class="input big" value="${esc(p.sender||'')}"></label><button id="diagBalance" class="btn">Test balance</button><div id="diagBalanceOut" class="admin-result"></div></section>
    <section class="admin-panel"><h2>3 · /v1/register</h2><div class="diag-warning">MUTATING · max 3 register/menit.</div><label class="form-field"><span>Channel</span><select id="diagRegisterChannel" class="input big"><option value="whatsapp">WhatsApp</option><option value="telegram">Telegram</option></select></label><label class="form-field"><span>Sender baru</span><input id="diagRegisterSender" class="input big"></label><label class="form-field"><span>Nama</span><input id="diagRegisterName" class="input big"></label><button id="diagRegister" class="btn danger">REGISTER nyata</button><div id="diagRegisterOut" class="admin-result"></div></section>
    <section class="admin-panel"><h2>4 · /v1/order/qris</h2><div class="diag-warning">MUTATING · membuat invoice nyata.</div><label class="form-field"><span>Channel</span><select id="diagQrisChannel" class="input big"><option value="whatsapp">WhatsApp</option><option value="telegram">Telegram</option></select></label><label class="form-field"><span>Sender</span><input id="diagQrisSender" class="input big" value="${esc(p.sender||'')}"></label><label class="form-field"><span>SKU</span><input id="diagQrisCode" class="input big" value="${esc(defaultSku)}"></label><label class="form-field"><span>Qty</span><input id="diagQrisQty" class="input big" type="number" min="1" value="1"></label><button id="diagQris" class="btn danger">Buat invoice</button><div id="diagQrisOut" class="admin-result"></div></section>
    <section class="admin-panel"><h2>5 · /v1/order/status</h2><label class="form-field"><span>Transaction ID</span><input id="diagStatusId" class="input big"></label><button id="diagStatus" class="btn">Test status</button><div id="diagStatusOut" class="admin-result"></div></section>
    <section class="admin-panel"><h2>6 · /v1/products/forms</h2><button id="diagForms" class="btn">Test forms</button><div id="diagFormsOut" class="admin-result"></div></section>
    <section class="admin-panel"><h2>7 · /v1/products/</h2><label class="form-field"><span>Search</span><input id="diagProductsSearch" class="input big"></label><button id="diagProducts" class="btn">Test product list</button><div id="diagProductsOut" class="admin-result"></div></section>
    <section class="admin-panel"><h2>8 · /v1/products/:id</h2><label class="form-field"><span>Product ID</span><input id="diagProductId" class="input big"></label><button id="diagProductDetail" class="btn">Test detail</button><div id="diagProductDetailOut" class="admin-result"></div></section>
    <section class="admin-panel"><h2>9 · /v1/products/variations/:id</h2><label class="form-field"><span>Variation ID</span><input id="diagVariationId" class="input big"></label><button id="diagVariation" class="btn">Test variation</button><div id="diagVariationOut" class="admin-result"></div></section>
    <section class="admin-panel"><h2>10 · /v1/products/:id/stocks</h2><label class="form-field"><span>Product ID</span><input id="diagStockProduct" class="input big"></label><label class="form-field"><span>Variation ID (optional)</span><input id="diagStockVariation" class="input big"></label><button id="diagStocks" class="btn">Test stocks</button><div id="diagStocksOut" class="admin-result"></div></section>
    <section class="admin-panel"><h2>11 · Health gateway</h2><p class="muted">Tidak ke Xoftware; cek build/env gateway.</p><button id="diagHealth" class="btn">Test health</button><div id="diagHealthOut" class="admin-result"></div></section>
  </div>`;
  const run=async(id,fn)=>{diagnosticOutput(id,{running:true});try{diagnosticOutput(id,await fn());}catch(e){diagnosticOutput(id,diagnosticError(e),true);}};
  $('#diagProduct').onclick=()=>run('diagProductOut',()=>adminApi('diag_product'));
  $('#diagBalance').onclick=()=>run('diagBalanceOut',()=>adminApi('diag_balance',{method:'POST',body:{channel:$('#diagBalanceChannel').value,sender:$('#diagBalanceSender').value}}));
  $('#diagRegister').onclick=()=>{if(confirm('Benar-benar panggil /v1/register?'))run('diagRegisterOut',()=>adminApi('diag_register',{method:'POST',body:{channel:$('#diagRegisterChannel').value,sender:$('#diagRegisterSender').value,name:$('#diagRegisterName').value}}));};
  $('#diagQris').onclick=()=>{if(confirm('Benar-benar buat invoice QRIS?'))run('diagQrisOut',()=>adminApi('diag_qris',{method:'POST',body:{channel:$('#diagQrisChannel').value,sender:$('#diagQrisSender').value,code:$('#diagQrisCode').value,quantity:Number($('#diagQrisQty').value||1)}}));};
  $('#diagStatus').onclick=()=>run('diagStatusOut',()=>adminApi('diag_order_status',{method:'POST',body:{transaction_id:$('#diagStatusId').value}}));
  $('#diagForms').onclick=()=>run('diagFormsOut',()=>adminApi('pm_forms'));
  $('#diagProducts').onclick=()=>run('diagProductsOut',()=>adminApi('pm_products',{query:{page:1,limit:20,search:$('#diagProductsSearch').value.trim()}}));
  $('#diagProductDetail').onclick=()=>run('diagProductDetailOut',()=>adminApi('pm_product',{query:{id:$('#diagProductId').value.trim()}}));
  $('#diagVariation').onclick=()=>run('diagVariationOut',()=>adminApi('pm_variation',{query:{id:$('#diagVariationId').value.trim()}}));
  $('#diagStocks').onclick=()=>run('diagStocksOut',()=>adminApi('pm_stocks',{query:{product_id:$('#diagStockProduct').value.trim(),variation_id:$('#diagStockVariation').value.trim(),page:1,limit:100}}));
  $('#diagHealth').onclick=()=>run('diagHealthOut',()=>api('health'));
}

function adminUsers(){
  const box=$('#adminContent');box.innerHTML=`<div class="admin-grid"><section class="admin-panel"><h2>Register user</h2><label class="form-field"><span>Channel</span><select id="auChannel" class="input big"><option value="whatsapp">WhatsApp</option><option value="telegram">Telegram ID</option></select></label><label class="form-field"><span>Sender</span><input id="auSender" class="input big" placeholder="08... / Telegram ID"></label><label class="form-field"><span>Nama</span><input id="auName" class="input big" placeholder="Nama user"></label><button id="auRegister" class="btn btn-primary">Register ke Xoftware</button></section><section class="admin-panel"><h2>Cek user / saldo</h2><label class="form-field"><span>Sender</span><input id="auCheckSender" class="input big" placeholder="Sender terdaftar"></label><button id="auCheck" class="btn">Cek /v1/balance</button><div id="auResult" class="admin-result"></div></section></div>`;
  $('#auRegister').onclick=async()=>{try{const channel=$('#auChannel').value,raw=$('#auSender').value,sender=channel==='whatsapp'?phoneNormalize(raw):String(raw).trim(),name=$('#auName').value.trim();const r=await adminApi('owner_register',{method:'POST',body:{channel,sender,name}});toast(r?.message||'User berhasil diregistrasi.');}catch(e){toast(e.message,true);}};
  $('#auCheck').onclick=async()=>{try{const sender=$('#auCheckSender').value.trim();const r=await adminApi('owner_balance',{method:'POST',body:{sender}});$('#auResult').innerHTML=`<pre>${esc(JSON.stringify(r,null,2))}</pre>`;}catch(e){$('#auResult').innerHTML=`<div class="status-card bad">${esc(e.message)}</div>`;}};
}
async function adminProducts(){
  const box=$('#adminContent');
  box.innerHTML=`<div class="admin-toolbar"><input id="apSearch" class="input big" placeholder="Cari produk / SKU"><select id="apVarFilter" class="input"><option value="">Semua tipe</option><option value="false">Tunggal</option><option value="true">Variasi</option></select><button id="apLoad" class="btn">Refresh</button><button id="apNew" class="btn btn-primary">Produk baru</button></div><div id="apForm"></div><div id="apList" class="admin-table-wrap"><div class="loading-card"><div class="loader"></div></div></div>`;
  const load=async()=>{try{const r=await adminApi('pm_products',{query:{page:1,limit:20,search:$('#apSearch').value.trim(),is_variation:$('#apVarFilter').value}}),data=r?.data??r,items=Array.isArray(data?.products)?data.products:(Array.isArray(r?.products)?r.products:[]),pg=data?.pagination||{};$('#apList').innerHTML=`<div class="table-meta"><span>${esc(pg.total??items.length)} total</span><span>page ${esc(pg.page??1)} / ${esc(pg.total_pages??1)}</span></div><table class="admin-table"><thead><tr><th>ID</th><th>Produk</th><th>SKU</th><th>Harga</th><th>Profit</th><th>Stok</th><th>Show</th><th></th></tr></thead><tbody>${items.map(x=>`<tr><td>${esc(x.id)}</td><td><b>${esc(x.title)}</b><small>${x.is_variation?'Variasi':'Tunggal'} · sold ${esc(x.sold??0)}</small></td><td>${esc(x.code||'—')}</td><td>${money(x.price)}</td><td>${money(x.profit)}</td><td>${esc(x.stock_count??'—')}</td><td>${x.is_show===false?'No':'Yes'}</td><td><button class="btn btn-sm ap-edit" data-id="${esc(x.id)}">Edit</button></td></tr>`).join('')}</tbody></table>`;$$('.ap-edit').forEach(b=>b.onclick=async()=>{try{const full=await adminApi('pm_product',{query:{id:b.dataset.id}});showProductForm(full?.data??full);}catch(e){toast(e.message,true);}});}catch(e){$('#apList').innerHTML=`<div class="status-card bad">${esc(e.message)}</div>`;}};
  const showProductForm=(x=null)=>{const edit=Boolean(x?.id), tiers=x?.wholesale_tiers?JSON.stringify(x.wholesale_tiers,null,2):'';$('#apForm').innerHTML=`<section class="admin-panel wide product-editor"><div class="panel-title"><div><h2>${edit?'Edit produk #'+esc(x.id):'Produk baru'}</h2><p class="muted">Field mengikuti README Product Management.</p></div>${edit?`<button id="apDelete" class="btn danger">Hapus produk</button>`:''}</div><div class="form-grid"><label class="form-field"><span>Title *</span><input id="apTitle" class="input big" maxlength="100" value="${esc(x?.title||'')}"></label><label class="form-field"><span>SKU ${x?.is_variation?'(tidak dipakai jika variation)':'*'}</span><input id="apCode" class="input big" maxlength="50" value="${esc(x?.code||'')}"></label><label class="form-field"><span>Harga</span><input id="apPrice" class="input big" type="number" min="0" value="${esc(x?.price??'')}"></label><label class="form-field"><span>Profit</span><input id="apProfit" class="input big" type="number" min="0" value="${esc(x?.profit??'')}"></label><label class="form-field"><span>Form ID</span><input id="apFormId" class="input big" type="number" min="1" value="${esc(x?.form??'')}"></label><label class="check-field"><input id="apVar" type="checkbox" ${x?.is_variation?'checked':''}><span>Produk variasi</span></label>${edit?`<label class="check-field"><input id="apShow" type="checkbox" ${x?.is_show===false?'':'checked'}><span>Tampilkan produk (is_show)</span></label>`:''}</div><label class="form-field"><span>Deskripsi (max 5000)</span><textarea id="apDesc" class="input textarea" maxlength="5000">${esc(x?.desc||x?.description||'')}</textarea></label><label class="form-field"><span>Syarat & ketentuan / SNK (max 5000)</span><textarea id="apSnk" class="input textarea" maxlength="5000">${esc(x?.snk||'')}</textarea></label><label class="form-field"><span>Wholesale tiers JSON (opsional)</span><textarea id="apWholesale" class="input textarea" placeholder='[{"min_qty":5,"price":15000,"profit":2000}]'>${esc(tiers)}</textarea></label>${edit?'':`<label class="form-field"><span>Stok awal (opsional, satu baris per account; gateway auto batch >100)</span><textarea id="apStocks" class="input textarea tall" placeholder="email|password"></textarea></label>`}<div class="button-row"><button id="apSave" class="btn btn-primary">${edit?'Simpan perubahan':'Buat produk'}</button><button id="apCancel" class="btn">Tutup form</button></div><div id="apFormOut" class="admin-result"></div></section>`;
    $('#apCancel').onclick=()=>{$('#apForm').innerHTML='';};
    $('#apSave').onclick=async()=>{try{let wholesale;const wr=$('#apWholesale').value.trim();if(wr){wholesale=JSON.parse(wr);if(!Array.isArray(wholesale))throw new Error('wholesale_tiers harus JSON array.');}const body={title:$('#apTitle').value.trim(),code:$('#apCode').value.trim(),price:Number($('#apPrice').value||0),profit:Number($('#apProfit').value||0),desc:$('#apDesc').value.trim(),snk:$('#apSnk').value.trim(),form:Number($('#apFormId').value||0)||undefined,is_variation:$('#apVar').checked,wholesale_tiers:wholesale};if(edit){body.id=x.id;body.is_show=$('#apShow').checked;const r=await adminApi('pm_product_update',{method:'POST',body});diagnosticOutput('apFormOut',r);toast('Produk diperbarui.');}else{body.stocks=$('#apStocks').value.split(/\r?\n/).map(v=>v.trim()).filter(Boolean);const r=await adminApi('pm_product_create',{method:'POST',body});diagnosticOutput('apFormOut',r);toast('Produk dibuat.');}load();}catch(e){diagnosticOutput('apFormOut',diagnosticError(e),true);}};
    if(edit)$('#apDelete').onclick=async()=>{if(!confirm(`Hapus produk ${x.title}? Produk, variasi, dan stok dapat ikut terhapus di Xoftware.`))return;try{const r=await adminApi('pm_product_delete',{method:'POST',body:{id:x.id}});toast('Produk dihapus.');$('#apForm').innerHTML='';load();}catch(e){toast(e.message,true);}};
  };
  $('#apLoad').onclick=load;$('#apSearch').onkeydown=e=>{if(e.key==='Enter')load();};$('#apVarFilter').onchange=load;$('#apNew').onclick=()=>showProductForm();load();
}
function adminStock(){
  const box=$('#adminContent');box.innerHTML=`<div class="admin-grid"><section class="admin-panel"><h2>Tambah stok</h2><label class="form-field"><span>Product ID</span><input id="asProduct" class="input big" inputmode="numeric"></label><label class="form-field"><span>Variation ID <small>(opsional)</small></span><input id="asVariation" class="input big" inputmode="numeric"></label><label class="form-field"><span>Accounts — satu baris satu stok</span><textarea id="asAccounts" class="input textarea tall" placeholder="email|password\nemail2|password2"></textarea></label><button id="asAdd" class="btn btn-primary">Tambah stok</button></section><section class="admin-panel"><h2>Lihat stok aktif</h2><label class="form-field"><span>Product ID</span><input id="asListProduct" class="input big" inputmode="numeric"></label><label class="form-field"><span>Variation ID <small>(opsional)</small></span><input id="asListVariation" class="input big" inputmode="numeric"></label><button id="asLoad" class="btn">Muat stok</button><div id="asResult" class="admin-result"></div></section></div>`;
  $('#asAdd').onclick=async()=>{try{const accounts=$('#asAccounts').value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);const r=await adminApi('pm_stock_add',{method:'POST',body:{product_id:$('#asProduct').value.trim(),variation_id:$('#asVariation').value.trim(),accounts}});toast(`Stok ditambahkan: ${r.total_added??accounts.length}`);}catch(e){toast(e.message,true);}};
  $('#asLoad').onclick=async()=>{try{const r=await adminApi('pm_stocks',{query:{product_id:$('#asListProduct').value.trim(),variation_id:$('#asListVariation').value.trim(),page:1,limit:100}}),data=r?.data??r,stocks=data?.stocks||[];$('#asResult').innerHTML=stocks.length?`<div class="stock-list">${stocks.map(s=>`<div class="stock-row"><span>#${esc(s.id)} · ${esc(JSON.stringify(s.value||s))}</span><button class="btn btn-sm danger as-delete" data-id="${esc(s.id)}">Hapus</button></div>`).join('')}</div>`:'<span class="muted">Stok kosong.</span>';$$('.as-delete').forEach(b=>b.onclick=async()=>{if(!confirm(`Hapus stok #${b.dataset.id}?`))return;try{await adminApi('pm_stock_delete',{method:'POST',body:{id:b.dataset.id}});b.closest('.stock-row').remove();toast('Stok dihapus.');}catch(e){toast(e.message,true);}});}catch(e){$('#asResult').innerHTML=`<div class="status-card bad">${esc(e.message)}</div>`;}};
}
function adminAppearance(){
  const a={...DEFAULT_STORE.appearance,...(state.store.appearance||{})},s=state.store.support||{},b={...DEFAULT_STORE.branding,...(state.store.branding||{})};
  const box=$('#adminContent');box.innerHTML=`<div class="admin-grid"><section class="admin-panel wide"><div class="panel-title"><div><h2>Branding, font & media</h2><p class="muted">Atur brand VanzShop, banner slide home, font, dan foto/logo. Preview tersimpan lokal di browser admin ini.</p></div><span class="build-chip">${BUILD_ID}</span></div><div class="form-grid"><label class="form-field"><span>Nama toko</span><input id="aaName" class="input big" value="${esc(state.store.name)}"></label><label class="form-field"><span>Tagline</span><input id="aaTagline" class="input big" value="${esc(state.store.tagline)}"></label><label class="form-field"><span>Inisial brand</span><input id="aaMark" class="input big" maxlength="2" value="${esc(b.mark||'V')}"></label><label class="form-field"><span>Subtitle brand</span><input id="aaSubtitle" class="input big" value="${esc(b.subtitle||'PRODUK DIGITAL')}"></label><label class="form-field"><span>Theme</span><select id="aaTheme" class="input big"><option value="dark" ${a.theme==='dark'?'selected':''}>Dark</option><option value="light" ${a.theme==='light'?'selected':''}>Light</option></select></label><label class="form-field"><span>Accent</span><input id="aaAccent" class="input big" type="color" value="${esc(a.accent||'#f3c74f')}"></label><label class="form-field"><span>Font body</span><select id="aaBodyFont" class="input big">${['Plus Jakarta Sans','Inter','Outfit','Sora','Space Grotesk'].map(x=>`<option value="${esc(x)}" ${String(b.body_font)===x?'selected':''}>${esc(x)}</option>`).join('')}</select></label><label class="form-field"><span>Font heading</span><select id="aaDisplayFont" class="input big">${['Archivo','Sora','Outfit','Space Grotesk'].map(x=>`<option value="${esc(x)}" ${String(b.display_font)===x?'selected':''}>${esc(x)}</option>`).join('')}</select></label><label class="form-field"><span>Radius (${esc(a.radius)})</span><input id="aaRadius" type="range" min="8" max="32" value="${esc(a.radius)}"></label><label class="form-field"><span>Kolom desktop</span><input id="aaColumns" type="number" min="2" max="6" class="input big" value="${esc(a.columns)}"></label><label class="form-field"><span>Density</span><select id="aaDensity" class="input big"><option value="compact" ${a.density==='compact'?'selected':''}>Compact</option><option value="comfortable" ${a.density==='comfortable'?'selected':''}>Comfortable</option></select></label><label class="check-field"><input id="aaHero" type="checkbox" ${a.hero!==false?'checked':''}><span>Tampilkan hero slider</span></label><label class="form-field wide"><span>Hero title</span><input id="aaHeroTitle" class="input big" value="${esc(b.hero_title||'')}"></label><label class="form-field wide"><span>Hero subtitle</span><textarea id="aaHeroSubtitle" class="input textarea">${esc(b.hero_subtitle||'')}</textarea></label><label class="form-field wide"><span>Badge hero (pisahkan koma)</span><input id="aaHeroBadges" class="input big" value="${esc((b.hero_badges||[]).join(', '))}"></label><label class="form-field wide"><span>URL logo / foto brand</span><input id="aaLogoUrl" class="input big" placeholder="https://...png atau data:image/..." value="${esc(b.logo_url||'')}"></label><label class="form-field wide"><span>Banner slide home (satu URL per baris)</span><textarea id="aaSlides" class="input textarea tall" placeholder="https://...jpg">${esc((b.hero_slides||[]).join('\n'))}</textarea></label><label class="form-field wide"><span>Catatan output akun</span><textarea id="aaReceiptNote" class="input textarea">${esc(b.receipt_note||'')}</textarea></label><label class="form-field wide"><span>Footer note</span><input id="aaFooterNote" class="input big" value="${esc(b.footer_note||'')}"></label><label class="form-field"><span>WhatsApp toko</span><input id="aaWa" class="input big" value="${esc(s.whatsapp||'')}"></label><label class="form-field"><span>Telegram toko</span><input id="aaTg" class="input big" value="${esc(s.telegram||'')}"></label><label class="form-field"><span>Email toko</span><input id="aaEmail" class="input big" value="${esc(s.email||'')}"></label><label class="form-field wide"><span>Upload logo/foto lokal untuk preview browser ini</span><input id="aaLogoFile" class="input big" type="file" accept="image/*"></label></div><div class="button-row"><button id="aaPreview" class="btn btn-primary">Simpan preview lokal</button><button id="aaReset" class="btn">Reset preview</button><button id="aaEnv" class="btn">Generate ENV Vercel</button></div><div id="aaEnvBox"></div></section><section class="admin-panel"><h2>Catatan penting</h2><p class="muted">Upload file gambar di dashboard hanya untuk preview lokal browser ini. Supaya permanen untuk semua pengunjung, pakai URL gambar yang publik lalu tempel ke Vercel ENV dan redeploy.</p></section><section class="admin-panel"><h2>Tips format stok</h2><p class="muted">Stok format <code>email|password</code> sekarang ditampilkan otomatis sebagai kartu akun yang rapi. Kalau stok berbentuk <code>url|catatan</code> atau object JSON, output sukses juga tetap dipoles.</p></section></div>`;
  const get=()=>({store:{name:$('#aaName').value.trim(),tagline:$('#aaTagline').value.trim(),support:{whatsapp:$('#aaWa').value.trim(),telegram:$('#aaTg').value.trim(),email:$('#aaEmail').value.trim()},branding:{mark:$('#aaMark').value.trim()||'V',subtitle:$('#aaSubtitle').value.trim()||'PRODUK DIGITAL',logo_url:$('#aaLogoUrl').value.trim(),hero_title:$('#aaHeroTitle').value.trim(),hero_subtitle:$('#aaHeroSubtitle').value.trim(),hero_badges:$('#aaHeroBadges').value.split(',').map(v=>v.trim()).filter(Boolean),hero_slides:$('#aaSlides').value.split(/\r?\n/).map(v=>v.trim()).filter(Boolean),receipt_note:$('#aaReceiptNote').value.trim(),footer_note:$('#aaFooterNote').value.trim(),body_font:$('#aaBodyFont').value,display_font:$('#aaDisplayFont').value}},appearance:{theme:$('#aaTheme').value,accent:$('#aaAccent').value,radius:Number($('#aaRadius').value),columns:Number($('#aaColumns').value),density:$('#aaDensity').value,hero:$('#aaHero').checked}});
  $('#aaLogoFile').onchange=(e)=>{const file=e.target.files&&e.target.files[0]; if(!file) return; const reader=new FileReader(); reader.onload=()=>{ $('#aaLogoUrl').value=String(reader.result||''); toast('Logo/foto dimasukkan ke preview lokal.'); }; reader.readAsDataURL(file); };
  $('#aaPreview').onclick=()=>{const x=get();localStorage.setItem('vanz_appearance_override',JSON.stringify(x.appearance));localStorage.setItem('vanz_store_override',JSON.stringify(x.store));state.store=mergeStore({...state.store,...x.store,appearance:x.appearance,branding:x.store.branding});applyAppearance();toast('Preview branding disimpan di browser ini.');renderAdmin('appearance');};
  $('#aaReset').onclick=()=>{localStorage.removeItem('vanz_appearance_override');localStorage.removeItem('vanz_store_override');toast('Preview lokal dihapus. Reload katalog untuk nilai deployment.');location.hash='#/';};
  $('#aaEnv').onclick=async()=>{const x=get(),lines=[`STORE_NAME=${x.store.name}`,`STORE_TAGLINE=${x.store.tagline}`,`STORE_BRAND_MARK=${x.store.branding.mark}`,`STORE_BRAND_SUBTITLE=${x.store.branding.subtitle}`,`STORE_LOGO_URL=${x.store.branding.logo_url}`,`STORE_HERO_TITLE=${x.store.branding.hero_title}`,`STORE_HERO_SUBTITLE=${x.store.branding.hero_subtitle}`,`STORE_HERO_BADGES=${x.store.branding.hero_badges.join(',')}`,`STORE_HERO_SLIDES=${x.store.branding.hero_slides.join(',')}`,`STORE_RECEIPT_NOTE=${x.store.branding.receipt_note}`,`STORE_FOOTER_NOTE=${x.store.branding.footer_note}`,`STORE_FONT_BODY=${x.store.branding.body_font}`,`STORE_FONT_DISPLAY=${x.store.branding.display_font}`,`STORE_THEME=${x.appearance.theme}`,`STORE_ACCENT=${x.appearance.accent}`,`STORE_RADIUS=${x.appearance.radius}`,`STORE_COLUMNS=${x.appearance.columns}`,`STORE_DENSITY=${x.appearance.density}`,`STORE_HERO=${x.appearance.hero?'true':'false'}`,`STORE_WHATSAPP=${x.store.support.whatsapp}`,`STORE_TELEGRAM=${x.store.support.telegram}`,`STORE_EMAIL=${x.store.support.email}`],txt=lines.join('\n');$('#aaEnvBox').innerHTML=`<div class="env-box"><pre>${esc(txt)}</pre><button id="copyEnv" class="btn btn-sm">Salin ENV</button></div>`;$('#copyEnv').onclick=async()=>{try{await navigator.clipboard.writeText(txt);toast('ENV branding disalin.');}catch{toast('Clipboard tidak tersedia.',true);}};};
}

async function adminSewaPay(){
  const box=$('#adminContent');
  box.innerHTML='<div class="loading-card"><div class="loader"></div><span>Menguji Sewa Pay...</span></div>';
  try{
    const r=await adminApi('admin_sewapay_probe');
    const m=r?.methods||{};
    box.innerHTML=`<div class="admin-grid"><section class="admin-panel"><h2>Sewa Pay</h2><div class="kv"><span>Configured</span><b>${r.configured?'Yes':'No'}</b></div><div class="kv"><span>Base URL</span><b>${esc(r.base_url||'https://sewapay.id')}</b></div><div class="kv"><span>Payment methods</span><b>${esc((m.methods||[]).join(', ')||'—')}</b></div><div class="kv"><span>Binance</span><b>${m?.binance?.enabled?'Enabled':'Disabled / unknown'}</b></div><div class="kv"><span>Auto fulfillment</span><b>${r?.fulfillment?.ready?'READY':'NOT READY'}</b></div><div class="kv"><span>Idempotency store</span><b>${r?.fulfillment?.store_ready?'Redis connected':'Missing Redis env'}</b></div></section><section class="admin-panel"><h2>Webhook</h2><p class="muted">Set URL ini di Sewa Pay → Pengaturan.</p><div class="env-box"><pre>${esc(`${location.origin}/api/sewapay-webhook`)}</pre></div><p class="muted">Webhook diverifikasi dengan HMAC-SHA256 + timestamp. Event payment.completed sekarang menjalankan claim stok Xoftware idempotent. Polling status juga menjalankan jalur yang sama, jadi webhook/polling tidak bisa mendobel claim payment yang sama.</p></section><section class="admin-panel wide"><h2>Raw methods response</h2><pre>${esc(JSON.stringify(m,null,2))}</pre></section></div>`;
  }catch(e){box.innerHTML=`<div class="status-card bad"><b>Sewa Pay gagal</b><span>${esc(e.message)}</span></div>`;}
}

async function adminApiHealth(){
  const box=$('#adminContent');
  box.innerHTML='<div class="loading-card"><div class="loader"></div><span>Membaca health + katalog...</span></div>';
  try{
    const [h,c]=await Promise.all([api('health'),adminApi('catalog_probe')]);
    const m=c?.summary||{}, limits=h?.documented_limits||{};
    box.innerHTML=`<div class="admin-grid">
      <section class="admin-panel"><h2>Server</h2><div class="kv"><span>Build</span><b>${esc(h.build||BUILD_ID)}</b></div><div class="kv"><span>Base URL</span><b>${esc(h.base_url||'—')}</b></div><div class="kv"><span>API key</span><b>${h.ready?'Configured':'Missing'}</b></div><div class="kv"><span>Admin</span><b>${h.admin_ready?'Configured':'Missing'}</b></div></section>
      <section class="admin-panel"><h2>Katalog live</h2><div class="kv"><span>Endpoint</span><b>${esc(m.endpoint||h.catalog_endpoint||'—')}</b></div><div class="kv"><span>Method</span><b>${esc(m.method||'—')}</b></div><div class="kv"><span>Produk</span><b>${esc(m.count??0)}</b></div><div class="kv"><span>Stok known</span><b>${esc(m.known_stock_total??0)}</b></div></section>
      <section class="admin-panel wide"><h2>Limit README aktif</h2><div class="metric-grid">${Object.entries(limits).map(([k,v])=>`<div class="metric-card"><small>${esc(k)}</small><strong>${esc(v)}</strong></div>`).join('')}</div></section>
      <section class="admin-panel wide"><div class="panel-title"><h2>Raw health</h2><button id="copyHealth" class="btn btn-sm">Salin JSON</button></div><div class="admin-result"><pre>${esc(JSON.stringify({health:h,catalog:c?.summary},null,2))}</pre></div></section>
    </div>`;
    $('#copyHealth').onclick=async()=>{try{await navigator.clipboard.writeText(JSON.stringify({health:h,catalog:c?.summary},null,2));toast('Health JSON disalin.');}catch{toast('Clipboard gagal.',true);}};
  }catch(e){box.innerHTML=`<div class="status-card bad"><b>API health gagal</b><span>${esc(e.message)}</span></div>`;}
}

function adminEndpointMap(){
  const rows=[
    ['https://sewapay.id/api/v1/payments/create','POST','Write','Create payment Sewa Pay (HMAC)'],
    ['https://sewapay.id/api/v1/payments/status','GET','Read','Status payment Sewa Pay'],
    ['https://sewapay.id/api/v1/payments/cancel','POST','Write','Cancel payment Sewa Pay'],
    ['https://sewapay.id/api/v1/payments/methods','GET','Read','Payment methods Sewa Pay'],
    ['/v1/product','GET / POST','Read','Katalog + stok + variasi storefront'],
    ['/v1/register','POST','Write','Registrasi sender baru; izin khusus + rate limit'],
    ['/v1/balance','GET / POST','Read','Info user, saldo, level, point, buytotal'],
    ['/v1/order/balance','POST','Danger','Order instan menggunakan saldo user'],
    ['/v1/order/qris','POST','Write','Membuat invoice QRIS'],
    ['/v1/deposit','POST','Write','Membuat invoice top-up saldo user'],
    ['/v1/order/status','GET / POST','Read','Status transaksi + accounts jika sukses'],
    ['/v1/products/forms','GET','Read','Template form stok'],
    ['/v1/products/','GET','Read','List produk owner, max 20/page'],
    ['/v1/products/:id','GET / PUT / DELETE','Mixed','Detail/update/delete produk'],
    ['/v1/products/','POST','Write','Buat produk'],
    ['/v1/products/:id/variations','POST','Write','Tambah variasi'],
    ['/v1/products/variations/:id','GET / PUT / DELETE','Mixed','Detail/update/delete variasi'],
    ['/v1/products/stocks','POST','Write','Tambah stok, max 100/request'],
    ['/v1/products/:id/stocks','GET','Read','List stok aktif, max 100/page'],
    ['/v1/products/stocks/:id','DELETE','Danger','Hapus satu stok'],
  ];
  $('#adminContent').innerHTML=`<section class="admin-panel wide"><h2>API Map berdasarkan README</h2><p class="muted">Ini daftar endpoint yang benar-benar dipakai v10. Tidak ada endpoint reseller-api tambahan karena tidak terdokumentasi di README project.</p><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Path</th><th>Method</th><th>Tipe</th><th>Fungsi</th></tr></thead><tbody>${rows.map(r=>`<tr><td><code>${esc(r[0])}</code></td><td>${esc(r[1])}</td><td><span class="api-kind ${String(r[2]).toLowerCase()}">${esc(r[2])}</span></td><td>${esc(r[3])}</td></tr>`).join('')}</tbody></table></div></section>`;
}

async function adminLimits(){
  const box=$('#adminContent');
  try{
    const h=await api('health'),l=h.documented_limits||{};
    const codes=[['200','OK','Berhasil'],['201','Created','Produk/variasi/stok dibuat'],['400','Bad Request','Validasi, stok/saldo, limit'],['401','Unauthorized','API key/auth salah'],['403','Forbidden','IP whitelist / akses'],['404','Not Found','Route/data tidak ada'],['409','Conflict','Konflik data/registrasi'],['429','Too Many Requests','Rate limit registrasi'],['500','Internal','Server provider']];
    box.innerHTML=`<div class="admin-grid"><section class="admin-panel"><h2>Limit Order API</h2><div class="kv"><span>Register</span><b>${esc(l.register_per_minute??3)}/menit</b></div><div class="kv"><span>Deposit min</span><b>${money(l.deposit_min??1000)}</b></div><div class="kv"><span>Deposit max</span><b>${money(l.deposit_max??1000000)}</b></div></section><section class="admin-panel"><h2>Limit Product API</h2><div class="kv"><span>Produk/page</span><b>${esc(l.product_page??20)}</b></div><div class="kv"><span>Stok/request</span><b>${esc(l.stock_batch??100)}</b></div><div class="kv"><span>Variasi/produk</span><b>${esc(l.variations_per_product??30)}</b></div><div class="kv"><span>SKU</span><b>${esc(l.sku_min??3)}-${esc(l.sku_max??50)} chars</b></div></section><section class="admin-panel wide"><h2>HTTP status reference</h2><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Code</th><th>Nama</th><th>Makna</th></tr></thead><tbody>${codes.map(x=>`<tr><td><b>${x[0]}</b></td><td>${x[1]}</td><td>${x[2]}</td></tr>`).join('')}</tbody></table></div></section></div>`;
  }catch(e){box.innerHTML=`<div class="status-card bad">${esc(e.message)}</div>`;}
}

async function adminCatalog(){
  const box=$('#adminContent');
  box.innerHTML=`<div class="admin-toolbar"><input id="acSearch" class="input big" placeholder="Cari title / SKU"><button id="acReload" class="btn btn-primary">Refresh live</button></div><div id="acBody"><div class="loading-card"><div class="loader"></div></div></div>`;
  let products=[];
  const draw=()=>{
    const q=String($('#acSearch')?.value||'').toLowerCase();
    const list=products.filter(p=>`${p.title} ${p.code} ${p.description}`.toLowerCase().includes(q));
    $('#acBody').innerHTML=`<div class="metric-grid"><div class="metric-card"><small>Produk</small><strong>${products.length}</strong></div><div class="metric-card"><small>Supplier</small><strong>${products.filter(x=>x.is_reseller).length}</strong></div><div class="metric-card"><small>Variasi</small><strong>${products.reduce((n,x)=>n+(x.variations?.length||0),0)}</strong></div><div class="metric-card"><small>Stok known</small><strong>${products.reduce((n,x)=>n+(x.stock==null?0:Number(x.stock)||0),0)}</strong></div></div><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>ID</th><th>Produk</th><th>SKU</th><th>Harga</th><th>Stok</th><th>Supplier</th><th>Variasi</th></tr></thead><tbody>${list.map(p=>`<tr><td>${esc(p.id??'—')}</td><td><b>${esc(p.title)}</b><small>${esc((p.description||'').slice(0,90))}</small></td><td>${esc(p.code||'—')}</td><td>${money(p.price)}</td><td>${esc(p.stock??'—')}</td><td>${p.is_reseller?'Yes':'No'}</td><td>${esc(p.variations?.length||0)}</td></tr>`).join('')}</tbody></table></div>`;
  };
  const load=async()=>{try{const r=await adminApi('catalog_probe');products=Array.isArray(r.products)?r.products:[];draw();}catch(e){$('#acBody').innerHTML=`<div class="status-card bad">${esc(e.message)}</div>`;}};
  $('#acSearch').oninput=draw;$('#acReload').onclick=load;load();
}

async function adminSuppliers(){
  const box=$('#adminContent');
  box.innerHTML='<div class="loading-card"><div class="loader"></div><span>Membaca is_reseller...</span></div>';
  try{
    const r=await adminApi('catalog_probe'),items=(r.products||[]).filter(x=>x.is_reseller);
    box.innerHTML=`<div class="admin-grid"><section class="admin-panel wide"><h2>Supplier products dari Order API</h2><p class="muted">README menandai produk supplier melalui <code>is_reseller: true</code> di <code>/v1/product</code>. Tab ini hanya membaca flag tersebut.</p><div class="metric-grid"><div class="metric-card"><small>Supplier products</small><strong>${items.length}</strong></div><div class="metric-card"><small>Stok known</small><strong>${items.reduce((n,x)=>n+(x.stock==null?0:Number(x.stock)||0),0)}</strong></div></div></section><section class="admin-panel wide"><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>ID</th><th>Produk</th><th>SKU</th><th>Harga</th><th>Stok</th></tr></thead><tbody>${items.length?items.map(x=>`<tr><td>${esc(x.id)}</td><td>${esc(x.title)}</td><td>${esc(x.code||'—')}</td><td>${money(x.price)}</td><td>${esc(x.stock??'—')}</td></tr>`).join(''):'<tr><td colspan="5">Tidak ada produk dengan is_reseller=true.</td></tr>'}</tbody></table></div></section></div>`;
  }catch(e){box.innerHTML=`<div class="status-card bad">${esc(e.message)}</div>`;}
}

function adminBalance(){
  const p=profile()||{};const box=$('#adminContent');
  box.innerHTML=`<div class="admin-grid"><section class="admin-panel"><h2>Cek /v1/balance</h2><label class="form-field"><span>Channel</span><select id="abChannel" class="input big"><option value="whatsapp" ${p.channel==='telegram'?'':'selected'}>WhatsApp</option><option value="telegram" ${p.channel==='telegram'?'selected':''}>Telegram ID</option></select></label><label class="form-field"><span>Sender</span><input id="abSender" class="input big" value="${esc(p.sender||'')}" placeholder="628... / Telegram ID"></label><button id="abGo" class="btn btn-primary">Cek user</button></section><section class="admin-panel"><h2>Ringkasan user</h2><div id="abSummary" class="admin-result"><span class="muted">Belum ada data.</span></div></section><section class="admin-panel wide"><h2>Raw response</h2><div id="abRaw" class="admin-result"></div></section></div>`;
  $('#abGo').onclick=async()=>{try{const r=await adminApi('owner_balance',{method:'POST',body:{channel:$('#abChannel').value,sender:$('#abSender').value.trim()}}),d=r?.data??r;$('#abSummary').innerHTML=`<div class="metric-grid"><div class="metric-card"><small>Nama</small><strong>${esc(d.name||'—')}</strong></div><div class="metric-card"><small>Saldo</small><strong>${money(d.saldo)}</strong></div><div class="metric-card"><small>Saldo used</small><strong>${money(d.saldoused)}</strong></div><div class="metric-card"><small>Buy total</small><strong>${esc(d.buytotal??0)}</strong></div><div class="metric-card"><small>Point</small><strong>${esc(d.point??0)}</strong></div><div class="metric-card"><small>Level</small><strong>${esc(d.level||'—')}</strong></div></div>`;diagnosticOutput('abRaw',r);}catch(e){diagnosticOutput('abRaw',diagnosticError(e),true);}};
}

function adminRegister(){
  const box=$('#adminContent');
  box.innerHTML=`<div class="admin-grid"><section class="admin-panel"><h2>Register user</h2><div class="diag-warning">Aksi nyata. README: maksimal 3 registrasi/menit dan permission register bisa dinonaktifkan provider.</div><label class="form-field"><span>Channel</span><select id="arChannel" class="input big"><option value="whatsapp">WhatsApp</option><option value="telegram">Telegram ID</option></select></label><label class="form-field"><span>Sender</span><input id="arSender" class="input big" placeholder="628... / Telegram ID"></label><label class="form-field"><span>Nama</span><input id="arName" class="input big" placeholder="Nama user"></label><button id="arGo" class="btn danger">Register nyata</button></section><section class="admin-panel"><h2>Response</h2><div id="arOut" class="admin-result"></div></section></div>`;
  $('#arGo').onclick=async()=>{if(!confirm('Buat user Xoftware baru sekarang?'))return;try{const r=await adminApi('owner_register',{method:'POST',body:{channel:$('#arChannel').value,sender:$('#arSender').value.trim(),name:$('#arName').value.trim()}});diagnosticOutput('arOut',r);toast('Request register selesai.');}catch(e){diagnosticOutput('arOut',diagnosticError(e),true);}};
}

function adminQris(){
  const p=profile()||{},sku=String(state.owner?.[0]?.variations?.[0]?.code||state.owner?.[0]?.code||'');
  const box=$('#adminContent');
  box.innerHTML=`<div class="admin-grid"><section class="admin-panel"><h2>Buat invoice QRIS</h2><div class="diag-warning">Aksi nyata: membuat invoice Xoftware.</div><label class="form-field"><span>Channel</span><select id="aqChannel" class="input big"><option value="whatsapp">WhatsApp</option><option value="telegram">Telegram ID</option></select></label><label class="form-field"><span>Sender terdaftar</span><input id="aqSender" class="input big" value="${esc(p.sender||'')}"></label><label class="form-field"><span>SKU</span><input id="aqSku" class="input big" value="${esc(sku)}"></label><label class="form-field"><span>Qty</span><input id="aqQty" class="input big" type="number" min="1" value="1"></label><button id="aqGo" class="btn danger">Buat invoice QRIS</button></section><section class="admin-panel"><h2>Invoice result</h2><div id="aqOut" class="admin-result"></div></section></div>`;
  $('#aqGo').onclick=async()=>{if(!confirm('Membuat invoice QRIS nyata?'))return;try{const r=await adminApi('admin_order_qris',{method:'POST',body:{channel:$('#aqChannel').value,sender:$('#aqSender').value.trim(),code:$('#aqSku').value.trim(),quantity:Number($('#aqQty').value||1)}});diagnosticOutput('aqOut',r);toast('Invoice QRIS dibuat.');}catch(e){diagnosticOutput('aqOut',diagnosticError(e),true);}};
}

function adminBalanceOrder(){
  const p=profile()||{};const box=$('#adminContent');
  box.innerHTML=`<div class="admin-grid"><section class="admin-panel"><h2>Order via saldo</h2><div class="diag-warning">DANGER: endpoint ini langsung memotong saldo user jika order sukses.</div><label class="form-field"><span>Channel</span><select id="aboChannel" class="input big"><option value="whatsapp" ${p.channel==='telegram'?'':'selected'}>WhatsApp</option><option value="telegram" ${p.channel==='telegram'?'selected':''}>Telegram ID</option></select></label><label class="form-field"><span>Sender terdaftar</span><input id="aboSender" class="input big" value="${esc(p.sender||'')}"></label><label class="form-field"><span>SKU</span><input id="aboSku" class="input big"></label><label class="form-field"><span>Qty</span><input id="aboQty" class="input big" type="number" min="1" value="1"></label><button id="aboGo" class="btn danger">Order pakai saldo</button></section><section class="admin-panel"><h2>Response</h2><div id="aboOut" class="admin-result"></div></section></div>`;
  $('#aboGo').onclick=async()=>{if(!confirm('Order ini dapat langsung mengurangi saldo user. Lanjutkan?'))return;try{const r=await adminApi('checkout_balance',{method:'POST',body:{channel:$('#aboChannel').value,sender:$('#aboSender').value.trim(),code:$('#aboSku').value.trim(),quantity:Number($('#aboQty').value||1)}});diagnosticOutput('aboOut',r);toast('Order saldo selesai.');}catch(e){diagnosticOutput('aboOut',diagnosticError(e),true);}};
}

function adminDeposit(){
  const p=profile()||{};const box=$('#adminContent');
  box.innerHTML=`<div class="admin-grid"><section class="admin-panel"><h2>Buat deposit</h2><div class="diag-warning">Aksi nyata: membuat invoice top-up Rp1.000–Rp1.000.000.</div><label class="form-field"><span>Channel</span><select id="adChannel" class="input big"><option value="whatsapp">WhatsApp</option><option value="telegram">Telegram ID</option></select></label><label class="form-field"><span>Sender terdaftar</span><input id="adSender" class="input big" value="${esc(p.sender||'')}"></label><label class="form-field"><span>Amount</span><input id="adAmount" class="input big" type="number" min="1000" max="1000000" step="1000" value="50000"></label><button id="adGo" class="btn danger">Buat invoice deposit</button></section><section class="admin-panel"><h2>Response</h2><div id="adOut" class="admin-result"></div></section></div>`;
  $('#adGo').onclick=async()=>{if(!confirm('Buat invoice deposit nyata?'))return;try{const r=await adminApi('admin_deposit',{method:'POST',body:{channel:$('#adChannel').value,sender:$('#adSender').value.trim(),amount:Number($('#adAmount').value||0)}});diagnosticOutput('adOut',r);toast('Invoice deposit dibuat.');}catch(e){diagnosticOutput('adOut',diagnosticError(e),true);}};
}

function adminStatus(){
  const box=$('#adminContent');
  box.innerHTML=`<div class="admin-grid"><section class="admin-panel"><h2>Cek status transaksi</h2><label class="form-field"><span>Transaction ID / Reff ID</span><input id="astTx" class="input big" placeholder="API-... / recap id"></label><div class="button-row"><button id="astPost" class="btn btn-primary">POST status</button><button id="astGet" class="btn">GET status</button></div></section><section class="admin-panel"><h2>Response</h2><div id="astOut" class="admin-result"></div></section></div>`;
  const go=async(method)=>{try{const id=$('#astTx').value.trim();const r=await adminApi('admin_order_status',method==='GET'?{method:'GET',query:{transaction_id:id}}:{method:'POST',body:{transaction_id:id}});diagnosticOutput('astOut',r);}catch(e){diagnosticOutput('astOut',diagnosticError(e),true);}};
  $('#astPost').onclick=()=>go('POST');$('#astGet').onclick=()=>go('GET');
}

function adminBrowserOrders(){
  const list=orders();
  $('#adminContent').innerHTML=`<section class="admin-panel wide"><div class="panel-title"><div><h2>Order history browser ini</h2><p class="muted">No-DB: hanya localStorage browser admin ini, bukan history global Xoftware.</p></div><button id="aboClear" class="btn danger">Clear local history</button></div>${list.length?`<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Created</th><th>Type</th><th>Transaction</th><th>Produk</th><th>Sender</th><th>Total</th><th>Status</th></tr></thead><tbody>${list.map(o=>`<tr><td>${new Date(o.created_at||Date.now()).toLocaleString('id-ID')}</td><td>${esc(o.type||'—')}</td><td>${esc(o.transaction_id)}</td><td>${esc(o.product_title||'—')}</td><td>${esc(o.sender||'—')}</td><td>${money(o.total)}</td><td>${esc(o.status||'—')}</td></tr>`).join('')}</tbody></table></div>`:'<p class="muted">Belum ada order tersimpan di browser ini.</p>'}</section>`;
  $('#aboClear').onclick=()=>{if(confirm('Hapus seluruh history lokal browser ini?')){localStorage.removeItem('vanz_orders');toast('History lokal dihapus.');adminBrowserOrders();}};
}

function adminWebhook(){
  const url=`${location.origin}/api/xo?a=webhook`;
  const sample={event:'buy_account',transaction_id:'API-ABCDE12345',reff_id:'',sender:'628xxx',product_code:'NETFLIX_1M',quantity:1,total_price:35000,platform:'API',accounts:[{email:'user@example.com',pass:'secret123'}]};
  $('#adminContent').innerHTML=`<div class="admin-grid"><section class="admin-panel"><h2>Callback URL</h2><label class="form-field"><span>Webhook Xoftware</span><input id="awUrl" class="input big" readonly value="${esc(url)}"></label><button id="awCopy" class="btn btn-primary">Salin URL</button><p class="muted">Receiver sekarang hanya ACK payload; project no-DB belum menyimpan webhook sebagai source of truth.</p></section><section class="admin-panel"><h2>Event README</h2><div class="kv"><span>Contoh event</span><b>buy_account / buy_balance</b></div><div class="kv"><span>Platform</span><b>API</b></div><div class="kv"><span>Accounts</span><b>ada jika fulfillment tersedia</b></div></section><section class="admin-panel wide"><h2>Sample payload</h2><div class="admin-result"><pre>${esc(JSON.stringify(sample,null,2))}</pre></div></section></div>`;
  $('#awCopy').onclick=async()=>{try{await navigator.clipboard.writeText(url);toast('Webhook URL disalin.');}catch{toast('Clipboard gagal.',true);}};
}

function adminProductDetail(){
  const box=$('#adminContent');
  box.innerHTML=`<div class="admin-grid"><section class="admin-panel"><h2>Detail produk owner</h2><label class="form-field"><span>Product ID</span><input id="apdId" class="input big" inputmode="numeric"></label><button id="apdGo" class="btn btn-primary">GET detail</button></section><section class="admin-panel"><h2>Raw response</h2><div id="apdOut" class="admin-result"></div></section></div>`;
  $('#apdGo').onclick=async()=>{try{const r=await adminApi('pm_product',{query:{id:$('#apdId').value.trim()}});diagnosticOutput('apdOut',r);}catch(e){diagnosticOutput('apdOut',diagnosticError(e),true);}};
}

function adminVariations(){
  const box=$('#adminContent');
  box.innerHTML=`<div class="admin-grid">
    <section class="admin-panel"><h2>Detail variasi</h2><label class="form-field"><span>Variation ID</span><input id="avGetId" class="input big"></label><button id="avGet" class="btn">GET variasi</button><div id="avGetOut" class="admin-result"></div></section>
    <section class="admin-panel"><h2>Tambah variasi</h2><label class="form-field"><span>Product ID</span><input id="avProduct" class="input big"></label><label class="form-field"><span>SKU</span><input id="avCode" class="input big"></label><label class="form-field"><span>Title</span><input id="avTitle" class="input big"></label><div class="form-grid"><label class="form-field"><span>Price</span><input id="avPrice" class="input big" type="number"></label><label class="form-field"><span>Profit</span><input id="avProfit" class="input big" type="number"></label><label class="form-field"><span>Form ID</span><input id="avForm" class="input big" type="number"></label></div><label class="form-field"><span>Desc</span><textarea id="avDesc" class="input textarea"></textarea></label><label class="form-field"><span>SNK</span><textarea id="avSnk" class="input textarea"></textarea></label><label class="form-field"><span>Initial stocks (opsional, satu baris)</span><textarea id="avStocks" class="input textarea"></textarea></label><button id="avCreate" class="btn btn-primary">Buat variasi</button><div id="avCreateOut" class="admin-result"></div></section>
    <section class="admin-panel"><h2>Update variasi</h2><label class="form-field"><span>Variation ID</span><input id="avUpdateId" class="input big"></label><label class="form-field"><span>Title</span><input id="avUpdateTitle" class="input big"></label><label class="form-field"><span>SKU</span><input id="avUpdateCode" class="input big"></label><div class="form-grid"><label class="form-field"><span>Price</span><input id="avUpdatePrice" class="input big" type="number"></label><label class="form-field"><span>Profit</span><input id="avUpdateProfit" class="input big" type="number"></label></div><button id="avUpdate" class="btn btn-primary">Update</button><div id="avUpdateOut" class="admin-result"></div></section>
    <section class="admin-panel"><h2>Hapus variasi</h2><div class="diag-warning">Menghapus variasi adalah aksi permanen di Xoftware.</div><label class="form-field"><span>Variation ID</span><input id="avDeleteId" class="input big"></label><button id="avDelete" class="btn danger">Delete variasi</button><div id="avDeleteOut" class="admin-result"></div></section>
  </div>`;
  $('#avGet').onclick=async()=>{try{diagnosticOutput('avGetOut',await adminApi('pm_variation',{query:{id:$('#avGetId').value.trim()}}));}catch(e){diagnosticOutput('avGetOut',diagnosticError(e),true);}};
  $('#avCreate').onclick=async()=>{try{const stocks=$('#avStocks').value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);const body={product_id:$('#avProduct').value.trim(),code:$('#avCode').value.trim(),title:$('#avTitle').value.trim(),price:Number($('#avPrice').value||0),profit:Number($('#avProfit').value||0),form:Number($('#avForm').value||0)||undefined,desc:$('#avDesc').value.trim(),snk:$('#avSnk').value.trim(),stocks};diagnosticOutput('avCreateOut',await adminApi('pm_variation_create',{method:'POST',body}));toast('Variasi dibuat.');}catch(e){diagnosticOutput('avCreateOut',diagnosticError(e),true);}};
  $('#avUpdate').onclick=async()=>{try{const body={id:$('#avUpdateId').value.trim()};if($('#avUpdateTitle').value.trim())body.title=$('#avUpdateTitle').value.trim();if($('#avUpdateCode').value.trim())body.code=$('#avUpdateCode').value.trim();if($('#avUpdatePrice').value!=='')body.price=Number($('#avUpdatePrice').value);if($('#avUpdateProfit').value!=='')body.profit=Number($('#avUpdateProfit').value);diagnosticOutput('avUpdateOut',await adminApi('pm_variation_update',{method:'POST',body}));toast('Variasi diupdate.');}catch(e){diagnosticOutput('avUpdateOut',diagnosticError(e),true);}};
  $('#avDelete').onclick=async()=>{if(!confirm('Hapus variasi ini?'))return;try{diagnosticOutput('avDeleteOut',await adminApi('pm_variation_delete',{method:'POST',body:{id:$('#avDeleteId').value.trim()}}));toast('Variasi dihapus.');}catch(e){diagnosticOutput('avDeleteOut',diagnosticError(e),true);}};
}

async function adminForms(){
  const box=$('#adminContent');box.innerHTML='<div class="loading-card"><div class="loader"></div><span>Memuat forms...</span></div>';
  try{const r=await adminApi('pm_forms'),items=Array.isArray(r?.data)?r.data:(Array.isArray(r)?r:[]);box.innerHTML=`<section class="admin-panel wide"><div class="panel-title"><div><h2>Template Form Stok</h2><p class="muted">Gunakan Form ID saat create produk/variasi agar format pipe stok sesuai template Xoftware.</p></div><span class="build-chip">${items.length} forms</span></div><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>ID</th><th>Name</th><th>Fields</th><th>Required</th><th>Contoh format stok</th></tr></thead><tbody>${items.map(f=>`<tr><td>${esc(f.id)}</td><td>${esc(f.name)}</td><td>${esc((f.fields||[]).join(' | '))}</td><td>${esc((f.required_fields||[]).join(' | '))}</td><td><code>${esc((f.fields||[]).map((x,i)=>`${String(x).toLowerCase().replace(/\s+/g,'')}${i+1}`).join('|'))}</code></td></tr>`).join('')}</tbody></table></div><div class="admin-result"><pre>${esc(JSON.stringify(r,null,2))}</pre></div></section>`;}catch(e){box.innerHTML=`<div class="status-card bad">${esc(e.message)}</div>`;}
}

function adminPricing(){
  const box=$('#adminContent');
  box.innerHTML=`<div class="admin-grid"><section class="admin-panel"><h2>Pricing calculator</h2><p class="muted">Tool lokal, bukan endpoint Xoftware. Cocok untuk menentukan harga jual setelah modal, target profit, dan fee payment gateway.</p><label class="form-field"><span>Modal produk</span><input id="prCost" class="input big" type="number" value="10000"></label><label class="form-field"><span>Target profit</span><input id="prProfit" class="input big" type="number" value="3000"></label><div class="form-grid"><label class="form-field"><span>Fee %</span><input id="prPct" class="input big" type="number" step="0.01" value="0.7"></label><label class="form-field"><span>Fee fixed</span><input id="prFixed" class="input big" type="number" value="310"></label></div><button id="prCalc" class="btn btn-primary">Hitung</button></section><section class="admin-panel"><h2>Hasil</h2><div id="prOut"></div></section></div>`;
  const calc=()=>{const cost=Number($('#prCost').value||0),profit=Number($('#prProfit').value||0),pct=Number($('#prPct').value||0)/100,fixed=Number($('#prFixed').value||0);const target=cost+profit;const sell=Math.ceil((target+fixed)/(1-pct));const fee=Math.ceil(sell*pct+fixed),net=sell-fee;$('#prOut').innerHTML=`<div class="metric-grid"><div class="metric-card"><small>Harga jual minimum</small><strong>${money(sell)}</strong></div><div class="metric-card"><small>Estimasi fee</small><strong>${money(fee)}</strong></div><div class="metric-card"><small>Bersih masuk</small><strong>${money(net)}</strong></div><div class="metric-card"><small>Profit bersih</small><strong>${money(net-cost)}</strong></div></div>`;};
  $('#prCalc').onclick=calc;calc();
}

function adminEnvironment(){
  const s=state.store.support||{},a=state.store.appearance||{};
  const lines=[
    'XSOFTWARE_API_KEY=ISI_DI_VERCEL_JANGAN_DI_GITHUB',
    'ADMIN_PASSWORD=ISI_PASSWORD_ADMIN',
    `STORE_NAME=${state.store.name||'VanzShop.com'}`,
    `STORE_TAGLINE=${state.store.tagline||''}`,
    `STORE_WHATSAPP=${s.whatsapp||''}`,
    `STORE_TELEGRAM=${s.telegram||''}`,
    `STORE_EMAIL=${s.email||''}`,
    `STORE_THEME=${a.theme||'dark'}`,
    `STORE_ACCENT=${a.accent||'#f3c74f'}`,
    `STORE_RADIUS=${a.radius||20}`,
    `STORE_COLUMNS=${a.columns||5}`,
    `STORE_DENSITY=${a.density||'compact'}`,
    `STORE_HERO=${a.hero!==false?'true':'false'}`,
    'XSOFTWARE_TIMEOUT=25000',
    'XSOFTWARE_CHECKOUT_MODE=user',
    'XSOFTWARE_SHARED_CHANNEL=whatsapp',
    'XSOFTWARE_SHARED_SENDER=',
    'XSOFTWARE_SHARED_NAME=VanzShop Checkout',
    'STORE_BRAND_MARK=V',
    'STORE_BRAND_SUBTITLE=PRODUK DIGITAL',
    'STORE_LOGO_URL=',
    'STORE_HERO_TITLE=Produk digital premium, instant delivery, full branding.',
    'STORE_HERO_SUBTITLE=Katalog live dari Xoftware, pembayaran otomatis SewaPay, dan auto-claim akun setelah payment berhasil.',
    'STORE_HERO_BADGES=Stok live,Auto claim,Checkout cepat,Full branding',
    'STORE_HERO_SLIDES=/assets/showcase/chatgpt.jpg,/assets/showcase/canva.jpg,/assets/showcase/netflix.jpg',
    'STORE_RECEIPT_NOTE=Detail akun dikirim otomatis dari stok aktif. Simpan data login dan segera ganti jika diperlukan.',
    'STORE_FOOTER_NOTE=Live stock · auto claim · pembayaran instan',
    'STORE_FONT_BODY=Plus Jakarta Sans',
    'STORE_FONT_DISPLAY=Archivo',
    'STORE_BRAND_MARK=V',
    'STORE_BRAND_SUBTITLE=PRODUK DIGITAL',
    'STORE_LOGO_URL=',
    'STORE_HERO_TITLE=Produk digital premium, instant delivery, full branding.',
    'STORE_HERO_SUBTITLE=Katalog live dari Xoftware, pembayaran otomatis SewaPay, dan auto-claim akun setelah payment berhasil.',
    'STORE_HERO_BADGES=Stok live,Auto claim,Checkout cepat,Full branding',
    'STORE_HERO_SLIDES=/assets/showcase/chatgpt.jpg,/assets/showcase/canva.jpg,/assets/showcase/netflix.jpg',
    'STORE_RECEIPT_NOTE=Detail akun dikirim otomatis dari stok aktif. Simpan data login dan segera ganti jika diperlukan.',
    'STORE_FOOTER_NOTE=Live stock · auto claim · pembayaran instan',
    'STORE_FONT_BODY=Plus Jakarta Sans',
    'STORE_FONT_DISPLAY=Archivo',
    'STORE_BRAND_MARK=V',
    'STORE_BRAND_SUBTITLE=PRODUK DIGITAL',
    'STORE_LOGO_URL=',
    'STORE_HERO_TITLE=Produk digital premium, instant delivery, full branding.',
    'STORE_HERO_SUBTITLE=Katalog live dari Xoftware, pembayaran otomatis SewaPay, dan auto-claim akun setelah payment berhasil.',
    'STORE_HERO_BADGES=Stok live,Auto claim,Checkout cepat,Full branding',
    'STORE_HERO_SLIDES=/assets/showcase/chatgpt.jpg,/assets/showcase/canva.jpg,/assets/showcase/netflix.jpg',
    'STORE_RECEIPT_NOTE=Detail akun dikirim otomatis dari stok aktif. Simpan data login dan segera ganti jika diperlukan.',
    'STORE_FOOTER_NOTE=Live stock · auto claim · pembayaran instan',
    'STORE_FONT_BODY=Plus Jakarta Sans',
    'STORE_FONT_DISPLAY=Archivo',
    'STORE_BRAND_MARK=V',
    'STORE_BRAND_SUBTITLE=PRODUK DIGITAL',
    'STORE_LOGO_URL=',
    'STORE_HERO_TITLE=Produk digital premium, instant delivery, full branding.',
    'STORE_HERO_SUBTITLE=Katalog live dari Xoftware, pembayaran otomatis SewaPay, dan auto-claim akun setelah payment berhasil.',
    'STORE_HERO_BADGES=Stok live,Auto claim,Checkout cepat,Full branding',
    'STORE_HERO_SLIDES=/assets/showcase/chatgpt.jpg,/assets/showcase/canva.jpg,/assets/showcase/netflix.jpg',
    'STORE_RECEIPT_NOTE=Detail akun dikirim otomatis dari stok aktif. Simpan data login dan segera ganti jika diperlukan.',
    'STORE_FOOTER_NOTE=Live stock · auto claim · pembayaran instan',
    'STORE_FONT_BODY=Plus Jakarta Sans',
    'STORE_FONT_DISPLAY=Archivo'
  ];const txt=lines.join('\n');
  $('#adminContent').innerHTML=`<div class="admin-grid"><section class="admin-panel wide"><h2>Vercel Environment helper</h2><div class="diag-warning">Jangan commit API key/password asli ke GitHub. Isi secret langsung di Vercel Environment Variables.</div><div class="env-box"><pre>${esc(txt)}</pre><button id="aeCopy" class="btn btn-primary">Salin template ENV</button></div></section><section class="admin-panel"><h2>Wajib</h2><div class="kv"><span>XSOFTWARE_API_KEY</span><b>secret</b></div><div class="kv"><span>ADMIN_PASSWORD</span><b>secret</b></div></section><section class="admin-panel"><h2>Opsional</h2><p class="muted">STORE_* mengatur tampilan/kontak global. XSOFTWARE_TIMEOUT mengatur timeout request provider.</p></section></div>`;
  $('#aeCopy').onclick=async()=>{try{await navigator.clipboard.writeText(txt);toast('Template ENV disalin.');}catch{toast('Clipboard gagal.',true);}};
}

async function adminSecurity(){
  const box=$('#adminContent');
  try{const h=await api('health');box.innerHTML=`<div class="admin-grid"><section class="admin-panel"><h2>Admin session</h2><div class="kv"><span>Token</span><b>${adminToken()?'Active':'Missing'}</b></div><div class="kv"><span>Build</span><b>${esc(h.build||BUILD_ID)}</b></div><div class="kv"><span>Admin env</span><b>${h.admin_ready?'Configured':'Missing'}</b></div><p class="muted">Admin memakai signed session token. Password tidak dikirim pada setiap request setelah login.</p></section><section class="admin-panel"><h2>Provider security</h2><div class="kv"><span>API key</span><b>${h.ready?'Server-side':'Missing'}</b></div><div class="kv"><span>IP whitelist</span><b>Atur di Xoftware</b></div><p class="muted">README menyebut HTTP 403 jika IP server tidak masuk whitelist. Vercel egress dapat berubah kecuali memakai solusi static egress.</p></section><section class="admin-panel wide"><h2>Checklist</h2><div class="checklist"><span>✓ API key tidak ada di frontend</span><span>✓ Admin password tidak disimpan localStorage</span><span>✓ Mutating action memakai confirmation</span><span>✓ Raw stock hanya ditampilkan setelah admin auth</span><span>✓ Public order status memakai signed token</span></div></section></div>`;}catch(e){box.innerHTML=`<div class="status-card bad">${esc(e.message)}</div>`;}
}

function adminLogsView(){
  const logs=readAdminLogs();
  $('#adminContent').innerHTML=`<section class="admin-panel wide"><div class="panel-title"><div><h2>Admin activity log</h2><p class="muted">Log lokal browser ini saja; tidak ada database server.</p></div><button id="alClear" class="btn danger">Clear logs</button></div>${logs.length?`<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Time</th><th>Action</th><th>Method</th><th>Status</th><th>Note</th></tr></thead><tbody>${logs.map(x=>`<tr><td>${new Date(x.time).toLocaleString('id-ID')}</td><td><code>${esc(x.action)}</code></td><td>${esc(x.method)}</td><td>${esc(x.status)}</td><td>${esc(x.note||'')}</td></tr>`).join('')}</tbody></table></div>`:'<p class="muted">Belum ada log.</p>'}</section>`;
  $('#alClear').onclick=()=>{if(confirm('Hapus seluruh log admin lokal?')){localStorage.removeItem('vanz_admin_logs');adminLogsView();}};
}

async function ensureInit(){
  if(state.catalogLoaded)return;
  try{const d=await api('init');state.owner=Array.isArray(d.products)?d.products:[];state.catalogSummary=d.catalog||null;state.store=mergeStore(d.store||DEFAULT_STORE);state.catalogLoaded=true;applyAppearance();}catch{}
}
function activeRoute(){
  const h=String(location.hash||'');
  if(h.startsWith('#/')) return h.slice(1);
  const p=String(location.pathname||'/').replace(/\/+$/,'')||'/';
  if(p==='/admin'||p.startsWith('/admin/')) return p;
  return '/';
}
async function renderRoute(){
  if(timer){clearInterval(timer);timer=null;}
  const route=activeRoute();
  const admin=route.match(/^\/admin(?:\/([^/]+))?$/);
  if(admin)return renderAdmin(admin[1]||'overview');
  if(route==='/akun'){await ensureInit();return renderAccount();}
  const m=route.match(/^\/produk\/([^/]+)\/(.+)$/);if(m){await ensureInit();const p=getProduct(m[1],decodeURIComponent(m[2]));if(!p){toast('Produk tidak ditemukan.',true);location.hash='#/';return;}state.product=p;return detailHtml(p);}
  const pay=route.match(/^\/bayar\/(.+)$/);if(pay){await ensureInit();return renderPayment(decodeURIComponent(pay[1]));}
  if(route==='/isi-saldo'){await ensureInit();return renderTopup();}
  if(/^\/pesanan/.test(route)){await ensureInit();return renderOrders();}
  await loadCatalog();
}
window.addEventListener('hashchange',renderRoute);window.addEventListener('beforeunload',()=>{if(timer)clearInterval(timer);});renderRoute();
})();
