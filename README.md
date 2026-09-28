# HARDMAX v19 — Gemini VanzCat

Build: `HARDMAX-v19-GEMINI-VANZCAT`

V19 menghubungkan VanzCat ke Gemini melalui backend serverless. API key tidak pernah masuk ke HTML/JavaScript browser. VanzCat menerima konteks katalog live, dapat memahami pertanyaan lanjutan, memakai status reference yang sudah disanitasi, dan otomatis kembali ke jawaban lokal jika Gemini tidak tersedia.

Tambahkan secret berikut di **Vercel → Project Settings → Environment Variables**, aktifkan untuk Production/Preview/Development sesuai kebutuhan, lalu redeploy:

```text
GEMINI_API_KEY=YOUR_REAL_GEMINI_API_KEY
GEMINI_MODEL=gemini-3.5-flash-lite
GEMINI_TIMEOUT=20000
GEMINI_MAX_OUTPUT_TOKENS=420
GEMINI_RATE_LIMIT_PER_MINUTE=12
```

Dashboard **Admin → VanzCat AI** menampilkan status konfigurasi, model aktif, rate limit, template ENV, guardrail, dan tes respons live. Nilai `GEMINI_API_KEY` sengaja tidak dapat dilihat atau diedit dari browser.

Guardrail VanzCat:

- tidak meminta/menampilkan password, OTP, payment token, atau secret;
- tidak mengarang harga/stok di luar katalog yang diterima dari server;
- reference hanya menghasilkan status aman, bukan kredensial hasil pembelian;
- input, output, timeout, history, dan request per menit dibatasi;
- respons Gemini dirender sebagai teks aman, bukan HTML mentah.

---

# HARDMAX v18 — Commerce, Order Tracking & SEO

Build: `HARDMAX-v18-COMMERCE-SEO`

V18 mematangkan storefront VanzShop menjadi alur jual-beli yang utuh:

- state machine pembayaran yang hanya menampilkan QR ketika status server benar-benar `PENDING`;
- status sukses tidak pernah dipicu timer—QR ditutup setelah Sewa Pay mengonfirmasi pembayaran;
- global reference search lintas perangkat dengan hasil aman tanpa membocorkan akun/password;
- **Admin → Lacak Pesanan** untuk mencari reference, payment ID, produk, atau kontak pembeli;
- tas belanja lokal, profil pembeli opsional, guest checkout, dan navigasi bawah mobile;
- VanzCat untuk pencarian produk, bantuan checkout/garansi, dan pelacakan reference;
- metadata SEO, canonical, Open Graph, JSON-LD, `robots.txt`, `sitemap.xml`, dan manifest;
- blok bawah katalog diganti menjadi ekosistem resmi VanzShop dan tautan bantuan;
- dashboard admin tidak ditampilkan di navigasi publik dan tetap diakses lewat `/admin`.

Detail akun hasil pembelian tetap hanya dapat dibuka dari perangkat yang memiliki signed payment token. Endpoint publik `order_lookup` hanya mengembalikan status transaksi dan metadata yang sudah disanitasi.

## HARDMAX v17 — Reseller Storefront

V17 merombak storefront mengikuti visual Join Reseller: dark/morning theme yang konsisten, headline premium berkilau halus, banner langsung di atas katalog, global search, branding Join Reseller, serta halaman pesanan yang menjelaskan produk dan detail yang diterima. Fitur publik Isi Saldo dan registrasi Akun dihapus; checkout langsung memakai Sewa Pay.

Gambar manual disimpan sebagai metadata katalog di Redis/Upstash yang sama dengan fulfillment. Upload browser dioptimasi menjadi JPG maksimal 900px sebelum dikirim. Jika provider mengirim `thumbnail`, `image`, `cover`, atau `media`, gambar tersebut dipakai otomatis; jika tidak ada, storefront memakai asset brand lokal.

ENV tampilan tambahan:

```text
STORE_COLOR_MODE=dark
STORE_BANNER_SECONDS=4.2
STORE_WHATSAPP=0895415204928
STORE_RESELLER_WHATSAPP=0895415204928
STORE_RESELLER_GROUP=https://chat.whatsapp.com/DQ2PsowpGt5FxhQDAS2sAz
```

`STORE_BANNER_SECONDS` menerima nilai 2–20 detik. Perubahan ENV hanya aktif setelah deployment baru.

## Reservation + Anti Double Delivery

V15 menambah soft-reservation stock record **sebelum payment dibuat**, ownership per `stock_record_id`, lock Redis yang lebih kuat, release hold otomatis untuk payment cancel/failed, dan Fulfillment Ledger di admin. Detail teknis ada di `HARDMAX-V15-ANTI-DOUBLE.md`.

