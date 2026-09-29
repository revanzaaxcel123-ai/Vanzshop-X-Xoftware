(() => {
'use strict';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const app = $('#app');
const BUILD_ID = 'HARDMAX-v21-THEME-PROFILE';
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
  support:{whatsapp:'0895415204928',telegram:'',email:''},
  reseller:{whatsapp:'0895415204928',group_url:'https://chat.whatsapp.com/DQ2PsowpGt5FxhQDAS2sAz'},
  appearance:{theme:'dark',color_mode:'dark',site_theme:'gold',admin_theme:'gold',accent:'#f3c74f',custom_accent:false,radius:20,columns:4,density:'comfortable',hero:true,banner_seconds:4.2,assistant_motion:'subtle'},
  branding:{
    mark:'V',
    subtitle:'PRODUK DIGITAL',
    logo_url:'',
    hero_title:'Pusat Premium Digital Termurah',
    hero_subtitle:'Produk digital pilihan dengan stok real-time, checkout ringkas, dan pengiriman akun otomatis setelah pembayaran berhasil.',
    hero_badges:['Harga bersaing','Stok real-time','Pembayaran aman','Proses otomatis'],
    hero_slides:['/assets/banner/banner1.jpg','/assets/banner/banner2.jpg','/assets/banner/banner3.jpg','/assets/banner/banner4.jpg','/assets/banner/banner5.jpg'],
    footer_note:'Produk digital hemat · stok real-time · proses otomatis',
    receipt_note:'Detail akun dikirim otomatis dari stok aktif. Simpan data login dan segera ganti jika diperlukan.',
    assistant_welcome:'Butuh bantuan memilih produk atau mengecek pesanan? Aku siap membantu.',
    body_font:'Plus Jakarta Sans',
    display_font:'Archivo'
  },
  registration:{required_before_order:true,api_permission_required_for_new_users:true,supported_sender_types:['whatsapp','telegram_id'],email_is_sender:false,max_per_minute:3,otp_endpoint_documented:false},
  payment:{provider:'sewapay',configured:false,base_url:'https://sewapay.id'},
  checkout:{mode:'sewapay',fulfillment:'disabled-until-redis-configured',shared_sender_configured:false,shared_channel:'whatsapp',shared_sender_masked:''},
  limits:{registration_per_minute:3,deposit_min:1000,deposit_max:1000000,stock_accounts_per_request:100,variations_per_product:30,products_per_page:20,title_max:100,description_max:5000,terms_max:5000,sku_min:3,sku_max:50}
};

const SITE_THEMES = Object.freeze({
  gold:{label:'Join Reseller Night',mode:'dark',scene:'orbs',bg:'#050509',bg2:'#0e0e15',card:'rgba(14,14,21,.78)',card2:'rgba(255,255,255,.035)',field:'rgba(255,255,255,.03)',text:'#f5f5f7',muted:'#b3b3c2',accent:'#f7d46a',accent2:'#d4a937',accent3:'#fff8dc',on:'#0b0b12',c2:'#ffdf7a',c3:'#6f6f84',orb1:'rgba(255,255,255,.09)',orb2:'#050509',border:'rgba(255,255,255,.1)',borderSoft:'rgba(255,255,255,.06)',shadow:'0 40px 100px rgba(0,0,0,.8),inset 0 1px 0 rgba(255,255,255,.05)'},
  pearl:{label:'Join Reseller Morning',mode:'light',scene:'orbs',bg:'#f6f0e4',bg2:'#efe6d4',card:'rgba(255,252,245,.8)',card2:'rgba(255,255,255,.72)',field:'rgba(255,255,255,.8)',text:'#211c13',muted:'#6f6656',accent:'#b98423',accent2:'#8f6212',accent3:'#fff3cf',on:'#ffffff',c2:'#e9b949',c3:'#d9c7a0',orb1:'#fffaf0',orb2:'#e3d5b8',border:'rgba(60,40,10,.14)',borderSoft:'rgba(60,40,10,.08)',shadow:'0 30px 70px -34px rgba(120,90,30,.45),0 2px 8px rgba(60,40,10,.05),inset 0 1px 0 #fff'},
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
  gold:{label:'Join Reseller Night',mode:'dark',scene:'orbs',bg:'#050509',side:'#0a0a10',card:'rgba(14,14,21,.9)',card2:'rgba(255,255,255,.035)',field:'rgba(255,255,255,.03)',text:'#f5f5f7',muted:'#b3b3c2',accent:'#f7d46a',accent2:'#d4a937',accent3:'#fff8dc',on:'#0b0b12',border:'rgba(255,255,255,.1)',borderSoft:'rgba(255,255,255,.06)',shadow:'0 40px 100px rgba(0,0,0,.8),inset 0 1px 0 rgba(255,255,255,.05)'},
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
  product:null, variantId:null, qty:1, busy:false, catalogLoaded:false, catHistory:[],
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
function cartItems(){ const rows=safeJsonParse(localStorage.getItem('vanz_cart')||'[]',[]);return Array.isArray(rows)?rows:[]; }
function saveCart(rows){ localStorage.setItem('vanz_cart',JSON.stringify((Array.isArray(rows)?rows:[]).slice(0,30))); }
function cartKey(productId,variationId){ return `${productId}:${variationId??'base'}`; }
function cartCount(){ return cartItems().reduce((sum,row)=>sum+Math.max(1,Number(row.quantity)||1),0); }
function addCartItem(product,variation,quantity){
  const rows=cartItems(),key=cartKey(product.id,variation?.id),existing=rows.find(row=>row.key===key),stock=variation?.stock??productStock(product),max=stock==null?20:Math.max(1,Math.min(20,Number(stock)||1)),qty=Math.max(1,Math.min(max,Number(quantity)||1));
  if(existing) existing.quantity=Math.min(max,Math.max(1,Number(existing.quantity)||1)+qty);
  else rows.unshift({key,product_id:product.id,variation_id:variation?.id??null,code:variation?.code||product.code||'',title:product.title,variant:variation?.title||variation?.name||'Varian utama',price:Number(variation?.price||productPrice(product)||0),quantity:qty,image:productImage(product)||localBrandImage(product),stock,added_at:Date.now()});
  saveCart(rows);return rows;
}
function removeCartItem(key){ saveCart(cartItems().filter(row=>row.key!==key)); }
function looksLikeReference(value){ return /^VZ-[A-Z0-9-]{8,190}$/i.test(String(value||'').trim()); }
function setMeta(selector,attribute,value){ const node=document.querySelector(selector);if(node&&value)node.setAttribute(attribute,value); }
function syncSeo(kind='home',product=null){
  const origin='https://vanzshop.com',productName=product?.title||'',title=kind==='product'&&productName?`${productName} Premium | VanzShop.com`:kind==='orders'?'Cek Pesanan Produk Digital | VanzShop.com':kind==='cart'?'Tas Belanja | VanzShop.com':kind==='profile'?'Profil Pembeli | VanzShop.com':'VanzShop.com — Pusat Produk Digital Premium Termurah';
  const description=kind==='product'&&productName?`Beli ${productName} di VanzShop.com. Stok real-time, pembayaran QRIS, proses otomatis, aman, dan bergaransi.`:'Beli ChatGPT, Canva, CapCut, Spotify, YouTube Premium dan produk digital lainnya di VanzShop.com. Stok real-time, pembayaran QRIS, aman, bergaransi, dan proses otomatis 24/7.';
  document.title=title;setMeta('meta[name="description"]','content',description);setMeta('meta[property="og:title"]','content',title);setMeta('meta[property="og:description"]','content',description);setMeta('meta[name="twitter:title"]','content',title);setMeta('meta[name="twitter:description"]','content',description);setMeta('link[rel="canonical"]','href',origin+'/');
  let schema=$('#dynamicSeoSchema');if(schema)schema.remove();
  if(product){schema=document.createElement('script');schema.id='dynamicSeoSchema';schema.type='application/ld+json';schema.textContent=JSON.stringify({'@context':'https://schema.org','@type':'Product',name:product.title,description:shortDesc(product.description,'Produk digital premium VanzShop.'),image:productImage(product)||`${origin}${localBrandImage(product)}`,brand:{'@type':'Brand',name:'VanzShop.com'},offers:{'@type':'Offer',priceCurrency:'IDR',price:productPrice(product),availability:productStock(product)===0?'https://schema.org/OutOfStock':'https://schema.org/InStock',url:origin+'/'}});document.head.appendChild(schema);}
}
function localAppearance(){ return safeJsonParse(localStorage.getItem('vanz_appearance_override') || 'null', null); }
function localStoreOverride(){ return safeJsonParse(localStorage.getItem('vanz_store_override') || 'null', null); }
function localColorMode(){ const mode=String(localStorage.getItem('vanz-theme')||localStorage.getItem('vanz_color_mode')||'').toLowerCase(); return ['light','dark'].includes(mode)?mode:''; }
function mergeStore(base){
  const b = base && typeof base === 'object' ? base : DEFAULT_STORE;
  const a = localAppearance();
  const s = localStoreOverride();
  return {
    ...DEFAULT_STORE,
    ...b,
    ...(s || {}),
    support:{...DEFAULT_STORE.support,...(b.support||{}),...(s?.support||{})},
    reseller:{...DEFAULT_STORE.reseller,...(b.reseller||{}),...(s?.reseller||{})},
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
  const preferredMode=localColorMode()||(['light','dark'].includes(a.color_mode)?a.color_mode:a.theme)||'dark';
  let siteKey = SITE_THEMES[a.site_theme] ? a.site_theme : (preferredMode === 'light' ? 'pearl' : 'gold');
  let adminKey = ADMIN_THEMES[a.admin_theme] ? a.admin_theme : (preferredMode === 'light' ? 'latte' : 'gold');
  if(SITE_THEMES[siteKey].mode!==preferredMode)siteKey=preferredMode==='light'?'pearl':'gold';
  if(ADMIN_THEMES[adminKey].mode!==preferredMode)adminKey=preferredMode==='light'?'latte':'gold';
  const preset = isAdmin ? ADMIN_THEMES[adminKey] : SITE_THEMES[siteKey];
  const root = document.documentElement;
  const customAccent = a.custom_accent && /^#[0-9a-f]{6}$/i.test(a.accent||'') ? a.accent : preset.accent;
  root.dataset.theme = preset.mode;
  root.dataset.scene = preset.scene;
  root.dataset.ui = isAdmin ? 'admin' : 'store';
  root.dataset.siteTheme = siteKey;
  root.dataset.adminTheme = adminKey;
  root.dataset.colorMode = preferredMode;
  root.dataset.density = a.density === 'comfortable' ? 'comfortable' : 'compact';
  root.dataset.assistantMotion = ['subtle','playful','off'].includes(a.assistant_motion) ? a.assistant_motion : 'subtle';
  const vars = {
    '--bg':preset.bg,'--bg2':preset.bg2 || preset.side || preset.bg,'--panel':preset.card || `color-mix(in srgb, ${preset.bg2} 76%, transparent)`,
    '--panel2':preset.card2 || `color-mix(in srgb, ${preset.bg2} 88%, transparent)`,'--field':preset.field || (preset.mode==='dark'?'rgba(0,0,0,.34)':'rgba(255,255,255,.76)'),
    '--text':preset.text || (preset.mode==='dark'?`color-mix(in srgb, ${preset.accent3} 12%, #f4f4f5)`:`color-mix(in srgb, ${preset.accent2} 16%, #141418)`),
    '--muted':preset.muted || `color-mix(in srgb, var(--text) ${preset.mode==='dark'?'58%':'62%'}, var(--bg))`,'--accent':customAccent,'--accent2':preset.accent2,'--accent3':preset.accent3,'--accent-on':preset.on,
    '--scene-c2':preset.c2 || preset.accent2,'--scene-c3':preset.c3 || preset.accent3,'--scene-orb1':preset.orb1 || preset.card2 || preset.bg2,'--scene-orb2':preset.orb2 || preset.bg,
    '--border':preset.border||`color-mix(in srgb, ${customAccent} ${preset.mode==='dark'?'18%':'22%'}, transparent)`,
    '--border-soft':preset.borderSoft||(preset.mode==='dark'?'rgba(255,255,255,.07)':`color-mix(in srgb, ${preset.accent2} 10%, transparent)`),
    '--shadow':preset.shadow||(preset.mode==='dark'?'0 30px 80px -34px rgba(0,0,0,.9)':`0 28px 70px -38px color-mix(in srgb, ${preset.accent2} 45%, transparent)`),
    '--accent-rgb':preset.mode==='dark'?'247,212,106':'185,132,35',
    '--join-name':preset.mode==='dark'?'linear-gradient(100deg,#d4a937 0%,#ffe58f 25%,#fff8dc 40%,#ffdf7a 55%,#d4a937 80%,#ffe58f 100%)':'linear-gradient(100deg,#8f6212 0%,#b98423 25%,#dcab4a 40%,#b98423 55%,#8f6212 80%,#b98423 100%)'
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
  const s=state.store.support||{},r=state.store.reseller||{}; const out=[];
  if(s.whatsapp){ const n=phoneNormalize(s.whatsapp); if(phoneOk(n)) out.push(`<a class="btn btn-sm" target="_blank" rel="noopener" href="https://wa.me/${esc(n)}">WhatsApp toko</a>`); }
  if(/^https:\/\/chat\.whatsapp\.com\/[\w-]+$/i.test(String(r.group_url||'').trim())) out.push(`<a class="btn btn-sm" target="_blank" rel="noopener" href="${esc(r.group_url)}">Grup reseller</a>`);
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
async function optimizeProductImage(file){
  if(!file||!/^image\/(?:jpeg|png|webp|avif)$/i.test(file.type||''))throw new Error('Pilih file JPG, PNG, WebP, atau AVIF.');
  if(file.size>12*1024*1024)throw new Error('File gambar maksimal 12 MB sebelum optimasi.');
  const raw=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||''));reader.onerror=()=>reject(new Error('File gambar gagal dibaca.'));reader.readAsDataURL(file);});
  const image=await new Promise((resolve,reject)=>{const el=new Image();el.onload=()=>resolve(el);el.onerror=()=>reject(new Error('Format gambar tidak dapat diproses.'));el.src=raw;});
  const maxSide=900,scale=Math.min(1,maxSide/Math.max(image.naturalWidth||1,image.naturalHeight||1)),canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
  const ctx=canvas.getContext('2d',{alpha:false});ctx.fillStyle='#0b0a09';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
  let quality=.84,result=canvas.toDataURL('image/jpeg',quality);
  while(result.length>185000&&quality>.4){quality-=.08;result=canvas.toDataURL('image/jpeg',quality);}
  if(result.length>200000)throw new Error('Gambar masih terlalu besar setelah optimasi. Gunakan gambar dengan dimensi lebih kecil.');
  return result;
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
  const intervalMs=Math.round(Math.max(2,Math.min(20,Number(state.store.appearance?.banner_seconds)||4.2))*1000);
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
  const start=()=>{stop();if(!reduced&&!mobile?.matches&&slides.length>1)timer=setInterval(()=>go(index+1),intervalMs);};
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
  return `<section class="seo-hub wrap" id="vanzshop-seo"><div class="seo-hub-head"><div><span class="section-kicker">VANZSHOP.COM · OFFICIAL ECOSYSTEM</span><h2>Solusi produk digital premium dalam satu ekosistem.</h2></div><p>VanzShop menyediakan ChatGPT, Canva, CapCut, Spotify, YouTube Premium, layanan sosial media, akses email, tools, serta kebutuhan digital lainnya dengan proses cepat, aman, dan bergaransi.</p></div><div class="seo-service-grid">
    <a href="https://direct-order.vanzshop.com" target="_blank" rel="noopener"><i>01</i><b>Direct Order</b><span>Bot Telegram, WhatsApp, dan website untuk pemesanan langsung.</span></a>
    <a href="https://suntik-sosmed.vanzshop.com/" target="_blank" rel="noopener"><i>02</i><b>Suntik Sosmed</b><span>Followers, likes, views, dan kebutuhan social media marketing.</span></a>
    <a id="join-reseller" href="https://join-reseller.vanzshop.com/" target="_blank" rel="noopener"><i>03</i><b>Join Reseller</b><span>Harga khusus, katalog siap jual, dan dukungan komunitas.</span></a>
    <a href="https://vanzshop.id" target="_blank" rel="noopener"><i>04</i><b>Akses Email</b><span>Buka inbox email yang terhubung dengan akun pesananmu.</span></a>
    <a href="https://ketentuan-garansi.vanzshop.com" target="_blank" rel="noopener"><i>05</i><b>Ketentuan Garansi</b><span>Pelajari masa garansi dan aturan penggantian setiap produk.</span></a>
    <a href="https://tools.vanzshop.com/" target="_blank" rel="noopener"><i>06</i><b>Tools Gratis</b><span>Kumpulan alat praktis untuk kebutuhan digital sehari-hari.</span></a>
    <a href="https://faq-website.vanzshop.com/" target="_blank" rel="noopener"><i>07</i><b>FAQ VanzShop</b><span>Jawaban resmi tentang pembayaran, akun, garansi, dan pesanan.</span></a>
    <a href="https://sosial-media.vanzshop.com/" target="_blank" rel="noopener"><i>08</i><b>Sosial Media</b><span>Ikuti kanal resmi untuk promo dan informasi stok terbaru.</span></a>
  </div></section><section class="seo-copy wrap"><div><span class="section-kicker">BELANJA AMAN DI VANZSHOP</span><h2>Produk digital terbaik, fast response, stok real-time, dan bantuan yang jelas.</h2><p>Temukan akun premium dan layanan digital populer dengan harga kompetitif. Harga dan stok divalidasi ulang ketika checkout, pembayaran dilakukan melalui QRIS, lalu produk diproses setelah status pembayaran benar-benar berhasil.</p><div class="seo-keywords"><span>ChatGPT Premium</span><span>Canva Pro</span><span>CapCut Pro</span><span>Spotify Premium</span><span>YouTube Premium</span><span>Netflix Premium</span><span>Akun AI</span><span>Produk Digital Bergaransi</span></div></div><aside><b>Butuh bantuan atau ingin jadi reseller?</b><p>Hubungi admin resmi VanzShop atau masuk ke grup untuk menerima informasi produk dan update stok.</p><div class="button-row"><a class="btn btn-primary" target="_blank" rel="noopener" href="https://wa.me/${esc(phoneNormalize(state.store.reseller?.whatsapp||'0895415204928'))}?text=${encodeURIComponent('Halo admin VanzShop, saya mau tanya produk / reseller.')}\">WhatsApp VanzShop</a><a class="btn" target="_blank" rel="noopener" href="${esc(state.store.reseller?.group_url||'https://chat.whatsapp.com/DQ2PsowpGt5FxhQDAS2sAz')}\">Grup WhatsApp</a></div></aside></section>`;
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
function storefrontThemeMenu(){
  const selected=document.documentElement.dataset.siteTheme||state.store.appearance?.site_theme||'gold';
  return `<div class="store-theme-menu" data-theme-menu hidden><button class="store-popover-backdrop" type="button" data-theme-menu-close aria-label="Tutup pilihan tema"></button><section class="store-theme-panel" role="dialog" aria-modal="true" aria-labelledby="storeThemeTitle"><header><div><span class="section-kicker">PERSONALISASI</span><h2 id="storeThemeTitle">Pilih tema VanzShop</h2><p>Semua tema tersedia dan langsung diterapkan di perangkat ini.</p></div><button class="icon-link" type="button" data-theme-menu-close aria-label="Tutup">×</button></header><div class="store-theme-grid">${Object.entries(SITE_THEMES).map(([key,t])=>`<button type="button" class="store-theme-option ${selected===key?'active':''}" data-store-theme="${esc(key)}" style="--sw-bg:${t.bg};--sw-bg2:${t.bg2||t.bg};--sw-accent:${t.accent};--sw-c2:${t.c2||t.accent2}"><span class="store-theme-swatch"><i></i></span><span><b>${esc(t.label)}</b><small>${t.mode==='light'?'Tema terang':'Tema gelap'}</small></span><em>✓</em></button>`).join('')}</div></section></div>`;
}
function profileMenuMarkup(){
  const buyer=profile(),identity=buyer?.name||buyer?.email||buyer?.whatsapp||'Akun';
  return `<details class="profile-menu"><summary aria-label="Buka menu akun"><span class="profile-menu-icon">♙</span><span class="profile-menu-label">${esc(identity)}</span><span class="profile-menu-caret">⌄</span></summary><div class="profile-menu-card"><div class="profile-menu-head"><b>${esc(buyer?.name||'Profil pembeli')}</b><span>${esc(buyer?.email||buyer?.whatsapp||'Belum ada kontak tersimpan')}</span><small>Profil tersimpan hanya di perangkat ini</small></div><a href="#/profil">Kelola profil</a><a href="#/pesanan">Pesanan saya</a>${buyer?'<button type="button" data-profile-clear>Hapus profil perangkat</button>':''}</div></details>`;
}
function bottomNavigation(active){
  const count=cartCount(),icon=paths=>`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
  return `<nav class="bottom-nav" aria-label="Navigasi utama"><a class="${active==='home'||active==='catalog'?'active':''}" href="#/"><span class="bottom-icon">${icon('<path d="m3 11 9-7 9 7v9h-6v-6H9v6H3z"/>')}</span><b>Beranda</b></a><a class="${active==='products'?'active':''}" href="#/produk"><span class="bottom-icon">${icon('<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>')}</span><b>Produk</b></a><a class="${active==='cart'?'active':''}" href="#/tas"><span class="bottom-icon">${icon('<path d="M5 8h14l-1 12H6z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/>')}</span><b>Tas</b>${count?`<em>${count>99?'99+':count}</em>`:''}</a><a class="${active==='orders'?'active':''}" href="#/pesanan"><span class="bottom-icon">${icon('<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>')}</span><b>Pesanan</b></a><a class="${active==='profile'?'active':''}" href="#/profil"><span class="bottom-icon">${icon('<circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/>')}</span><b>Profil</b></a></nav>`;
}
function assistantMarkup(){
  const checkoutContext=/^\/produk(?:\/|$)/.test(activeRoute());
  const welcome=String(state.store.branding?.assistant_welcome||DEFAULT_STORE.branding.assistant_welcome).trim().slice(0,280)||DEFAULT_STORE.branding.assistant_welcome;
  return `<div class="vanzcat ${checkoutContext?'vanzcat-checkout':''}" data-vanzcat><button class="vanzcat-launch" type="button" aria-label="Buka VanzCat" aria-expanded="false"><span class="cat-avatar" aria-hidden="true"><i class="cat-ear left"></i><i class="cat-ear right"></i><i class="cat-face"><b></b><b></b><em></em></i><i class="cat-tail"></i></span><span class="vanzcat-launch-copy"><b>VanzCat</b><small>Bantuan AI</small></span><span class="vanzcat-dot"></span></button><section class="vanzcat-panel" aria-label="VanzCat — asisten resmi VanzShop" hidden><header><div><span class="cat-mini">ฅ</span><span><b>VanzCat</b><small>Asisten resmi VanzShop</small></span></div><button type="button" data-cat-close aria-label="Tutup asisten">×</button></header><div class="vanzcat-messages" aria-live="polite"><div class="cat-message bot"><span class="cat-provider local">VANZCAT</span>${esc(welcome)}</div></div><div class="vanzcat-suggestions"><button type="button">Cari produk terbaik</button><button type="button">Lacak pesanan</button></div><form class="vanzcat-form"><input autocomplete="off" maxlength="700" placeholder="Tanya produk atau tempel reference..."><button type="submit" aria-label="Kirim">↑</button></form><small class="vanzcat-disclaimer">Jangan kirim password, OTP, atau payment token.</small></section></div>`;
}

function shell(content,active='catalog'){
  const logo=brandLogo();
  const support=supportLinks();
  const isAdmin=active==='admin';
  applyAppearance(isAdmin);
  app.innerHTML=`<div class="app-shell">
    ${themeBackground()}
    <header class="site-header"><div class="wrap header-inner">
      <a class="brand" href="#/">${logo?`<span class="brand-logo"><img src="${esc(logo)}" alt="${esc(state.store.name)}"></span>`:`<span class="brand-mark">${esc(brandMark())}</span>`}<span class="brand-copy"><strong>${esc(state.store.name)}</strong><small>${esc(brandSubtitle())}</small></span></a>
      <nav class="nav-right">
        ${isAdmin?'<a class="nav-link" href="/#/">Lihat toko</a>':`<a class="nav-link nav-home" href="#/" aria-label="Home"><span class="nav-home-icon" aria-hidden="true">⌂</span><span class="nav-home-label">Home</span></a>
        <a class="nav-link ${active==='catalog'||active==='home'||active==='products'?'active':''}" href="#/">Katalog</a>
        <a class="nav-link nav-cart ${active==='cart'?'active':''}" href="#/tas">Tas${cartCount()?` <em>${cartCount()}</em>`:''}</a>
        <a class="nav-link ${active==='orders'?'active':''}" href="#/pesanan">Pesanan</a>${profileMenuMarkup()}
        <button class="icon-link store-theme-trigger" type="button" data-theme-menu-open title="Pilih tema" aria-label="Pilih tema">◉</button>`}
        ${isAdmin?'<button class="icon-link theme-mode-toggle" type="button" data-theme-toggle title="Ganti mode siang/malam" aria-label="Ganti mode siang/malam"><span class="theme-moon">☾</span><span class="theme-sun">☀</span></button>':''}
      </nav>
    </div></header>
    ${content}
    <footer class="site-footer"><div class="wrap footer-grid"><div class="footer-brand"><a class="brand" href="#/">${logo?`<span class="brand-logo"><img src="${esc(logo)}" alt="${esc(state.store.name)}"></span>`:`<span class="brand-mark">${esc(brandMark())}</span>`}<span class="brand-copy"><strong>${esc(state.store.name)}</strong><small>${esc(brandSubtitle())}</small></span></a><p>VanzShop adalah pusat premium digital dengan katalog real-time, checkout ringkas, serta jalur komunitas untuk pembeli dan reseller.</p></div><div class="footer-links"><b>VanzShop</b><a href="#/">Home</a><a href="#/">Katalog produk</a><a href="#/pesanan">Cek pesanan</a><a href="#/reseller">Join Reseller</a></div><div class="footer-links"><b>Bantuan & komunitas</b>${support||'<span>Dukungan toko dapat diatur dari dashboard admin.</span>'}</div></div><div class="wrap footer-bottom"><span>© ${new Date().getFullYear()} ${esc(state.store.name)}</span><small>${esc(footerNote())}</small></div></footer>
    ${isAdmin?'':`${bottomNavigation(active)}${assistantMarkup()}${storefrontThemeMenu()}`}
  </div>`;
  bindThemeToggle();
  if(!isAdmin){bindThemeMenu();bindProfileMenu();bindAssistant();}
}
function bindThemeToggle(){
  const button=$('[data-theme-toggle]'); if(!button)return;
  const sync=()=>{const light=document.documentElement.dataset.theme==='light';button.setAttribute('aria-label',light?'Gunakan mode malam':'Gunakan mode siang');button.title=light?'Mode malam':'Mode siang';};
  button.onclick=e=>{
    const next=document.documentElement.dataset.theme==='light'?'dark':'light';
    const apply=()=>{localStorage.setItem('vanz-theme',next);localStorage.setItem('vanz_color_mode',next);applyAppearance();sync();};
    if(document.startViewTransition&&!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){
      const x=e.clientX||innerWidth-50,y=e.clientY||40,r=Math.hypot(Math.max(x,innerWidth-x),Math.max(y,innerHeight-y));
      const transition=document.startViewTransition(apply);transition.ready.then(()=>document.documentElement.animate({clipPath:[`circle(0 at ${x}px ${y}px)`,`circle(${r}px at ${x}px ${y}px)`]},{duration:520,easing:'cubic-bezier(.2,.7,.2,1)',pseudoElement:'::view-transition-new(root)'})).catch(()=>{});
    }else apply();
  };
  sync();
}

function bindThemeMenu(){
  const menu=$('[data-theme-menu]'),trigger=$('[data-theme-menu-open]');if(!menu||!trigger)return;
  if(window.__vanzGlobalSearchKeyHandler){document.removeEventListener('keydown',window.__vanzGlobalSearchKeyHandler);window.__vanzGlobalSearchKeyHandler=null;}
  const close=()=>{menu.hidden=true;document.body.classList.remove('theme-menu-open');trigger.setAttribute('aria-expanded','false');};
  const open=()=>{menu.hidden=false;document.body.classList.add('theme-menu-open');trigger.setAttribute('aria-expanded','true');};
  trigger.setAttribute('aria-expanded','false');trigger.onclick=()=>menu.hidden?open():close();
  $$('[data-theme-menu-close]',menu).forEach(button=>button.onclick=close);
  $$('[data-store-theme]',menu).forEach(button=>button.onclick=()=>{
    const key=button.dataset.storeTheme,preset=SITE_THEMES[key];if(!preset)return;
    const appearance={...(localAppearance()||{}),site_theme:key,color_mode:preset.mode,theme:preset.mode};
    localStorage.setItem('vanz_appearance_override',JSON.stringify(appearance));localStorage.setItem('vanz-theme',preset.mode);localStorage.setItem('vanz_color_mode',preset.mode);
    state.store={...state.store,appearance:{...state.store.appearance,...appearance}};applyAppearance(false);
    $$('.store-theme-option',menu).forEach(option=>option.classList.toggle('active',option===button));close();toast(`Tema ${preset.label} diterapkan.`);
  });
  if(window.__vanzThemeMenuKeyHandler)document.removeEventListener('keydown',window.__vanzThemeMenuKeyHandler);
  window.__vanzThemeMenuKeyHandler=e=>{if(e.key==='Escape'&&!menu.hidden)close();};document.addEventListener('keydown',window.__vanzThemeMenuKeyHandler);
}

function bindProfileMenu(){
  const details=$('.profile-menu');if(!details)return;
  $('[data-profile-clear]',details)?.addEventListener('click',()=>{clearProfile();details.open=false;toast('Profil perangkat dihapus.');renderRoute();});
}

function bindGlobalSearch(){
  const modal=$('[data-global-search]'),input=$('#globalSearchInput'),results=$('#globalSearchResults');
  if(!modal||!input||!results)return;
  const draw=()=>{
    const raw=input.value.trim(),q=raw.toLowerCase(),items=allProducts().filter(p=>productPrice(p)>0&&(!q||`${p.title} ${p.code} ${p.description||''} ${brandCategory(p.title,p.code)}`.toLowerCase().includes(q))).slice(0,6),orderHits=q?orders().filter(o=>`${o.reference||''} ${o.transaction_id||''} ${o.product_title||''}`.toLowerCase().includes(q)).slice(0,4):[];
    const productHtml=items.length?`<div class="global-group-label">Produk</div>${items.map(p=>`<button type="button" class="global-result" data-source="${esc(p.source||'owner')}" data-id="${esc(p.id??p.code)}"><img src="${esc(productImage(p)||localBrandImage(p))}" alt=""><span><b>${esc(p.title)}</b><small>${esc(brandCategory(p.title,p.code))} · ${stockLabel(productStock(p)).text}</small></span><strong>${money(productPrice(p))}</strong><em>→</em></button>`).join('')}`:'';
    const orderHtml=orderHits.length?`<div class="global-group-label">Pesanan perangkat ini</div>${orderHits.map(o=>{const s=orderState(o);return `<button type="button" class="global-result global-order-result" data-order="${esc(o.transaction_id)}"><span class="global-order-icon">◎</span><span><b>${esc(o.reference||o.transaction_id)}</b><small>${esc(o.product_title||'Pesanan digital')} · ${esc(s.label)}</small></span><strong>${money(o.total)}</strong><em>→</em></button>`;}).join('')}`:'';
    const refHtml=looksLikeReference(raw)?`<button type="button" class="global-reference" data-reference="${esc(raw.toUpperCase())}"><span>⌕</span><span><b>Lacak ${esc(raw.toUpperCase())}</b><small>Cari status aman dari pusat pesanan VanzShop</small></span><em>→</em></button>`:'';
    results.innerHTML=productHtml+orderHtml+refHtml||`<div class="global-search-empty"><b>Tidak ditemukan</b><span>Cari nama produk atau tempel reference yang diawali VZ-.</span></div>`;
    $$('.global-result[data-id]',results).forEach(button=>button.onclick=()=>{location.hash=`#/produk/${button.dataset.source}/${encodeURIComponent(button.dataset.id)}`;});
    $$('.global-order-result',results).forEach(button=>button.onclick=()=>{location.hash=`#/bayar/${encodeURIComponent(button.dataset.order)}`;});
    $('[data-reference]',results)?.addEventListener('click',e=>{location.hash=`#/pesanan/${encodeURIComponent(e.currentTarget.dataset.reference)}`;});
  };
  const open=()=>{modal.hidden=false;document.body.classList.add('search-open');input.value='';draw();requestAnimationFrame(()=>input.focus());};
  const close=()=>{modal.hidden=true;document.body.classList.remove('search-open');};
  $$('[data-global-search-open]').forEach(button=>button.onclick=open);$$('[data-global-search-close]',modal).forEach(button=>button.onclick=close);input.oninput=draw;
  if(window.__vanzGlobalSearchKeyHandler)document.removeEventListener('keydown',window.__vanzGlobalSearchKeyHandler);
  window.__vanzGlobalSearchKeyHandler=e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();open();}else if(e.key==='Escape'&&!modal.hidden)close();};
  document.addEventListener('keydown',window.__vanzGlobalSearchKeyHandler);
}

