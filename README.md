# VanzShop.com × Xoftware — v5 Verified Docs

Versi ini dikunci mengikuti dokumentasi yang diberikan: Order API, Product Management, dan Syarat & Ketentuan API Xoftware. Tidak ada login email API yang dibuat-buat karena dokumentasi Order hanya mendefinisikan `sender` sebagai nomor WhatsApp atau ID Telegram.

## Fakta penting dari dokumentasi

- User baru dibuat lewat `POST /v1/register` dengan `sender` + `name`.
- Fitur register **memerlukan aktivasi izin khusus di tingkat penyedia layanan**. Kalau Xoftware membalas `API Registration is disabled for this bot`, kode tidak dapat membypass izin tersebut.
- Registrasi dibatasi **maksimal 3 per menit**; HTTP `429` ditangani dan ditampilkan jelas.
- Checkout QRIS memakai `POST /v1/order/qris` dengan `sender`, `code`, `quantity`.
- Produk dari supplier/provider yang muncul di Order API ditandai `is_reseller=true` dan **tetap didukung melalui Order API**. Storefront tidak lagi menganggap produk ini harus diblokir.
- Endpoint `/v1/reseller-api/*` tetap diperlakukan terpisah sebagai H2H/admin karena order di jalur itu memakai `reseller_saldo`.
- Deposit dibatasi Rp1.000–Rp1.000.000.
- Product Management: stok 100 akun/request, maksimal 30 variasi/produk, 20 produk/page, judul 100 karakter, desc/snk 5.000 karakter, SKU 3–50 huruf/angka/dash.

# VanzShop.com × Xoftware — v4 Hardened

Storefront statis + Vercel Node.js Function untuk Xoftware Order API, Product Management API, dan Reseller API.

## Perubahan v4

### 1. Registrasi user sebelum checkout

Flow storefront sekarang mengikuti dokumentasi Xoftware secara literal:

1. Pembeli menyimpan identitas user di menu **Akun**.
2. `sender` hanya menggunakan jenis yang didokumentasikan Xoftware:
   - nomor WhatsApp, atau
   - Telegram ID.
3. Website mengecek user dengan `POST /v1/balance`.
4. Jika user belum ditemukan, gateway mencoba `POST /v1/register` dengan `sender` + `name`.
5. Jika API Registration dinonaktifkan di bot Xoftware, checkout dihentikan. Kode **tidak** mengganti sender pembeli dengan sender toko secara diam-diam.
6. Setelah user valid/terdaftar, checkout QRIS dikirim ke `POST /v1/order/qris` dengan sender user tersebut.

> Dokumentasi Xoftware menyatakan endpoint register memerlukan aktivasi izin khusus pada tingkat penyedia layanan. Jika muncul `API Registration is disabled for this bot`, izin tersebut harus diaktifkan atau user harus didaftarkan melalui alur resmi Xoftware sebelum checkout.

Email hanya informasi lokal/opsional di storefront. Dokumentasi Order API tidak mendefinisikan email sebagai nilai `sender`.

### 2. Gambar produk

- Reseller API mendokumentasikan field `thumbnail`, jadi thumbnail upstream digunakan jika ada.
- Order API untuk katalog owner tidak mendokumentasikan field image/thumbnail.
- Karena itu owner product memakai asset fallback lokal di `assets/brands/*.svg`.
- Tidak lagi bergantung ke CDN logo eksternal untuk fallback utama.
- Jika upstream benar-benar mengirim URL gambar valid, gambar upstream tetap diprioritaskan.

### 3. Dashboard admin

Buka:

```text
https://domain-kamu/#/admin
```

Login menggunakan `ADMIN_PASSWORD`.

Dashboard menyediakan:

- status konfigurasi API,
- register/check user Xoftware,
- list/create/update/delete produk,
- tambah/list/delete stok,
- cek saldo dan riwayat Reseller API,
- preview theme/style,
- generator environment variables untuk konfigurasi global Vercel.

