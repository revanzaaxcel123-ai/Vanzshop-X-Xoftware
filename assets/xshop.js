(() => {
'use strict';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const app = $('#app');
const BUILD_ID = 'HARDMAX-v15-ANTIDOUBLE';
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
  appearance:{theme:'dark',site_theme:'gold',admin_theme:'gold',accent:'#f3c74f',custom_accent:false,radius:20,columns:4,density:'comfortable',hero:true},
  branding:{
    mark:'V',
    subtitle:'PRODUK DIGITAL',
    logo_url:'',
    hero_title:'VanzShop — Pusat Produk Digital Termurah',
    hero_subtitle:'Produk digital pilihan dengan stok real-time, checkout ringkas, dan pengiriman akun otomatis setelah pembayaran berhasil.',
    hero_badges:['Harga bersaing','Stok real-time','Pembayaran aman','Proses otomatis'],
    hero_slides:['/assets/banner/banner1.jpg','/assets/banner/banner2.jpg','/assets/banner/banner3.jpg','/assets/banner/banner4.jpg','/assets/banner/banner5.jpg'],
    footer_note:'Produk digital hemat · stok real-time · proses otomatis',
    receipt_note:'Detail akun dikirim otomatis dari stok aktif. Simpan data login dan segera ganti jika diperlukan.',
    body_font:'Plus Jakarta Sans',
    display_font:'Archivo'
  },
  registration:{required_before_order:true,api_permission_required_for_new_users:true,supported_sender_types:['whatsapp','telegram_id'],email_is_sender:false,max_per_minute:3,otp_endpoint_documented:false},
  payment:{provider:'sewapay',configured:false,base_url:'https://sewapay.id'},
  checkout:{mode:'sewapay',fulfillment:'disabled-until-redis-configured',shared_sender_configured:false,shared_channel:'whatsapp',shared_sender_masked:''},
  limits:{registration_per_minute:3,deposit_min:1000,deposit_max:1000000,stock_accounts_per_request:100,variations_per_product:30,products_per_page:20,title_max:100,description_max:5000,terms_max:5000,sku_min:3,sku_max:50}
};

const SITE_THEMES = Object.freeze({
  gold:{label:'Golden Night',mode:'dark',scene:'orbs',bg:'#0a0908',bg2:'#12110f',accent:'#e9b949',accent2:'#c8912a',accent3:'#fff0c2',on:'#1a1307',c2:'#c8912a',c3:'#7a5a1a',orb1:'#2a2723',orb2:'#0c0b0a'},
  pearl:{label:'Cream Pearl',mode:'light',scene:'orbs',bg:'#f6f0e4',bg2:'#efe6d4',accent:'#b98423',accent2:'#8f6212',accent3:'#fff3cf',on:'#1a1307',c2:'#e9b949',c3:'#d9c7a0',orb1:'#fffaf0',orb2:'#e3d5b8'},
  aurora:{label:'Aurora Borealis',mode:'dark',scene:'aurora',bg:'#040a10',bg2:'#0a1822',accent:'#34d399',accent2:'#10b981',accent3:'#a7f3d0',on:'#03140c',c2:'#22d3ee',c3:'#8b5cf6',orb1:'#13222b',orb2:'#050b12'},
  galaxy:{label:'Purple Galaxy',mode:'dark',scene:'aurora',bg:'#07051a',bg2:'#120a2e',accent:'#a78bfa',accent2:'#7c3aed',accent3:'#ede9fe',on:'#ffffff',c2:'#ec4899',c3:'#3b82f6',orb1:'#1e1640',orb2:'#07051a'},
  ocean:{label:'Deep Ocean',mode:'dark',scene:'waves',bg:'#031020',bg2:'#072543',accent:'#38bdf8',accent2:'#0284c7',accent3:'#e0f2fe',on:'#04121f',c2:'#2563eb',c3:'#06b6d4',orb1:'#0b2a4a',orb2:'#031020'},
  sunset:{label:'Tropical Sunset',mode:'dark',scene:'waves',bg:'#170914',bg2:'#2c0f22',accent:'#fb923c',accent2:'#f43f5e',accent3:'#ffedd5',on:'#2a0a0f',c2:'#f43f5e',c3:'#facc15',orb1:'#3a1426',orb2:'#170914'},
  synth:{label:'Synthwave 84',mode:'dark',scene:'retro',bg:'#0c0220',bg2:'#1c0538',accent:'#ff2e97',accent2:'#d4146f',accent3:'#ffd1ea',on:'#ffffff',c2:'#22d3ee',c3:'#fbbf24',orb1:'#2a0b4a',orb2:'#0c0220'},
  neon:{label:'Neon City',mode:'dark',scene:'retro',bg:'#020617',bg2:'#0b1333',accent:'#22d3ee',accent2:'#0891b2',accent3:'#cffafe',on:'#04121f',c2:'#a855f7',c3:'#f472b6',orb1:'#101a3d',orb2:'#020617'},
  forest:{label:'Enchanted Forest',mode:'dark',scene:'bubbles',bg:'#03100a',bg2:'#0a2116',accent:'#4ade80',accent2:'#16a34a',accent3:'#dcfce7',on:'#03140c',c2:'#a3e635',c3:'#2dd4bf',orb1:'#0d2a1b',orb2:'#03100a'},
  ruby:{label:'Ruby Royale',mode:'dark',scene:'orbs',bg:'#11050a',bg2:'#1f0a12',accent:'#fb7185',accent2:'#e11d48',accent3:'#ffe4e6',on:'#ffffff',c2:'#f43f5e',c3:'#881337',orb1:'#2c0f18',orb2:'#0e0407'},
  matrix:{label:'Cyber Matrix',mode:'dark',scene:'dots',bg:'#020604',bg2:'#04140b',accent:'#22c55e',accent2:'#15803d',accent3:'#dcfce7',on:'#02140a',c2:'#16a34a',c3:'#065f46',orb1:'#062012',orb2:'#020604'},
  mono:{label:'Midnight Mono',mode:'dark',scene:'dots',bg:'#09090b',bg2:'#141417',accent:'#e4e4e7',accent2:'#a1a1aa',accent3:'#ffffff',on:'#111111',c2:'#71717a',c3:'#3f3f46',orb1:'#1c1c20',orb2:'#09090b'},
  sakura:{label:'Sakura Blossom',mode:'light',scene:'petals',bg:'#fff3f6',bg2:'#ffe4ec',accent:'#ec4899',accent2:'#be185d',accent3:'#fce7f3',on:'#ffffff',c2:'#f9a8d4',c3:'#fda4af',orb1:'#ffffff',orb2:'#fbcfe8'},
  arctic:{label:'Arctic Aurora',mode:'light',scene:'aurora',bg:'#eef6fd',bg2:'#dfeeff',accent:'#2563eb',accent2:'#1d4ed8',accent3:'#dbeafe',on:'#ffffff',c2:'#22d3ee',c3:'#a78bfa',orb1:'#ffffff',orb2:'#cfe0f7'},
  mint:{label:'Mint Breeze',mode:'light',scene:'mesh',bg:'#eefbf6',bg2:'#dcf7ec',accent:'#10b981',accent2:'#047857',accent3:'#d1fae5',on:'#ffffff',c2:'#5eead4',c3:'#bef264',orb1:'#ffffff',orb2:'#c9efe0'},
  candy:{label:'Candy Pop',mode:'light',scene:'mesh',bg:'#fff7fc',bg2:'#fbeefe',accent:'#d946ef',accent2:'#a21caf',accent3:'#fae8ff',on:'#ffffff',c2:'#38bdf8',c3:'#fb7185',orb1:'#ffffff',orb2:'#f3d9f7'},
  lavender:{label:'Lavender Dream',mode:'light',scene:'bubbles',bg:'#f6f4ff',bg2:'#ece8ff',accent:'#7c3aed',accent2:'#6d28d9',accent3:'#ede9fe',on:'#ffffff',c2:'#f0abfc',c3:'#93c5fd',orb1:'#ffffff',orb2:'#ddd6fe'},
  desert:{label:'Desert Dune',mode:'light',scene:'waves',bg:'#fbf5ea',bg2:'#f5e6cc',accent:'#d97706',accent2:'#b45309',accent3:'#fef3c7',on:'#ffffff',c2:'#f59e0b',c3:'#fb923c',orb1:'#fffaf0',orb2:'#f0dcb8'},
  paper:{label:'Clean Paper',mode:'light',scene:'dots',bg:'#fafaf9',bg2:'#f0f0ee',accent:'#27272a',accent2:'#09090b',accent3:'#e4e4e7',on:'#ffffff',c2:'#a1a1aa',c3:'#d4d4d8',orb1:'#ffffff',orb2:'#e7e5e4'}
});
const ADMIN_THEMES = Object.freeze({
  gold:{label:'Vanz Gold',mode:'dark',scene:'orbs',bg:'#0b0a09',side:'#100f0d',card:'#161513',card2:'#1c1a17',field:'#0f0e0c',text:'#f3eee4',muted:'#9a9387',accent:'#e9b949',accent2:'#c8912a',accent3:'#fff0c2',on:'#1a1307'},
  latte:{label:'Cream Latte',mode:'light',scene:'dots',bg:'#f5f1e8',side:'#fbf8f1',card:'#ffffff',card2:'#fbf8f2',field:'#f6f2ea',text:'#1f1b14',muted:'#6d6556',accent:'#b98423',accent2:'#8f6212',accent3:'#f3d58a',on:'#ffffff'},
  ocean:{label:'Midnight Ocean',mode:'dark',scene:'waves',bg:'#070d18',side:'#0a1322',card:'#0f1a2d',card2:'#142238',field:'#0a1426',text:'#e6eefc',muted:'#8a9bb8',accent:'#38bdf8',accent2:'#0284c7',accent3:'#bae6fd',on:'#04121f'},
  emerald:{label:'Emerald Forest',mode:'dark',scene:'bubbles',bg:'#06110c',side:'#081710',card:'#0d1f16',card2:'#12281d',field:'#0a1a12',text:'#e5f5ec',muted:'#86a897',accent:'#34d399',accent2:'#059669',accent3:'#a7f3d0',on:'#03140c'},
  nebula:{label:'Nebula Violet',mode:'dark',scene:'aurora',bg:'#0c0816',side:'#110b1f',card:'#171029',card2:'#1e1535',field:'#120c21',text:'#efe9ff',muted:'#9e93bd',accent:'#a78bfa',accent2:'#7c3aed',accent3:'#ddd6fe',on:'#ffffff'},
  sunset:{label:'Sunset Coral',mode:'dark',scene:'waves',bg:'#140b0a',side:'#1a0f0d',card:'#221412',card2:'#2b1916',field:'#180e0c',text:'#fbece7',muted:'#b5948b',accent:'#fb7185',accent2:'#f97316',accent3:'#fecdd3',on:'#2a0a0f'},
  neon:{label:'Cyber Neon',mode:'dark',scene:'retro',bg:'#050507',side:'#08080c',card:'#0e0e14',card2:'#14141c',field:'#09090e',text:'#eaffea',muted:'#8b93a1',accent:'#a3e635',accent2:'#22d3ee',accent3:'#ecfccb',on:'#0b1200'},
  graphite:{label:'Graphite Mono',mode:'dark',scene:'dots',bg:'#0d0e10',side:'#111215',card:'#17181c',card2:'#1d1f24',field:'#101114',text:'#ececee',muted:'#8e9097',accent:'#e5e7eb',accent2:'#9ca3af',accent3:'#ffffff',on:'#111111'},
  ruby:{label:'Ruby Wine',mode:'dark',scene:'orbs',bg:'#12080a',side:'#170a0d',card:'#1f0e12',card2:'#281318',field:'#160a0d',text:'#fbe9ec',muted:'#b18c93',accent:'#f43f5e',accent2:'#be123c',accent3:'#fecdd3',on:'#ffffff'},
  sakura:{label:'Sakura Bloom',mode:'light',scene:'petals',bg:'#fdf2f5',side:'#fff7f9',card:'#ffffff',card2:'#fff5f8',field:'#fdf0f4',text:'#3a1d27',muted:'#8a6371',accent:'#ec4899',accent2:'#be185d',accent3:'#fbcfe8',on:'#ffffff'},
  arctic:{label:'Arctic Frost',mode:'light',scene:'aurora',bg:'#eef4fb',side:'#f7fafe',card:'#ffffff',card2:'#f5f9fe',field:'#edf3fa',text:'#0f1f33',muted:'#5b6f88',accent:'#2563eb',accent2:'#1d4ed8',accent3:'#bfdbfe',on:'#ffffff'},
  mint:{label:'Mint Fresh',mode:'light',scene:'mesh',bg:'#effaf6',side:'#f7fdfa',card:'#ffffff',card2:'#f3fbf8',field:'#ecf8f3',text:'#0f2a20',muted:'#56776b',accent:'#10b981',accent2:'#047857',accent3:'#a7f3d0',on:'#ffffff'},
  lavender:{label:'Lavender Mist',mode:'light',scene:'bubbles',bg:'#f4f2fb',side:'#faf9fe',card:'#ffffff',card2:'#f8f6fd',field:'#f1eefa',text:'#221d38',muted:'#6b6488',accent:'#7c3aed',accent2:'#6d28d9',accent3:'#ddd6fe',on:'#ffffff'},
  sand:{label:'Desert Sand',mode:'light',scene:'waves',bg:'#f7f1e8',side:'#fcf8f2',card:'#fffdf9',card2:'#faf5ec',field:'#f4ede1',text:'#2b2118',muted:'#7d6b58',accent:'#d97706',accent2:'#b45309',accent3:'#fde68a',on:'#ffffff'}
});
const state = {
  owner:[], source:'all', category:'all', q:'', sort:'store', catalogSummary:null,
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
function applyAppearance(adminMode=null){
  const a = state.store.appearance || DEFAULT_STORE.appearance;
  const b = state.store.branding || DEFAULT_STORE.branding;
  const isAdmin = adminMode == null ? /^\/admin(?:\/|$)/.test(activeRoute()) : Boolean(adminMode);
  const siteKey = SITE_THEMES[a.site_theme] ? a.site_theme : (a.theme === 'light' ? 'pearl' : 'gold');
  const adminKey = ADMIN_THEMES[a.admin_theme] ? a.admin_theme : (a.theme === 'light' ? 'latte' : 'gold');
  const preset = isAdmin ? ADMIN_THEMES[adminKey] : SITE_THEMES[siteKey];
  const root = document.documentElement;
  const customAccent = a.custom_accent && /^#[0-9a-f]{6}$/i.test(a.accent||'') ? a.accent : preset.accent;
  root.dataset.theme = preset.mode;
  root.dataset.scene = preset.scene;
  root.dataset.ui = isAdmin ? 'admin' : 'store';
  root.dataset.siteTheme = siteKey;
  root.dataset.adminTheme = adminKey;
  root.dataset.density = a.density === 'comfortable' ? 'comfortable' : 'compact';
  const vars = {
    '--bg':preset.bg,'--bg2':preset.bg2 || preset.side || preset.bg,'--panel':preset.card || `color-mix(in srgb, ${preset.bg2} 76%, transparent)`,
    '--panel2':preset.card2 || `color-mix(in srgb, ${preset.bg2} 88%, transparent)`,'--field':preset.field || (preset.mode==='dark'?'rgba(0,0,0,.34)':'rgba(255,255,255,.76)'),
    '--text':preset.text || (preset.mode==='dark'?`color-mix(in srgb, ${preset.accent3} 12%, #f4f4f5)`:`color-mix(in srgb, ${preset.accent2} 16%, #141418)`),
    '--muted':preset.muted || `color-mix(in srgb, var(--text) ${preset.mode==='dark'?'58%':'62%'}, var(--bg))`,'--accent':customAccent,'--accent2':preset.accent2,'--accent3':preset.accent3,'--accent-on':preset.on,
    '--scene-c2':preset.c2 || preset.accent2,'--scene-c3':preset.c3 || preset.accent3,'--scene-orb1':preset.orb1 || preset.card2 || preset.bg2,'--scene-orb2':preset.orb2 || preset.bg,
    '--border':`color-mix(in srgb, ${customAccent} ${preset.mode==='dark'?'18%':'22%'}, transparent)`,
    '--border-soft':preset.mode==='dark'?'rgba(255,255,255,.07)':`color-mix(in srgb, ${preset.accent2} 10%, transparent)`,
    '--shadow':preset.mode==='dark'?'0 30px 80px -34px rgba(0,0,0,.9)':`0 28px 70px -38px color-mix(in srgb, ${preset.accent2} 45%, transparent)`
  };
  Object.entries(vars).forEach(([key,value])=>root.style.setProperty(key,value));
  root.style.setProperty('--radius', `${Math.max(8,Math.min(32,Number(a.radius)||20))}px`);
  root.style.setProperty('--grid-columns', String(Math.max(2,Math.min(6,Number(a.columns)||5))));
  root.style.setProperty('--font', fontPreset(b.body_font,'body'));
  root.style.setProperty('--display', fontPreset(b.display_font,'display'));
  const metaTheme=document.querySelector('meta[name="theme-color"]');
  if(metaTheme)metaTheme.setAttribute('content',preset.bg);
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
  return /^(https?:\/\/|data:image\/)/i.test(s)||/^\/(?!\/)/.test(s)?s:'';
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
  const viewport=$('.campaign-slider-window',root),track=$('.campaign-slider-track',root),slides=$$('.campaign-slide',root),dots=$$('.campaign-dot',root);
  if(!viewport||!track||!slides.length) return;
  let index=0,timer=null,baseX=0,startX=0,moved=false,dragging=false;
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const mobile=window.matchMedia?.('(max-width: 700px)');
  const update=(instant=false)=>{
    const slide=slides[index];
    baseX=-(slide.offsetLeft-(viewport.clientWidth-slide.offsetWidth)/2);
    if(mobile?.matches){track.style.transform='none';viewport.scrollTo({left:-baseX,behavior:instant||reduced?'auto':'smooth'});}
    else{track.style.transition=instant?'none':'';track.style.transform=`translateX(${baseX}px)`;}
    slides.forEach((el,i)=>el.classList.toggle('is-center',i===index));
    dots.forEach((el,i)=>{el.classList.toggle('active',i===index);el.setAttribute('aria-current',i===index?'true':'false');});
  };
  const go=i=>{index=(i+slides.length)%slides.length;update();};
  const stop=()=>{if(timer){clearInterval(timer);timer=null;}};
  const start=()=>{stop();if(!reduced&&!mobile?.matches&&slides.length>1)timer=setInterval(()=>go(index+1),4200);};
  $('[data-slider-next]',root)?.addEventListener('click',()=>{go(index+1);start();});
  $('[data-slider-prev]',root)?.addEventListener('click',()=>{go(index-1);start();});
  dots.forEach((dot,i)=>dot.addEventListener('click',()=>{go(i);start();}));
  viewport.addEventListener('pointerdown',e=>{if(mobile?.matches)return;dragging=true;moved=false;startX=e.clientX;stop();viewport.setPointerCapture?.(e.pointerId);root.classList.add('dragging');});
  viewport.addEventListener('pointermove',e=>{if(!dragging||mobile?.matches)return;const dx=e.clientX-startX;if(Math.abs(dx)>5)moved=true;track.style.transition='none';track.style.transform=`translateX(${baseX+dx}px)`;});
  const release=e=>{if(!dragging)return;dragging=false;root.classList.remove('dragging');const dx=e.clientX-startX,threshold=Math.min(120,slides[index].offsetWidth*.16);if(Math.abs(dx)>threshold)go(index+(dx<0?1:-1));else update();start();};
  viewport.addEventListener('pointerup',release);viewport.addEventListener('pointercancel',release);
  const openSlide=slide=>{if(moved||mobile?.matches)return;const q=slide.dataset.query||'';const input=$('#search');if(input&&q){input.value=q;state.q=q.toLowerCase();drawGrid();}$('#produk')?.scrollIntoView({behavior:reduced?'auto':'smooth',block:'start'});};
  slides.forEach(slide=>{slide.addEventListener('click',()=>openSlide(slide));slide.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openSlide(slide);}});});
  root.addEventListener('mouseenter',stop);root.addEventListener('mouseleave',start);root.addEventListener('focusin',stop);root.addEventListener('focusout',start);
  if(window.ResizeObserver)new ResizeObserver(()=>update(true)).observe(viewport);else window.addEventListener('resize',()=>update(true));
  requestAnimationFrame(()=>{update(true);start();});
}