## Theme Studio

Storefront dan dashboard memakai visual system VanzShop Mail: glass panels, gradient accent, serta background `orbs`, `aurora`, `waves`, `mesh`, `bubbles`, `petals`, `retro`, dan `dots`. Tersedia 19 tema storefront dan 14 tema dashboard di **Admin → Store Tools → Theme**.

Preview tema disimpan di browser. Untuk menjadikannya permanen, gunakan tombol **Generate ENV Vercel** atau isi:

```text
STORE_SITE_THEME=gold
STORE_ADMIN_THEME=gold
STORE_ACCENT=
```

`STORE_ACCENT` boleh dikosongkan agar aksen mengikuti preset. Nilai tema yang didukung juga ditampilkan sebagai kartu preview di Theme Studio.

ENV tambahan:

```text
FULFILLMENT_KEY_PREFIX=vanzshop:v13
FULFILLMENT_HOLD_TTL_SECONDS=1800
FULFILLMENT_LOCK_TTL_SECONDS=120
FULFILLMENT_STOCK_CLAIM_TTL_DAYS=365
FULFILLMENT_EXCLUSIVE_STOCK=true
```

---

# HARDMAX v13 — Sewa Pay + Auto Claim Stok Xoftware

## Arsitektur aktif

Storefront v13 memisahkan provider tetapi menyambungkan fulfillment secara otomatis:

- **Xoftware `/v1/product`** = katalog, variasi, harga, stok agregat.
- **Sewa Pay** = pembayaran QRIS/Binance.
- **Xoftware Product Management `/v1/products/:id/stocks`** = sumber akun stok aktif setelah pembayaran sukses.
- **Redis/Upstash REST** = idempotency + order state agar satu payment hanya boleh claim stok satu kali.

Flow produksi:

```text
Customer pilih produk
→ server refresh katalog Xoftware
→ server validasi product/variation, stok, harga
→ server create payment Sewa Pay
→ order metadata disimpan ke Redis
→ customer bayar
→ Sewa Pay COMPLETED (polling atau webhook)
→ lock payment + lock stok di Redis
→ GET /v1/products/:id/stocks
→ pilih record stok aktif
→ DELETE /v1/products/stocks/:id
→ simpan receipt fulfillment + account value di Redis
→ account tampil di website
```

## Kenapa Redis wajib

Payment status dan webhook dapat dipanggil berkali-kali. Tanpa idempotency, payment yang sama bisa mengambil beberapa akun. v13 memakai lock dan receipt persisten:

```text
reference → payment/order metadata → claimed stock IDs → delivered account values
```

Jika request yang sama diulang, receipt lama dikembalikan dan **tidak menghapus stok kedua**.

Untuk recovery crash, kandidat stok disimpan ke Redis sebelum request DELETE ke Xoftware. Claim per produk/variasi juga memakai lock terpisah agar dua payment dari aplikasi ini tidak memilih record stok yang sama pada saat bersamaan.

## ENV Vercel wajib