function bindAssistant(){
  const root=$('[data-vanzcat]');if(!root)return;
  const panel=$('.vanzcat-panel',root),launch=$('.vanzcat-launch',root),form=$('.vanzcat-form',root),input=$('input',form),messages=$('.vanzcat-messages',root);
  const add=(role,html)=>{const row=document.createElement('div');row.className=`cat-message ${role}`;row.innerHTML=html;messages.appendChild(row);messages.scrollTop=messages.scrollHeight;};
  const localAnswer=async q=>{
    const lower=q.toLowerCase();let html='';
    const reference=q.toUpperCase().match(/VZ-[A-Z0-9-]{8,190}/)?.[0]||'';
    if(reference){
      try{const data=await api('order_lookup',null,{reference}),status=data.payment_status==='success'?'pembayaran berhasil':data.payment_status==='pending'?'menunggu pembayaran':data.payment_status==='fail'?'pembayaran gagal':data.payment_status,fulfill=data.fulfillment_status==='fulfilled'?'produk sudah siap':data.fulfillment_status==='waiting_stock'?'menunggu stok':'produk sedang diproses';html=`Reference <b>${esc(data.reference)}</b> ditemukan: ${esc(data.product_title||'produk digital')}, ${esc(status)} dan ${esc(fulfill)}. <a href="#/pesanan/${encodeURIComponent(data.reference)}">Buka pusat pesanan →</a>`;}catch{html=`Aku belum menemukan reference itu. Periksa penulisannya atau <a target="_blank" rel="noopener" href="https://wa.me/${esc(phoneNormalize(state.store.support?.whatsapp||'0895415204928'))}">hubungi admin</a>.`;}
    }else if(/garansi|refund|ganti akun/.test(lower))html='Ketentuan berbeda untuk setiap produk. Baca <a target="_blank" rel="noopener" href="https://ketentuan-garansi.vanzshop.com">Ketentuan Garansi resmi</a>, lalu simpan reference pesananmu.';
    else if(/pesanan|status|reference|belum masuk|bermasalah/.test(lower))html='Buka <a href="#/pesanan">Pusat Pesanan</a>, tempel reference <b>VZ-...</b>, lalu tekan Lacak. Detail aman hanya muncul pada perangkat checkout.';
    else if(/bayar|qris|checkout/.test(lower))html='Pilih varian dan jumlah, lalu bayar lewat QRIS. Sistem baru memproses produk setelah gateway mengonfirmasi pembayaran <b>berhasil</b>—bukan berdasarkan timer.';
    else if(/reseller|jualan/.test(lower))html='Program reseller punya katalog dan dukungan komunitas. <a target="_blank" rel="noopener" href="https://join-reseller.vanzshop.com/">Lihat Join Reseller →</a>';
    else{const words=lower.split(/\s+/).filter(word=>word.length>2),matches=allProducts().filter(p=>productPrice(p)>0&&words.some(word=>`${p.title} ${p.code} ${p.description||''}`.toLowerCase().includes(word))).slice(0,3);html=matches.length?`Aku menemukan ${matches.map(p=>`<a href="#/produk/${esc(p.source||'owner')}/${encodeURIComponent(p.id??p.code)}"><b>${esc(p.title)}</b> (${money(productPrice(p))})</a>`).join(', ')}.`:'Aku belum yakin. Coba tulis nama produk, “cara cek pesanan”, “info garansi”, atau tempel reference <b>VZ-...</b>.';}
    return `<span class="cat-provider local">MODE AMAN</span>${html}`;
  };
  let sending=false;
  const answer=async raw=>{
    const q=String(raw||'').trim().slice(0,700);if(!q||sending)return;
    sending=true;const previous=state.catHistory.slice(-8);add('user',esc(q));add('bot','<span class="cat-thinking">VanzCat sedang mengetik</span>');const thinking=messages.lastElementChild;
    let html='',plain='';
    try{
      const data=await api('vanzcat_chat',{message:q,history:previous});plain=String(data?.answer||'').trim();
      if(!plain)throw new Error('Jawaban AI kosong.');
      html=`<span class="cat-provider gemini">VANZCAT AI</span>${esc(plain).replace(/\n/g,'<br>')}`;
    }catch{
      html=await localAnswer(q);
    }
    thinking.remove();add('bot',html);const helper=document.createElement('div');helper.innerHTML=html;plain=plain||helper.textContent.trim();state.catHistory=[...previous,{role:'user',text:q},{role:'model',text:plain}].slice(-10);sending=false;
  };
  const openPanel=()=>{panel.hidden=false;root.classList.add('is-open');launch.setAttribute('aria-expanded','true');setTimeout(()=>input.focus(),120);};
  const closePanel=()=>{root.classList.remove('is-open');launch.setAttribute('aria-expanded','false');panel.hidden=true;launch.focus();};
  launch.onclick=()=>panel.hidden?openPanel():closePanel();$('[data-cat-close]',root).onclick=closePanel;
  if(window.__vanzCatKeyHandler)document.removeEventListener('keydown',window.__vanzCatKeyHandler);
  window.__vanzCatKeyHandler=e=>{if(e.key==='Escape'&&!panel.hidden)closePanel();};document.addEventListener('keydown',window.__vanzCatKeyHandler);
  $$('.vanzcat-suggestions button',root).forEach(button=>button.onclick=()=>answer(button.textContent));
  form.onsubmit=e=>{e.preventDefault();const value=input.value;input.value='';answer(value);};
}

