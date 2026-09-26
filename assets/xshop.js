(() => {
'use strict';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const app = $('#app');

const state = {
  owner: [],
  reseller: [],
  source: 'owner',
  filtered: [],
  product: null,
  invoice: null,
  search: '',
  initialized: false,
};

let pollTimer = null;

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]));

const rupiah = n => new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
}).format(Number(n) || 0);

async function api(action, body = null, query = {}) {
  const u = new URL('/api/xo', location.origin);
  u.searchParams.set('a', action);
  Object.entries(query).forEach(([k, v]) => {
    if (v !== '' && v != null) u.searchParams.set(k, v);
  });

  const options = body === null ? {} : {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };

  const response = await fetch(u, options);
  const raw = await response.text();
  let json = null;
  try { json = raw ? JSON.parse(raw) : {}; }
  catch { throw new Error(`Server mengirim respons tidak valid (HTTP ${response.status}).`); }

  if (!response.ok || json?.ok === false) {
    throw new Error(json?.error || json?.message || `Request gagal (HTTP ${response.status}).`);
  }
  return json?.data ?? json;
}

function invoices() {
  try { return JSON.parse(localStorage.getItem('vanzshop_xo_invoices') || '[]'); }
  catch { return []; }
}

function saveInvoice(inv) {
  const arr = invoices().filter(x => x.transaction_id !== inv.transaction_id);
  arr.unshift(inv);
  localStorage.setItem('vanzshop_xo_invoices', JSON.stringify(arr.slice(0, 50)));
}

function toast(message, bad = false) {
  let holder = $('.toasts');
  if (!holder) {
    holder = document.createElement('div');
    holder.className = 'toasts';
    document.body.appendChild(holder);
  }
  const item = document.createElement('div');
  item.className = `toast${bad ? ' bad' : ''}`;
  item.textContent = message;
  holder.appendChild(item);
  setTimeout(() => item.remove(), 4500);
}

function shell(content, active = 'catalog') {
  app.innerHTML = `
    <div class="shop">
      <header class="topbar">
        <div class="wrap">
          <a class="brand" href="#/"><span class="brand-mark">V</span><span class="brand-name">VanzShop.com</span></a>
          <nav class="nav">
            <a href="#/" ${active === 'catalog' ? 'aria-current="page"' : ''}>Katalog</a>
            <a href="#/pesanan" ${active === 'orders' ? 'aria-current="page"' : ''}>Pesanan</a>
          </nav>
        </div>
      </header>
      ${content}
      <footer class="footer">
        <div class="wrap">
          <b>VanzShop.com</b>
          <p class="footer-note">Live catalog & transaksi terintegrasi langsung dengan Xoftware API.</p>
        </div>
      </footer>
    </div>`;
}

function productName(p) { return p?.title || p?.name || 'Produk'; }
function productCode(p) { return p?.code || ''; }
function productImage(p) { return p?.thumbnail || p?.image || p?.img || ''; }
function productStock(p) {
  if (p?.stock != null) return Number(p.stock);
  const vars = Array.isArray(p?.variations) ? p.variations : [];
  if (!vars.length) return null;
  return vars.reduce((n, v) => n + Number(v?.stock_count ?? v?.stock ?? 0), 0);
}
function productPrice(p) {
  if (p?.price != null && Number(p.price) > 0) return Number(p.price);
  const vars = Array.isArray(p?.variations) ? p.variations : [];
  const vals = vars.map(v => Number(v?.price) || 0).filter(n => n > 0);
  return vals.length ? Math.min(...vals) : 0;
}
function productVariants(p) { return Array.isArray(p?.variations) ? p.variations : []; }
function currentProducts() { return state.source === 'reseller' ? state.reseller : state.owner; }

function productRoute(p) {
  const id = p?.id ?? p?.code;
  return `#/p/${p?.source === 'reseller' ? 'reseller' : 'owner'}/${encodeURIComponent(String(id))}`;
}

function syncTabs() {
  const owner = $('#tabOwner');
  const reseller = $('#tabReseller');
  if (!owner || !reseller) return;
  owner.classList.toggle('btn-primary', state.source === 'owner');
  reseller.classList.toggle('btn-primary', state.source === 'reseller');
}

