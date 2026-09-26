# VanzShop.com × Xoftware — Vercel No-DB (Hardened)

Storefront statis + Vercel Node.js Function untuk integrasi resmi Xoftware.

## Yang sudah dibetulkan

- Base URL produksi Xoftware di-hardcode ke `https://backend-s2.xoftware.id`.
- Semua endpoint memakai header server-side `x-api-key`; API key tidak pernah dikirim ke browser.
- Checkout QRIS publik memakai **Order API**.
- Jika Xoftware membalas **"User not found"**, gateway sekarang otomatis mencoba mendaftarkan `XSOFTWARE_DEFAULT_SENDER` dulu lalu mengulang request checkout/deposit.
- SKU variasi yang dipilih sekarang benar-benar dikirim saat checkout (`variation.code`, fallback ke `product.code`).
- Status transaksi publik memakai HMAC `status_token`, jadi `transaction_id` saja tidak cukup untuk membaca payload akun.
- Klik riwayat **deposit** sekarang kembali ke halaman pembayaran, bukan langsung dianggap sukses.
- Total status mengikuti field dokumentasi `total` (dengan fallback `total_to_pay`).
- Navigasi kembali ke katalog selalu membangun ulang halaman katalog dengan benar.
- **Reseller H2H tidak lagi bisa dibeli gratis dari storefront.** Endpoint reseller memakai `reseller_saldo` toko dan sekarang hanya bisa dipanggil dengan password admin.
- `order/balance` juga admin-only karena endpoint tersebut langsung menghabiskan saldo user Xoftware.
- Product Management benar-benar diimplementasikan: forms, CRUD produk, CRUD variasi, tambah/list/hapus stok.
- Penambahan stok >100 akun otomatis dipecah menjadi batch 100 sesuai limit Xoftware.
- Create produk/variasi dengan >100 stok mengirim 100 pertama saat create lalu melanjutkan batch stok otomatis.
- Limit pagination Product Management dikunci maksimal 20, stok maksimal 100 per halaman, reseller history maksimal 100.

## Environment Variables wajib

```text
XSOFTWARE_API_KEY=YOUR_REAL_XOFTWARE_API_KEY
XSOFTWARE_DEFAULT_SENDER=628xxxxxxxxxx
ADMIN_PASSWORD=PASSWORD_ADMIN_YANG_PANJANG_DAN_UNIK
```

Opsional:

```text
STORE_NAME=VanzShop.com
STORE_TAGLINE=Produk digital pilihan, stok live, checkout otomatis.
XSOFTWARE_DEFAULT_NAME=VanzShop.com
XSOFTWARE_TIMEOUT=25000
CATALOG_SOURCE=owner
```

> `XSOFTWARE_DEFAULT_SENDER` harus diisi dengan nomor/ID identitas default untuk transaksi publik. Kalau user itu belum ada di Xoftware, gateway sekarang akan auto-register saat checkout/deposit pertama.

`CATALOG_SOURCE`:

- `owner` — default dan paling aman untuk storefront QRIS.
- `reseller` — menampilkan katalog partner, tetapi checkout publik tetap dinonaktifkan.
- `merged` — menampilkan owner + reseller; item reseller tetap tidak dapat langsung menghabiskan saldo toko dari browser.

> API key **jangan** di-hardcode ke `assets/xshop.js`, HTML, repository publik, atau environment variable yang diawali `NEXT_PUBLIC_`/sejenis. Base URL dan route boleh hardcoded; secret tidak.

## Endpoint gateway

Semua request masuk ke `/api/xo?a=ACTION`.

### Public storefront

| Action | Method | Fungsi |
|---|---|---|
| `health` | GET | Health/config state tanpa secret |
| `init` | GET | Katalog sesuai `CATALOG_SOURCE` |
| `owner_product` | GET | Detail item owner dari katalog Order API |
| `reseller_product` | GET | Detail item reseller (read-only) |
| `checkout_qris` | POST | Buat invoice QRIS Order API |
| `deposit` | POST | Buat invoice top-up saldo |
| `order_status` | GET/POST | Cek status dengan `transaction_id` + `status_token` |
| `webhook` | POST | Receiver/ack callback; tidak menyimpan state |