async function loadCatalog(active='catalog'){
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
  syncSeo('home');
  const slides=slidesList();
  const bannerNames=['Canva Pro','CapCut Pro','ChatGPT Plus','Claude Pro','YouTube Premium'];
  const bannerQueries=['canva','capcut','chatgpt','claude','youtube'];
  const hero=state.store.appearance?.hero!==false?`<section class="campaign-slider wrap" data-hero-slider aria-label="Promo pilihan VanzShop"><div class="campaign-slider-window"><div class="campaign-slider-track">${slides.map((src,i)=>`<article class="campaign-slide ${i===0?'is-center':''}" data-query="${esc(bannerQueries[i]||'')}" style="--campaign-image:url('${esc(src)}')" tabindex="0" role="link" aria-label="Lihat ${esc(bannerNames[i]||`promo VanzShop ${i+1}`)}"><img src="${esc(src)}" alt="${esc(bannerNames[i]||`Promo VanzShop ${i+1}`)}" width="1600" height="639" ${i===0?'loading="eager" fetchpriority="high"':'loading="lazy"'} decoding="async"></article>`).join('')}</div></div><button class="campaign-arrow prev" type="button" data-slider-prev aria-label="Slide sebelumnya">‹</button><button class="campaign-arrow next" type="button" data-slider-next aria-label="Slide berikutnya">›</button><div class="campaign-dots">${slides.map((_,i)=>`<button class="campaign-dot ${i===0?'active':''}" type="button" aria-label="Buka slide ${i+1}" aria-current="${i===0?'true':'false'}"></button>`).join('')}</div></section>`:'';
  const identity=`<section class="catalog-identity wrap"><span class="identity-ghost" aria-hidden="true">PREMIUM</span><div><span class="section-kicker">VANZSHOP.COM · DIGITAL STORE</span><h1>Pusat Premium Digital <span>Termurah</span></h1><p>Katalog pilihan dengan stok real-time, pembayaran QRIS, dan pengiriman detail otomatis.</p></div><div class="identity-actions"><button class="btn btn-primary" type="button" data-scroll-products>Belanja sekarang</button><a class="btn" href="#/reseller">Join Reseller</a></div></section>`;
  const categories=[...new Set(allProducts().map(p=>brandCategory(p.title,p.code)))].sort((a,b)=>a.localeCompare(b,'id'));
  shell(`<main class="page storefront-page">${identity}${hero}<section class="catalog wrap" id="produk"><div class="catalog-head"><div><span class="section-kicker">Katalog produk</span><h2>Premium digital, harga tetap rasional.</h2><p>Cari produk, pilih varian, bayar lewat QRIS, lalu ambil detail pembelian dari menu Pesanan.</p></div><span class="catalog-live"><i></i> Stok diperbarui otomatis</span></div><div class="filters"><div class="filter-scroll"><button class="chip active" data-category="all">Semua</button>${categories.map(c=>`<button class="chip" data-category="${esc(c)}">${esc(c)}</button>`).join('')}</div><label class="search-wrap"><span>⌕</span><input id="search" autocomplete="off" placeholder="Cari produk digital..."></label><select id="sort" class="sort"><option value="store">Rekomendasi</option><option value="sold">Terlaris</option><option value="new">Terbaru</option><option value="low">Harga terendah</option><option value="high">Harga tertinggi</option><option value="name">Nama A–Z</option></select></div><div id="grid" class="grid"></div></section></main>`,active);
  $('#search').oninput=e=>{state.q=e.target.value.toLowerCase();drawGrid();};
  $('#sort').onchange=e=>{state.sort=e.target.value;drawGrid();};
  $$('.chip[data-category]').forEach(b=>b.onclick=()=>{state.category=b.dataset.category;$$('.chip[data-category]').forEach(x=>x.classList.toggle('active',x===b));drawGrid();});
  drawGrid();
  mountHeroSlider();
  mountStorefrontExperience();
}
function drawGrid(){
  let list=allProducts().filter(p=>productPrice(p)>0);
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
  const buyer=profile();
  return buyer?`<div class="profile-callout good checkout-direct"><div><b>Pesanan atas nama ${esc(buyer.name||'Pembeli')}</b><span>Kontak tersimpan di perangkat ini agar pesanan lebih mudah ditemukan saat butuh bantuan.</span></div><a href="#/profil">Edit</a></div>`:`<div class="profile-callout good checkout-direct"><div><b>Pembelian cepat, tanpa akun wajib</b><span>Tambahkan profil lokal bila kamu ingin pesanan lebih mudah dilacak dan dibantu admin.</span></div><a href="#/profil">Tambah profil</a></div>`;
}
function productInformation(product,variation){
  const text=`${product?.title||''} ${variation?.title||variation?.name||''} ${product?.description||''}`.toLowerCase(),duration=(text.match(/\b(\d+)\s*(hari|minggu|bulan|tahun)\b/i)||[]).slice(1).join(' ')||'Sesuai nama varian',access=/invite|famhead|family/.test(text)?'Invite / bergabung':/shared|sharing/.test(text)?'Akun sharing':/private|owner/.test(text)?'Akun private':'Akun, link, atau kode digital',device=(text.match(/\b(\d+)\s*(device|perangkat|profile|profil)\b/i)||[]).slice(1).join(' ')||'Ikuti catatan produk';
  return {duration,access,device};
}
function legacyDetailHtml(p){
  const vs=variants(p),chosen=state.variantId??(vs[0]?.id??null),v=vs.find(x=>String(x.id)===String(chosen))||vs[0];state.variantId=v?.id??null;state.product=p;
  const price=Number(v?.price||productPrice(p)||0),stock=v?.stock??productStock(p),safeMax=stock==null?20:Math.max(1,Number(stock)||1);state.qty=Math.min(Math.max(1,state.qty),safeMax);
  const orderSupplier=isOrderSupplier(p),badge=stockLabel(stock),paymentReady=state.store.payment?.configured!==false,fulfillmentReady=state.store.checkout?.fulfillment==='automatic-xoftware-stock',ready=paymentReady&&fulfillmentReady&&stock!==0&&price>0,info=productInformation(p,v);
  syncSeo('product',p);
  shell(`<main class="detail wrap"><div class="crumb"><a href="#/">← Kembali</a><span>/</span><b>${esc(p.title)}</b></div><div class="detail-grid"><section class="detail-main"><div class="detail-product">${visualMarkup(p,'detail-visual')}<div class="detail-info"><div class="detail-head"><div><span class="section-kicker">${esc(brandCategory(p.title,p.code))} · ${orderSupplier?'supplier':'owner'}</span><h1>${esc(p.title)}</h1></div><span class="meta-stock ${badge.cls}">${esc(badge.text)}</span></div><p class="detail-desc">${esc(p.description||'Produk digital siap diproses otomatis.')}</p><div class="fact-grid"><div><small>Harga</small><strong>${price>0?money(price):'Belum diatur'}</strong></div><div><small>Stok real-time</small><strong>${stock==null?'Dicek saat checkout':Number(stock)}</strong></div><div><small>Pembayaran</small><strong>QRIS · Sewa Pay</strong></div></div><div class="product-clarity"><div><small>Masa aktif</small><b>${esc(info.duration)}</b></div><div><small>Jenis akses</small><b>${esc(info.access)}</b></div><div><small>Perangkat / profil</small><b>${esc(info.device)}</b></div><div><small>Pengiriman</small><b>Otomatis setelah pembayaran terverifikasi</b></div></div><div class="product-policy"><b>Sebelum membeli</b><p>Pastikan varian sudah sesuai. Simpan reference pesanan dan baca <a target="_blank" rel="noopener" href="https://ketentuan-garansi.vanzshop.com">ketentuan garansi VanzShop</a>.</p></div></div></div></section><aside class="buy-panel"><div class="panel-head"><h2>Pembelian</h2><span>Guest checkout</span></div>${profileSummary()}${vs.length?`<div class="step-block"><div class="step-head"><span>1</span><b>Pilih varian</b></div><div class="variant-list">${vs.map(x=>{const active=String(x.id)===String(chosen),out=x.stock!=null&&Number(x.stock)<=0;return `<button type="button" class="variant ${active?'active':''} ${out?'disabled':''}" data-variant="${esc(x.id)}" ${out?'disabled':''}><span>${esc(x.name||x.title||'Varian')}</span><span><small>${x.stock==null?'':`Stok ${Number(x.stock)}`}</small><b>${Number(x.price)>0?money(x.price):'Belum diatur'}</b></span></button>`;}).join('')}</div></div>`:''}<div class="step-block"><div class="step-head"><span>${vs.length?2:1}</span><b>Jumlah</b></div><div class="qty"><button id="qtyMinus" type="button">−</button><b id="qtyVal">${state.qty}</b><button id="qtyPlus" type="button">+</button></div></div><div class="step-block"><div class="step-head"><span>${vs.length?3:2}</span><b>Pembayaran</b></div><div class="payment-card"><div class="payment-icon">QR</div><div><b>QRIS · Sewa Pay</b><small>QR hanya tampil jika gateway menyatakan transaksi masih menunggu pembayaran.</small></div></div></div><div class="summary"><div><span>${esc(v?.name||v?.title||p.title)}</span><b id="sumUnit">${money(price)}</b></div><div><span>Jumlah</span><b id="sumQty">×${state.qty}</b></div><div class="summary-total"><span>Subtotal</span><strong id="sumTotal">${money(price*state.qty)}</strong></div></div><div class="buy-actions"><button class="btn" id="addToCart" type="button" ${!ready?'disabled':''}>+ Masukkan ke tas</button><button class="btn btn-primary btn-buy" id="buyNow" type="button" ${!ready?'disabled':''}>${!paymentReady?'Sewa Pay belum dikonfigurasi':!fulfillmentReady?'Auto-delivery belum dikonfigurasi':stock===0?'Stok habis':price<=0?'Harga belum valid':'Bayar dengan QRIS'}</button></div><div class="secure-note">Checkout diproses tanpa wajib registrasi. Produk baru dikirim setelah status payment sukses dan fulfillment server selesai.</div></aside></div></main>`,'catalog');
  $$('.variant').forEach(btn=>btn.onclick=()=>{state.variantId=btn.dataset.variant;state.qty=1;renderRoute();});
  $('#qtyMinus').onclick=()=>{state.qty=Math.max(1,state.qty-1);refreshTotal(p);};
  $('#qtyPlus').onclick=()=>{const raw=v?.stock??productStock(p),max=raw==null?20:Math.max(1,Math.min(20,Number(raw)||1));state.qty=Math.min(max,state.qty+1);refreshTotal(p);};
  $('#addToCart').onclick=()=>{addCartItem(p,v,state.qty);toast(`${p.title} masuk ke tas.`);detailHtml(p);};
  $('#buyNow').onclick=()=>startCheckout(p);
}
function checkoutAvailability(product,variation){
  const price=Number(variation?.price||productPrice(product)||0),stock=variation?.stock??productStock(product),paymentReady=state.store.payment?.configured!==false,fulfillmentReady=state.store.checkout?.fulfillment==='automatic-xoftware-stock';
  return {price,stock,paymentReady,fulfillmentReady,ready:paymentReady&&fulfillmentReady&&stock!==0&&price>0,label:!paymentReady?'Sewa Pay belum dikonfigurasi':!fulfillmentReady?'Auto-delivery belum dikonfigurasi':stock===0?'Stok habis':price<=0?'Harga belum valid':'Bayar dengan QRIS'};
}

function syncCartBadges(){
  const count=cartCount(),top=$('.nav-cart'),bottom=$('.bottom-nav a[href="#/tas"]');
  if(top)top.innerHTML=`Tas${count?` <em>${count>99?'99+':count}</em>`:''}`;
  if(bottom){let badge=$('em',bottom);if(count&&!badge){badge=document.createElement('em');bottom.appendChild(badge);}if(badge){badge.textContent=count>99?'99+':String(count);badge.hidden=!count;}}
}

function updatePurchasePanel(product){
  const vs=variants(product),variation=vs.find(item=>String(item.id)===String(state.variantId))||vs[0],availability=checkoutAvailability(product,variation),safeMax=availability.stock==null?20:Math.max(1,Number(availability.stock)||1),badge=stockLabel(availability.stock),info=productInformation(product,variation);
  state.variantId=variation?.id??null;state.qty=Math.min(Math.max(1,state.qty),safeMax);
  $$('.variant').forEach(button=>{const active=String(button.dataset.variant)===String(state.variantId);button.classList.toggle('active',active);button.setAttribute('aria-pressed',active?'true':'false');});
  const price=$('#detailPrice'),stock=$('#detailStock'),stockBadge=$('.detail-head .meta-stock'),duration=$('#detailDuration'),access=$('#detailAccess'),device=$('#detailDevice'),cart=$('#addToCart'),buy=$('#buyNow');
  if(price)price.textContent=availability.price>0?money(availability.price):'Belum diatur';if(stock)stock.textContent=availability.stock==null?'Dicek saat checkout':String(Number(availability.stock));
  if(stockBadge){stockBadge.className=`meta-stock ${badge.cls}`;stockBadge.textContent=badge.text;}if(duration)duration.textContent=info.duration;if(access)access.textContent=info.access;if(device)device.textContent=info.device;
  if(cart)cart.disabled=!availability.ready;if(buy){buy.disabled=!availability.ready;buy.textContent=availability.label;}refreshTotal(product);
}