function mountStorefrontExperience(){
  $$('[data-scroll-products]').forEach(btn=>btn.onclick=()=>$('#produk')?.scrollIntoView({behavior:'smooth',block:'start'}));
  $$('[data-scroll-how]').forEach(btn=>btn.onclick=()=>$('#cara-belanja')?.scrollIntoView({behavior:'smooth',block:'start'}));
}

function storefrontSections(){
  return `<section class="market-section wrap" id="kenapa-vanzshop"><div class="market-heading"><div><span class="section-kicker">Kenapa VanzShop</span><h2>Belanja digital harus cepat, jelas, dan tidak bikin was-was.</h2></div><p>Kami merapikan seluruh proses dari pilih produk sampai akun diterima, supaya kamu tidak perlu pindah-pindah chat hanya untuk menyelesaikan satu pembelian.</p></div><div class="benefit-grid">
    <article class="benefit-card"><span class="benefit-no">01</span><div class="benefit-icon">Rp</div><h3>Harga tetap masuk akal</h3><p>Produk dipilih untuk kebutuhan sehari-hari dengan harga yang kompetitif dan rincian yang mudah dibandingkan.</p></article>
    <article class="benefit-card"><span class="benefit-no">02</span><div class="benefit-icon">↻</div><h3>Stok terlihat real-time</h3><p>Status stok dibaca langsung dari katalog, jadi keputusan belanja dibuat dari data yang sedang tersedia.</p></article>
    <article class="benefit-card"><span class="benefit-no">03</span><div class="benefit-icon">⚡</div><h3>Proses otomatis</h3><p>Setelah pembayaran tervalidasi, sistem menyiapkan detail akun dari stok aktif tanpa alur manual yang panjang.</p></article>
    <article class="benefit-card"><span class="benefit-no">04</span><div class="benefit-icon">✓</div><h3>Detail pembelian rapi</h3><p>Produk, status transaksi, dan hasil fulfillment ditampilkan dalam satu pengalaman yang konsisten dan mudah disalin.</p></article>
  </div></section>
  <section class="experience-section wrap" id="cara-belanja"><div class="experience-card"><div class="experience-copy"><span class="section-kicker">Pengalaman belanja</span><h2>Dari katalog ke akun siap pakai dalam tiga langkah.</h2><p>Tidak ada form panjang. Cari produk, selesaikan QRIS, lalu pantau hasilnya dari halaman pesanan.</p><button class="btn btn-primary" type="button" data-scroll-products>Lihat katalog</button></div><div class="experience-steps"><article><span>1</span><div><b>Pilih produk</b><p>Cari layanan dan varian yang paling sesuai kebutuhanmu.</p></div></article><article><span>2</span><div><b>Bayar dengan aman</b><p>Nominal dihitung server dan transaksi diproses melalui Sewa Pay.</p></div></article><article><span>3</span><div><b>Terima detail</b><p>Status dipantau otomatis, lalu akun tampil ketika fulfillment selesai.</p></div></article></div></div></section>
  <section class="faq-section wrap" id="faq"><div class="faq-intro"><span class="section-kicker">FAQ</span><h2>Pertanyaan yang paling sering muncul.</h2><p>Jawaban singkat sebelum kamu mulai belanja di VanzShop.</p></div><div class="faq-list">
    <details open><summary>Berapa lama produk dikirim?<span>+</span></summary><p>Produk diproses setelah pembayaran terverifikasi. Jika stok aktif tersedia dan koneksi provider normal, detail akun akan tampil otomatis di halaman pesanan.</p></details>
    <details><summary>Bagaimana cara mengecek pesanan?<span>+</span></summary><p>Buka menu Pesanan pada perangkat dan browser yang sama. Status pembayaran serta hasil fulfillment akan diperbarui dari sana.</p></details>
    <details><summary>Apakah stok yang tampil benar-benar tersedia?<span>+</span></summary><p>Jumlah stok berasal dari katalog Xoftware. Saat checkout, server memvalidasi kembali produk, harga, dan stok untuk mengurangi risiko data lama.</p></details>
    <details><summary>Apa yang harus dilakukan jika akun belum muncul?<span>+</span></summary><p>Cek kembali status transaksi pada menu Pesanan. Jika pembayaran sudah berhasil tetapi fulfillment tertunda, gunakan retry yang tersedia atau hubungi dukungan toko.</p></details>
    <details><summary>Apakah data pembeli aman?<span>+</span></summary><p>Kunci API dan secret pembayaran tetap berada di server. Data kontak hanya dipakai sesuai kebutuhan proses order dan dukungan.</p></details>
  </div></section>
  <section class="closing-cta wrap"><div><span class="section-kicker">Siap mulai?</span><h2>Satu tempat untuk kebutuhan digitalmu.</h2><p>Pilih produk, bayar, dan pantau pesanan tanpa alur yang membingungkan.</p></div><button class="btn btn-primary" type="button" data-scroll-products>Belanja sekarang</button></section>`;
}
function visualMarkup(p,extra=''){
  const direct=productImage(p), fallback=localBrandImage(p), cat=brandCategory(p?.title,p?.code);
  return `<div class="product-visual ${extra}"><div class="visual-media">
    <img class="visual-img fallback-art" src="${esc(fallback)}" alt="${esc(p?.title||'Produk')}" loading="lazy">
    ${direct?`<img class="visual-img direct-art" src="${esc(direct)}" alt="${esc(p?.title||'Produk')}" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">`:''}
  </div><span class="visual-tag">${esc(cat)}</span></div>`;
}

function themeBackground(){
  return `<div class="theme-background" aria-hidden="true"><div class="scene-grid"></div><div class="scene-beam"></div><div class="scene-beam second"></div><div class="scene-orb orb-one"></div><div class="scene-orb orb-two"></div><div class="scene-aurora"><i></i><i></i><i></i></div><div class="scene-mesh"></div><div class="scene-waves"><i></i><i></i><i></i></div><div class="scene-bubbles">${'<i></i>'.repeat(10)}</div><div class="scene-petals">${'<i></i>'.repeat(12)}</div><div class="scene-retro"><i class="retro-sun"></i><i class="retro-floor"></i></div><div class="scene-dots"></div><div class="scene-vignette"></div></div>`;
}
function themePicker(themes,selected,name){
  return `<div class="theme-picker">${Object.entries(themes).map(([key,t])=>`<label class="theme-choice ${selected===key?'is-selected':''}" style="--sw-bg:${t.bg};--sw-bg2:${t.bg2||t.side||t.bg};--sw-accent:${t.accent};--sw-c2:${t.c2||t.accent2}"><input type="radio" name="${name}" value="${key}" ${selected===key?'checked':''}><span class="theme-swatch"><i></i><i></i><i></i></span><span class="theme-choice-copy"><b>${esc(t.label)}</b><small>${esc(t.mode)} · ${esc(t.scene)}</small></span><span class="theme-check">✓</span></label>`).join('')}</div>`;
}

function shell(content,active='catalog'){
  const p=profile();
  const logo=brandLogo();
  const support=supportLinks();
  applyAppearance(active==='admin');
  app.innerHTML=`<div class="app-shell">
    ${themeBackground()}
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
    <footer class="site-footer"><div class="wrap footer-grid"><div class="footer-brand"><a class="brand" href="#/">${logo?`<span class="brand-logo"><img src="${esc(logo)}" alt="${esc(state.store.name)}"></span>`:`<span class="brand-mark">${esc(brandMark())}</span>`}<span class="brand-copy"><strong>${esc(state.store.name)}</strong><small>${esc(brandSubtitle())}</small></span></a><p>VanzShop adalah pusat produk digital dengan katalog ringkas, stok real-time, dan proses pembelian yang mudah dipantau.</p></div><div class="footer-links"><b>Belanja</b><a href="#/">Katalog produk</a><a href="#/pesanan">Cek pesanan</a><a href="#/akun">Data pembeli</a></div><div class="footer-links"><b>Bantuan</b>${support||'<span>Dukungan toko dapat diatur dari dashboard admin.</span>'}</div></div><div class="wrap footer-bottom"><span>© ${new Date().getFullYear()} ${esc(state.store.name)}</span><small>${esc(footerNote())}</small></div></footer>
  </div>`;
}

async function loadCatalog(){
  state.source='all';state.category='all';state.q='';state.sort='store';
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
  const bannerNames=['Canva Pro','CapCut Pro','ChatGPT Plus','Claude Pro','YouTube Premium'];
  const bannerQueries=['canva','capcut','chatgpt','claude','youtube'];
  const hero=state.store.appearance?.hero!==false?`<section class="campaign-slider wrap" data-hero-slider aria-label="Promo pilihan VanzShop"><div class="campaign-slider-window"><div class="campaign-slider-track">${slides.map((src,i)=>`<article class="campaign-slide ${i===0?'is-center':''}" data-query="${esc(bannerQueries[i]||'')}" style="--campaign-image:url('${esc(src)}')" tabindex="0" role="link" aria-label="Lihat ${esc(bannerNames[i]||`promo VanzShop ${i+1}`)}"><img src="${esc(src)}" alt="${esc(bannerNames[i]||`Promo VanzShop ${i+1}`)}" width="1600" height="639" ${i===0?'loading="eager" fetchpriority="high"':'loading="lazy"'} decoding="async"></article>`).join('')}</div></div><button class="campaign-arrow prev" type="button" data-slider-prev aria-label="Slide sebelumnya">‹</button><button class="campaign-arrow next" type="button" data-slider-next aria-label="Slide berikutnya">›</button><div class="campaign-dots">${slides.map((_,i)=>`<button class="campaign-dot ${i===0?'active':''}" type="button" aria-label="Buka slide ${i+1}" aria-current="${i===0?'true':'false'}"></button>`).join('')}</div></section>`:'';
  const intro=`<section class="store-intro wrap"><div class="store-intro-copy"><span class="section-kicker">VanzShop.com</span><h1>${esc(heroTitle())}</h1><p>${esc(heroSubtitle())}</p><div class="intro-actions"><button class="btn btn-primary" type="button" data-scroll-products>Belanja sekarang</button><button class="btn" type="button" data-scroll-how>Cara belanja</button></div></div><div class="trust-list"><div><i>01</i><span><b>Harga bersaing</b><small>Pilihan hemat untuk kebutuhan digital</small></span></div><div><i>02</i><span><b>Stok real-time</b><small>Status produk selalu mudah dilihat</small></span></div><div><i>03</i><span><b>Checkout ringkas</b><small>Bayar dan pantau dari satu tempat</small></span></div><div><i>04</i><span><b>Auto fulfillment</b><small>Detail akun diproses setelah pembayaran</small></span></div></div></section>`;
  const categories=[...new Set(allProducts().map(p=>brandCategory(p.title,p.code)))].sort((a,b)=>a.localeCompare(b,'id'));
  shell(`<main class="page storefront-page">${hero}${intro}<section class="catalog wrap" id="produk"><div class="catalog-head"><div><span class="section-kicker">Katalog pilihan</span><h2>Temukan produk digital yang kamu butuhkan.</h2><p>Harga jelas, stok terlihat, dan detail produk tersusun rapi.</p></div><span class="catalog-live"><i></i> Stok diperbarui otomatis</span></div><div class="filters"><div class="filter-scroll"><button class="chip active" data-category="all">Semua</button>${categories.map(c=>`<button class="chip" data-category="${esc(c)}">${esc(c)}</button>`).join('')}</div><label class="search-wrap"><span>⌕</span><input id="search" autocomplete="off" placeholder="Cari produk digital..."></label><select id="sort" class="sort"><option value="store">Rekomendasi</option><option value="sold">Terlaris</option><option value="new">Terbaru</option><option value="low">Harga terendah</option><option value="high">Harga tertinggi</option><option value="name">Nama A–Z</option></select></div><div id="grid" class="grid"></div></section>${storefrontSections()}</main>`,'catalog');
  $('#search').oninput=e=>{state.q=e.target.value.toLowerCase();drawGrid();};
  $('#sort').onchange=e=>{state.sort=e.target.value;drawGrid();};
  $$('.chip[data-category]').forEach(b=>b.onclick=()=>{state.category=b.dataset.category;$$('.chip[data-category]').forEach(x=>x.classList.toggle('active',x===b));drawGrid();});
  drawGrid();
  mountHeroSlider();
  mountStorefrontExperience();
}
function drawGrid(){
  let list=allProducts();
  if(state.source==='owner')list=list.filter(p=>!p.is_reseller);
  else if(state.source==='supplier')list=list.filter(p=>Boolean(p.is_reseller));
  if(state.category!=='all')list=list.filter(p=>brandCategory(p.title,p.code)===state.category);
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
  shell(`<main class="detail wrap"><div class="crumb"><a href="#/">← Kembali</a><span>/</span><b>${esc(p.title)}</b></div><div class="detail-grid"><section class="detail-main"><div class="detail-product">${visualMarkup(p,'detail-visual')}<div class="detail-info"><div class="detail-head"><div><span class="section-kicker">${esc(brandCategory(p.title,p.code))} · ${orderSupplier?'supplier':'owner'}</span><h1>${esc(p.title)}</h1></div><span class="meta-stock ${badge.cls}">${esc(badge.text)}</span></div><p class="detail-desc">${esc(p.description||'Produk digital siap diproses otomatis.')}</p><div class="fact-grid"><div><small>Harga</small><strong>${money(price)}</strong></div><div><small>Stok Xoftware</small><strong>${stock==null?'—':Number(stock)}</strong></div><div><small>Pembayaran</small><strong>Sewa Pay</strong></div></div></div></div></section><aside class="buy-panel"><div class="panel-head"><h2>Pembelian</h2><span>Sewa Pay</span></div>${profileSummary()}${vs.length?`<div class="step-block"><div class="step-head"><span>1</span><b>Pilih varian</b></div><div class="variant-list">${vs.map(x=>{const active=String(x.id)===String(chosen),out=x.stock!=null&&Number(x.stock)<=0;return `<button type="button" class="variant ${active?'active':''} ${out?'disabled':''}" data-variant="${esc(x.id)}" ${out?'disabled':''}><span>${esc(x.name||x.title||'Varian')}</span><span><small>${x.stock==null?'':`Stok ${Number(x.stock)}`}</small><b>${money(x.price)}</b></span></button>`;}).join('')}</div></div>`:''}<div class="step-block"><div class="step-head"><span>${vs.length?2:1}</span><b>Jumlah</b></div><div class="qty"><button id="qtyMinus" type="button">−</button><b id="qtyVal">${state.qty}</b><button id="qtyPlus" type="button">+</button></div></div><div class="step-block"><div class="step-head"><span>${vs.length?3:2}</span><b>Pembayaran</b></div><div class="payment-card"><div class="payment-icon">QR</div><div><b>QRIS · Sewa Pay</b><small>Nominal dihitung server dari harga katalog Xoftware. Fee gateway ditambahkan oleh Sewa Pay pada invoice.</small></div></div></div><div class="summary"><div><span>${esc(v?.name||v?.title||p.title)}</span><b id="sumUnit">${money(price)}</b></div><div><span>Jumlah</span><b id="sumQty">×${state.qty}</b></div><div class="summary-total"><span>Subtotal</span><strong id="sumTotal">${money(price*state.qty)}</strong></div></div><button class="btn btn-primary btn-buy" id="buyNow" type="button" ${(!paymentReady||!fulfillmentReady||stock===0)?'disabled':''}>${!paymentReady?'Sewa Pay belum dikonfigurasi':!fulfillmentReady?'Auto-delivery belum dikonfigurasi':stock===0?'Stok habis':'Bayar dengan QRIS'}</button><div class="secure-note">Katalog + stok dari Xoftware · pembayaran Sewa Pay · setelah COMPLETED akun di-claim otomatis dari stok aktif Xoftware dengan reservation + idempotency Redis.</div></aside></div></main>`,'catalog');
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
  shell(`<main class="account-page wrap"><div class="page-head"><div><span class="section-kicker">Data Pembeli</span><h1>Kontak order</h1><p>Sewa Pay tidak membutuhkan registrasi Xoftware. Data ini opsional dan disimpan lokal di browser untuk memudahkan kontak.</p></div><a class="btn" href="#/">← Katalog</a></div><div class="account-grid"><section class="account-card"><div class="channel-tabs"><button class="chip ${old.channel!=='telegram'?'active':''}" data-channel="whatsapp">WhatsApp</button><button class="chip ${old.channel==='telegram'?'active':''}" data-channel="telegram">Telegram ID</button></div><label class="form-field"><span>Nama</span><input id="accountName" class="input big" maxlength="120" placeholder="Nama pembeli" value="${esc(old.name||'')}"></label><label class="form-field"><span id="senderLabel">${old.channel==='telegram'?'Telegram ID':'Nomor WhatsApp'}</span><input id="accountSender" class="input big" placeholder="${old.channel==='telegram'?'Telegram ID':'08xxxxxxxxxx'}" value="${esc(old.sender||'')}"></label><label class="form-field"><span>Email <small>(opsional)</small></span><input id="accountEmail" class="input big" type="email" placeholder="nama@email.com" value="${esc(old.email||'')}"></label><button id="prepareUser" class="btn btn-primary btn-buy" type="button">Simpan data</button><div id="registrationStatus">${old.verified?`<div class="status-card good"><b>Data tersimpan</b><span>${esc(old.name||'Pembeli')} · ${esc(old.sender||'—')}</span></div>`:''}</div></section><aside class="account-info"><h2>Tidak ada registrasi Xoftware</h2><ol><li>Katalog dan stok tetap dibaca dari <code>/v1/product</code>.</li><li>Invoice dibuat lewat Sewa Pay.</li><li>Status pembayaran dicek ke Sewa Pay.</li><li>User Xoftware tidak diperlukan untuk membuat invoice.</li></ol><div class="doc-note"><b>Auto fulfillment</b><span>Sesudah Sewa Pay COMPLETED, backend sudah menahan stock_record_id di Redis sebelum payment dibuat; setelah COMPLETED record itu dihapus dari Xoftware dan receipt disimpan, jadi refresh/webhook ulang tidak mengambil akun kedua.</span></div></aside></div></main>`,'account');
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
    ['Ringkasan', [['overview','Dashboard']]],
    ['Produk', [['products','Kelola Produk'],['product-detail','Detail Produk'],['variations','Variasi'],['forms','Format Stok']]],
    ['Stok', [['stock','Stok Masuk & Aktif'],['fulfillment','Stok Keluar']]],
    ['Tampilan', [['appearance','Tema & Branding']]],
  ];
  return `<aside class="admin-sidebar">${groups.map(([title,items])=>`<div class="admin-nav-group"><b>${title}</b>${items.map(([id,label])=>`<a class="${active===id?'active':''}" href="#/admin/${id}">${label}</a>`).join('')}</div>`).join('')}</aside>`;
}
async function renderAdmin(section='overview'){
  if(!adminToken())return renderAdminLogin();
  shell(`<main class="admin wrap"><div class="admin-head"><div><span class="section-kicker">Dashboard VanzShop</span><h1>Manajemen Produk & Stok</h1><p>Kelola katalog, variasi, stok masuk, dan riwayat stok keluar dari satu tempat.</p></div><div class="button-row"><a class="btn" href="#/">Lihat toko</a><button class="btn" id="adminLogout">Keluar</button></div></div><div class="admin-layout">${adminTabs(section)}<div id="adminContent" class="admin-content"><div class="loading-card"><div class="loader"></div><span>Memuat dashboard...</span></div></div></div></main>`,'admin');
  $('#adminLogout').onclick=()=>{sessionStorage.removeItem('vanz_admin_token');renderAdminLogin();};
  try{await adminApi('admin_ping');}catch(e){sessionStorage.removeItem('vanz_admin_token');toast(e.message,true);return renderAdminLogin();}
  const routes={
    overview:adminOverview,products:adminProducts,'product-detail':adminProductDetail,variations:adminVariations,
    stock:adminStock,fulfillment:adminFulfillment,forms:adminForms,appearance:adminAppearance,
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
  const products=allProducts(),known=products.filter(p=>productStock(p)!=null),stock=known.reduce((n,p)=>n+Math.max(0,Number(productStock(p))||0),0),variations=products.reduce((n,p)=>n+variants(p).length,0),low=products.filter(p=>productStock(p)!=null&&productStock(p)<=5).sort((a,b)=>productStock(a)-productStock(b)).slice(0,8);
  box.innerHTML=`<div class="admin-grid inventory-dashboard"><section class="admin-panel wide admin-welcome"><div><span class="section-kicker">Ringkasan toko</span><h2>Semua yang penting, tanpa menu teknis yang ramai.</h2><p class="muted">Pantau katalog dan stok, lalu masuk langsung ke pekerjaan yang ingin kamu selesaikan.</p></div><a class="btn btn-primary" href="#/admin/products">Tambah produk</a></section><section class="admin-panel wide"><div class="metric-grid"><div class="metric-card"><small>Produk aktif</small><strong>${products.length}</strong></div><div class="metric-card"><small>Total variasi</small><strong>${variations}</strong></div><div class="metric-card"><small>Stok terhitung</small><strong>${stock}</strong></div><div class="metric-card"><small>Stok menipis</small><strong>${low.length}</strong></div></div></section><section class="admin-panel wide"><div class="panel-title"><div><h2>Aksi cepat</h2><p class="muted">Jalur singkat untuk pekerjaan harian toko.</p></div></div><div class="quick-action-grid"><a href="#/admin/products"><span>01</span><b>Kelola produk</b><small>Buat, edit, tampilkan, atau hapus produk.</small></a><a href="#/admin/variations"><span>02</span><b>Atur variasi</b><small>Kelola paket, durasi, harga, dan SKU.</small></a><a href="#/admin/stock"><span>03</span><b>Masukkan stok</b><small>Tambah akun dan lihat stok aktif.</small></a><a href="#/admin/fulfillment"><span>04</span><b>Lihat stok keluar</b><small>Pantau akun yang sudah dikirim ke pembeli.</small></a></div></section><section class="admin-panel wide"><div class="panel-title"><div><h2>Perlu perhatian</h2><p class="muted">Produk dengan stok lima atau kurang.</p></div><a class="btn btn-sm" href="#/admin/stock">Kelola stok</a></div>${low.length?`<div class="low-stock-list">${low.map(p=>`<div><span><b>${esc(p.title)}</b><small>${esc(p.code||'Tanpa SKU')}</small></span><strong class="${productStock(p)===0?'out':''}">${productStock(p)===0?'Habis':`${productStock(p)} tersisa`}</strong></div>`).join('')}</div>`:'<div class="status-card good"><b>Stok aman</b><span>Tidak ada produk yang perlu ditambah saat ini.</span></div>'}</section></div>`;
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
  const box=$('#adminContent');box.innerHTML=`<div class="admin-grid"><section class="admin-panel"><span class="section-kicker">Stok masuk</span><h2>Tambahkan akun baru</h2><p class="muted">Masukkan satu akun per baris. Gunakan format yang sama dengan form produkmu, misalnya <code>email|password</code>.</p><label class="form-field"><span>Product ID</span><input id="asProduct" class="input big" inputmode="numeric" placeholder="Contoh: 128"></label><label class="form-field"><span>Variation ID <small>(opsional)</small></span><input id="asVariation" class="input big" inputmode="numeric" placeholder="Kosongkan untuk produk tanpa variasi"></label><label class="form-field"><span>Data akun — satu baris satu stok</span><textarea id="asAccounts" class="input textarea tall" placeholder="email|password\nemail2|password2"></textarea></label><button id="asAdd" class="btn btn-primary">Masukkan stok</button></section><section class="admin-panel"><span class="section-kicker">Stok aktif</span><h2>Lihat dan keluarkan stok</h2><p class="muted">Cari stok berdasarkan produk. Gunakan hapus hanya untuk akun yang memang ingin dikeluarkan dari inventori.</p><label class="form-field"><span>Product ID</span><input id="asListProduct" class="input big" inputmode="numeric" placeholder="Contoh: 128"></label><label class="form-field"><span>Variation ID <small>(opsional)</small></span><input id="asListVariation" class="input big" inputmode="numeric"></label><button id="asLoad" class="btn">Tampilkan stok aktif</button><div id="asResult" class="admin-result"></div></section></div>`;
  $('#asAdd').onclick=async()=>{try{const accounts=$('#asAccounts').value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);const r=await adminApi('pm_stock_add',{method:'POST',body:{product_id:$('#asProduct').value.trim(),variation_id:$('#asVariation').value.trim(),accounts}});toast(`Stok ditambahkan: ${r.total_added??accounts.length}`);}catch(e){toast(e.message,true);}};
  $('#asLoad').onclick=async()=>{try{const r=await adminApi('pm_stocks',{query:{product_id:$('#asListProduct').value.trim(),variation_id:$('#asListVariation').value.trim(),page:1,limit:100}}),data=r?.data??r,stocks=data?.stocks||[];$('#asResult').innerHTML=stocks.length?`<div class="stock-list">${stocks.map(s=>`<div class="stock-row"><span>#${esc(s.id)} · ${esc(JSON.stringify(s.value||s))}</span><button class="btn btn-sm danger as-delete" data-id="${esc(s.id)}">Keluarkan</button></div>`).join('')}</div>`:'<span class="muted">Stok aktif kosong.</span>';$$('.as-delete').forEach(b=>b.onclick=async()=>{if(!confirm(`Keluarkan stok #${b.dataset.id} dari inventori?`))return;try{await adminApi('pm_stock_delete',{method:'POST',body:{id:b.dataset.id}});b.closest('.stock-row').remove();toast('Stok dikeluarkan dari inventori.');}catch(e){toast(e.message,true);}});}catch(e){$('#asResult').innerHTML=`<div class="status-card bad">${esc(e.message)}</div>`;}};
}
async function adminFulfillment(){
  const box=$('#adminContent');
  box.innerHTML='<div class="loading-card"><div class="loader"></div><span>Memuat riwayat stok keluar...</span></div>';
  try{
    const r=await adminApi('admin_fulfillment_list',{query:{limit:120}}),st=r?.stats||{},rows=Array.isArray(r?.receipts)?r.receipts:[];
    box.innerHTML=`<div class="admin-grid"><section class="admin-panel wide"><div class="panel-title"><div><span class="section-kicker">Stok keluar</span><h2>Riwayat akun yang sudah diproses</h2><p class="muted">Gunakan halaman ini untuk memantau stok yang keluar melalui pesanan dan menemukan transaksi tertentu.</p></div><span class="build-chip">${rows.length} transaksi</span></div><div class="stat-grid"><div class="stat-card"><span>Berhasil dikirim</span><strong>${esc(st.fulfilled??0)}</strong></div><div class="stat-card"><span>Menunggu stok</span><strong>${esc(st.waiting_stock??0)}</strong></div><div class="stat-card"><span>Perlu perhatian</span><strong>${esc(st.retryable_error??0)}</strong></div><div class="stat-card"><span>Total akun keluar</span><strong>${esc(st.accounts_delivered??0)}</strong></div></div></section><section class="admin-panel wide"><div class="panel-title"><div><h2>Cari transaksi</h2><p class="muted">Masukkan reference pesanan untuk melihat rincian stok yang keluar.</p></div></div><div class="admin-toolbar stock-search"><input id="afReference" class="input big" placeholder="Contoh: VZ-..."><button id="afGet" class="btn btn-primary">Cari transaksi</button></div><div id="afLookup" class="admin-result"></div></section><section class="admin-panel wide"><h2>Transaksi terbaru</h2><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Reference</th><th>Status</th><th>Produk</th><th>Jumlah</th><th>ID stok keluar</th><th>Waktu keluar</th></tr></thead><tbody>${rows.length?rows.map(x=>`<tr><td><button class="link-btn af-open" data-ref="${esc(x.reference)}">${esc(x.reference)}</button></td><td><span class="status-pill ${x.status==='fulfilled'?'good':x.status==='waiting_stock'?'warn':'bad'}">${esc(x.status||'—')}</span></td><td>${esc(x.product_title||x.code||x.product_id||'—')}</td><td>${esc(x.quantity??'—')}</td><td>${esc((x.accounts||[]).map(a=>a.stock_record_id).join(', ')||'—')}</td><td>${esc(x.fulfilled_at||'—')}</td></tr>`).join(''):'<tr><td colspan="6">Belum ada stok keluar yang tercatat.</td></tr>'}</tbody></table></div></section></div>`;
    const lookup=async()=>{const ref=$('#afReference').value.trim();if(!ref){toast('Reference wajib diisi.',true);return;}try{diagnosticOutput('afLookup',await adminApi('admin_fulfillment_get',{query:{reference:ref}}));}catch(e){diagnosticOutput('afLookup',diagnosticError(e),true);}};
    $('#afGet').onclick=lookup;$$('.af-open').forEach(b=>b.onclick=()=>{$('#afReference').value=b.dataset.ref;lookup();});
  }catch(e){box.innerHTML=`<div class="status-card bad"><b>Riwayat stok keluar gagal dimuat</b><span>${esc(e.message)}</span></div>`;}
}
function adminAppearance(){
  const a={...DEFAULT_STORE.appearance,...(state.store.appearance||{})},s=state.store.support||{},b={...DEFAULT_STORE.branding,...(state.store.branding||{})};
  const siteTheme=SITE_THEMES[a.site_theme]?a.site_theme:(a.theme==='light'?'pearl':'gold');
  const adminTheme=ADMIN_THEMES[a.admin_theme]?a.admin_theme:(a.theme==='light'?'latte':'gold');
  const box=$('#adminContent');
  box.innerHTML=`<div class="admin-grid theme-admin-grid">
    <section class="admin-panel wide theme-studio-head"><div><span class="section-kicker">Visual system</span><h2>Theme Studio</h2><p class="muted">Seluruh palet dan background dari VanzShop Mail sudah tersedia untuk toko dan dashboard. Preview disimpan lokal sebelum kamu salin ke ENV.</p></div><span class="build-chip">${BUILD_ID}</span></section>
    <section class="admin-panel wide"><div class="panel-title"><div><h2>Tema storefront</h2><p class="muted">19 tema dengan background orbs, aurora, waves, mesh, bubbles, petals, retro, dan dots.</p></div><span class="theme-count">${Object.keys(SITE_THEMES).length} tema</span></div>${themePicker(SITE_THEMES,siteTheme,'siteTheme')}</section>
    <section class="admin-panel wide"><div class="panel-title"><div><h2>Tema dashboard</h2><p class="muted">Palet dashboard terpisah agar area operasional tetap nyaman dibaca.</p></div><span class="theme-count">${Object.keys(ADMIN_THEMES).length} tema</span></div>${themePicker(ADMIN_THEMES,adminTheme,'adminTheme')}</section>
    <section class="admin-panel wide"><div class="panel-title"><div><h2>Branding, layout & media</h2><p class="muted">Atur identitas toko, font, banner, kepadatan kartu, dan kontak.</p></div></div><div class="form-grid">
      <label class="form-field"><span>Nama toko</span><input id="aaName" class="input big" value="${esc(state.store.name)}"></label><label class="form-field"><span>Tagline</span><input id="aaTagline" class="input big" value="${esc(state.store.tagline)}"></label>
      <label class="form-field"><span>Inisial brand</span><input id="aaMark" class="input big" maxlength="2" value="${esc(b.mark||'V')}"></label><label class="form-field"><span>Subtitle brand</span><input id="aaSubtitle" class="input big" value="${esc(b.subtitle||'PRODUK DIGITAL')}"></label>
      <label class="check-field"><input id="aaCustomAccent" type="checkbox" ${a.custom_accent?'checked':''}><span>Gunakan aksen warna custom</span></label><label class="form-field"><span>Accent custom</span><input id="aaAccent" class="input big color-input" type="color" value="${esc(/^#[0-9a-f]{6}$/i.test(a.accent||'')?a.accent:SITE_THEMES[siteTheme].accent)}"></label>
      <label class="form-field"><span>Font body</span><select id="aaBodyFont" class="input big">${['Plus Jakarta Sans','Inter','Outfit','Sora','Space Grotesk'].map(x=>`<option value="${esc(x)}" ${String(b.body_font)===x?'selected':''}>${esc(x)}</option>`).join('')}</select></label><label class="form-field"><span>Font heading</span><select id="aaDisplayFont" class="input big">${['Archivo','Sora','Outfit','Space Grotesk'].map(x=>`<option value="${esc(x)}" ${String(b.display_font)===x?'selected':''}>${esc(x)}</option>`).join('')}</select></label>
      <label class="form-field"><span>Radius (${esc(a.radius)}px)</span><input id="aaRadius" type="range" min="8" max="32" value="${esc(a.radius)}"></label><label class="form-field"><span>Kolom desktop</span><input id="aaColumns" type="number" min="2" max="6" class="input big" value="${esc(a.columns)}"></label>
      <label class="form-field"><span>Density</span><select id="aaDensity" class="input big"><option value="compact" ${a.density==='compact'?'selected':''}>Compact</option><option value="comfortable" ${a.density==='comfortable'?'selected':''}>Comfortable</option></select></label><label class="check-field"><input id="aaHero" type="checkbox" ${a.hero!==false?'checked':''}><span>Tampilkan hero slider</span></label>
      <label class="form-field wide"><span>Hero title</span><input id="aaHeroTitle" class="input big" value="${esc(b.hero_title||'')}"></label><label class="form-field wide"><span>Hero subtitle</span><textarea id="aaHeroSubtitle" class="input textarea">${esc(b.hero_subtitle||'')}</textarea></label>
      <label class="form-field wide"><span>Badge hero (pisahkan koma)</span><input id="aaHeroBadges" class="input big" value="${esc((b.hero_badges||[]).join(', '))}"></label><label class="form-field wide"><span>URL logo / foto brand</span><input id="aaLogoUrl" class="input big" placeholder="https://...png atau data:image/..." value="${esc(b.logo_url||'')}"></label>
      <label class="form-field wide"><span>Banner slide home (satu URL per baris)</span><textarea id="aaSlides" class="input textarea tall" placeholder="https://...jpg">${esc((b.hero_slides||[]).join('\n'))}</textarea></label><label class="form-field wide"><span>Catatan output akun</span><textarea id="aaReceiptNote" class="input textarea">${esc(b.receipt_note||'')}</textarea></label>
      <label class="form-field wide"><span>Footer note</span><input id="aaFooterNote" class="input big" value="${esc(b.footer_note||'')}"></label><label class="form-field"><span>WhatsApp toko</span><input id="aaWa" class="input big" value="${esc(s.whatsapp||'')}"></label><label class="form-field"><span>Telegram toko</span><input id="aaTg" class="input big" value="${esc(s.telegram||'')}"></label><label class="form-field"><span>Email toko</span><input id="aaEmail" class="input big" value="${esc(s.email||'')}"></label>
      <label class="form-field wide"><span>Upload logo/foto lokal untuk preview browser ini</span><input id="aaLogoFile" class="input big" type="file" accept="image/*"></label>
    </div><div class="button-row sticky-actions"><button id="aaPreview" class="btn btn-primary">Terapkan preview</button><button id="aaReset" class="btn">Reset preview</button><button id="aaEnv" class="btn">Generate ENV Vercel</button></div><div id="aaEnvBox"></div></section>
    <section class="admin-panel"><h2>Preview vs permanen</h2><p class="muted">Preview hanya tersimpan di browser admin ini. Gunakan Generate ENV lalu pasang hasilnya di Vercel untuk semua pengunjung.</p></section><section class="admin-panel"><h2>Background adaptif</h2><p class="muted">Animasi otomatis dimatikan jika perangkat memakai <code>prefers-reduced-motion</code>, dan disederhanakan di layar kecil.</p></section>
  </div>`;
  const get=()=>{
    const pickedSite=$('input[name="siteTheme"]:checked')?.value||'gold',pickedAdmin=$('input[name="adminTheme"]:checked')?.value||'gold';
    return {store:{name:$('#aaName').value.trim(),tagline:$('#aaTagline').value.trim(),support:{whatsapp:$('#aaWa').value.trim(),telegram:$('#aaTg').value.trim(),email:$('#aaEmail').value.trim()},branding:{mark:$('#aaMark').value.trim()||'V',subtitle:$('#aaSubtitle').value.trim()||'PRODUK DIGITAL',logo_url:$('#aaLogoUrl').value.trim(),hero_title:$('#aaHeroTitle').value.trim(),hero_subtitle:$('#aaHeroSubtitle').value.trim(),hero_badges:$('#aaHeroBadges').value.split(',').map(v=>v.trim()).filter(Boolean),hero_slides:$('#aaSlides').value.split(/\r?\n/).map(v=>v.trim()).filter(Boolean),receipt_note:$('#aaReceiptNote').value.trim(),footer_note:$('#aaFooterNote').value.trim(),body_font:$('#aaBodyFont').value,display_font:$('#aaDisplayFont').value}},appearance:{theme:SITE_THEMES[pickedSite]?.mode||'dark',site_theme:pickedSite,admin_theme:pickedAdmin,accent:$('#aaAccent').value,custom_accent:$('#aaCustomAccent').checked,radius:Number($('#aaRadius').value),columns:Number($('#aaColumns').value),density:$('#aaDensity').value,hero:$('#aaHero').checked}};
  };
  $$('input[name="siteTheme"],input[name="adminTheme"]').forEach(input=>input.onchange=()=>{$$(`input[name="${input.name}"]`).forEach(x=>x.closest('.theme-choice')?.classList.toggle('is-selected',x.checked));});
  $('#aaLogoFile').onchange=(e)=>{const file=e.target.files&&e.target.files[0]; if(!file) return; const reader=new FileReader(); reader.onload=()=>{ $('#aaLogoUrl').value=String(reader.result||''); toast('Logo/foto dimasukkan ke preview lokal.'); }; reader.readAsDataURL(file); };
  $('#aaPreview').onclick=()=>{const x=get();localStorage.setItem('vanz_appearance_override',JSON.stringify(x.appearance));localStorage.setItem('vanz_store_override',JSON.stringify(x.store));state.store=mergeStore({...state.store,...x.store,appearance:x.appearance,branding:x.store.branding});applyAppearance();toast('Preview branding disimpan di browser ini.');renderAdmin('appearance');};
  $('#aaReset').onclick=()=>{localStorage.removeItem('vanz_appearance_override');localStorage.removeItem('vanz_store_override');toast('Preview lokal dihapus. Reload katalog untuk nilai deployment.');location.hash='#/';};
  $('#aaEnv').onclick=async()=>{const x=get(),lines=[`STORE_NAME=${x.store.name}`,`STORE_TAGLINE=${x.store.tagline}`,`STORE_BRAND_MARK=${x.store.branding.mark}`,`STORE_BRAND_SUBTITLE=${x.store.branding.subtitle}`,`STORE_LOGO_URL=${x.store.branding.logo_url}`,`STORE_HERO_TITLE=${x.store.branding.hero_title}`,`STORE_HERO_SUBTITLE=${x.store.branding.hero_subtitle}`,`STORE_HERO_BADGES=${x.store.branding.hero_badges.join(',')}`,`STORE_HERO_SLIDES=${x.store.branding.hero_slides.join(',')}`,`STORE_RECEIPT_NOTE=${x.store.branding.receipt_note}`,`STORE_FOOTER_NOTE=${x.store.branding.footer_note}`,`STORE_FONT_BODY=${x.store.branding.body_font}`,`STORE_FONT_DISPLAY=${x.store.branding.display_font}`,`STORE_SITE_THEME=${x.appearance.site_theme}`,`STORE_ADMIN_THEME=${x.appearance.admin_theme}`,`STORE_THEME=${x.appearance.theme}`,`STORE_ACCENT=${x.appearance.custom_accent?x.appearance.accent:''}`,`STORE_RADIUS=${x.appearance.radius}`,`STORE_COLUMNS=${x.appearance.columns}`,`STORE_DENSITY=${x.appearance.density}`,`STORE_HERO=${x.appearance.hero?'true':'false'}`,`STORE_WHATSAPP=${x.store.support.whatsapp}`,`STORE_TELEGRAM=${x.store.support.telegram}`,`STORE_EMAIL=${x.store.support.email}`],txt=lines.join('\n');$('#aaEnvBox').innerHTML=`<div class="env-box"><pre>${esc(txt)}</pre><button id="copyEnv" class="btn btn-sm">Salin ENV</button></div>`;$('#copyEnv').onclick=async()=>{try{await navigator.clipboard.writeText(txt);toast('ENV branding disalin.');}catch{toast('Clipboard tidak tersedia.',true);}};};
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
  try{const r=await adminApi('pm_forms'),items=Array.isArray(r?.data)?r.data:(Array.isArray(r)?r:[]);box.innerHTML=`<section class="admin-panel wide"><div class="panel-title"><div><span class="section-kicker">Format stok</span><h2>Template data akun</h2><p class="muted">Pilih Form ID yang sesuai saat membuat produk atau variasi, lalu masukkan stok mengikuti urutan field di bawah.</p></div><span class="build-chip">${items.length} format</span></div><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>ID</th><th>Nama format</th><th>Urutan data</th><th>Wajib diisi</th><th>Contoh satu baris stok</th></tr></thead><tbody>${items.map(f=>`<tr><td>${esc(f.id)}</td><td><b>${esc(f.name)}</b></td><td>${esc((f.fields||[]).join(' → '))}</td><td>${esc((f.required_fields||[]).join(', ')||'—')}</td><td><code>${esc((f.fields||[]).map((x,i)=>`${String(x).toLowerCase().replace(/\s+/g,'')}${i+1}`).join('|'))}</code></td></tr>`).join('')}</tbody></table></div></section>`;}catch(e){box.innerHTML=`<div class="status-card bad">${esc(e.message)}</div>`;}
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
    `STORE_SITE_THEME=${a.site_theme||'gold'}`,
    `STORE_ADMIN_THEME=${a.admin_theme||'gold'}`,
    `STORE_THEME=${a.theme||'dark'}`,
    `STORE_ACCENT=${a.custom_accent?(a.accent||'#f3c74f'):''}`,
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
  if(admin){await ensureInit();return renderAdmin(admin[1]||'overview');}
  if(route==='/akun'){await ensureInit();return renderAccount();}
  const m=route.match(/^\/produk\/([^/]+)\/(.+)$/);if(m){await ensureInit();const p=getProduct(m[1],decodeURIComponent(m[2]));if(!p){toast('Produk tidak ditemukan.',true);location.hash='#/';return;}state.product=p;return detailHtml(p);}
  const pay=route.match(/^\/bayar\/(.+)$/);if(pay){await ensureInit();return renderPayment(decodeURIComponent(pay[1]));}
  if(route==='/isi-saldo'){await ensureInit();return renderTopup();}
  if(/^\/pesanan/.test(route)){await ensureInit();return renderOrders();}
  await loadCatalog();
}
window.addEventListener('hashchange',renderRoute);window.addEventListener('beforeunload',()=>{if(timer)clearInterval(timer);});renderRoute();
})();