```text
XSOFTWARE_API_KEY=...
SEWAPAY_API_KEY=pg_...
SEWAPAY_SECRET_KEY=sk_...
ADMIN_PASSWORD=...

UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

Alternatif nama env Redis yang juga didukung:

```text
KV_REST_API_URL=...
KV_REST_API_TOKEN=...
```

Opsional:

```text
PAYMENT_TOKEN_SECRET=...
FULFILLMENT_KEY_PREFIX=vanzshop:v13
FULFILLMENT_TTL_DAYS=30
XSOFTWARE_TIMEOUT=25000
SEWAPAY_TIMEOUT=25000
SEWAPAY_WEBHOOK_MAX_SKEW=900
```

Storefront v13 **menolak create payment baru jika Redis fulfillment store belum siap**. Ini sengaja supaya uang customer tidak diterima ketika sistem belum mampu melakukan auto-claim dengan aman.

## Endpoint fulfillment internal

- `payment_create` — membuat Sewa Pay payment + menyimpan order record Redis.
- `payment_status` — cek Sewa Pay; jika COMPLETED otomatis menjalankan claim Xoftware.
- `fulfillment_status` — membaca receipt fulfillment memakai signed payment token.
- `fulfillment_retry` — retry aman untuk payment COMPLETED yang gagal claim sementara.
- `/api/sewapay-webhook` — webhook tervalidasi HMAC; `payment.completed` menjalankan engine fulfillment yang sama.

## Endpoint Xoftware stok yang dipakai

Sesuai README Product Management:

```text
GET    /v1/products/:id/stocks
DELETE /v1/products/stocks/:id
```

Untuk produk variasi, `variation_id` diteruskan saat mengambil stok aktif.

## Output ke pembeli

Setelah receipt `fulfilled`, website menampilkan `value` stok dari Xoftware. Bentuknya mengikuti data yang memang disimpan di Xoftware, misalnya object:

```json
{
  "Email": "user@example.com",
  "Password": "secret"
}
```

atau string/link. Tombol **Salin semua** tersedia di halaman sukses.

## Migrasi payment v12 yang sudah terbayar

Jika browser masih memiliki `payment_token` v12, `payment_status` v13 dapat membuat order record dari signed token tersebut lalu mencoba fulfillment. Artinya payment lama yang sudah `COMPLETED` masih dapat dicoba claim setelah Redis dipasang, selama stok Xoftware yang sesuai masih tersedia.

## Security

- Nominal tidak dipercaya dari browser; dihitung server dari katalog Xoftware.
- Payment token ditandatangani server.
- Sewa Pay webhook diverifikasi HMAC + timestamp.
- Account value hanya dikembalikan ke browser yang memiliki signed payment token.
- API key Xoftware, secret Sewa Pay, dan Redis token tetap server-side.
- Payment/reference yang sama tidak boleh claim dua stok.

Build: `HARDMAX-v13-AUTOCLAIM`

---

# HARDMAX v11 — Checkout Identity Fix


## Fakta API yang diverifikasi

Order API Xoftware yang menjadi acuan project **tidak mendokumentasikan OTP** untuk registrasi API. Endpoint registrasi adalah `POST /v1/register` dengan body `sender` + `name`, dan dokumentasi menyatakan fitur tersebut memerlukan aktivasi izin khusus pada tingkat penyedia layanan. Karena itu project tidak membuat endpoint OTP fiktif.

## Dua mode checkout

### `XSOFTWARE_CHECKOUT_MODE=user`
Mode sesuai model user Xoftware: buyer dicek melalui `/v1/balance`; user baru dicoba dibuat melalui `/v1/register`; lalu `/v1/order/qris` memakai sender buyer. Jika provider mematikan API Registration, user baru memang tidak dapat dibuat oleh code toko.

### `XSOFTWARE_CHECKOUT_MODE=shared`
Mode kompatibilitas untuk storefront: buyer tetap memasukkan nama + WhatsApp/Telegram sebagai data kontak lokal, tetapi request `/v1/order/qris` memakai satu `XSOFTWARE_SHARED_SENDER` yang **sudah terdaftar** di Xoftware. Dengan mode ini checkout buyer tidak memanggil `/v1/register`.

Contoh Vercel ENV:

```text
XSOFTWARE_CHECKOUT_MODE=shared
XSOFTWARE_SHARED_CHANNEL=whatsapp
XSOFTWARE_SHARED_SENDER=628xxxxxxxxxx
XSOFTWARE_SHARED_NAME=VanzShop Checkout
```

> Shared mode tetap membutuhkan minimal satu sender existing. Jika tidak ada satu pun sender yang sudah terdaftar dan `/v1/register` dinonaktifkan oleh Xoftware, Order API tidak menyediakan jalur terdokumentasi untuk membuat buyer baru dari project ini.

Setelah QRIS sukses, website tetap mengambil `accounts[]` dari `/v1/order/status` dan menampilkannya di halaman sukses. Pengiriman otomatis ke WhatsApp membutuhkan API WhatsApp terpisah; Order API README tidak mendokumentasikan endpoint kirim pesan WhatsApp.

---

# VanzShop X Xoftware — HARDMAX v10

## Control Center v10

Dashboard admin diperluas menjadi control center berbasis **endpoint yang terdokumentasi di README ini**. Tidak ada endpoint provider tambahan yang dikarang.

Menu admin v10:

- System: Overview, API Health, Endpoint Lab, API Map, Limits.
- Order API: Catalog, Supplier flag, User Tools, Balance, Register, QRIS, Order Saldo, Deposit, Status, Browser Orders, Webhook.
- Product Management: Products full CRUD, Product Detail, Variations CRUD, Stock add/list/delete, Forms.
- Store Tools: Pricing calculator, Theme/Profile, Environment helper, Security, Logs.

Endpoint Lab mempunyai 11 panel test. Aksi mutating (register, QRIS, order saldo, deposit, delete) diberi confirmation.

Admin memakai signed session token setelah login; API key dan ADMIN_PASSWORD tidak diekspos ke browser.

Build marker: `HARDMAX-v10`.

---
## Admin route fix

`/admin` sekarang dilayani oleh file fisik `admin.html` dengan `cleanUrls: true`, bukan bergantung pada rewrite SPA. Fallback `/#/admin` tetap didukung.