async function loadCatalog() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }

  shell(`
    <section class="xhero">
      <div class="wrap">
        <div class="xhero-grid">
          <div>
            <div class="eyebrow">LIVE CATALOG · XOFTWARE API</div>
            <h1>Produk langsung <span>dari VanzShop & Xoftware.</span></h1>
            <p>VanzShop membaca katalog secara live dari API. Tidak ada database produk lokal.</p>
            <div class="xstats">
              <div class="xstat"><b id="sOwner">—</b><span>produk toko</span></div>
              <div class="xstat"><b id="sReseller">—</b><span>Star Seller</span></div>
              <div class="xstat"><b>0 DB</b><span>tanpa database lokal</span></div>
            </div>
          </div>
          <div class="xpanel">
            <b>⚡ Server-side API proxy</b>
            <p class="hint" style="margin-top:8px">API key Xoftware hanya berada di environment Vercel. Browser tidak menerima API key.</p>
            <hr class="rule">
            <div id="apiWarn" class="xnotice">Memuat status API…</div>
          </div>
        </div>
      </div>
    </section>

    <section class="xcatalog">
      <div class="wrap">
        <div class="xtoolbar">
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button type="button" class="btn" id="tabOwner">Produk Toko</button>
            <button type="button" class="btn" id="tabReseller">Star Seller</button>
          </div>
          <div style="display:flex;gap:8px;flex:1;min-width:260px">
            <input id="search" class="input" placeholder="Cari nama produk atau SKU…" autocomplete="off">
            <button type="button" class="btn" id="refresh">Refresh</button>
          </div>
        </div>
        <div id="grid" class="xgrid"><div class="xloading"><span class="xspin"></span>Memuat katalog…</div></div>
      </div>
    </section>`,'catalog');

  $('#refresh').onclick = () => loadCatalog();
  $('#search').oninput = e => { state.search = e.target.value.toLowerCase(); renderGrid(); };
  $('#tabOwner').onclick = () => { state.source = 'owner'; state.search = ''; $('#search').value = ''; syncTabs(); renderGrid(); };
  $('#tabReseller').onclick = () => { state.source = 'reseller'; state.search = ''; $('#search').value = ''; syncTabs(); renderGrid(); };

  syncTabs();

  try {
    const d = await api('init');
    state.owner = Array.isArray(d?.owner_products) ? d.owner_products : [];
    state.reseller = Array.isArray(d?.reseller_products) ? d.reseller_products : [];
    state.initialized = true;
    $('#sOwner').textContent = state.owner.length;
    $('#sReseller').textContent = state.reseller.length;
    const warnings = Array.isArray(d?.warnings) ? d.warnings : [];
    $('#apiWarn').innerHTML = warnings.length ? warnings.map(esc).join('<br>') : 'Semua catalog yang diaktifkan berhasil dibaca.';
    renderGrid();
  } catch (e) {
    $('#apiWarn').textContent = e.message;
    $('#grid').innerHTML = `<div class="xempty"><b>Gagal memuat API</b><p style="margin-top:8px">${esc(e.message)}</p><button class="btn btn-primary" id="retry" style="margin-top:14px">Coba lagi</button></div>`;
    $('#retry').onclick = () => loadCatalog();
  }
}

