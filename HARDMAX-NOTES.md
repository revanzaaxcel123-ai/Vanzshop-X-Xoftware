# HARDMAX implementation notes — v8

`README.md` asli dipertahankan sebagai source of truth API.

## Fokus v8

v8 mempertahankan fondasi v6 yang sudah berhasil membaca katalog/stok Xoftware dan mengeraskan jalur admin + diagnostic endpoint.

### Storefront

- Base URL hardcoded: `https://backend-s2.xoftware.id`
- Katalog publik hanya dari endpoint terdokumentasi `GET/POST /v1/product`.
- Gateway mencoba GET terlebih dahulu, lalu fallback POST `{}` bila GET ditolak.
- `is_reseller=true` tetap dianggap produk supplier di Order API yang sama.
- Tidak ada alur storefront aktif ke `/v1/reseller-api/*`.
- Gambar memakai URL upstream bila ada; artwork lokal menjadi fallback karena field image tidak dijamin oleh README `/v1/product`.

### Admin route hardened

Admin sekarang bisa dibuka dari **dua URL**:

```text
https://DOMAIN/admin
https://DOMAIN/#/admin
```

Perubahan teknis:

- `vercel.json` me-rewrite `/admin` dan `/admin/*` ke `index.html`.
- Router frontend membaca hash route terlebih dahulu, lalu pathname `/admin` sebagai fallback.
- Admin tidak lagi menunggu katalog di-load sebelum menampilkan login/dashboard.
- Build marker `HARDMAX-v9` ditampilkan di dashboard dan dikembalikan endpoint `health`/`admin_ping`.
- Asset version dinaikkan ke `v=16` untuk memaksa browser mengambil bundle baru setelah redeploy.

### Diagnostic dashboard

Tab **Diagnostik** tersedia setelah login admin.

Endpoint yang dapat diuji satu-satu:

1. `/v1/product` — safe/read-only, GET lalu fallback POST.
2. `/v1/balance` — cek sender yang sudah terdaftar.
3. `/v1/register` — **mutating**, membuat user nyata dan terkena rate limit registrasi.
4. `/v1/order/qris` — **mutating**, membuat invoice QRIS nyata.
5. `/v1/order/status` — cek transaksi berdasarkan `transaction_id`.

Diagnostic menampilkan:

- method dan path yang benar-benar dikirim,
- body request tanpa API key,
- raw JSON response Xoftware,
- normalized preview untuk katalog.

API key tidak pernah dikirim ke browser.

### Product Management

- Forms: `/v1/products/forms`
- List: `/v1/products/` max 20/page
- Detail/CRUD: `/v1/products/:id`
- Variations: `/v1/products/:id/variations` dan `/v1/products/variations/:id`
- Stok add: `/v1/products/stocks`, gateway batching otomatis max 100 akun/request
- Stok list: `/v1/products/:id/stocks`, max 100/page
- Stok delete: `/v1/products/stocks/:id`

## Environment minimal

```env
XSOFTWARE_API_KEY=API_KEY_ASLI
ADMIN_PASSWORD=PASSWORD_ADMIN_YANG_KUAT
```

Theme/kontak toko tetap opsional melalui `.env.example`.


## v9 Admin Auth Fix
- Login admin sekarang POST password sekali ke `?a=admin_login`.
- Server mengeluarkan signed session token 12 jam.
- Request admin berikutnya memakai `Authorization: Bearer <token>`.
- `ADMIN_PASSWORD` di Vercel ditoleransi jika tanpa sengaja dibungkus tanda kutip.
- Password field ditrim dan Enter bisa submit.