### Admin-only — Order API

Header wajib:

```text
X-Admin-Password: <ADMIN_PASSWORD>
```

| Action | Method | Fungsi |
|---|---|---|
| `owner_register` | POST | `/v1/register` |
| `owner_balance` | GET/POST | `/v1/balance` |
| `checkout_balance` | POST | `/v1/order/balance` — langsung memakai saldo |

### Admin-only — Reseller H2H

| Action | Method | Fungsi |
|---|---|---|
| `reseller_balance` | GET/POST | Cek `reseller_saldo` |
| `reseller_order` | POST | Order instan, memotong `reseller_saldo` |
| `reseller_orders` | GET | Riwayat order (`page`, `limit<=100`) |
| `reseller_status` | GET | Status by `reff_id` |

### Admin-only — Product Management

| Action | Method | Parameter utama |
|---|---|---|
| `pm_forms` | GET | - |
| `pm_products` | GET | `page`, `limit<=20`, `search`, `is_variation` |
| `pm_product` | GET | `id` |
| `pm_product_create` | POST | body produk |
| `pm_product_update` | PUT/POST | `id` + body update |
| `pm_product_delete` | DELETE/POST | `id` |
| `pm_variation_create` | POST | `product_id` + body variasi |
| `pm_variation` | GET | `id` |
| `pm_variation_update` | PUT/POST | `id` + body update |
| `pm_variation_delete` | DELETE/POST | `id` |
| `pm_stock_add` | POST | `product_id`, optional `variation_id`, `accounts[]` |
| `pm_stocks` | GET | `product_id`, optional `variation_id`, `page`, `limit<=100` |
| `pm_stock_delete` | DELETE/POST | `id` stok |

## Contoh request

Checkout QRIS dari storefront/server sendiri:

```bash
curl -X POST 'https://DOMAIN-KAMU.vercel.app/api/xo?a=checkout_qris' \
  -H 'Content-Type: application/json' \
  -d '{"code":"NETFLIX-1M","quantity":1,"email":"buyer@example.com"}'
```

Cek reseller saldo sebagai admin:

```bash
curl 'https://DOMAIN-KAMU.vercel.app/api/xo?a=reseller_balance' \
  -H 'X-Admin-Password: PASSWORD_ADMIN_KAMU'
```

Tambah 250 akun stok (gateway otomatis batching 100 + 100 + 50):

```bash
curl -X POST 'https://DOMAIN-KAMU.vercel.app/api/xo?a=pm_stock_add' \
  -H 'Content-Type: application/json' \
  -H 'X-Admin-Password: PASSWORD_ADMIN_KAMU' \
  -d '{"product_id":105,"accounts":["email1|pass1","email2|pass2"]}'
```

## Catatan penting Reseller H2H

Dokumentasi Xoftware menyatakan:

- server pemanggil wajib masuk IP whitelist,
- pembelian memotong `reseller_saldo`,
- akun/stok dikirim realtime pada response order.

Karena itu endpoint reseller **bukan payment gateway customer**. Untuk menjual produk partner ke publik, harus ada flow pembayaran customer terlebih dahulu dan order reseller baru dilakukan dari backend setelah pembayaran tervalidasi. Project ini sengaja tidak menganggap tombol publik sebagai izin untuk menghabiskan saldo reseller.

Jika whitelist IP Xoftware aktif, pastikan deployment memakai egress/static IP yang benar-benar dapat didaftarkan pada dashboard Xoftware.

## No database

Riwayat invoice storefront hanya disimpan di `localStorage` browser. Tidak ada database server. Konsekuensinya:

- pindah perangkat/browser tidak membawa riwayat,
- clear storage menghapus riwayat lokal,
- webhook hanya di-ack, bukan dipakai sebagai source of truth persisten,
- fulfillment QRIS tetap diperoleh dengan polling status Xoftware memakai token lokal yang ditandatangani server.

## Test

Jalankan:

```bash
node --check api/xo.js
node --check assets/xshop.js
node tests/gateway.test.js
```

Test mock mencakup katalog owner/reseller, QRIS, HMAC status token, blokir reseller order tanpa admin, reseller order admin, serta batching stok 205 akun.