function renderGrid() {
  const q = state.search;
  const all = currentProducts();
  state.filtered = all.filter(p => {
    if (!q) return true;
    const hay = `${productName(p)} ${productCode(p)} ${p?.provider_name || ''}`.toLowerCase();
    return hay.includes(q);
  });

  const grid = $('#grid');
  if (!grid) return;
  if (!state.filtered.length) {
    grid.innerHTML = '<div class="xempty">Produk tidak ditemukan.</div>';
    return;
  }

  grid.innerHTML = state.filtered.map((p, i) => {
    const stock = productStock(p);
    const image = productImage(p);
    const price = productPrice(p);
    return `
      <article class="xcard xcard-clickable" data-open-card="${i}" tabindex="0" role="link" aria-label="Buka ${esc(productName(p))}">
        <div class="xthumb">${image ? `<img src="${esc(image)}" alt="${esc(productName(p))}" loading="lazy" onerror="this.remove()">` : ''}</div>
        <div class="xbody">
          <div class="eyebrow">${esc(p.source === 'reseller' ? 'STAR SELLER' : productCode(p))}</div>
          <h3>${esc(productName(p))}</h3>
          <p class="desc">${esc(p.description || 'Produk digital tersedia otomatis.')}</p>
          ${p.provider_name ? `<p class="hint">Provider: ${esc(p.provider_name)}</p>` : ''}
          <div class="xprice">
            <div>
              <small>Mulai dari</small>
              <strong>${rupiah(price)}</strong>
              ${stock != null ? `<small style="margin-top:3px">Stok ${Number(stock)}</small>` : ''}
            </div>
            <button type="button" class="btn btn-primary btn-sm" data-open="${i}">Detail</button>
          </div>
        </div>
      </article>`;
  }).join('');

  grid.onclick = e => {
    const btn = e.target.closest('[data-open]');
    const card = e.target.closest('[data-open-card]');
    if (!card) return;
    const i = Number((btn || card).dataset.open ?? card.dataset.openCard);
    const p = state.filtered[i];
    if (!p) return;
    location.hash = productRoute(p);
  };

  grid.onkeydown = e => {
    const card = e.target.closest('[data-open-card]');
    if (!card || !['Enter',' '].includes(e.key)) return;
    e.preventDefault();
    const p = state.filtered[Number(card.dataset.openCard)];
    if (p) location.hash = productRoute(p);
  };
}

function findProduct(source, id) {
  const list = source === 'reseller' ? state.reseller : state.owner;
  const needle = String(id);
  return list.find(p => String(p.id) === needle || String(p.code) === needle) || null;
}

function variationMarkup(p) {
  const vars = productVariants(p);
  if (!vars.length) return '';
  return `
    <div class="o-section" style="margin-top:22px">
      <span class="label"><span class="o-step">1</span>Pilih varian</span>
      <div class="xvariant">
        ${vars.map((v,i) => {
          const stock = v?.stock_count ?? v?.stock;
          const disabled = stock != null && Number(stock) <= 0;
          return `<label class="xvariant-row ${disabled ? 'is-disabled' : ''}">
            <span>
              <input type="radio" name="variant" value="${i}" ${i === 0 && !disabled ? 'checked' : ''} ${disabled ? 'disabled' : ''}>
              <b>${esc(v?.title || v?.name || `Variasi ${i+1}`)}</b>
              ${stock != null ? `<small>${disabled ? 'Stok habis' : `Stok ${Number(stock)}`}</small>` : ''}
            </span>
            <b>${rupiah(v?.price)}</b>
          </label>`;
        }).join('')}
      </div>
    </div>`;
}

function openProductDetail(p) {
  state.product = p;
  if (p?.source === 'reseller') return openResellerProduct(p);
  return openOwnerProduct(p);
}

