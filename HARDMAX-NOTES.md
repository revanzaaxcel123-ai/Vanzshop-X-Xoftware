# HARDMAX implementation notes

`README.md` asli dipertahankan sebagai source of truth API.

## Fokus v6

Target utama versi ini adalah memastikan website pribadi dapat membaca katalog dan stok Xoftware tanpa bergantung pada flow registrasi user.

### Storefront

- Base URL hardcoded: `https://backend-s2.xoftware.id`
- Katalog publik hanya dari endpoint terdokumentasi `GET/POST /v1/product`.
- Gateway mencoba `GET` terlebih dahulu. Jika gagal, mencoba `POST {}` karena README mengizinkan kedua method.
- Response katalog diwajibkan memiliki `data` berupa array. Format lain dianggap error upstream, bukan diam-diam dianggap katalog kosong.
- Field yang dipakai mengikuti README: `id`, `title`, `code`, `is_reseller`, `price`, `original_price`, `discount`, `point`, `sold`, `stock`, `description`, `is_variation`, `variations`.
- `is_reseller=true` hanya dipakai sebagai penanda produk supplier pada Order API. Storefront tetap checkout melalui `/v1/order/qris`.
- Tidak ada request aktif ke `/v1/reseller-api/*` karena kontrak endpoint tersebut tidak tersedia di README project ini.
- Gambar tidak diwajibkan oleh dokumentasi `/v1/product`; UI memakai artwork lokal sebagai fallback. Jika upstream mengirim URL image ekstra, URL tersebut boleh dipakai.

### User dan order

- User dicek lewat `POST /v1/balance`.
- Jika tidak ditemukan, gateway mencoba `POST /v1/register`.
- Jika provider menolak dengan `API Registration is disabled...`, katalog tetap berfungsi; hanya registrasi/checkout user baru yang berhenti.
- QRIS: `POST /v1/order/qris` dengan `sender`, `code`, `quantity`.
- Status: `POST /v1/order/status` dengan `transaction_id`.
- Deposit mengikuti range README Rp1.000–Rp1.000.000.

### Product Management

- Forms: `/v1/products/forms`
- List: `/v1/products/` max 20/page
- Detail/CRUD: `/v1/products/:id`
- Variations: `/v1/products/:id/variations` dan `/v1/products/variations/:id`
- Stok add: `/v1/products/stocks`, gateway batching otomatis max 100 akun/request
- Stok list: `/v1/products/:id/stocks`, max 100/page
- Stok delete: `/v1/products/stocks/:id`

### Dashboard

`/#/admin` > **Koneksi API** melakukan probe nyata dari server ke `/v1/product` dan menampilkan:

- method GET/POST yang berhasil,
- jumlah produk,
- total stok top-level yang terhitung,
- jumlah produk dengan stok unknown,
- jumlah produk `is_reseller=true`,
- preview lima produk yang sudah dinormalisasi.

Ini membantu membedakan masalah code frontend dari API key, IP whitelist, atau response Xoftware.

## Environment minimal

```env
XSOFTWARE_API_KEY=API_KEY_ASLI
ADMIN_PASSWORD=PASSWORD_ADMIN_YANG_KUAT
```

Setting toko/theme lain opsional dan ada di `.env.example`.