Xoftware Official Documentation
Selamat datang di pusat dokumentasi teknis Xoftware. Di sini tersedia panduan lengkap integrasi API, referensi endpoint teknis, dan petunjuk penggunaan sistem.

Fitur & Layanan API
🚀 API Order: Panduan integrasi pembelian produk, registrasi user, order saldo, dan pembayaran QRIS.
📦 API Produk: Panduan integrasi manajemen katalog produk toko, variasi, dan pengelolaan persediaan stok akun.
🔄 API Reseller: Integrasi transaksi produk otomatis langsung ke Star Seller.
⚖️ Ketentuan Layanan: Syarat, ketentuan penggunaan layanan, dan kebijakan teknis.
Informasi Server & Autentikasi
Base URL
Request API diarahkan ke base URL berikut:

https://backend-s2.xoftware.id
text
Autentikasi API Key
Setiap request wajib menyertakan API Key pada Header HTTP:

x-api-key: YOUR_API_KEY
Content-Type: application/json
bash
API Key dapat diperoleh melalui dashboard bot pada menu Pengaturan -> Manajemen API.

Gunakan menu navigasi di sebelah kiri untuk melihat referensi endpoint spesifik beserta parameter request dan contoh response.

Dokumentasi API - Xoftware Order
Versi: 1.1.0
Status: Produksi
Penyusun: Xoftware Developer Team

Selamat datang di Dokumentasi API Xoftware Order. API ini memungkinkan integrasi sistem pihak ketiga untuk melakukan manajemen produk, registrasi pengguna, pengecekan saldo, deposit, serta transaksi produk digital melalui platform kami.

1. Informasi Dasar
Base Path
Semua akses endpoint API Order menggunakan prefix path: /v1/

Autentikasi
API ini menggunakan metode autentikasi X-API-Key. API Key harus disertakan pada setiap request di bagian Header.

Header	Wajib	Deskripsi
X-API-Key	
Wajib
API Key yang diperoleh dari dashboard owner Anda.
Content-Type	
Wajib
application/json
2. Endpoint Khusus
2.1 Cek Daftar Produk
Mengambil daftar stok dan variasi produk yang tersedia.

URL Path: product
Method: GET / POST
Response Body (Data)
Field	Tipe	Deskripsi
id	number	ID unik produk.
title	string	Nama atau judul produk.
code	string	Kode unik produk (SKU).
is_reseller	boolean	true jika produk dari supplier/provider.
price	number	Harga akhir produk (setelah diskon).
original_price	number	Harga asli produk sebelum diskon.
discount	number	Nominal potongan harga.
point	number	Poin yang didapatkan (jika ada).
sold	number	Jumlah produk yang telah terjual.
stock	number	Jumlah stok yang tersedia saat ini.
description	string	Deskripsi lengkap produk.
is_variation	boolean	true jika produk memiliki variasi.
variations	array	Daftar objek variasi produk.
Contoh Response
{
  "status": true,
  "data": [
    {
      "id": 1,
      "title": "Produk Contoh",
      "code": "PRD01",
      "price": 9000,
      "original_price": 10000,
      "discount": 1000,
      "is_reseller": false,
      "stock": 50,
      "description": "Deskripsi produk...",
      "is_variation": false,
      "variations": []
    }
  ]
}
json
2.2 Registrasi Pengguna Baru
Mendaftarkan identitas pengguna baru ke dalam database. Fitur ini memerlukan aktivasi izin khusus pada tingkat penyedia layanan.

URL Path: register
Method: POST
Request Body
Field	Tipe	Wajib	Deskripsi
sender	string	
Wajib
Nomor WhatsApp atau ID Telegram pengguna.
name	string	
Wajib
Nama tampilan pengguna.
Response Body (Data)
Field	Tipe	Deskripsi
id	number	ID unik pengguna di sistem.
name	string	Nama pengguna yang terdaftar.
sender	string	Nomor atau ID identitas pengguna.
saldo	number	Saldo awal pengguna (default 0).
Contoh Response
{
  "status": true,
  "message": "User registered successfully",
  "data": {
    "id": 123,
    "name": "Iqbal",
    "sender": "628xxx",
    "saldo": 0
  }
}
json
2.3 Cek Saldo & Informasi Pengguna
Mendapatkan informasi saldo terkini dan level pengguna.