Project tetap **no database**. Perubahan tampilan dari dashboard disimpan sebagai preview lokal di browser. Untuk menerapkan theme ke semua visitor, gunakan ENV hasil generator dashboard di Vercel lalu redeploy.

## Environment variables

### Wajib

```text
XSOFTWARE_API_KEY=YOUR_REAL_XOFTWARE_API_KEY
ADMIN_PASSWORD=PASSWORD_ADMIN_PANJANG_DAN_UNIK
```

### Opsional

```text
XSOFTWARE_DEFAULT_SENDER=
XSOFTWARE_DEFAULT_NAME=VanzShop.com
XSOFTWARE_TIMEOUT=25000
CATALOG_SOURCE=owner
```

`XSOFTWARE_DEFAULT_SENDER` tidak digunakan sebagai fallback checkout publik. Field ini hanya default untuk beberapa operasi admin.

### Identitas toko

```text
STORE_NAME=VanzShop.com
STORE_TAGLINE=Produk digital pilihan, stok live, checkout otomatis.
STORE_WHATSAPP=
STORE_TELEGRAM=
STORE_EMAIL=
```

Kontak boleh dikosongkan. Jangan isi data palsu.

### Tampilan global

```text
STORE_THEME=dark
STORE_ACCENT=#f3c74f
STORE_RADIUS=20
STORE_COLUMNS=5
STORE_DENSITY=compact
STORE_HERO=true
```

## API Xoftware yang digunakan

Base URL hardcoded server-side:

```text
https://backend-s2.xoftware.id
```

Semua request upstream memakai header:

```text
x-api-key: XSOFTWARE_API_KEY
Content-Type: application/json
```

### Order API

| Fungsi | Endpoint |
|---|---|
| katalog | `/v1/product` |
| register user | `/v1/register` |
| cek user/saldo | `/v1/balance` |
| order saldo | `/v1/order/balance` |
| order QRIS | `/v1/order/qris` |
| status order | `/v1/order/status` |
| deposit | `/v1/deposit` |

### Product Management API

Prefix `/v1/products`. Gateway mencakup forms, CRUD produk, CRUD variasi, dan stok.

Hard limit yang diterapkan:

- produk maksimal 20 per page,
- stok maksimal 100 per request,
- stok >100 otomatis dibatch 100 + 100 + ...,
- SKU 3–50 karakter, huruf/angka/dash,
- variasi dikelola lewat endpoint resmi Xoftware.

### Reseller API

Prefix `/v1/reseller-api/`.

Reseller order hanya admin-only karena dokumentasi menyatakan:

- server harus masuk IP whitelist,
- order langsung memotong `reseller_saldo`,
- akun dikirim realtime pada response.

Karena itu storefront publik **tidak** memakai `/reseller-api/order` sebagai payment customer.

## Flow user storefront

Menu **Akun** menyediakan:

- WhatsApp: format `08xx`, `+62xx`, atau `62xx` dinormalisasi ke `62xx`.
- Telegram: gunakan **Telegram ID** sesuai identitas yang diterima Xoftware, bukan email.
- Nama: wajib untuk proses register jika user belum ada.
- Email: opsional dan hanya disimpan di browser untuk metadata order lokal.

Tidak ada endpoint login email/WhatsApp/Telegram yang didokumentasikan di Order API selain mekanisme `sender`, `/balance`, dan `/register`. Karena itu project tidak mengarang integrasi login lain.

## Test

```bash
node --check api/xo.js
node --check assets/xshop.js
node tests/gateway.test.js
```

Mock test mencakup:

- response API-level `status:false` walaupun HTTP 200,
- user existing,
- auto-register user baru,
- API Registration disabled,
- checkout berhenti sebelum order jika user belum bisa diregister,
- sender checkout harus sender pembeli (tidak fallback sender toko),
- order status via POST,
- admin password,
- Reseller API admin-only,
- batching stok 205 akun menjadi 100 + 100 + 5.