function openOwnerProduct(p) {
  const vars = productVariants(p);
  const image = productImage(p);
  const startingStock = productStock(p);
  const initialVariant = vars.find(v => v?.stock == null || Number(v.stock) > 0) || vars[0] || null;

  shell(`
    <section class="xdetail">
      <div class="wrap">
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <a class="btn btn-ghost" href="#/">← Kembali</a>
          <span class="hint">Katalog / ${esc(productName(p))}</span>
        </div>
        <div class="xdetail-grid" style="margin-top:18px">
          <div>
            <div class="xpanel">
              <div class="xthumb" style="height:260px;border-radius:16px;margin-bottom:22px">${image ? `<img src="${esc(image)}" alt="${esc(productName(p))}" onerror="this.remove()">` : ''}</div>
              <div class="eyebrow">OWNER CATALOG · ${esc(productCode(p))}</div>
              <h1 style="font-family:var(--f-display);font-size:clamp(32px,4vw,50px);margin-top:8px">${esc(productName(p))}</h1>
              <p class="hint" style="margin-top:12px;line-height:1.7">${esc(p.description || 'Belum ada deskripsi produk.')}</p>
              <div class="xstats" style="margin-top:18px">
                <div class="xstat"><b>${rupiah(productPrice(p))}</b><span>mulai dari</span></div>
                <div class="xstat"><b>${startingStock == null ? 'Live' : Number(startingStock)}</b><span>stok</span></div>
                <div class="xstat"><b>${p.sold ?? 0}</b><span>terjual</span></div>
              </div>
            </div>
          </div>
          <div class="xpanel">
            <form id="buy" class="xform">
              ${variationMarkup(p)}
              <div class="o-section">
                <span class="label"><span class="o-step">${vars.length ? '2' : '1'}</span>Data pembeli</span>
                <div class="field"><label>WhatsApp / Telegram ID</label><input class="input" name="sender" required placeholder="62812xxxx / Telegram ID"></div>
                <div class="field" style="margin-top:12px"><label>Nama</label><input class="input" name="name" required placeholder="Nama Anda"></div>
              </div>
              <div class="o-section">
                <span class="label"><span class="o-step">${vars.length ? '3' : '2'}</span>Jumlah</span>
                <div class="stepper">
                  <button type="button" id="minus" aria-label="Kurangi">−</button>
                  <output id="qty" aria-live="polite">1</output>
                  <button type="button" id="plus" aria-label="Tambah">+</button>
                </div>
              </div>
              <div class="o-section">
                <span class="label"><span class="o-step">${vars.length ? '4' : '3'}</span>Metode pembayaran</span>
                <select class="select" name="method">
                  <option value="qris">QRIS — Xoftware</option>
                  <option value="balance">Saldo Xoftware</option>
                </select>
              </div>
              <div class="summary">
                <div class="sum-row"><span id="sum-name">${esc(initialVariant?.title || initialVariant?.name || productName(p))}</span><span id="sum-unit">${rupiah(initialVariant?.price ?? productPrice(p))}</span></div>
                <div class="sum-row"><span>Jumlah</span><span id="sum-qty">× 1</span></div>
                <div class="sum-total"><span>Total</span><strong id="sum-total">${rupiah(initialVariant?.price ?? productPrice(p))}</strong></div>
              </div>
              <div class="xnotice">Owner Order API: register → checkout → status.</div>
              <p id="formError" class="form-error"></p>
              <button class="btn btn-primary btn-lg btn-block" type="submit" id="buyBtn">Lanjutkan Pembelian</button>
            </form>
          </div>
        </div>
      </div>
    </section>`,'catalog');

  const form = $('#buy');
  const qtyEl = $('#qty');
  const minus = $('#minus');
  const plus = $('#plus');
  const sumName = $('#sum-name');
  const sumUnit = $('#sum-unit');
  const sumQty = $('#sum-qty');
  const sumTotal = $('#sum-total');
  const errEl = $('#formError');
  const buyBtn = $('#buyBtn');
  let qty = 1;

  function selectedVariant() {
    const el = $('input[name="variant"]:checked', form);
    return el ? vars[Number(el.value)] : null;
  }
  function maxQty() {
    const v = selectedVariant();
    const stock = v?.stock ?? v?.stock_count ?? p.stock;
    if (stock == null || Number(stock) <= 0) return 10;
    return Math.max(1, Math.min(10, Number(stock)));
  }
  function sync() {
    const v = selectedVariant();
    const unit = Number(v?.price ?? p.price ?? productPrice(p)) || 0;
    qty = Math.max(1, Math.min(qty, maxQty()));
    qtyEl.textContent = qty;
    sumQty.textContent = `× ${qty}`;
    sumName.textContent = v?.title || v?.name || productName(p);
    sumUnit.textContent = rupiah(unit);
    sumTotal.textContent = rupiah(unit * qty);
    minus.disabled = qty <= 1;
    plus.disabled = qty >= maxQty();
    buyBtn.disabled = !!(v && (v.stock ?? v.stock_count) != null && Number(v.stock ?? v.stock_count) <= 0);
  }
  form.addEventListener('change', e => { if (e.target.name === 'variant') sync(); });
  minus.onclick = () => { qty = Math.max(1, qty - 1); sync(); };
  plus.onclick = () => { qty = Math.min(maxQty(), qty + 1); sync(); };
  sync();

  form.onsubmit = async e => {
    e.preventDefault();
    errEl.textContent = '';
    errEl.classList.remove('show');
    const fd = new FormData(form);
    const sender = String(fd.get('sender') || '').trim();
    const name = String(fd.get('name') || '').trim();
    const method = String(fd.get('method') || 'qris');
    const v = selectedVariant();
    const code = v?.code || p.code;
    if (!sender || !name || !code) {
      errEl.textContent = 'Data pembeli dan kode produk wajib diisi.';
      errEl.classList.add('show');
      return;
    }
    buyBtn.disabled = true;
    buyBtn.textContent = 'Memproses…';
    try {
      try { await api('register', { sender, name }); }
      catch (regErr) {
        if (!/already|registered|terdaftar|exist|duplicate|sudah/i.test(regErr.message)) throw regErr;
      }
      const action = method === 'balance' ? 'order_balance' : 'order_qris';
      const payload = await api(action, { sender, code, quantity: qty });
      const d = payload?.data ?? payload;
      const tx = String(d?.transaction_id ?? d?.reff_id ?? d?.id ?? '');
      if (!tx) throw new Error('Xoftware tidak mengembalikan transaction_id.');
      const inv = {
        transaction_id: tx,
        sender,
        name,
        code,
        product_name: productName(p),
        variant_name: v?.title || v?.name || '',
        quantity: qty,
        method,
        total: d?.total_to_pay ?? d?.total_price ?? d?.amount ?? (Number(v?.price ?? p.price ?? productPrice(p)) * qty),
        qr_string: d?.qr_string || '',
        link: d?.link || '',
        status: d?.status || (method === 'balance' ? 'success' : 'pending'),
        accounts: Array.isArray(d?.accounts) ? d.accounts : [],
        created_at: Date.now(),
        source: 'owner',
      };
      saveInvoice(inv);
      state.invoice = inv;
      location.hash = `#/invoice/${encodeURIComponent(tx)}`;
    } catch (error) {
      errEl.textContent = error.message;
      errEl.classList.add('show');
      buyBtn.disabled = false;
      buyBtn.textContent = 'Lanjutkan Pembelian';
    }
  };
}