URL Path: balance
Method: GET / POST
Request (Query/Body)
Field	Tipe	Wajib	Deskripsi
sender	string	
Wajib
Nomor WhatsApp atau ID Telegram pengguna.
Response Body (Data)
Field	Tipe	Deskripsi
id	number	ID unik pengguna.
name	string	Nama profil pengguna.
sender	string	Identitas pengirim (ID/Nomor).
lid	string	ID Level pengguna (misal: "L-12345").
saldo	number	Saldo tersedia saat ini.
saldoused	number	Total saldo yang telah digunakan.
buytotal	number	Total jumlah item yang pernah dibeli.
point	number	Jumlah poin yang dimiliki.
level	string	Nama level keanggotaan (misal: "GOLD", "BASIC").
Contoh Response
{
  "status": true,
  "data": {
    "id": 123,
    "name": "Iqbal",
    "sender": "628xxx",
    "lid": "L-12345",
    "saldo": 50000,
    "saldoused": 100000,
    "buytotal": 10,
    "point": 100,
    "level": "GOLD"
  }
}
json
3. Transaksi & Pembayaran
3.1 Pembelian via Saldo (Balance)
Melakukan pembelian produk secara instan menggunakan saldo akun pengguna.

URL Path: order/balance
Method: POST
Request Body
Field	Tipe	Wajib	Deskripsi
sender	string	
Wajib
Nomor WhatsApp atau ID Telegram pembeli.
code	string	
Wajib
Kode produk (SKU).
quantity	number	
Wajib
Jumlah yang ingin dibeli.
Response Body (Data)
Field	Tipe	Deskripsi
transaction_id	number	ID unik transaksi di sistem (Recap ID).
total_price	number	Total biaya yang dipotong dari saldo.
status	string	Status transaksi (biasanya "success").
accounts	array	Daftar data akun/item yang dibeli.
Contoh Response
{
  "status": true,
  "message": "Order Successful",
  "data": {
    "transaction_id": 9991,
    "total_price": 20000,
    "status": "success",
    "accounts": [
      { "email": "user1@demo.com", "pass": "pw123" },
      { "email": "user2@demo.com", "pass": "pw123" }
    ]
  }
}
json
3.2 Pembelian via QRIS (Bayar Langsung)
Membuat invoice pembayaran QRIS untuk pembelian produk tertentu.

URL Path: order/qris
Method: POST
Request Body
Sama dengan pembelian via saldo (Section 3.1).

Response Body (Data)
Field	Tipe	Deskripsi
transaction_id	string	Kode referensi pembayaran (Reff ID).
amount	number	Nominal dasar pembelian.
total_to_pay	number	Nominal akhir yang harus dibayar (termasuk fee).
qr_string	string	Raw string QRIS untuk generate QR code.
link	string	URL halaman pembayaran (Xoftware Checkout).
expired_at	number	Timestamp kedaluwarsa invoice.
status	string	Status awal invoice ("pending").
Contoh Response
{
  "status": true,
  "data": {
    "transaction_id": "API-12345678",
    "amount": 10000,
    "total_to_pay": 10700,
    "qr_string": "00020101021126...",
    "link": "https://pay.xoftware.id/...",
    "expired_at": 1713251234,
    "status": "pending"
  }
}
json
3.3 Request Deposit (Top-up Saldo)
Membuat permintaan pengisian saldo akun pengguna.

URL Path: deposit
Method: POST
Request Body
Field	Tipe	Wajib	Rentang	Deskripsi
sender	string	
Wajib
-	Identitas pengguna yang melakukan top-up.
amount	number	
Wajib
1.000 - 1.000.000	Nominal saldo yang diinginkan.
Response Body (Data)
Struktur respon sama dengan Pembelian via QRIS (Section 3.2).

3.4 Cek Status Transaksi
Memeriksa status pembayaran atau status pesanan yang telah diproses.

URL Path: order/status
Method: GET / POST
Request (Query/Body)
Field	Tipe	Wajib	Deskripsi
transaction_id	string	
Wajib
ID unik transaksi (Reff ID QRIS atau ID Recap Balance).
Response Body (Data - Type: QRIS/Payment)
Field	Tipe	Deskripsi
transaction_id	string	Kode referensi pembayaran.
status	string	Status saat ini (pending, success, fail).
amount	number	Nominal dasar transaksi.
total	number	Total yang dibayarkan.
product	object	Detail produk yang dibeli.
accounts	array	Data akun yang dikirimkan (jika status success).
Response Body (Data - Type: Balance/Recap)
Field	Tipe	Deskripsi
transaction_id	number	ID unik recap produk.
status	string	Status transaksi (selalu "success").
title	string	Nama produk yang dibeli.
price	number	Harga per unit produk.
quantity	number	Jumlah item yang dibeli.
total_price	number	Total harga transaksi.
accounts	array	Daftar data akun yang dibeli.
4. Webhook (Callback)
Sistem kami akan mengirimkan data secara sinkron ke URL Webhook yang Anda daftarkan setiap kali terjadi perubahan status transaksi.