function detailHtml(p){
  const vs=variants(p),chosen=state.variantId??(vs[0]?.id??null),variation=vs.find(item=>String(item.id)===String(chosen))||vs[0];
  state.variantId=variation?.id??null;state.product=p;
  const availability=checkoutAvailability(p,variation),safeMax=availability.stock==null?20:Math.max(1,Number(availability.stock)||1),badge=stockLabel(availability.stock),orderSupplier=isOrderSupplier(p),info=productInformation(p,variation);
  state.qty=Math.min(Math.max(1,state.qty),safeMax);syncSeo('product',p);
  const variantRows=vs.map(item=>{const active=String(item.id)===String(state.variantId),out=item.stock!=null&&Number(item.stock)<=0;return `<button type="button" class="variant ${active?'active':''} ${out?'disabled':''}" data-variant="${esc(item.id)}" aria-pressed="${active?'true':'false'}" ${out?'disabled':''}><span class="variant-name">${esc(item.name||item.title||'Varian')}</span><span class="variant-meta"><small>${item.stock==null?'Stok dicek saat checkout':`Stok ${Number(item.stock)}`}</small><b>${Number(item.price)>0?money(item.price):'Belum diatur'}</b></span></button>`;}).join('');
  shell(`<main class="detail wrap"><div class="crumb"><a href="#/">← Kembali</a><span>/</span><b>${esc(p.title)}</b></div><div class="detail-grid"><section class="detail-main"><div class="detail-product">${visualMarkup(p,'detail-visual')}<div class="detail-info"><div class="detail-head"><div><span class="section-kicker">${esc(brandCategory(p.title,p.code))} · ${orderSupplier?'supplier':'owner'}</span><h1>${esc(p.title)}</h1></div><span class="meta-stock ${badge.cls}">${esc(badge.text)}</span></div><p class="detail-desc">${esc(p.description||'Produk digital siap diproses otomatis.')}</p><div class="fact-grid"><div><small>Harga</small><strong id="detailPrice">${availability.price>0?money(availability.price):'Belum diatur'}</strong></div><div><small>Stok real-time</small><strong id="detailStock">${availability.stock==null?'Dicek saat checkout':Number(availability.stock)}</strong></div><div><small>Pembayaran</small><strong>QRIS · Sewa Pay</strong></div></div><div class="product-clarity"><div><small>Masa aktif</small><b id="detailDuration">${esc(info.duration)}</b></div><div><small>Jenis akses</small><b id="detailAccess">${esc(info.access)}</b></div><div><small>Perangkat / profil</small><b id="detailDevice">${esc(info.device)}</b></div><div><small>Pengiriman</small><b>Otomatis setelah pembayaran terverifikasi</b></div></div><div class="product-policy"><b>Sebelum membeli</b><p>Pastikan varian sudah sesuai. Simpan reference pesanan dan baca <a target="_blank" rel="noopener" href="https://ketentuan-garansi.vanzshop.com">ketentuan garansi VanzShop</a>.</p></div></div></div></section><aside class="buy-panel" aria-label="Pilihan pembelian"><div class="panel-head"><h2>Pembelian</h2><span>Checkout aman</span></div>${profileSummary()}${vs.length?`<div class="step-block"><div class="step-head"><span>1</span><b>Pilih varian</b></div><div class="variant-list">${variantRows}</div></div>`:''}<div class="step-block step-quantity"><div class="step-head"><span>${vs.length?2:1}</span><b>Jumlah</b></div><div class="qty"><button id="qtyMinus" type="button" aria-label="Kurangi jumlah">−</button><b id="qtyVal">${state.qty}</b><button id="qtyPlus" type="button" aria-label="Tambah jumlah">+</button></div></div><div class="step-block"><div class="step-head"><span>${vs.length?3:2}</span><b>Pembayaran</b></div><div class="payment-card"><div class="payment-icon">QR</div><div><b>QRIS · Sewa Pay</b><small>QR hanya tampil setelah gateway membuat transaksi berstatus menunggu pembayaran.</small></div></div></div><div class="summary checkout-summary"><div><span>${esc(variation?.name||variation?.title||p.title)}</span><b id="sumUnit">${money(availability.price)}</b></div><div><span>Jumlah</span><b id="sumQty">×${state.qty}</b></div><div class="summary-total"><span>Subtotal</span><strong id="sumTotal">${money(availability.price*state.qty)}</strong></div></div><div class="buy-actions mobile-checkout-actions"><button class="btn" id="addToCart" type="button" ${!availability.ready?'disabled':''}><span class="wide-label">+ Masukkan ke tas</span><span class="compact-label">+ Tas</span></button><button class="btn btn-primary btn-buy" id="buyNow" type="button" ${!availability.ready?'disabled':''}>${availability.label}</button></div><div class="secure-note">Profil tidak wajib · produk dikirim setelah pembayaran sukses.</div></aside></div></main>`,'catalog');
  $$('.variant').forEach(button=>button.onclick=()=>{state.variantId=button.dataset.variant;state.qty=1;updatePurchasePanel(p);button.scrollIntoView({block:'nearest',behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});});
  $('#qtyMinus').onclick=()=>{state.qty=Math.max(1,state.qty-1);refreshTotal(p);};
  $('#qtyPlus').onclick=()=>{const current=variants(p).find(item=>String(item.id)===String(state.variantId))||variants(p)[0],raw=current?.stock??productStock(p),max=raw==null?20:Math.max(1,Math.min(20,Number(raw)||1));state.qty=Math.min(max,state.qty+1);refreshTotal(p);};
  $('#addToCart').onclick=()=>{const current=variants(p).find(item=>String(item.id)===String(state.variantId))||variants(p)[0];addCartItem(p,current,state.qty);syncCartBadges();toast(`${p.title} masuk ke tas.`);};
  $('#buyNow').onclick=()=>startCheckout(p);
}

function refreshTotal(p){const vs=variants(p),v=vs.find(x=>String(x.id)===String(state.variantId))||vs[0],price=Number(v?.price||productPrice(p)||0);$('#qtyVal').textContent=state.qty;$('#sumUnit').textContent=money(price);$('#sumQty').textContent=`×${state.qty}`;$('#sumTotal').textContent=money(price*state.qty);const name=$('.checkout-summary>div:first-child>span');if(name)name.textContent=v?.name||v?.title||p.title;}
function priceFrom(p){const vs=variants(p);return Number(vs.find(x=>String(x.id)===String(state.variantId))?.price||productPrice(p)||0);}
async function startCheckout(p,options={}){
  const vs=variants(p),wanted=options.variation_id??state.variantId,v=vs.find(x=>String(x.id)===String(wanted))||vs[0],qty=Math.max(1,Number(options.quantity??state.qty)||1),sku=String(v?.code||p.code||'').trim();
  if(!sku){toast('SKU produk/varian tidak tersedia.',true);return;}
  if(state.busy)return;state.busy=true;const btn=$('#buyNow');if(btn){btn.disabled=true;btn.textContent='Membuat invoice Sewa Pay...';}
  try{
    const buyer=profile()||{};
    const result=await api('payment_create',{product_id:p.id,variation_id:v?.id??null,code:sku,quantity:qty,method:'QRIS',buyer:{name:buyer.name||'',whatsapp:buyer.whatsapp||'',email:buyer.email||''}});
    const d=result?.payment||{},paymentId=String(d?.id||'');if(!paymentId)throw new Error('Sewa Pay tidak mengembalikan payment id.');
    saveLocalOrder({type:'sewapay',provider:'sewapay',transaction_id:paymentId,reference:String(d?.reference||''),payment_token:String(result?.payment_token||''),product_id:result?.order?.product_id??p.id,variation_id:result?.order?.variation_id??v?.id??null,sku:result?.order?.code||sku,product_title:result?.order?.product_title||p.title,variant:result?.order?.variant_title||v?.title||v?.name||'',quantity:result?.order?.quantity||qty,unit_price:Number(result?.order?.unit_price||Number(v?.price||productPrice(p))),amount:Number(d?.amount||result?.order?.unit_price*qty||0),fee:Number(d?.fee||0),total:Number(d?.total_payment||d?.amount||Number(v?.price||productPrice(p))*qty),status:String(d?.status||'PENDING').toLowerCase()==='completed'?'success':'pending',qr_string:d?.payment_data?.qr_string||'',expires_at:d?.expires_at||'',fulfillment:'waiting-payment',delivery_label:'Detail akun / akses digital sesuai varian',buyer:{name:buyer.name||'',whatsapp:buyer.whatsapp||'',email:buyer.email||''},created_at:Date.now()});
    if(options.cart_key)removeCartItem(options.cart_key);
    location.hash=`#/bayar/${encodeURIComponent(paymentId)}`;
  }catch(e){toast(e.message,true);if(btn){btn.disabled=false;btn.textContent='Bayar dengan QRIS';}}
  finally{state.busy=false;}
}

function renderCart(){
  syncSeo('cart');
  const rows=cartItems(),total=rows.reduce((sum,row)=>sum+(Number(row.price)||0)*Math.max(1,Number(row.quantity)||1),0);
  shell(`<main class="cart-page wrap"><div class="page-head"><div><span class="section-kicker">TAS BELANJA</span><h1>Produk yang kamu simpan</h1><p>Checkout dilakukan per produk agar reservasi stok dan pengiriman akun tetap aman.</p></div><a class="btn" href="#/">+ Tambah produk</a></div>${rows.length?`<div class="cart-layout"><section class="cart-list">${rows.map(row=>`<article class="cart-row" data-key="${esc(row.key)}"><img src="${esc(row.image||'/assets/brands/default.svg')}" alt=""><div><b>${esc(row.title)}</b><span>${esc(row.variant||'Varian utama')}</span><small>${money(row.price)} per item</small></div><div class="cart-qty"><button type="button" data-cart-minus>−</button><b>${esc(row.quantity)}</b><button type="button" data-cart-plus>+</button></div><strong>${money((Number(row.price)||0)*Math.max(1,Number(row.quantity)||1))}</strong><div class="cart-actions"><button class="btn btn-primary btn-sm" type="button" data-cart-checkout>Checkout</button><button class="btn btn-sm danger" type="button" data-cart-remove>Hapus</button></div></article>`).join('')}</section><aside class="cart-summary"><span class="section-kicker">RINGKASAN</span><div><span>Total item</span><b>${cartCount()}</b></div><div><span>Estimasi subtotal</span><strong>${money(total)}</strong></div><p>Fee QRIS dihitung oleh Sewa Pay saat invoice dibuat. Harga dan stok divalidasi ulang oleh server.</p><a class="btn" href="#/pesanan">Lihat pesanan</a></aside></div>`:`<div class="empty-card"><div class="empty-icon">▱</div><h3>Tas masih kosong</h3><p>Masukkan produk dari halaman detail, lalu kembali ke sini saat siap checkout.</p><a class="btn btn-primary" href="#/">Cari produk</a></div>`}</main>`,'cart');
  $$('.cart-row').forEach(row=>{const key=row.dataset.key,get=()=>cartItems().find(item=>item.key===key);$('[data-cart-minus]',row).onclick=()=>{const item=get();if(!item)return;item.quantity=Math.max(1,(Number(item.quantity)||1)-1);saveCart(cartItems().map(x=>x.key===key?item:x));renderCart();};$('[data-cart-plus]',row).onclick=()=>{const item=get();if(!item)return;const max=item.stock==null?20:Math.max(1,Math.min(20,Number(item.stock)||1));item.quantity=Math.min(max,(Number(item.quantity)||1)+1);saveCart(cartItems().map(x=>x.key===key?item:x));renderCart();};$('[data-cart-remove]',row).onclick=()=>{removeCartItem(key);toast('Produk dihapus dari tas.');renderCart();};$('[data-cart-checkout]',row).onclick=()=>{const item=get(),product=item&&getProduct('owner',item.product_id);if(!item||!product){toast('Produk tidak lagi tersedia di katalog.',true);return;}startCheckout(product,{variation_id:item.variation_id,quantity:item.quantity,cart_key:key});};});
}

function renderProfile(){
  syncSeo('profile');const buyer=profile()||{};
  shell(`<main class="profile-page wrap"><div class="page-head"><div><span class="section-kicker">AKUN & PROFIL</span><h1>Profil pembeli yang simpel</h1><p>Simpan kontak secara lokal agar pesanan lebih mudah ditemukan dan dibantu tanpa membuat password baru.</p></div><a class="btn" href="#/">Katalog</a></div><div class="profile-layout"><section class="profile-card"><label class="form-field"><span>Nama panggilan</span><input id="buyerName" class="input big" maxlength="100" value="${esc(buyer.name||'')}" placeholder="Contoh: Vanz"></label><label class="form-field"><span>WhatsApp</span><input id="buyerWa" class="input big" inputmode="tel" value="${esc(buyer.whatsapp||'')}" placeholder="08xxxxxxxxxx"></label><label class="form-field"><span>Email (opsional)</span><input id="buyerEmail" class="input big" inputmode="email" value="${esc(buyer.email||'')}" placeholder="nama@email.com"></label><div class="button-row"><button id="saveBuyer" class="btn btn-primary" type="button">Simpan profil</button><button id="clearBuyer" class="btn" type="button">Hapus</button></div></section><aside class="profile-safety"><span>PRIVASI PERANGKAT</span><h2>Pesanan lebih mudah dilacak, tanpa password tambahan.</h2><p>Profil ini bersifat opsional dan hanya disimpan di browser. Detail hasil pembelian tetap dilindungi payment token perangkat checkout.</p><ul><li>Nama dan kontak membantu admin menemukan order.</li><li>Reference tetap menjadi identitas utama transaksi.</li><li>Profil dapat dihapus kapan saja dari perangkat ini.</li></ul></aside></div></main>`,'profile');
  $('#saveBuyer').onclick=()=>{const name=$('#buyerName').value.trim(),whatsapp=phoneNormalize($('#buyerWa').value),email=$('#buyerEmail').value.trim().toLowerCase();if(whatsapp&&!phoneOk(whatsapp)){toast('Nomor WhatsApp tidak valid.',true);return;}if(email&&!emailOk(email)){toast('Email tidak valid.',true);return;}saveProfile({name,whatsapp,email,updated_at:Date.now()});toast('Profil lokal disimpan.');renderProfile();};
  $('#clearBuyer').onclick=()=>{clearProfile();toast('Profil lokal dihapus.');renderProfile();};
}