function openResellerProduct(p) {
  const vars = productVariants(p);
  const image = productImage(p);
  const startingStock = productStock(p);
  const initialVariant = vars.find(v => v?.stock == null || Number(v.stock) > 0) || vars[0] || null;

  shell(`
    <section class="xdetail">
      <div class="wrap">
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <a class="btn btn-ghost" href="#/">← Kembali</a>
          <span class="hint">Star Seller / ${esc(productName(p))}</span>
        </div>
        <div class="xdetail-grid" style="margin-top:18px">
          <div class="xpanel">
            <div class="xthumb" style="height:260px;border-radius:16px;margin-bottom:22px">${image ? `<img src="${esc(image)}" alt="${esc(productName(p))}" onerror="this.remove()">` : ''}</div>
            <div class="eyebrow">STAR SELLER · ${esc(productCode(p))}</div>
            <h1 style="font-family:var(--f-display);font-size:clamp(32px,4vw,50px);margin-top:8px">${esc(productName(p))}</h1>
            <p class="hint" style="margin-top:12px;line-height:1.7">${esc(p.description || 'Belum ada deskripsi produk.')}</p>
            <p class="hint" style="margin-top:8px">Provider: ${esc(p.provider_name || 'Star Seller')}</p>
            <div class="xstats" style="margin-top:18px">
              <div class="xstat"><b>${rupiah(productPrice(p))}</b><span>mulai dari</span></div>
              <div class="xstat"><b>${startingStock == null ? 'Live' : Number(startingStock)}</b><span>stok</span></div>
              <div class="xstat"><b>H2H</b><span>reseller order</span></div>
            </div>
          </div>
          <div class="xpanel">
            <form id="buyRes" class="xform">
              ${variationMarkup(p)}
              <div class="xnotice"><b>Reseller H2H</b><br>Pembelian memotong <code>reseller_saldo</code> bot Xoftware dan akun dikirim realtime dari response order.</div>
              <div class="field" style="margin-top:18px"><label>Jumlah</label><input class="input" name="qty" type="number" min="1" max="10" value="1" required></div>
              <label style="display:flex;gap:8px;align-items:flex-start;margin-top:14px"><input type="checkbox" name="confirm" required> <span>Saya paham transaksi ini memakai saldo reseller.</span></label>
              <p id="resError" class="form-error"></p>
              <button class="btn btn-primary btn-lg btn-block" type="submit" id="resBtn" style="margin-top:18px">Order dari Star Seller</button>
            </form>
            <div id="resResult" style="margin-top:20px"></div>
          </div>
        </div>
      </div>
    </section>`,'catalog');

  const form = $('#buyRes');
  const btn = $('#resBtn');
  const errorEl = $('#resError');
  const result = $('#resResult');

  form.onsubmit = async e => {
    e.preventDefault();
    errorEl.textContent = '';
    errorEl.classList.remove('show');
    const fd = new FormData(form);
    const qty = Math.max(1, Math.min(10, Number(fd.get('qty')) || 1));
    let variation_id = '';
    const checked = $('input[name="variant"]:checked', form);
    if (checked) {
      const v = vars[Number(checked.value)];
      variation_id = v?.id ?? v?.variation_id ?? '';
    }

    btn.disabled = true;
    btn.textContent = 'Order…';
    try {
      const payload = await api('reseller_order', {
        stock_id: Number(p.id),
        variation_id,
        quantity: qty,
      });
      const d = payload?.data ?? payload;
      const reff = String(d?.reff_id || d?.id || '');
      const inv = {
        transaction_id: reff || `RES-${Date.now()}`,
        reff_id: reff,
        product_name: productName(p),
        variant_name: checked ? (vars[Number(checked.value)]?.title || vars[Number(checked.value)]?.name || '') : '',
        quantity: qty,
        method: 'reseller',
        total: d?.total_price ?? d?.price_reseller ?? 0,
        status: d?.status || 'success',
        accounts: Array.isArray(d?.accounts) ? d.accounts : [],
        created_at: Date.now(),
        source: 'reseller',
      };
      saveInvoice(inv);
      result.innerHTML = `
        <div class="xnotice ok"><b>Order berhasil</b><br>Reff: ${esc(reff || '-')}<br>Total: ${rupiah(inv.total)}</div>
        ${inv.accounts.length ? `<div style="margin-top:16px"><h3>Akun diterima</h3>${inv.accounts.map(a => `<div class="xaccount"><pre>${esc(typeof a === 'string' ? a : JSON.stringify(a, null, 2))}</pre></div>`).join('')}</div>` : '<p class="hint" style="margin-top:12px">Data akun tidak ada di response awal. Cek status transaksi dari menu Pesanan.</p>'}`;
      btn.textContent = 'Order Berhasil';
    } catch (error) {
      errorEl.textContent = error.message;
      errorEl.classList.add('show');
      btn.disabled = false;
      btn.textContent = 'Order dari Star Seller';
    }
  };
}