Payload Data
Field	Tipe	Deskripsi
event	string	Jenis kejadian (misal: buy_account, buy_balance).
transaction_id	string	ID unik transaksi sistem.
reff_id	string	Referensi transaksi eksternal.
sender	string	Identitas pengguna terkait.
product_code	string	Kode produk yang dibeli.
quantity	number	Jumlah item pembelian.
total_price	number	Total nilai transaksi.
platform	string	Sumber transaksi (selalu "API" untuk endpoint ini).
accounts	array	Data item/akun yang dikirimkan (jika ada).
Payload Contoh (Pembelian Sukses):
{
  "event": "buy_account",
  "transaction_id": "API-ABCDE12345",
  "sender": "6282354545xxx",
  "product_code": "NETFLIX_1M",
  "quantity": 1,
  "total_price": 35000,
  "platform": "API",
  "accounts": [
    { "email": "user@example.com", "pass": "secret123" }
  ]
}
json
5. Ketentuan Penggunaan
Detail mengenai aturan penggunaan, limitasi API, dan kebijakan layanan dapat diakses melalui halaman berikut: Ketentuan Layanan

Dokumentasi API - Manajemen Produk
Versi: 1.0.0
Status: Produksi
Penyusun: Xoftware Developer Team

API Manajemen Produk digunakan oleh pemilik bot (store owner) untuk mengelola katalog produk digital, variasi, dan persediaan stok akun secara otomatis melalui integrasi Host-to-Host (H2H).

1. Informasi Dasar
Base Path
Semua endpoint manajemen produk menggunakan prefix: /v1/products

Autentikasi & Header
API ini menggunakan autentikasi header x-api-key yang diperoleh dari menu Pengaturan -> Manajemen API di dashboard bot Anda.

Header	Wajib	Tipe	Keterangan
x-api-key	
Wajib
string	Kunci API resmi bot Anda
Content-Type	Ya (untuk POST/PUT)	string	application/json
[!NOTE] Keamanan IP Whitelist: Jika Anda mengaktifkan daftar IP Whitelist pada pengaturan bot, pastikan IP server pemanggil telah didaftarkan.

2. Batasan Teknis & Regulasi Input
Untuk menjaga stabilitas performa sistem, aturan berikut berlaku dan mohon menjadi perhatian:

Limitasi Stok per Request: Endpoint penambahan stok akun (POST /v1/products/stocks) dibatasi maksimal 100 akun per request. Jika memiliki stok lebih dari 100, lakukan pengiriman bertahap (batching).
Limitasi Variasi Produk: Satu produk induk dibatasi maksimal memiliki 30 item variasi.
Limitasi Pagination Produk: Pengambilan daftar produk (GET /v1/products) dibatasi maksimal 20 produk per halaman (default: 20).
Standar Kode (SKU): Kode produk maupun variasi (code) wajib berupa kombinasi huruf, angka, atau dash (-) dengan panjang 3 hingga 50 karakter.
Format Stok Akun: Menggunakan format JSON array string ["nilai1|nilai2"] yang dipisahkan oleh tanda pipe (|) sesuai urutan field pada template form produk.
3. Template Form Stok (Forms Reference)
Sebelum membuat produk atau menambahkan stok akun, Anda dapat mengecek format isian form stok yang tersedia di sistem.

3.1 Mengambil Daftar Template Form
Path: /v1/products/forms
Method: GET
Contoh Response
{
  "code": 200,
  "message": "OK",
  "data": [
    {
      "id": 1,
      "name": "default",
      "fields": ["Akun"],
      "required_fields": ["Akun"]
    },
    {
      "id": 2,
      "name": "Email | Password",
      "fields": ["Email", "Password"],
      "required_fields": ["Email", "Password"]
    },
    {
      "id": 3,
      "name": "Email | Password | 2FA Key",
      "fields": ["Email", "Password", "2FA Key"],
      "required_fields": ["Email", "Password"]
    }
  ]
}
json
4. Manajemen Produk Utama
4.1 Mengambil Daftar Produk
Mengambil daftar produk digital milik bot dengan pagination dan filter pencarian.