function orders(){return safeJsonParse(localStorage.getItem('vanz_orders')||'[]',[]);}
function saveLocalOrder(o){const xs=orders().filter(x=>x.transaction_id!==o.transaction_id);xs.unshift(o);localStorage.setItem('vanz_orders',JSON.stringify(xs.slice(0,40)));}
function orderState(o){
  const status=String(o?.status||'pending').toLowerCase(),fulfillment=String(o?.fulfillment||'').toLowerCase();
  if(status==='success'&&fulfillment==='fulfilled')return{label:'Siap digunakan',tone:'good',detail:`${Array.isArray(o.accounts)?o.accounts.length:Math.max(1,Number(o.quantity)||1)} detail tersedia`};
  if(status==='success')return{label:'Sedang disiapkan',tone:'warn',detail:'Pembayaran berhasil, fulfillment berjalan'};
  if(['fail','failed','cancelled','canceled'].includes(status))return{label:status.startsWith('cancel')?'Dibatalkan':'Gagal',tone:'bad',detail:'Tidak ada produk yang dikirim'};
  return{label:'Menunggu pembayaran',tone:'pending',detail:'Selesaikan QRIS untuk memproses produk'};
}
function orderDate(value){const time=Number(value)||Date.parse(value||'');return time?new Date(time).toLocaleString('id-ID',{dateStyle:'medium',timeStyle:'short'}):'Waktu tidak tersedia';}
function renderOrders(reference=''){
  syncSeo('orders');
  const list=orders(),done=list.filter(o=>orderState(o).tone==='good').length,pending=list.filter(o=>['pending','warn'].includes(orderState(o).tone)).length;
  shell(`<main class="orders orders-rich wrap"><div class="page-head orders-head"><div><span class="section-kicker">PUSAT PESANAN</span><h1>Pesanan dan hasil pembelian</h1><p>Lacak reference, cek pembayaran, dan buka detail akun dari perangkat checkout.</p></div><a class="btn" href="#/">← Kembali ke katalog</a></div><section class="reference-search"><div><span class="section-kicker">GLOBAL REFERENCE SEARCH</span><h2>Produk bermasalah? Lacak sekarang.</h2><p>Masukkan reference yang diawali <b>VZ-</b>. Status dapat dicari lintas perangkat; detail rahasia tetap terlindungi.</p></div><form id="referenceForm"><input id="referenceInput" class="input big" autocomplete="off" value="${esc(reference)}" placeholder="VZ-XXXXXXXX-XXXXXXXXXX"><button class="btn btn-primary" type="submit">Lacak reference</button></form><div id="referenceResult"></div></section><section class="order-overview"><div><span>Total pesanan</span><strong>${list.length}</strong></div><div><span>Siap digunakan</span><strong>${done}</strong></div><div><span>Sedang diproses</span><strong>${pending}</strong></div><aside><b>Yang kamu dapat</b><p>Produk, varian, jumlah, total, status pembayaran, serta detail akun/link setelah fulfillment selesai.</p></aside></section><div class="order-list order-list-rich">${list.length?list.map(o=>{const s=orderState(o);return `<button type="button" class="order-row order-row-rich" data-tx="${esc(o.transaction_id)}"><div class="order-art">${esc((o.product_title||'P')[0])}</div><div class="order-info"><div class="order-title-line"><b>${esc(o.product_title||'Produk digital')}</b><span class="order-status ${s.tone}">${esc(s.label)}</span></div><span>${esc(o.variant||'Varian utama')} · ${esc(o.quantity||1)} item</span><small>${esc(orderDate(o.created_at))} · Ref ${esc(o.reference||o.transaction_id||'—')}</small><div class="order-delivery"><i>✓</i><span><b>${esc(o.delivery_label||'Detail akun / akses digital')}</b><small>${esc(s.detail)}</small></span></div></div><div class="order-right"><strong>${money(o.total)}</strong><small>Lihat detail →</small></div></button>`;}).join(''):`<div class="empty-card"><div class="empty-icon">□</div><h3>Belum ada riwayat lokal</h3><p>Kamu tetap dapat menemukan transaksi lama melalui reference search di atas.</p><a class="btn btn-primary" href="#/">Mulai belanja</a></div>`}</div><div class="orders-privacy"><b>Privasi hasil pembelian</b><span>Status aman dapat dicari dari perangkat mana pun. Email, password, link, atau kode akses hanya terbuka di perangkat yang memiliki payment token.</span></div></main>`,'orders');
  $$('.order-row').forEach(b=>b.onclick=()=>{const o=list.find(x=>x.transaction_id===b.dataset.tx);if(o)location.hash=`#/bayar/${encodeURIComponent(o.transaction_id)}`;});
  $('#referenceForm').onsubmit=e=>{e.preventDefault();trackReference($('#referenceInput').value);};
  if(reference)requestAnimationFrame(()=>trackReference(reference));
}
async function trackReference(value){
  const reference=String(value||'').trim().toUpperCase(),box=$('#referenceResult');if(!box)return;if(!looksLikeReference(reference)){box.innerHTML='<div class="reference-result bad"><b>Format reference belum benar</b><span>Contoh: VZ-MUK9CF55-D47AC475BB</span></div>';return;}
  box.innerHTML='<div class="reference-result"><span class="loader small"></span><b>Mengecek pusat pesanan...</b></div>';
  const local=orders().find(o=>String(o.reference||'').toUpperCase()===reference);
  try{
    if(local?.payment_token){await syncPaymentOrder(local).catch(()=>{});const latest=orders().find(o=>o.transaction_id===local.transaction_id)||local,s=orderState(latest);box.innerHTML=`<div class="reference-result ${s.tone}"><div><span>REFERENCE DITEMUKAN · PERANGKAT CHECKOUT</span><h3>${esc(latest.product_title||'Produk digital')}</h3><p>${esc(latest.variant||'Varian utama')} · ${esc(s.label)} · ${money(latest.total)}</p><small>${esc(s.detail)}</small></div><a class="btn btn-primary" href="#/bayar/${encodeURIComponent(latest.transaction_id)}">Buka detail aman</a></div>`;return;}
    const data=await api('order_lookup',null,{reference});const tone=data.payment_status==='fail'||data.payment_status==='cancelled'?'bad':data.fulfillment_status==='fulfilled'?'good':'warn';box.innerHTML=`<div class="reference-result ${tone}"><div><span>REFERENCE DITEMUKAN · STATUS AMAN</span><h3>${esc(data.product_title||'Produk digital')}</h3><p>${esc(data.variant_title||'Varian utama')} · ${esc(data.quantity||1)} item · ${money(data.amount)}</p><small>Pembayaran: ${esc(data.payment_status)} · Pengiriman: ${esc(data.fulfillment_status)}${data.delivered_items?` · ${esc(data.delivered_items)} item terkirim`:''}</small></div><a class="btn" target="_blank" rel="noopener" href="https://wa.me/${esc(phoneNormalize(state.store.support?.whatsapp||'0895415204928'))}?text=${encodeURIComponent(`Halo admin VanzShop, saya butuh bantuan untuk reference ${reference}`)}">Bantuan admin</a></div><p class="reference-privacy">Demi keamanan, kredensial tidak ditampilkan pada perangkat baru. Buka dari perangkat checkout atau hubungi admin dengan reference ini.</p>`;
  }catch(e){box.innerHTML=`<div class="reference-result bad"><b>Reference belum ditemukan</b><span>${esc(e.message)}</span></div>`;}
}
async function renderPayment(txid){
  let o=orders().find(x=>String(x.transaction_id)===String(txid));if(!o){toast('Pesanan tidak ditemukan.',true);location.hash='#/pesanan';return;}
  syncSeo('orders');
  if(String(o.status)==='success'&&String(o.fulfillment)==='fulfilled'&&Array.isArray(o.accounts)&&o.accounts.length){showSuccess(o,o.accounts);return;}
  shell(`<main class="payment-check wrap"><section><span class="loader"></span><div><span class="section-kicker">SINKRONISASI PESANAN</span><h1>Mengecek status terbaru</h1><p>QRIS tidak akan ditampilkan sebelum server memastikan transaksi masih menunggu pembayaran.</p></div></section></main>`,'orders');
  try{await syncPaymentOrder(o);}catch(e){o.sync_error=e.message;}
  o=orders().find(x=>String(x.transaction_id)===String(txid))||o;
  if(o.status==='success'&&o.fulfillment==='fulfilled'&&Array.isArray(o.accounts)&&o.accounts.length){showSuccess(o,o.accounts);return;}
  if(o.status==='success'){renderFulfillmentProgress(o);return;}
  if(['fail','cancelled'].includes(String(o.status))){renderPaymentStopped(o);return;}
  renderPendingPayment(o);
}
async function syncPaymentOrder(o){
  if(o.provider==='sewapay'){
    if(!o.payment_token)throw new Error('Pesanan tidak memiliki payment token aman.');
    const data=await api('payment_status',{id:o.transaction_id,reference:o.reference||'',payment_token:o.payment_token}),d=data?.payment||{},f=data?.fulfillment||{};
    o.status=String(data?.status||'pending').toLowerCase();o.fee=Number(d?.fee??o.fee??0);o.amount=Number(d?.amount??o.amount??0);o.total=Number(d?.total_payment??(o.amount+o.fee)??o.total);o.fulfillment=f?.status||((o.status==='success')?'processing':'waiting-payment');o.accounts=Array.isArray(f?.accounts)?f.accounts.map(x=>x?.value??x):o.accounts||[];o.fulfillment_error=f?.error||f?.last_error||'';o.last_checked_at=Date.now();saveLocalOrder(o);return o;
  }
  if(!o.status_token)throw new Error('Pesanan lama tidak memiliki token status.');const data=await api('order_status',{transaction_id:o.transaction_id,status_token:o.status_token}),d=data?.transaction||{},status=String(d?.status||'').toLowerCase();if(status)o.status=status;o.accounts=d?.accounts||o.accounts||[];if(d?.total!=null||d?.total_to_pay!=null)o.total=Number(d?.total??d?.total_to_pay);o.fulfillment=o.status==='success'&&o.accounts.length?'fulfilled':o.fulfillment;saveLocalOrder(o);return o;
}
function renderPendingPayment(o){
  shell(`<main class="invoice wrap" data-payment-view="pending"><div class="crumb"><a href="#/pesanan">← Pesanan</a><span>/</span><b>Menunggu pembayaran</b></div><div class="invoice-grid"><section class="invoice-main"><div class="invoice-badge">MENUNGGU PEMBAYARAN</div><h1>${esc(o.product_title)}</h1><p>${esc(o.variant||'Varian utama')} · ${esc(o.quantity||1)} item · QRIS Sewa Pay</p><div class="payment-box">${o.qr_string?'<div class="qr" id="qr"></div>':'<div class="qr-unavailable">QR tidak tersedia</div>'}<div class="pay-data"><span>Total dibayar</span><strong>${money(o.total)}</strong><small>${o.fee?`Subtotal ${money(o.amount)} + fee ${money(o.fee)}`:'Scan QRIS sebelum masa berlaku berakhir.'}</small></div></div><div class="payment-truth"><i>1</i><div><b>QR aktif karena payment masih PENDING</b><p>Setelah gateway mengonfirmasi pembayaran, QR ditutup dan proses pengiriman dimulai.</p></div></div></section><aside class="invoice-side"><div><span>Payment ID</span><b>${esc(o.transaction_id)}</b></div><div><span>Reference</span><b>${esc(o.reference||'—')}</b></div><div><span>Status pembayaran</span><b id="invoiceStatus">Menunggu pembayaran</b></div><div><span>Status produk</span><b>Belum diproses</b></div>${o.sync_error?`<div class="status-card bad"><span>${esc(o.sync_error)}</span></div>`:''}<button class="btn btn-primary" id="checkNow">Saya sudah bayar · cek lagi</button><button class="btn" id="cancelPayment">Batalkan pembayaran</button><div class="invoice-help"><b>Jangan tutup reference</b><span>Simpan ${esc(o.reference||'reference ini')} untuk pelacakan.</span></div></aside></div></main>`,'orders');
  if(o.qr_string&&window.QRCode&&$('#qr')){try{new QRCode($('#qr'),{text:o.qr_string,width:220,height:220,colorDark:'#111',colorLight:'#fff'});}catch{}}
  $('#checkNow').onclick=()=>refreshInvoice(o,true);$('#cancelPayment').onclick=async()=>{if(!confirm('Batalkan payment yang masih menunggu?'))return;try{await api('payment_cancel',{payment_token:o.payment_token});o.status='cancelled';saveLocalOrder(o);renderPaymentStopped(o);}catch(e){toast(e.message,true);}};startPaymentPolling(o);
}
function renderFulfillmentProgress(o){
  const waitingStock=o.fulfillment==='waiting_stock',error=o.fulfillment_error||'';
  shell(`<main class="fulfillment-progress wrap" data-payment-view="processing"><section class="progress-card"><div class="progress-orb"><span></span></div><span class="section-kicker">PEMBAYARAN TERVERIFIKASI</span><h1>${waitingStock?'Pembayaran aman, menunggu stok':'Produk sedang disiapkan'}</h1><p>QR sudah ditutup karena pembayaran berhasil. Server sedang menyelesaikan fulfillment tanpa mengirim stok dua kali.</p><div class="progress-steps"><div class="done"><i>✓</i><span><b>Pembayaran berhasil</b><small>Sewa Pay telah mengonfirmasi transaksi.</small></span></div><div class="active"><i>2</i><span><b>${waitingStock?'Menunggu stok tersedia':'Mengambil stok terreservasi'}</b><small>${esc(error||'Proses dilakukan server-side dan aman untuk diretry.')}</small></span></div><div><i>3</i><span><b>Detail siap digunakan</b><small>Akan tampil setelah fulfillment benar-benar selesai.</small></span></div></div><div class="reference-bar"><span>REFERENCE PESANAN</span><code>${esc(o.reference||'—')}</code></div><div class="button-row"><button id="checkNow" class="btn btn-primary">Cek proses sekarang</button><a class="btn" href="#/pesanan">Pusat pesanan</a></div></section></main>`,'orders');
  $('#checkNow').onclick=()=>refreshInvoice(o,true);startPaymentPolling(o);
}
function renderPaymentStopped(o){
  if(timer){clearInterval(timer);timer=null;}const cancelled=String(o.status)==='cancelled';
  shell(`<main class="payment-stopped wrap"><section><div class="stopped-mark">!</div><span class="section-kicker">TRANSAKSI ${cancelled?'DIBATALKAN':'GAGAL'}</span><h1>Produk tidak diproses</h1><p>Tidak ada akun yang dikirim untuk transaksi ini. Kamu dapat kembali ke katalog atau menghubungi admin dengan reference.</p><div class="reference-bar"><span>REFERENCE</span><code>${esc(o.reference||'—')}</code></div><div class="button-row"><a class="btn btn-primary" href="#/">Kembali belanja</a><a class="btn" target="_blank" rel="noopener" href="https://wa.me/${esc(phoneNormalize(state.store.support?.whatsapp||'0895415204928'))}?text=${encodeURIComponent(`Halo admin VanzShop, mohon cek reference ${o.reference||o.transaction_id}`)}">Hubungi admin</a></div></section></main>`,'orders');
}
function startPaymentPolling(o){
  if(timer)clearInterval(timer);timer=setInterval(()=>refreshInvoice(o,false),5000);
}
async function refreshInvoice(o,manual=false){
  try{await syncPaymentOrder(o);if(o.status==='success'&&o.fulfillment==='fulfilled'&&Array.isArray(o.accounts)&&o.accounts.length){if(timer){clearInterval(timer);timer=null;}showSuccess(o,o.accounts);return;}const view=$('[data-payment-view]')?.dataset.paymentView;if(o.status==='success'&&view!=='processing'){renderFulfillmentProgress(o);return;}if(['fail','cancelled'].includes(String(o.status))){renderPaymentStopped(o);return;}if(manual)toast(o.status==='success'?'Pembayaran berhasil, produk sedang disiapkan.':'Pembayaran masih menunggu.');}
  catch(e){if(manual)toast(e.message,true);if(String(e.message).toLowerCase().includes('token')&&timer){clearInterval(timer);timer=null;}}
}
function showSuccess(o,accountsOverride){
  if(timer){clearInterval(timer);timer=null;}
  const acc=Array.isArray(accountsOverride)&&accountsOverride.length?accountsOverride:(Array.isArray(o.accounts)?o.accounts:[]);
  const sewa=o.provider==='sewapay';
  shell(`<main class="success wrap"><div class="success-card success-card-rich"><div class="success-mark">✓</div><span class="section-kicker">${sewa?'PEMBAYARAN & PENGIRIMAN SELESAI':'PESANAN BERHASIL'}</span><h1>${acc.length?'Produk siap digunakan':'Pembayaran berhasil'}</h1><p>${acc.length?'Detail pembelianmu sudah tersedia. Salin data di bawah lalu ikuti catatan penggunaan produk.':'Pembayaran sudah diterima dan sistem sedang menyiapkan detail produkmu.'}</p><div class="success-summary"><div><small>Produk</small><b>${esc(o.product_title)}</b></div><div><small>Varian</small><b>${esc(o.variant||'Varian utama')}</b></div><div><small>Jumlah</small><b>${esc(o.quantity||1)} item</b></div><div><small>Total</small><b>${money(o.total)}</b></div></div>${sewa?`<div class="reference-bar"><span>REFERENCE PESANAN</span><code>${esc(o.reference||'—')}</code></div>`:''}${acc.length?`<div class="accounts"><div class="accounts-head"><div><b>Yang kamu dapat</b><small>${esc(receiptNote())}</small></div><button class="btn btn-primary btn-sm" id="copyAll">Salin semua detail</button></div><div class="credential-grid">${acc.map((a,i)=>renderCredentialCard(a,i)).join('')}</div></div>`:`<div class="registration-blocked"><b>Detail produk sedang disiapkan</b><span>${esc(o.fulfillment_error||'Sistem akan mencoba mengambil stok yang sudah direservasi tanpa mengirim akun dua kali.')}</span><button class="btn btn-sm" id="retryFulfillment">Coba kirim lagi</button></div>`}<div class="after-delivery-note"><b>Simpan detail ini dengan aman</b><span>Jangan membagikan email, password, link, atau kode akses kepada orang lain. Hubungi admin jika format produk tidak sesuai pesanan.</span></div><div class="success-actions"><a class="btn btn-primary" href="#/pesanan">Lihat semua pesanan</a><a class="btn" href="#/">Belanja lagi</a><a class="btn" target="_blank" rel="noopener" href="https://wa.me/${esc(phoneNormalize(state.store.support?.whatsapp||'0895415204928'))}">Bantuan WhatsApp</a></div></div></main>`,'orders');
  const b=$('#copyAll');if(b)b.onclick=async()=>{try{await navigator.clipboard.writeText(acc.map(formatAccount).join('\n\n'));toast('Detail disalin.');}catch{toast('Gagal menyalin otomatis.',true);}};
  $$('.credential-copy').forEach(btn=>btn.onclick=async()=>{try{await navigator.clipboard.writeText(btn.dataset.copy||'');toast('Detail akun disalin.');}catch{toast('Clipboard gagal.',true);}});
  const retry=$('#retryFulfillment');if(retry)retry.onclick=async()=>{retry.disabled=true;retry.textContent='Claiming...';try{const r=await api('fulfillment_retry',{payment_token:o.payment_token});const a=(r?.fulfillment?.accounts||[]).map(x=>x?.value??x);o.accounts=a;o.fulfillment=r?.fulfillment?.status||'pending';o.fulfillment_error=r?.fulfillment?.last_error||'';saveLocalOrder(o);if(o.fulfillment==='fulfilled')showSuccess(o,a);else{toast(o.fulfillment_error||'Fulfillment belum selesai.',true);retry.disabled=false;retry.textContent='Retry claim';}}catch(e){toast(e.message,true);retry.disabled=false;retry.textContent='Retry claim';}};
}