function ordersPage() {
  const list = invoices();
  shell(`
    <section class="xinvoice">
      <div class="wrap">
        <div class="xpanel">
          <div class="eyebrow">LOCAL HISTORY</div>
          <h1 style="font-family:var(--f-display);font-size:38px;margin-top:6px">Pesanan</h1>
          <p class="hint" style="margin-top:8px">Riwayat transaksi disimpan di browser ini. Produk, stok, saldo, dan status tetap bersumber dari Xoftware.</p>
          <div style="margin-top:20px;display:grid;gap:10px">
            ${list.length ? list.map(x => `
              <div class="xaccount" style="display:flex;justify-content:space-between;gap:12px;align-items:center">
                <div>
                  <b>${esc(x.product_name || 'Produk')}</b>
                  <div class="hint">${esc(x.transaction_id)} · ${esc(x.method || 'order')} · ${new Date(x.created_at).toLocaleString('id-ID')}</div>
                </div>
                ${x.method === 'reseller' && x.reff_id ? `<a class="btn btn-sm" href="#/reseller/${encodeURIComponent(x.reff_id)}">Buka</a>` : `<a class="btn btn-sm" href="#/invoice/${encodeURIComponent(x.transaction_id)}">Buka</a>`}
              </div>`).join('') : '<div class="xempty">Belum ada pesanan.</div>'}
          </div>
        </div>
      </div>
    </section>`,'orders');
}