Path: /v1/products/
Method: GET
Query Parameters:
page (opsional, default: 1): Nomor halaman.
limit (opsional, default: 20, maks: 20): Jumlah data per halaman (maksimal 20 data).
search (opsional): Kata kunci judul atau kode produk.
is_variation (opsional): Filter true untuk produk variasi atau false untuk produk tunggal.
Contoh Response
{
  "code": 200,
  "message": "OK",
  "data": {
    "products": [
      {
        "id": 105,
        "code": "NETFLIX-1B",
        "title": "Netflix Premium 1 Bulan",
        "price": 35000,
        "profit": 5000,
        "desc": "Akun private resmi 4K UHD",
        "snk": "Garansi 30 hari replace",
        "form": 2,
        "is_variation": false,
        "is_show": true,
        "bulk_count": 0,
        "wholesale_tiers": null,
        "sold": 42,
        "stock_count": 15,
        "createdAt": "2026-09-18T10:00:00.000Z",
        "updatedAt": "2026-09-20T08:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "total_pages": 1
    }
  }
}
json
4.2 Mengambil Detail Produk
Path: /v1/products/:id
Method: GET
Contoh Response
{
  "code": 200,
  "message": "OK",
  "data": {
    "id": 105,
    "code": "NETFLIX-1B",
    "title": "Netflix Premium 1 Bulan",
    "price": 35000,
    "profit": 5000,
    "desc": "Akun private resmi 4K UHD",
    "snk": "Garansi 30 hari replace",
    "form": 2,
    "is_variation": false,
    "is_show": true,
    "bulk_count": 0,
    "wholesale_tiers": null,
    "required_seller_note": false,
    "sold": 42,
    "stock_count": 15,
    "createdAt": "2026-09-18T10:00:00.000Z",
    "updatedAt": "2026-09-20T08:30:00.000Z"
  }
}
json
4.3 Membuat Produk Baru
Path: /v1/products/
Method: POST
Payload (Produk Tunggal)
{
  "code": "SPOTIFY-IND",
  "title": "Spotify Individual 1 Bulan",
  "price": 18000,
  "profit": 3000,
  "desc": "Akun fresh anti on-hold",
  "snk": "Garansi full 30 hari",
  "form": 2,
  "is_variation": false,
  "stocks": [
    "user1@gmail.com|pass123",
    "user2@gmail.com|pass456"
  ]
}
json
Payload (Produk Bertipe Variasi)
{
  "title": "Canva Pro Edu & Lifetime",
  "desc": "Pilih durasi aktivasi Canva",
  "is_variation": true
}
json
Deskripsi Field
Field	Wajib	Tipe	Deskripsi
title	
Wajib
string	Judul produk (maks 100 karakter)
code	Ya (jika non-variasi)	string	Kode SKU alfanumerik & dash (3 - 50 karakter)
price	Ya (jika non-variasi)	number	Harga jual produk dalam Rupiah
profit	
Opsional
number	Nilai profit untuk laporan bot
desc	
Opsional
string	Deskripsi produk (maks 5.000 karakter)
snk	
Opsional
string	Syarat & ketentuan produk (maks 5.000 karakter)
form	
Opsional
number	ID template form stok (default: form default sistem)
is_variation	
Opsional
boolean	true jika produk memiliki banyak pilihan variasi
wholesale_tiers	
Opsional
array	Tier harga grosir: [{"min_qty": 5, "price": 15000, "profit": 2000}]
stocks	
Opsional
array<string>	Injeksi stok awal (maksimal 100 akun)
Contoh Response
{
  "code": 201,
  "message": "Produk berhasil dibuat",
  "data": {
    "product_id": 108,
    "code": "SPOTIFY-IND",
    "title": "Spotify Individual 1 Bulan",
    "is_variation": false
  }
}
json
4.4 Memperbarui Data Produk
Path: /v1/products/:id
Method: PUT
Payload
{
  "title": "Spotify Individual 1 Bulan (Update)",
  "price": 19000,
  "profit": 3500,
  "desc": "Stok fresh akun legal",
  "is_show": true
}
json
Contoh Response
{
  "code": 200,
  "message": "Produk berhasil diperbarui",
  "data": {
    "product_id": 108
  }
}
json
4.5 Menghapus Produk
Menghapus produk induk beserta seluruh variasi dan sisa persediaan stok akunnya.

Path: /v1/products/:id
Method: DELETE
Contoh Response
{
  "code": 200,
  "message": "Produk berhasil dihapus",
  "data": null
}
json
5. Manajemen Variasi Produk
5.1 Menambahkan Variasi
Menambahkan variasi baru ke dalam produk induk. Maksimal 30 variasi per produk induk.

Path: /v1/products/:id/variations (di mana :id adalah ID produk induk)
Method: POST
Payload
{
  "code": "CANVA-1TH",
  "title": "Canva Pro 1 Tahun",
  "price": 25000,
  "profit": 5000,
  "desc": "Invited via team link resmi",
  "form": 1,
  "stocks": [
    "https://canva.com/brand/join?token=abc123xyz"
  ]
}
json
Contoh Response
{
  "code": 201,
  "message": "Variasi berhasil ditambahkan",
  "data": {
    "variation_id": 45,
    "code": "CANVA-1TH",
    "title": "Canva Pro 1 Tahun"
  }
}
json
5.2 Mengambil Detail Variasi
Path: /v1/products/variations/:id (di mana :id adalah ID variasi)
Method: GET
Contoh Response
{
  "code": 200,
  "message": "OK",
  "data": {
    "id": 45,
    "stock_id": 108,
    "code": "CANVA-1TH",
    "title": "Canva Pro 1 Tahun",
    "price": 25000,
    "profit": 5000,
    "desc": "Invited via team link resmi",
    "snk": "",
    "form": 1,
    "stock_count": 8,
    "createdAt": "2026-09-20T09:00:00.000Z"
  }
}
json
5.3 Memperbarui Variasi
Path: /v1/products/variations/:id
Method: PUT
Payload
{
  "title": "Canva Pro 1 Tahun (Full Garansi)",
  "price": 27000,
  "profit": 6000
}
json
Contoh Response
{
  "code": 200,
  "message": "Variasi berhasil diperbarui",
  "data": {
    "variation_id": 45
  }
}
json
5.4 Menghapus Variasi
Path: /v1/products/variations/:id
Method: DELETE
Contoh Response
{
  "code": 200,
  "message": "Variasi berhasil dihapus",
  "data": null
}
json
6. Manajemen Stok Akun (Stock Accounts)
6.1 Injeksi Stok Akun
Menambahkan data persediaan akun siap jual ke produk atau variasi.

Path: /v1/products/stocks
Method: POST
[!IMPORTANT] Batasan Kuota: Maksimal 100 akun per request pengiriman.

Payload (Produk Tunggal)
{
  "product_id": 105,
  "accounts": [
    "user1@gmail.com|pass123",
    "user2@gmail.com|pass456"
  ]
}
json
Payload (Produk Bertipe Variasi)
{
  "product_id": 108,
  "variation_id": 45,
  "accounts": [
    "https://canva.com/brand/join?token=link1",
    "https://canva.com/brand/join?token=link2"
  ]
}
json
Contoh Response
{
  "code": 201,
  "message": "Berhasil menambahkan 2 akun stok",
  "data": {
    "total_added": 2,
    "product_id": 105,
    "variation_id": null
  }
}
json
6.2 Mengambil Sisa Stok Akun Aktif
Melihat daftar data akun yang belum terjual pada suatu produk.

Path: /v1/products/:id/stocks (di mana :id adalah ID produk)
Method: GET
Query Parameters:
variation_id (opsional): Filter akun untuk ID variasi tertentu.
page (opsional, default: 1): Nomor halaman.
limit (opsional, default: 50, maks: 100): Jumlah data per halaman.
Contoh Response
{
  "code": 200,
  "message": "OK",
  "data": {
    "stocks": [
      {
        "id": 8901,
        "stock_id": 105,
        "variation_id": null,
        "value": {
          "Email": "user1@gmail.com",
          "Password": "pass123"
        },
        "createdAt": "2026-09-20T09:15:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 1,
      "total_pages": 1
    }
  }
}
json
6.3 Menghapus 1 Stok Akun
Menghapus data akun stok spesifik yang belum terjual berdasarkan ID akunnya.

Path: /v1/products/stocks/:id (di mana :id adalah ID akun stok)
Method: DELETE
Contoh Response
{
  "code": 200,
  "message": "Data akun stok berhasil dihapus",
  "data": null
}
json
7. Penanganan Kesalahan (Error Handling)
Format response error mengikuti standar Xoftware:

{
  "code": 400,
  "message": "Maksimal penambahan stok adalah 100 akun per request",
  "data": null
}
json
Kode HTTP	Penjelasan
200	Permintaan berhasil diproses.
201	Sumber daya baru (produk/variasi/stok) berhasil dibuat.
400	Validasi input gagal, kuota akun > 100, variasi > 30, atau kode SKU duplikat.
401	API Key tidak ditemukan atau tidak valid.
403	Akses IP diblokir (tidak masuk whitelist IP bot).
404	Produk, variasi, form, atau akun stok tidak ditemukan.
500	Terjadi kesalahan internal pada server.


### Admin login v9
Dashboard tidak lagi mengirim `ADMIN_PASSWORD` pada setiap request. Password divalidasi satu kali oleh `admin_login`, lalu browser memakai signed session token selama 12 jam. Setelah mengubah `ADMIN_PASSWORD` di Vercel, lakukan redeploy Production.