function adminToken(){return sessionStorage.getItem('vanz_admin_token')||'';}
function adminTabs(active){
  const groups=[
    ['Ringkasan', [['overview','Dashboard'],['orders','Lacak Pesanan'],['recap','Rekap Produk']]],
    ['Produk', [['products','Kelola Produk'],['product-detail','Detail Produk'],['variations','Variasi'],['forms','Format Stok']]],
    ['Stok', [['stock','Stok Masuk & Aktif'],['fulfillment','Stok Keluar']]],
    ['Tampilan', [['appearance','Tema & Branding'],['ai','VanzCat AI']]],
  ];
  return `<aside class="admin-sidebar">${groups.map(([title,items])=>`<div class="admin-nav-group"><b>${title}</b>${items.map(([id,label])=>`<a class="${active===id?'active':''}" href="#/admin/${id}">${label}</a>`).join('')}</div>`).join('')}</aside>`;
}
async function renderAdmin(section='overview'){
  if(!adminToken())return renderAdminLogin();
  shell(`<main class="admin wrap"><div class="admin-head"><div><span class="section-kicker">Dashboard VanzShop</span><h1>Manajemen Produk & Stok</h1><p>Kelola katalog, variasi, stok masuk, dan riwayat stok keluar dari satu tempat.</p></div><div class="button-row"><a class="btn" href="#/">Lihat toko</a><button class="btn" id="adminLogout">Keluar</button></div></div><div class="admin-layout">${adminTabs(section)}<div id="adminContent" class="admin-content"><div class="loading-card"><div class="loader"></div><span>Memuat dashboard...</span></div></div></div></main>`,'admin');
  $('#adminLogout').onclick=()=>{sessionStorage.removeItem('vanz_admin_token');renderAdminLogin();};
  try{await adminApi('admin_ping');}catch(e){sessionStorage.removeItem('vanz_admin_token');toast(e.message,true);return renderAdminLogin();}
  const routes={
    overview:adminOverview,orders:adminOrderTracking,recap:adminProductRecap,products:adminProducts,'product-detail':adminProductDetail,variations:adminVariations,ai:adminVanzCatAI,
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

async function adminVanzCatAI(){
  const box=$('#adminContent');box.innerHTML='<div class="loading-card"><div class="loader"></div><span>Memeriksa koneksi Gemini...</span></div>';
  try{
    const ai=await adminApi('admin_ai_status'),configured=Boolean(ai.configured),fallbackModels=Array.isArray(ai.fallback_models)&&ai.fallback_models.length?ai.fallback_models.join(' → '):'—',envTemplate=['GEMINI_API_KEY=PASTE_KEY_DI_VERCEL','GEMINI_MODEL='+String(ai.model||'gemini-3.5-flash-lite'),'GEMINI_TIMEOUT=20000','GEMINI_MAX_OUTPUT_TOKENS=420','GEMINI_RATE_LIMIT_PER_MINUTE=12'].join('\n');
    box.innerHTML=`<div class="admin-grid ai-control"><section class="admin-panel wide ai-hero"><div><span class="section-kicker">VANZCAT INTELLIGENCE</span><h2>Gemini Control Center</h2><p class="muted">VanzCat memakai Gemini melalui backend VanzShop. API key tidak pernah dikirim ke browser atau pengunjung.</p></div><span class="ai-live ${configured?'good':'bad'}"><i></i>${configured?'Gemini terhubung':'Secret belum dipasang'}</span></section><section class="admin-panel"><div class="panel-title"><div><h2>Status runtime</h2><p class="muted">Konfigurasi aktif pada deployment ini.</p></div></div><div class="ai-status-list"><div><span>Provider</span><b>Google Gemini</b></div><div><span>Model utama</span><code>${esc(ai.model||'—')}</code></div><div><span>Fallback otomatis</span><code>${esc(fallbackModels)}</code></div><div><span>API key</span><b>${configured?'Server-side · terlindungi':'Missing'}</b></div><div><span>Rate limit publik</span><b>${esc(ai.rate_limit_per_minute||12)} chat / menit</b></div><div><span>Timeout</span><b>${esc(Math.round(Number(ai.timeout_ms||0)/1000))} detik</b></div></div></section><section class="admin-panel"><div class="panel-title"><div><h2>Secret Vercel</h2><p class="muted">Pasang sebagai Environment Variable, lalu redeploy.</p></div></div><div class="env-box ai-env"><pre>${esc(envTemplate)}</pre><button id="aiCopyEnv" class="btn">Salin template ENV</button></div><div class="status-card ${configured?'good':'warn'}"><b>${configured?'Key sudah terdeteksi':'GEMINI_API_KEY belum terdeteksi'}</b><span>Nilai secret sengaja tidak dapat dibaca dari dashboard.</span></div></section><section class="admin-panel wide"><div class="panel-title"><div><h2>Tes jawaban VanzCat</h2><p class="muted">Tes ini memakai katalog live yang sama dengan storefront.</p></div><span class="build-chip">${BUILD_ID}</span></div><div class="ai-test-grid"><label class="form-field"><span>Pertanyaan tes</span><textarea id="aiTestPrompt" class="input" rows="4" maxlength="700">Rekomendasikan satu produk AI dari katalog VanzShop dan jelaskan cara checkout dengan aman.</textarea></label><div id="aiTestOutput" class="ai-test-output"><span>Jawaban Gemini akan tampil di sini.</span></div></div><div class="button-row"><button id="aiTestBtn" class="btn btn-primary" ${configured?'':'disabled'}>Tes Gemini sekarang</button><a class="btn" href="/#/">Buka VanzCat</a></div></section><section class="admin-panel wide"><h2>Guardrail aktif</h2><div class="checklist ai-checklist"><span>✓ Key hanya berada di server</span><span>✓ Katalog live menjadi konteks jawaban</span><span>✓ Reference dilacak tanpa membocorkan kredensial</span><span>✓ Password, OTP, dan payment token dilarang</span><span>✓ Fallback model & jawaban lokal aktif</span><span>✓ Input dan output dibatasi untuk kontrol biaya</span></div></section></div>`;
    $('#aiCopyEnv').onclick=()=>navigator.clipboard.writeText(envTemplate).then(()=>toast('Template ENV disalin.')).catch(()=>toast('Clipboard gagal.',true));
    const test=$('#aiTestBtn');if(test)test.onclick=async()=>{const output=$('#aiTestOutput'),message=$('#aiTestPrompt').value.trim();if(!message){toast('Pertanyaan tes wajib diisi.',true);return;}test.disabled=true;test.textContent='Menghubungi Gemini...';output.innerHTML='<div class="loading-card"><div class="loader"></div><span>Gemini sedang menyusun jawaban...</span></div>';try{const result=await adminApi('admin_ai_test',{method:'POST',body:{message}}),usage=result.usage||{};output.innerHTML=`<span class="cat-provider gemini">GEMINI · ${esc(result.model||ai.model)}</span><p>${esc(result.answer||'').replace(/\n/g,'<br>')}</p><small>Input ${esc(usage.promptTokenCount??'—')} · Output ${esc(usage.candidatesTokenCount??'—')} token</small>`;}catch(error){output.innerHTML=`<div class="status-card bad"><b>Tes Gemini gagal</b><span>${esc(error.message)}</span></div>`;}finally{test.disabled=false;test.textContent='Tes Gemini sekarang';}};
  }catch(error){box.innerHTML=`<div class="status-card bad"><b>Status Gemini gagal dimuat</b><span>${esc(error.message)}</span></div>`;}
}

async function adminProductRecap(){
  const box=$('#adminContent');
  box.innerHTML='<div class="loading-card"><div class="loader"></div><span>Memuat rekap produk...</span></div>';
  try{
    const response=await adminApi('admin_fulfillment_list',{query:{limit:500}}),orders=Array.isArray(response?.orders)?response.orders:[],receipts=Array.isArray(response?.receipts)?response.receipts:[],receiptMap=new Map(receipts.map(row=>[String(row.reference),row]));
    const profitFor=order=>{const product=state.owner.find(p=>String(p.id)===String(order.product_id)||String(p.code)===String(order.code)),variation=(product?.variations||[]).find(v=>String(v.id)===String(order.variation_id)||String(v.code)===String(order.code)),profit=Number(variation?.profit??product?.profit??0);return Number.isFinite(profit)?profit*Math.max(1,Number(order.quantity)||1):0;};
    const rows=orders.map(order=>{const receipt=receiptMap.get(String(order.reference));return {...order,fulfillment_status:receipt?.status||order.status||'payment_pending',fulfilled_at:receipt?.fulfilled_at||null,delivered:Array.isArray(receipt?.accounts)?receipt.accounts.length:0,profit:profitFor(order)};});
    box.innerHTML=`<div class="admin-grid recap-dashboard"><section class="admin-panel wide"><div class="panel-title"><div><span class="section-kicker">Analitik penjualan</span><h2>Rekap Produk</h2><p class="muted">Ringkasan transaksi VanzShop yang tercatat di fulfillment store.</p></div><div class="button-row"><button id="arReload" class="btn">↻ Muat ulang</button><button id="arExport" class="btn btn-primary">Export CSV</button></div></div><div class="doc-note"><span>Omzet dihitung dari order Sewa Pay. Profit hanya dihitung jika forward API menyediakan field profit pada produk atau variasi.</span></div><div id="arMetrics" class="recap-metrics"></div></section><section class="admin-panel wide recap-filter-panel"><div class="recap-filters"><label class="form-field"><span>Cari produk / reference</span><input id="arSearch" class="input big" placeholder="ChatGPT, VZ-..."></label><label class="form-field"><span>Status</span><select id="arStatus" class="input big"><option value="">Semua status</option><option value="fulfilled">Fulfilled</option><option value="waiting_stock">Menunggu stok</option><option value="retryable_error">Perlu perhatian</option><option value="payment_pending">Menunggu pembayaran</option></select></label><label class="form-field"><span>Dari</span><input id="arFrom" class="input big" type="date"></label><label class="form-field"><span>Sampai</span><input id="arTo" class="input big" type="date"></label></div></section><section class="admin-panel wide"><div class="table-meta"><span id="arCount">0 transaksi</span><span>Urutan terbaru</span></div><div id="arTable" class="admin-table-wrap inset"></div></section></div>`;
    let visible=rows.slice();
    const draw=()=>{const query=$('#arSearch').value.trim().toLowerCase(),status=$('#arStatus').value,from=$('#arFrom').value?new Date(`${$('#arFrom').value}T00:00:00`).getTime():0,to=$('#arTo').value?new Date(`${$('#arTo').value}T23:59:59`).getTime():Infinity;visible=rows.filter(row=>{const stamp=Date.parse(row.created_at||'')||0;return(!query||`${row.reference} ${row.product_title} ${row.variant_title} ${row.code}`.toLowerCase().includes(query))&&(!status||row.fulfillment_status===status)&&stamp>=from&&stamp<=to;}).sort((a,b)=>(Date.parse(b.created_at||'')||0)-(Date.parse(a.created_at||'')||0));const qty=visible.reduce((sum,row)=>sum+(Number(row.quantity)||0),0),revenue=visible.reduce((sum,row)=>sum+(Number(row.amount)||0),0),profit=visible.reduce((sum,row)=>sum+(Number(row.profit)||0),0),fulfilled=visible.filter(row=>row.fulfillment_status==='fulfilled').length;$('#arMetrics').innerHTML=`<div class="recap-metric"><span>Total transaksi</span><strong>${visible.length}</strong><small>${fulfilled} selesai</small></div><div class="recap-metric"><span>Produk terjual</span><strong>${qty}</strong><small>total quantity</small></div><div class="recap-metric"><span>Total omzet</span><strong>${money(revenue)}</strong><small>nilai order</small></div><div class="recap-metric"><span>Profit tercatat</span><strong>${money(profit)}</strong><small>dari data Xoftware</small></div>`;$('#arCount').textContent=`Ditemukan ${visible.length} transaksi`;$('#arTable').innerHTML=`<table class="admin-table recap-table"><thead><tr><th>Waktu</th><th>Reference</th><th>Produk</th><th>Status</th><th>Harga</th><th>Qty</th><th>Total</th><th>Profit</th><th>Terkirim</th></tr></thead><tbody>${visible.length?visible.map(row=>`<tr><td>${esc(row.created_at?new Date(row.created_at).toLocaleString('id-ID'):'—')}</td><td><code>${esc(row.reference||'—')}</code></td><td><b>${esc(row.product_title||row.code||'—')}</b><small>${esc(row.variant_title||row.code||'')}</small></td><td><span class="status-pill ${row.fulfillment_status==='fulfilled'?'good':row.fulfillment_status==='waiting_stock'?'warn':'bad'}">${esc(row.fulfillment_status)}</span></td><td>${money(row.unit_price)}</td><td>${esc(row.quantity||0)}</td><td><b>${money(row.amount)}</b></td><td class="profit-cell">${row.profit?money(row.profit):'—'}</td><td>${esc(row.delivered||0)}</td></tr>`).join(''):'<tr><td colspan="9">Belum ada transaksi pada filter ini.</td></tr>'}</tbody></table>`;};
    ['arSearch','arStatus','arFrom','arTo'].forEach(id=>$(`#${id}`).addEventListener(id==='arSearch'?'input':'change',draw));
    $('#arReload').onclick=adminProductRecap;$('#arExport').onclick=()=>{const cols=['created_at','reference','product_title','variant_title','code','fulfillment_status','unit_price','quantity','amount','profit','delivered'],quote=value=>`"${String(value??'').replace(/"/g,'""')}"`,csv=[cols.join(','),...visible.map(row=>cols.map(key=>quote(row[key])).join(','))].join('\r\n'),blob=new Blob([`\uFEFF${csv}`],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`rekap-produk-${new Date().toISOString().slice(0,10)}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};draw();
  }catch(e){box.innerHTML=`<div class="status-card bad"><b>Rekap belum dapat dimuat</b><span>${esc(e.message)}</span></div>`;}
}

async function adminOrderTracking(){
  const box=$('#adminContent');box.innerHTML='<div class="loading-card"><div class="loader"></div><span>Memuat pusat tracking pesanan...</span></div>';
  try{
    const response=await adminApi('admin_fulfillment_list',{query:{limit:500}}),ordersData=Array.isArray(response?.orders)?response.orders:[],receipts=Array.isArray(response?.receipts)?response.receipts:[],receiptMap=new Map(receipts.map(row=>[String(row.reference),row])),rows=ordersData.map(order=>({...order,receipt:receiptMap.get(String(order.reference))||null}));
    const fulfilled=rows.filter(row=>row.receipt?.status==='fulfilled').length,attention=rows.filter(row=>['waiting_stock','retryable_error'].includes(row.receipt?.status)).length,pending=rows.filter(row=>!row.receipt||row.receipt.status==='claiming').length;
    box.innerHTML=`<div class="admin-grid order-tracking"><section class="admin-panel wide"><div class="panel-title"><div><span class="section-kicker">ORDER CONTROL CENTER</span><h2>Lacak Pesanan</h2><p class="muted">Cari reference, payment ID, produk, atau kontak pembeli dari seluruh order Redis.</p></div><button id="aotReload" class="btn">↻ Muat ulang</button></div><div class="stat-grid"><div class="stat-card"><span>Total order</span><strong>${rows.length}</strong></div><div class="stat-card"><span>Fulfilled</span><strong>${fulfilled}</strong></div><div class="stat-card"><span>Diproses / pending</span><strong>${pending}</strong></div><div class="stat-card"><span>Perlu perhatian</span><strong>${attention}</strong></div></div></section><section class="admin-panel wide"><div class="admin-toolbar order-search-toolbar"><input id="aotSearch" class="input big" placeholder="Reference, payment ID, produk, WhatsApp, email..."><select id="aotStatus" class="input"><option value="">Semua status</option><option value="fulfilled">Fulfilled</option><option value="claiming">Claiming</option><option value="waiting_stock">Menunggu stok</option><option value="retryable_error">Error</option><option value="payment_pending">Menunggu pembayaran</option></select></div><div id="aotCount" class="table-meta"></div><div id="aotTable" class="admin-table-wrap inset"></div></section><section class="admin-panel wide"><div class="panel-title"><div><h2>Detail & tindakan</h2><p class="muted">Pilih order untuk membaca status live dan melakukan retry aman.</p></div></div><div id="aotDetail" class="order-admin-detail"><span class="muted">Belum ada pesanan dipilih.</span></div></section></div>`;
    let visible=rows.slice();
    const detail=async reference=>{const target=$('#aotDetail');target.innerHTML='<div class="loading-card"><div class="loader"></div><span>Mengecek payment dan fulfillment...</span></div>';try{const data=await adminApi('admin_fulfillment_get',{query:{reference}}),order=data.order||{},receipt=data.receipt||{},buyer=order.buyer||{},payment=data.payment||{},status=receipt.status||data.payment_status||order.status||'unknown';target.innerHTML=`<div class="tracking-detail-grid"><div><small>Reference</small><code>${esc(reference)}</code></div><div><small>Payment ID</small><b>${esc(order.payment_id||'—')}</b></div><div><small>Produk</small><b>${esc(order.product_title||receipt.product_title||'—')}</b><span>${esc(order.variant_title||receipt.variant_title||'')}</span></div><div><small>Pembeli</small><b>${esc(buyer.name||'Guest')}</b><span>${esc(buyer.whatsapp||buyer.email||'Tanpa kontak')}</span></div><div><small>Status payment</small><b>${esc(data.payment_status||payment.status||'—')}</b></div><div><small>Status fulfillment</small><b class="status-pill ${status==='fulfilled'?'good':status==='waiting_stock'?'warn':'bad'}">${esc(status)}</b></div><div><small>Nilai</small><b>${money(payment.total_payment??payment.amount??order.amount)}</b></div><div><small>Item terkirim</small><b>${esc(Array.isArray(receipt.accounts)?receipt.accounts.length:0)} / ${esc(order.quantity||receipt.quantity||0)}</b></div></div>${receipt.last_error?`<div class="status-card bad"><b>Masalah terakhir</b><span>${esc(receipt.last_error)}</span></div>`:''}<div class="button-row">${data.payment_status==='success'&&status!=='fulfilled'?`<button id="aotRetry" class="btn btn-primary">Retry fulfillment aman</button>`:''}<button id="aotCopy" class="btn">Salin reference</button></div>`;$('#aotCopy').onclick=()=>navigator.clipboard.writeText(reference).then(()=>toast('Reference disalin.')).catch(()=>toast('Clipboard gagal.',true));const retry=$('#aotRetry');if(retry)retry.onclick=async()=>{retry.disabled=true;retry.textContent='Memproses...';try{await adminApi('admin_fulfillment_retry',{method:'POST',body:{reference}});toast('Retry selesai.');detail(reference);}catch(e){toast(e.message,true);retry.disabled=false;retry.textContent='Retry fulfillment aman';}};}catch(e){target.innerHTML=`<div class="status-card bad"><b>Tracking gagal</b><span>${esc(e.message)}</span></div>`;}};
    const draw=()=>{const q=$('#aotSearch').value.trim().toLowerCase(),filter=$('#aotStatus').value;visible=rows.filter(row=>{const status=row.receipt?.status||row.status||'payment_pending',buyer=row.buyer||{};return(!q||`${row.reference} ${row.payment_id} ${row.product_title} ${row.variant_title} ${buyer.name||''} ${buyer.whatsapp||''} ${buyer.email||''}`.toLowerCase().includes(q))&&(!filter||status===filter);}).sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')));$('#aotCount').textContent=`${visible.length} pesanan`;$('#aotTable').innerHTML=`<table class="admin-table"><thead><tr><th>Waktu</th><th>Reference</th><th>Produk</th><th>Pembeli</th><th>Status</th><th>Total</th><th></th></tr></thead><tbody>${visible.length?visible.map(row=>{const status=row.receipt?.status||row.status||'payment_pending',buyer=row.buyer||{};return `<tr><td>${esc(row.created_at?new Date(row.created_at).toLocaleString('id-ID'):'—')}</td><td><code>${esc(row.reference)}</code><small>${esc(row.payment_id||'')}</small></td><td><b>${esc(row.product_title||row.code||'—')}</b><small>${esc(row.variant_title||'')}</small></td><td>${esc(buyer.name||'Guest')}<small>${esc(buyer.whatsapp||buyer.email||'')}</small></td><td><span class="status-pill ${status==='fulfilled'?'good':status==='waiting_stock'?'warn':status==='payment_pending'?'':'bad'}">${esc(status)}</span></td><td>${money(row.amount)}</td><td><button class="btn btn-sm aot-open" data-ref="${esc(row.reference)}">Detail</button></td></tr>`;}).join(''):'<tr><td colspan="7">Pesanan tidak ditemukan.</td></tr>'}</tbody></table>`;$$('.aot-open').forEach(button=>button.onclick=()=>detail(button.dataset.ref));};
    $('#aotSearch').oninput=draw;$('#aotStatus').onchange=draw;$('#aotReload').onclick=adminOrderTracking;draw();
  }catch(e){box.innerHTML=`<div class="status-card bad"><b>Tracking pesanan belum dapat dimuat</b><span>${esc(e.message)}</span></div>`;}
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
function managedProductPrice(product){return Number(product?.display_price??product?.storefront_price??productPrice(product))||0;}
function productListThumbnail(product){return productImage(product)||localBrandImage(product);}
async function adminProducts(){
  const box=$('#adminContent');let page=1,totalPages=1;
  box.innerHTML=`<div class="admin-toolbar product-toolbar"><input id="apSearch" class="input big" placeholder="Cari produk / SKU"><select id="apVarFilter" class="input"><option value="">Semua tipe</option><option value="false">Tunggal</option><option value="true">Variasi</option></select><button id="apLoad" class="btn">Refresh</button><button id="apNew" class="btn btn-primary">+ Produk baru</button></div><div id="apForm"></div><div id="apList" class="admin-table-wrap"><div class="loading-card"><div class="loader"></div></div></div>`;

  const openVariationEditor=async(variation=null,productId='')=>{
    let value=variation||{};
    if(variation?.id){const response=await adminApi('pm_variation',{query:{id:variation.id}});value=response?.data??response??variation;}
    const edit=Boolean(value?.id),modal=document.createElement('div');modal.className='admin-modal';
    modal.innerHTML=`<div class="admin-modal-card"><div class="panel-title"><div><span class="section-kicker">${edit?'Edit':'Tambah'} variasi</span><h2>${edit?'Variasi #'+esc(value.id):'Variasi baru'}</h2></div><button type="button" class="modal-close" aria-label="Tutup">×</button></div><div class="form-grid"><label class="form-field"><span>Kode variasi *</span><input id="mvCode" class="input big" maxlength="50" value="${esc(value?.code||'')}"></label><label class="form-field"><span>Nama variasi *</span><input id="mvTitle" class="input big" maxlength="100" value="${esc(value?.title||value?.name||'')}"></label><label class="form-field"><span>Harga jual *</span><input id="mvPrice" class="input big" type="number" min="0" value="${esc(value?.price??'')}"></label><label class="form-field"><span>Profit</span><input id="mvProfit" class="input big" type="number" min="0" value="${esc(value?.profit??'')}"></label><label class="form-field"><span>Form ID</span><input id="mvForm" class="input big" type="number" min="1" value="${esc(value?.form??'')}"></label></div><label class="form-field"><span>Deskripsi</span><textarea id="mvDesc" class="input textarea" maxlength="5000">${esc(value?.desc||value?.description||'')}</textarea></label><label class="form-field"><span>Syarat & ketentuan</span><textarea id="mvSnk" class="input textarea" maxlength="5000">${esc(value?.snk||'')}</textarea></label>${edit?'':`<label class="form-field"><span>Stok awal — satu baris per akun</span><textarea id="mvStocks" class="input textarea" placeholder="email|password"></textarea></label>`}<div class="button-row"><button id="mvSave" class="btn btn-primary">${edit?'Simpan variasi':'Tambah variasi'}</button>${edit?'<button id="mvDelete" class="btn danger">Hapus variasi</button>':''}<button id="mvCancel" class="btn">Batal</button></div><div id="mvOut" class="admin-result"></div></div>`;
    document.body.appendChild(modal);const close=()=>modal.remove();$('.modal-close',modal).onclick=close;$('#mvCancel',modal).onclick=close;modal.onclick=e=>{if(e.target===modal)close();};
    $('#mvSave',modal).onclick=async()=>{try{const body={code:$('#mvCode',modal).value.trim(),title:$('#mvTitle',modal).value.trim(),price:Number($('#mvPrice',modal).value||0),profit:Number($('#mvProfit',modal).value||0),form:Number($('#mvForm',modal).value||0)||undefined,desc:$('#mvDesc',modal).value.trim(),snk:$('#mvSnk',modal).value.trim()};if(edit){body.id=value.id;await adminApi('pm_variation_update',{method:'POST',body});toast('Variasi diperbarui.');}else{body.product_id=productId;body.stocks=$('#mvStocks',modal).value.split(/\r?\n/).map(v=>v.trim()).filter(Boolean);await adminApi('pm_variation_create',{method:'POST',body});toast('Variasi ditambahkan.');}close();if(productId||value?.stock_id){const id=productId||value.stock_id;const full=await adminApi('pm_product',{query:{id}});showProductForm(full?.data??full);}load();}catch(e){diagnosticOutput('mvOut',diagnosticError(e),true);}};
    if(edit)$('#mvDelete',modal).onclick=async()=>{if(!confirm(`Hapus variasi ${value.title||value.name}?`))return;try{await adminApi('pm_variation_delete',{method:'POST',body:{id:value.id}});toast('Variasi dihapus.');close();load();}catch(e){diagnosticOutput('mvOut',diagnosticError(e),true);}};
  };

  const showProductForm=x=>{
    x=x||{};const edit=Boolean(x?.id),tiers=x?.wholesale_tiers?JSON.stringify(x.wholesale_tiers,null,2):'',variations=Array.isArray(x?.storefront_variations)?x.storefront_variations:[];
    const providerImage=normalizeMediaUrl(x?.provider_thumbnail||''),currentImage=productImage(x),fallback=localBrandImage(x);let mediaTouched=false,mediaDelete=false;
    $('#apForm').innerHTML=`<section class="admin-panel wide product-editor"><div class="panel-title"><div><span class="section-kicker">${edit?'Edit produk':'Produk baru'}</span><h2>${edit?esc(x.title):'Buat produk Xoftware'}</h2><p class="muted">Harga storefront selalu disinkronkan dari forward API. Gambar API dipakai otomatis; override manual disimpan di Redis.</p></div>${edit?`<button id="apDelete" class="btn danger">Hapus produk</button>`:''}</div><div class="product-editor-layout"><div class="product-media-editor"><div class="media-preview"><img id="apImagePreview" src="${esc(currentImage||fallback)}" alt="Preview produk"></div><div class="media-copy"><b>Gambar produk</b><span>${x?.media_source==='upload'?'Upload manual aktif':x?.media_source==='url'?'URL manual aktif':providerImage?'Diimpor otomatis dari API':'Fallback brand otomatis'}</span></div><label class="form-field"><span>URL gambar JPG/PNG/WebP</span><input id="apImageUrl" class="input big" placeholder="https://.../produk.jpg" value="${esc(currentImage||'')}"></label><label class="form-field"><span>Atau upload gambar</span><input id="apImageFile" class="input big" type="file" accept="image/jpeg,image/png,image/webp,image/avif"></label><div class="button-row"><button id="apImageAuto" type="button" class="btn btn-sm">Gunakan gambar otomatis</button></div><small>Upload otomatis dikompres ke JPG maksimal 900px. Provider image tetap menjadi prioritas jika override manual dihapus.</small></div><div class="product-fields"><div class="price-source-card"><span>Harga storefront</span><strong>${money(managedProductPrice(x))}</strong><small>${x?.price_source==='forwarded-catalog'?'Sumber: forward /v1/product Xoftware':edit?'Sumber: Product Management':'Diisi setelah produk dibuat'}${edit?` · nilai induk ${money(x?.price)}`:''}</small></div><div class="form-grid"><label class="form-field"><span>Nama produk *</span><input id="apTitle" class="input big" maxlength="100" value="${esc(x?.title||'')}"></label><label class="form-field"><span>SKU ${x?.is_variation?'(harga ada di variasi)':'*'}</span><input id="apCode" class="input big" maxlength="50" value="${esc(x?.code||'')}"></label><label class="form-field"><span>Harga produk ${x?.is_variation?'induk':''}</span><input id="apPrice" class="input big" type="number" min="0" value="${esc(x?.price??'')}" ${x?.is_variation?'disabled':''}></label><label class="form-field"><span>Profit</span><input id="apProfit" class="input big" type="number" min="0" value="${esc(x?.profit??'')}"></label><label class="form-field"><span>Form ID</span><input id="apFormId" class="input big" type="number" min="1" value="${esc(x?.form??'')}"></label><label class="check-field"><input id="apVar" type="checkbox" ${x?.is_variation?'checked':''}><span>Produk memiliki variasi</span></label>${edit?`<label class="check-field"><input id="apShow" type="checkbox" ${x?.is_show===false?'':'checked'}><span>Tampilkan produk</span></label>`:''}</div><label class="form-field"><span>Deskripsi</span><textarea id="apDesc" class="input textarea" maxlength="5000">${esc(x?.desc||x?.description||'')}</textarea></label><label class="form-field"><span>Syarat & ketentuan</span><textarea id="apSnk" class="input textarea" maxlength="5000">${esc(x?.snk||'')}</textarea></label><label class="form-field"><span>Harga grosir JSON <small>(opsional)</small></span><textarea id="apWholesale" class="input textarea" placeholder='[{"min_qty":5,"price":15000,"profit":2000}]'>${esc(tiers)}</textarea></label>${edit?'':`<label class="form-field"><span>Stok awal — satu baris per akun</span><textarea id="apStocks" class="input textarea tall" placeholder="email|password"></textarea></label>`}</div></div>${edit&&x?.is_variation?`<div class="variation-manager"><div class="panel-title"><div><h3>Variasi & harga jual</h3><p class="muted">Harga produk variasi berasal dari baris berikut, bukan harga induk.</p></div><button id="apAddVariation" class="btn btn-primary btn-sm">+ Variasi</button></div><div class="variation-editor-list">${variations.length?variations.map(v=>`<button type="button" class="variation-editor-row" data-variation-id="${esc(v.id)}"><span><b>${esc(v.title||v.name)}</b><small>${esc(v.code||'Tanpa SKU')} · stok ${esc(v.stock_count??v.stock??'—')}</small></span><strong>${money(v.price)}</strong><em>Edit</em></button>`).join(''):'<div class="status-card"><span>Variasi belum diterima dari forward API. Gunakan tombol tambah atau refresh katalog.</span></div>'}</div></div>`:''}<div class="sticky-actions button-row"><button id="apSave" class="btn btn-primary">${edit?'Simpan seluruh perubahan':'Buat produk'}</button><button id="apCancel" class="btn">Tutup editor</button></div><div id="apFormOut" class="admin-result"></div></section>`;
    const preview=$('#apImagePreview'),urlInput=$('#apImageUrl');
    urlInput.oninput=()=>{mediaTouched=true;mediaDelete=false;preview.src=normalizeMediaUrl(urlInput.value)||fallback;};
    $('#apImageFile').onchange=async e=>{try{const file=e.target.files?.[0];if(!file)return;urlInput.value=await optimizeProductImage(file);preview.src=urlInput.value;mediaTouched=true;mediaDelete=false;toast('Gambar dioptimasi dan siap disimpan.');}catch(error){toast(error.message,true);e.target.value='';}};
    $('#apImageAuto').onclick=()=>{urlInput.value=providerImage;preview.src=providerImage||fallback;mediaTouched=true;mediaDelete=true;toast('Mode gambar otomatis dipilih.');};
    $('#apVar').onchange=e=>{$('#apPrice').disabled=e.target.checked;};
    $('#apCancel').onclick=()=>{$('#apForm').innerHTML='';};
    if($('#apAddVariation'))$('#apAddVariation').onclick=()=>openVariationEditor(null,x.id);
    $$('.variation-editor-row',$('#apForm')).forEach(button=>button.onclick=()=>openVariationEditor(variations.find(v=>String(v.id)===button.dataset.variationId),x.id));
    $('#apSave').onclick=async()=>{const save=$('#apSave');save.disabled=true;save.textContent='Menyimpan...';try{let wholesale;const rawWholesale=$('#apWholesale').value.trim();if(rawWholesale){wholesale=JSON.parse(rawWholesale);if(!Array.isArray(wholesale))throw new Error('Harga grosir harus berupa JSON array.');}const body={title:$('#apTitle').value.trim(),code:$('#apCode').value.trim(),price:Number($('#apPrice').value||0),profit:Number($('#apProfit').value||0),desc:$('#apDesc').value.trim(),snk:$('#apSnk').value.trim(),form:Number($('#apFormId').value||0)||undefined,is_variation:$('#apVar').checked,wholesale_tiers:wholesale};if(body.is_variation)delete body.price;let productId=x.id;if(edit){body.id=x.id;body.is_show=$('#apShow').checked;await adminApi('pm_product_update',{method:'POST',body});}else{body.stocks=$('#apStocks').value.split(/\r?\n/).map(v=>v.trim()).filter(Boolean);const created=await adminApi('pm_product_create',{method:'POST',body});productId=created?.created?.data?.product_id||created?.data?.product_id;if(!productId)throw new Error('Produk dibuat tetapi ID produk tidak diterima untuk menyimpan gambar.');}if(mediaTouched&&productId){if(mediaDelete)await adminApi('pm_product_media_delete',{method:'POST',body:{id:productId,code:body.code||x.code}}).catch(error=>{if(error.status!==503)throw error;});if(!mediaDelete&&urlInput.value.trim())await adminApi('pm_product_media_set',{method:'POST',body:{id:productId,code:body.code||x.code,image_url:urlInput.value.trim()}});}toast(edit?'Produk diperbarui.':'Produk berhasil dibuat.');$('#apForm').innerHTML='';await load();}catch(e){diagnosticOutput('apFormOut',diagnosticError(e),true);save.disabled=false;save.textContent=edit?'Simpan seluruh perubahan':'Buat produk';}};
    if(edit)$('#apDelete').onclick=async()=>{if(!confirm(`Hapus ${x.title}, seluruh variasi, dan stoknya dari Xoftware?`))return;try{await adminApi('pm_product_delete',{method:'POST',body:{id:x.id}});await adminApi('pm_product_media_delete',{method:'POST',body:{id:x.id,code:x.code}}).catch(()=>{});toast('Produk dihapus.');$('#apForm').innerHTML='';load();}catch(e){toast(e.message,true);}};
    $('#apForm').scrollIntoView({behavior:'smooth',block:'start'});
  };

  const load=async()=>{try{$('#apList').innerHTML='<div class="loading-card"><div class="loader"></div><span>Menyinkronkan harga forward API...</span></div>';const response=await adminApi('pm_products',{query:{page,limit:20,search:$('#apSearch').value.trim(),is_variation:$('#apVarFilter').value}}),data=response?.data??response,items=Array.isArray(data?.products)?data.products:[],pagination=data?.pagination||{};page=Number(pagination.page||page);totalPages=Math.max(1,Number(pagination.total_pages||1));$('#apList').innerHTML=`<div class="table-meta"><span><b>${esc(pagination.total??items.length)}</b> produk · harga tersinkron forward API</span><span>Halaman ${page} / ${totalPages}</span></div><table class="admin-table product-management-table"><thead><tr><th>Produk</th><th>SKU</th><th>Harga storefront</th><th>Profit</th><th>Stok</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${items.length?items.map(x=>`<tr><td><div class="product-table-name"><img src="${esc(productListThumbnail(x))}" alt=""><span><b>${esc(x.title)}</b><small>#${esc(x.id)} · ${x.is_variation?'Variasi':'Tunggal'} · terjual ${esc(x.sold??0)}</small></span></div></td><td><code>${esc(x.code||'—')}</code></td><td><div class="synced-price"><b>${money(managedProductPrice(x))}</b><small>${x.price_source==='forwarded-catalog'?'Forward API':'Product API'} · induk ${money(x.price)}</small></div></td><td>${money(x.profit)}</td><td>${esc(x.storefront_stock??x.stock_count??'—')}</td><td><span class="status-pill ${x.is_show===false?'bad':'good'}">${x.is_show===false?'Disembunyikan':'Tampil'}</span></td><td><button class="btn btn-sm ap-edit" data-id="${esc(x.id)}">Edit produk</button></td></tr>`).join(''):'<tr><td colspan="7">Produk tidak ditemukan.</td></tr>'}</tbody></table><div class="pagination-row"><button id="apPrev" class="btn btn-sm" ${page<=1?'disabled':''}>← Sebelumnya</button><span>Halaman ${page} dari ${totalPages}</span><button id="apNext" class="btn btn-sm" ${page>=totalPages?'disabled':''}>Berikutnya →</button></div>`;$$('.ap-edit').forEach(button=>button.onclick=async()=>{try{const full=await adminApi('pm_product',{query:{id:button.dataset.id}});showProductForm(full?.data??full);}catch(e){toast(e.message,true);}});$('#apPrev').onclick=()=>{if(page>1){page--;load();}};$('#apNext').onclick=()=>{if(page<totalPages){page++;load();}};}catch(e){$('#apList').innerHTML=`<div class="status-card bad"><b>Produk gagal dimuat</b><span>${esc(e.message)}</span></div>`;}};
  $('#apLoad').onclick=()=>{page=1;load();};$('#apSearch').onkeydown=e=>{if(e.key==='Enter'){page=1;load();}};$('#apVarFilter').onchange=()=>{page=1;load();};$('#apNew').onclick=()=>showProductForm({});load();
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
  const a={...DEFAULT_STORE.appearance,...(state.store.appearance||{})},s=state.store.support||{},r={...DEFAULT_STORE.reseller,...(state.store.reseller||{})},b={...DEFAULT_STORE.branding,...(state.store.branding||{})};
  const siteTheme=SITE_THEMES[a.site_theme]?a.site_theme:(a.theme==='light'?'pearl':'gold');
  const adminTheme=ADMIN_THEMES[a.admin_theme]?a.admin_theme:(a.theme==='light'?'latte':'gold');
  const colorMode=['light','dark'].includes(a.color_mode)?a.color_mode:(a.theme==='light'?'light':'dark');
  const box=$('#adminContent');
  box.innerHTML=`<div class="admin-grid theme-admin-grid">
    <section class="admin-panel wide theme-studio-head"><div><span class="section-kicker">Visual system</span><h2>Theme Studio</h2><p class="muted">Seluruh palet dan background dari VanzShop Mail sudah tersedia untuk toko dan dashboard. Preview disimpan lokal sebelum kamu salin ke ENV.</p></div><span class="build-chip">${BUILD_ID}</span></section>
    <section class="admin-panel wide"><div class="panel-title"><div><h2>Tema storefront</h2><p class="muted">19 tema dengan background orbs, aurora, waves, mesh, bubbles, petals, retro, dan dots.</p></div><span class="theme-count">${Object.keys(SITE_THEMES).length} tema</span></div>${themePicker(SITE_THEMES,siteTheme,'siteTheme')}</section>
    <section class="admin-panel wide"><div class="panel-title"><div><h2>Tema dashboard</h2><p class="muted">Palet dashboard terpisah agar area operasional tetap nyaman dibaca.</p></div><span class="theme-count">${Object.keys(ADMIN_THEMES).length} tema</span></div>${themePicker(ADMIN_THEMES,adminTheme,'adminTheme')}</section>
    <section class="admin-panel wide"><div class="panel-title"><div><h2>Mode siang & malam</h2><p class="muted">Tentukan mode awal pengunjung. Tombol matahari/bulan di header tetap bisa dipakai setiap perangkat.</p></div></div><div class="day-night-settings"><label class="day-night-option"><input type="radio" name="colorMode" value="dark" ${colorMode==='dark'?'checked':''}><span class="mode-orb">☾</span><span><b>Mode malam</b><small>Gelap, fokus, dan kontras tinggi</small></span></label><label class="day-night-option"><input type="radio" name="colorMode" value="light" ${colorMode==='light'?'checked':''}><span class="mode-orb sun">☀</span><span><b>Mode siang</b><small>Terang, hangat, dan mudah dibaca</small></span></label></div></section>
    <section class="admin-panel wide"><div class="panel-title"><div><h2>Branding, layout & media</h2><p class="muted">Atur identitas toko, font, banner, kepadatan kartu, dan kontak.</p></div></div><div class="form-grid">
      <label class="form-field"><span>Nama toko</span><input id="aaName" class="input big" value="${esc(state.store.name)}"></label><label class="form-field"><span>Tagline</span><input id="aaTagline" class="input big" value="${esc(state.store.tagline)}"></label>
      <label class="form-field"><span>Inisial brand</span><input id="aaMark" class="input big" maxlength="2" value="${esc(b.mark||'V')}"></label><label class="form-field"><span>Subtitle brand</span><input id="aaSubtitle" class="input big" value="${esc(b.subtitle||'PRODUK DIGITAL')}"></label>
      <label class="check-field"><input id="aaCustomAccent" type="checkbox" ${a.custom_accent?'checked':''}><span>Gunakan aksen warna custom</span></label><label class="form-field"><span>Accent custom</span><input id="aaAccent" class="input big color-input" type="color" value="${esc(/^#[0-9a-f]{6}$/i.test(a.accent||'')?a.accent:SITE_THEMES[siteTheme].accent)}"></label>
      <label class="form-field"><span>Font body</span><select id="aaBodyFont" class="input big">${['Plus Jakarta Sans','Inter','Outfit','Sora','Space Grotesk'].map(x=>`<option value="${esc(x)}" ${String(b.body_font)===x?'selected':''}>${esc(x)}</option>`).join('')}</select></label><label class="form-field"><span>Font heading</span><select id="aaDisplayFont" class="input big">${['Archivo','Sora','Outfit','Space Grotesk'].map(x=>`<option value="${esc(x)}" ${String(b.display_font)===x?'selected':''}>${esc(x)}</option>`).join('')}</select></label>
      <label class="form-field"><span>Radius (${esc(a.radius)}px)</span><input id="aaRadius" type="range" min="8" max="32" value="${esc(a.radius)}"></label><label class="form-field"><span>Kolom desktop</span><input id="aaColumns" type="number" min="2" max="6" class="input big" value="${esc(a.columns)}"></label>
      <label class="form-field"><span>Density</span><select id="aaDensity" class="input big"><option value="compact" ${a.density==='compact'?'selected':''}>Compact</option><option value="comfortable" ${a.density==='comfortable'?'selected':''}>Comfortable</option></select></label><label class="check-field"><input id="aaHero" type="checkbox" ${a.hero!==false?'checked':''}><span>Tampilkan hero slider</span></label>
      <label class="form-field"><span>Animasi VanzCat</span><select id="aaAssistantMotion" class="input big"><option value="subtle" ${a.assistant_motion==='subtle'?'selected':''}>Tenang · resmi</option><option value="playful" ${a.assistant_motion==='playful'?'selected':''}>Ekspresif</option><option value="off" ${a.assistant_motion==='off'?'selected':''}>Tanpa animasi</option></select><small>Mengatur gerakan tombol dan transisi panel VanzCat.</small></label>
      <label class="form-field wide"><span>Pesan pembuka VanzCat</span><textarea id="aaAssistantWelcome" class="input textarea" maxlength="280" placeholder="Pesan pertama saat VanzCat dibuka">${esc(b.assistant_welcome||DEFAULT_STORE.branding.assistant_welcome)}</textarea><small>Maksimal 280 karakter. Ditampilkan sebagai sapaan pertama untuk pelanggan.</small></label>
      <label class="form-field wide"><span>Kecepatan banner: <b id="aaBannerSpeedLabel">${esc(a.banner_seconds)} detik</b></span><input id="aaBannerSeconds" type="range" min="2" max="20" step="0.5" value="${esc(a.banner_seconds)}"><small>2 detik lebih cepat · 20 detik lebih santai. Autoplay desktop berhenti saat banner disentuh atau diarahkan mouse.</small></label>
      <label class="form-field wide"><span>Hero title</span><input id="aaHeroTitle" class="input big" value="${esc(b.hero_title||'')}"></label><label class="form-field wide"><span>Hero subtitle</span><textarea id="aaHeroSubtitle" class="input textarea">${esc(b.hero_subtitle||'')}</textarea></label>
      <label class="form-field wide"><span>Badge hero (pisahkan koma)</span><input id="aaHeroBadges" class="input big" value="${esc((b.hero_badges||[]).join(', '))}"></label><label class="form-field wide"><span>URL logo / foto brand</span><input id="aaLogoUrl" class="input big" placeholder="https://...png atau data:image/..." value="${esc(b.logo_url||'')}"></label>
      <label class="form-field wide"><span>Banner slide home (satu URL per baris)</span><textarea id="aaSlides" class="input textarea tall" placeholder="https://...jpg">${esc((b.hero_slides||[]).join('\n'))}</textarea></label><label class="form-field wide"><span>Catatan output akun</span><textarea id="aaReceiptNote" class="input textarea">${esc(b.receipt_note||'')}</textarea></label>
      <label class="form-field wide"><span>Footer note</span><input id="aaFooterNote" class="input big" value="${esc(b.footer_note||'')}"></label><label class="form-field"><span>WhatsApp toko / reseller</span><input id="aaWa" class="input big" value="${esc(s.whatsapp||r.whatsapp||'')}"></label><label class="form-field"><span>Link grup reseller</span><input id="aaResellerGroup" class="input big" value="${esc(r.group_url||'')}"></label><label class="form-field"><span>Telegram toko</span><input id="aaTg" class="input big" value="${esc(s.telegram||'')}"></label><label class="form-field"><span>Email toko</span><input id="aaEmail" class="input big" value="${esc(s.email||'')}"></label>
      <label class="form-field wide"><span>Upload logo/foto lokal untuk preview browser ini</span><input id="aaLogoFile" class="input big" type="file" accept="image/*"></label>
    </div><div class="button-row sticky-actions"><button id="aaPreview" class="btn btn-primary">Terapkan preview</button><button id="aaReset" class="btn">Reset preview</button><button id="aaEnv" class="btn">Generate ENV Vercel</button></div><div id="aaEnvBox"></div></section>
    <section class="admin-panel"><h2>Preview vs permanen</h2><p class="muted">Preview hanya tersimpan di browser admin ini. Gunakan Generate ENV lalu pasang hasilnya di Vercel untuk semua pengunjung.</p></section><section class="admin-panel"><h2>Background adaptif</h2><p class="muted">Animasi otomatis dimatikan jika perangkat memakai <code>prefers-reduced-motion</code>, dan disederhanakan di layar kecil.</p></section>
  </div>`;
  const get=()=>{
    const pickedSite=$('input[name="siteTheme"]:checked')?.value||'gold',pickedAdmin=$('input[name="adminTheme"]:checked')?.value||'gold';
    const pickedMode=$('input[name="colorMode"]:checked')?.value||SITE_THEMES[pickedSite]?.mode||'dark';
    const resellerWhatsapp=$('#aaWa').value.trim();
    return {store:{name:$('#aaName').value.trim(),tagline:$('#aaTagline').value.trim(),support:{whatsapp:resellerWhatsapp,telegram:$('#aaTg').value.trim(),email:$('#aaEmail').value.trim()},reseller:{whatsapp:resellerWhatsapp,group_url:$('#aaResellerGroup').value.trim()},branding:{mark:$('#aaMark').value.trim()||'V',subtitle:$('#aaSubtitle').value.trim()||'PRODUK DIGITAL',logo_url:$('#aaLogoUrl').value.trim(),hero_title:$('#aaHeroTitle').value.trim(),hero_subtitle:$('#aaHeroSubtitle').value.trim(),hero_badges:$('#aaHeroBadges').value.split(',').map(v=>v.trim()).filter(Boolean),hero_slides:$('#aaSlides').value.split(/\r?\n/).map(v=>v.trim()).filter(Boolean),assistant_welcome:$('#aaAssistantWelcome').value.trim().slice(0,280),receipt_note:$('#aaReceiptNote').value.trim(),footer_note:$('#aaFooterNote').value.trim(),body_font:$('#aaBodyFont').value,display_font:$('#aaDisplayFont').value}},appearance:{theme:pickedMode,color_mode:pickedMode,site_theme:pickedSite,admin_theme:pickedAdmin,accent:$('#aaAccent').value,custom_accent:$('#aaCustomAccent').checked,radius:Number($('#aaRadius').value),columns:Number($('#aaColumns').value),density:$('#aaDensity').value,hero:$('#aaHero').checked,banner_seconds:Number($('#aaBannerSeconds').value)||4.2,assistant_motion:$('#aaAssistantMotion').value}};
  };
  $$('input[name="siteTheme"],input[name="adminTheme"]').forEach(input=>input.onchange=()=>{$$(`input[name="${input.name}"]`).forEach(x=>x.closest('.theme-choice')?.classList.toggle('is-selected',x.checked));const mode=(input.name==='siteTheme'?SITE_THEMES[input.value]:ADMIN_THEMES[input.value])?.mode;if(mode){const radio=$(`input[name="colorMode"][value="${mode}"]`);if(radio)radio.checked=true;}});
  $('#aaBannerSeconds').oninput=e=>{$('#aaBannerSpeedLabel').textContent=`${Number(e.target.value).toLocaleString('id-ID')} detik`;};
  $('#aaLogoFile').onchange=(e)=>{const file=e.target.files&&e.target.files[0]; if(!file) return; const reader=new FileReader(); reader.onload=()=>{ $('#aaLogoUrl').value=String(reader.result||''); toast('Logo/foto dimasukkan ke preview lokal.'); }; reader.readAsDataURL(file); };
  $('#aaPreview').onclick=()=>{const x=get();localStorage.setItem('vanz_appearance_override',JSON.stringify(x.appearance));localStorage.setItem('vanz_store_override',JSON.stringify(x.store));localStorage.setItem('vanz_color_mode',x.appearance.color_mode);state.store=mergeStore({...state.store,...x.store,appearance:x.appearance,branding:x.store.branding});applyAppearance();toast('Preview branding disimpan di browser ini.');renderAdmin('appearance');};
  $('#aaReset').onclick=()=>{localStorage.removeItem('vanz_appearance_override');localStorage.removeItem('vanz_store_override');localStorage.removeItem('vanz_color_mode');toast('Preview lokal dihapus. Reload katalog untuk nilai deployment.');location.hash='#/';};
  $('#aaEnv').onclick=async()=>{const x=get(),lines=[`STORE_NAME=${x.store.name}`,`STORE_TAGLINE=${x.store.tagline}`,`STORE_BRAND_MARK=${x.store.branding.mark}`,`STORE_BRAND_SUBTITLE=${x.store.branding.subtitle}`,`STORE_LOGO_URL=${x.store.branding.logo_url}`,`STORE_HERO_TITLE=${x.store.branding.hero_title}`,`STORE_HERO_SUBTITLE=${x.store.branding.hero_subtitle}`,`STORE_HERO_BADGES=${x.store.branding.hero_badges.join(',')}`,`STORE_HERO_SLIDES=${x.store.branding.hero_slides.join(',')}`,`STORE_BANNER_SECONDS=${x.appearance.banner_seconds}`,`STORE_VANZCAT_MOTION=${x.appearance.assistant_motion}`,`STORE_VANZCAT_WELCOME=${x.store.branding.assistant_welcome}`,`STORE_RECEIPT_NOTE=${x.store.branding.receipt_note}`,`STORE_FOOTER_NOTE=${x.store.branding.footer_note}`,`STORE_FONT_BODY=${x.store.branding.body_font}`,`STORE_FONT_DISPLAY=${x.store.branding.display_font}`,`STORE_SITE_THEME=${x.appearance.site_theme}`,`STORE_ADMIN_THEME=${x.appearance.admin_theme}`,`STORE_THEME=${x.appearance.theme}`,`STORE_COLOR_MODE=${x.appearance.color_mode}`,`STORE_ACCENT=${x.appearance.custom_accent?x.appearance.accent:''}`,`STORE_RADIUS=${x.appearance.radius}`,`STORE_COLUMNS=${x.appearance.columns}`,`STORE_DENSITY=${x.appearance.density}`,`STORE_HERO=${x.appearance.hero?'true':'false'}`,`STORE_WHATSAPP=${x.store.support.whatsapp}`,`STORE_RESELLER_WHATSAPP=${x.store.reseller.whatsapp}`,`STORE_RESELLER_GROUP=${x.store.reseller.group_url}`,`STORE_TELEGRAM=${x.store.support.telegram}`,`STORE_EMAIL=${x.store.support.email}`],txt=lines.join('\n');$('#aaEnvBox').innerHTML=`<div class="env-box"><pre>${esc(txt)}</pre><button id="copyEnv" class="btn btn-sm">Salin ENV</button></div>`;$('#copyEnv').onclick=async()=>{try{await navigator.clipboard.writeText(txt);toast('ENV branding disalin.');}catch{toast('Clipboard tidak tersedia.',true);}};};
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
    'GEMINI_API_KEY=ISI_DI_VERCEL_JANGAN_DI_GITHUB',
    'GEMINI_MODEL=gemini-3.5-flash-lite',
    'GEMINI_TIMEOUT=20000',
    'GEMINI_MAX_OUTPUT_TOKENS=420',
    'GEMINI_RATE_LIMIT_PER_MINUTE=12',
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
  $('#adminContent').innerHTML=`<div class="admin-grid"><section class="admin-panel wide"><h2>Vercel Environment helper</h2><div class="diag-warning">Jangan commit API key/password asli ke GitHub. Isi secret langsung di Vercel Environment Variables.</div><div class="env-box"><pre>${esc(txt)}</pre><button id="aeCopy" class="btn btn-primary">Salin template ENV</button></div></section><section class="admin-panel"><h2>Wajib</h2><div class="kv"><span>XSOFTWARE_API_KEY</span><b>secret</b></div><div class="kv"><span>ADMIN_PASSWORD</span><b>secret</b></div><div class="kv"><span>GEMINI_API_KEY</span><b>secret VanzCat</b></div></section><section class="admin-panel"><h2>Opsional</h2><p class="muted">STORE_* mengatur tampilan/kontak global. GEMINI_* mengatur model, timeout, output, dan rate limit VanzCat.</p></section></div>`;
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
  if(admin){if(!String(location.pathname||'').startsWith('/admin')){location.replace('/admin');return;}await ensureInit();return renderAdmin(admin[1]||'overview');}
  const m=route.match(/^\/produk\/([^/]+)\/(.+)$/);if(m){await ensureInit();const p=getProduct(m[1],decodeURIComponent(m[2]));if(!p){toast('Produk tidak ditemukan.',true);location.hash='#/';return;}state.product=p;return detailHtml(p);}
  const pay=route.match(/^\/bayar\/(.+)$/);if(pay){await ensureInit();return renderPayment(decodeURIComponent(pay[1]));}
  const orderRoute=route.match(/^\/pesanan(?:\/(.+))?$/);if(orderRoute){await ensureInit();return renderOrders(orderRoute[1]?decodeURIComponent(orderRoute[1]):'');}
  if(route==='/tas'){await ensureInit();return renderCart();}
  if(route==='/profil'){await ensureInit();return renderProfile();}
  if(route==='/produk'){await loadCatalog('products');requestAnimationFrame(()=>setTimeout(()=>document.querySelector('#produk')?.scrollIntoView({behavior:'smooth',block:'start'}),80));return;}
  if(route==='/reseller'){await loadCatalog('reseller');requestAnimationFrame(()=>setTimeout(()=>document.querySelector('#join-reseller')?.scrollIntoView({behavior:'smooth',block:'center'}),80));return;}
  if(route==='/akun'||route==='/isi-saldo'){history.replaceState(null,'',`${location.pathname}#/`);return loadCatalog();}
  await loadCatalog();
}
window.addEventListener('hashchange',renderRoute);window.addEventListener('beforeunload',()=>{if(timer)clearInterval(timer);});renderRoute();
})();