async function invoice(tx) {
  const inv = invoices().find(x => x.transaction_id === tx);
  if (!inv) {
    shell('<section class="xinvoice"><div class="wrap"><div class="xempty"><b>Invoice tidak ditemukan</b><p style="margin-top:8px">Invoice hanya tersimpan pada browser tempat transaksi dibuat.</p><a class="btn btn-primary" href="#/pesanan" style="margin-top:14px">Kembali ke Pesanan</a></div></div></section>','orders');
    return;
  }
  if (inv.source === 'reseller' || inv.method === 'reseller') {
    return renderResellerInvoice(inv);
  }
  renderInvoice(inv);
}

function renderInvoice(inv) {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }

  shell(`
    <section class="xinvoice">
      <div class="wrap">
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px">
          <a class="btn btn-ghost" href="#/">← Katalog</a>
          <a class="btn btn-ghost" href="#/pesanan">Pesanan</a>
        </div>
        <div class="xinvoice-grid">
          <div class="xpanel">
            <div class="eyebrow">TRANSACTION ID</div>
            <h1 style="font-family:var(--f-display);font-size:32px;margin-top:8px">${esc(inv.transaction_id)}</h1>
            <div id="status" style="margin-top:15px"></div>
            <div id="result" style="margin-top:18px"></div>
          </div>
          <div class="xpanel">
            <h3>Pembayaran</h3>
            <p class="hint" style="margin-top:6px">${esc(inv.product_name)}${inv.variant_name ? ` · ${esc(inv.variant_name)}` : ''} · x${inv.quantity}</p>
            ${inv.qr_string ? '<div class="xqr" id="qr"></div>' : ''}
            <div id="payInfo" class="xnotice" style="margin-top:12px"></div>
            ${inv.link ? `<a class="btn btn-primary btn-block" style="margin-top:10px" target="_blank" rel="noopener" href="${esc(inv.link)}">Buka halaman pembayaran</a>` : ''}
            <button class="btn btn-block" id="check" style="margin-top:10px">Cek Status</button>
          </div>
        </div>
      </div>
    </section>`,'orders');

  if (inv.qr_string && $('#qr') && typeof QRCode !== 'undefined') {
    new QRCode($('#qr'), { text: inv.qr_string, width: 260, height: 260 });
  }

  $('#check').onclick = () => checkStatus(inv);
  checkStatus(inv);
  if (['pending','unpaid'].includes(String(inv.status).toLowerCase())) {
    pollTimer = setInterval(() => checkStatus(inv), 8000);
  }
}

async function checkStatus(inv) {
  try {
    const payload = await api('order_status', null, { transaction_id: inv.transaction_id });
    const x = payload?.data ?? payload;
    const s = String(x?.status || 'pending').toLowerCase();
    inv.status = s;
    inv.accounts = Array.isArray(x?.accounts) ? x.accounts : (inv.accounts || []);
    inv.total = x?.total ?? x?.total_price ?? inv.total;
    saveInvoice(inv);

    const success = ['success','paid'].includes(s);
    const bad = ['fail','failed','cancel','cancelled'].includes(s);
    const statusEl = $('#status');
    if (!statusEl) return;
    statusEl.innerHTML = `<div class="xnotice ${success ? 'ok' : bad ? 'bad' : ''}"><b>${success ? 'Pembayaran berhasil' : bad ? 'Pembayaran gagal' : 'Menunggu pembayaran'}</b><br><span>${esc(s.toUpperCase())}</span></div>`;
    const info = $('#payInfo');
    if (info) info.textContent = success ? `Total ${rupiah(inv.total)} · Produk sudah diterima.` : `Total ${rupiah(inv.total)} · status dicek otomatis.`;

    const result = $('#result');
    if (result && inv.accounts?.length) {
      result.innerHTML = `<h3>Produk / akun diterima</h3>${inv.accounts.map(a => `<div class="xaccount"><pre>${esc(typeof a === 'string' ? a : JSON.stringify(a, null, 2))}</pre></div>`).join('')}`;
    }
    if (success || bad) {
      if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    }
  } catch (error) {
    const statusEl = $('#status');
    if (statusEl) statusEl.innerHTML = `<div class="xnotice bad">${esc(error.message)}</div>`;
  }
}

async function renderResellerInvoice(inv) {
  shell(`
    <section class="xinvoice">
      <div class="wrap">
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px">
          <a class="btn btn-ghost" href="#/">← Katalog</a>
          <a class="btn btn-ghost" href="#/pesanan">Pesanan</a>
        </div>
        <div class="xpanel">
          <div class="eyebrow">RESELLER H2H</div>
          <h1 style="font-family:var(--f-display);font-size:32px;margin-top:8px">${esc(inv.product_name)}</h1>
          <div id="resStatus" style="margin-top:15px"></div>
          <div id="resResult" style="margin-top:18px"></div>
        </div>
      </div>
    </section>`,'orders');

  if (inv.reff_id) {
    try {
      const payload = await api('reseller_status', null, { reff_id: inv.reff_id });
      const x = payload?.data ?? payload;
      const status = String(x?.status || inv.status || 'pending').toLowerCase();
      inv.status = status;
      inv.accounts = Array.isArray(x?.accounts) ? x.accounts : inv.accounts;
      inv.total = x?.price_reseller ?? inv.total;
      saveInvoice(inv);
      $('#resStatus').innerHTML = `<div class="xnotice ${status === 'success' ? 'ok' : status === 'fail' ? 'bad' : ''}"><b>${esc(status.toUpperCase())}</b><br>Reff: ${esc(inv.reff_id)}</div>`;
      if (inv.accounts?.length) $('#resResult').innerHTML = `<h3>Akun diterima</h3>${inv.accounts.map(a => `<div class="xaccount"><pre>${esc(typeof a === 'string' ? a : JSON.stringify(a, null, 2))}</pre></div>`).join('')}`;
      else $('#resResult').textContent = `Total: ${rupiah(inv.total)}`;
    } catch (error) {
      $('#resStatus').innerHTML = `<div class="xnotice bad">${esc(error.message)}</div>`;
    }
  }
}

async function router() {
  const hash = location.hash || '#/';
  if (hash === '#/' || hash === '#') return loadCatalog();
  if (hash === '#/pesanan') return ordersPage();
  if (hash.startsWith('#/invoice/')) return invoice(decodeURIComponent(hash.slice('#/invoice/'.length)));
  if (hash.startsWith('#/p/')) {
    const parts = hash.slice(4).split('/');
    const source = parts[0] === 'reseller' ? 'reseller' : 'owner';
    const id = decodeURIComponent(parts.slice(1).join('/'));
    let p = findProduct(source, id);
    if (!p) {
      try {
        if (!state.initialized) {
          const d = await api('init');
          state.owner = Array.isArray(d?.owner_products) ? d.owner_products : [];
          state.reseller = Array.isArray(d?.reseller_products) ? d.reseller_products : [];
          state.initialized = true;
        }
        p = findProduct(source, id);
      } catch (error) {
        shell(`<section class="xinvoice"><div class="wrap"><div class="xempty"><b>Gagal membuka produk</b><p style="margin-top:8px">${esc(error.message)}</p><a class="btn btn-primary" href="#/" style="margin-top:14px">Kembali</a></div></div></section>`,'catalog');
        return;
      }
    }
    if (!p) {
      shell('<section class="xinvoice"><div class="wrap"><div class="xempty"><b>Produk tidak ditemukan.</b><a class="btn btn-primary" href="#/" style="margin-top:14px">Kembali ke katalog</a></div></div></section>','catalog');
      return;
    }
    return openProductDetail(p);
  }
  if (hash.startsWith('#/reseller/')) return invoice(decodeURIComponent(hash.slice('#/reseller/'.length)));
  return loadCatalog();
}

window.addEventListener('hashchange', router);
router();
})();
