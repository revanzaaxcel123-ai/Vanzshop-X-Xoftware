# VanzShop.com × Xoftware — Vercel No-DB v2

Versi ini memakai **Vercel Node.js Function**, bukan PHP container. Tujuannya supaya API gateway bisa bekerja dengan fitur Vercel Static IP saat Xoftware mewajibkan IP whitelist untuk Reseller H2H.

## API yang di-cover

### Order API (`/v1/`)
- GET/POST `product`
- POST `register`
- GET/POST `balance`
- POST `order/balance`
- POST `order/qris`
- GET/POST `order/status`
- POST `deposit`
- POST `webhook` (receive/log only, no persistence)

### Reseller H2H (`/v1/reseller-api/`)
- GET/POST `balance` (gateway menggunakan GET)
- GET `product`
- POST `order`
- GET `order?page=&limit=`
- GET `order/status?reff_id=`

### Product Management (`/v1/products`)
Admin-protected actions:
- forms
- list/detail/create/update/delete product
- create/get/update/delete variation
- add/list/delete stock

## Environment Variables

```text
STORE_NAME=VanzShop.com
STORE_TAGLINE=Digital store powered by VanzShop & Xoftware
XSOFTWARE_BASE_URL=https://backend-s2.xoftware.id
XSOFTWARE_API_KEY=...
XSOFTWARE_TIMEOUT=25000
CATALOG_SOURCE=merged
ADMIN_PASSWORD=...
```

`CATALOG_SOURCE` dapat berupa `owner`, `reseller`, atau `merged`.

## Penting untuk Reseller H2H

Dokumentasi Xoftware menyatakan IP server pemanggil wajib berada dalam whitelist IP. Vercel memakai outbound IP dinamis secara default. Karena itu, bila whitelist Xoftware diaktifkan, gunakan **Vercel Static IPs (Pro/Enterprise)** pada Function ini dan masukkan IP egress Vercel yang diberikan ke whitelist Xoftware.

Jangan gunakan Docker container untuk route yang bergantung pada Vercel Static IPs; dokumentasi Vercel saat ini menyatakan Static IPs belum berlaku untuk custom container images.

## Tidak ada database

Tidak ada MySQL/SQLite. Produk, stok, saldo, dan transaksi live berasal dari Xoftware. Riwayat invoice owner-order hanya berada di `localStorage` browser.

## Security

- API key Xoftware hanya berada di Environment Variables server.
- Frontend tidak menerima API key.
- Endpoint product management membutuhkan `X-Admin-Password`.
- Proxy tidak menyediakan arbitrary URL; hanya action yang di-whitelist.

## Reseller vs Order API

**Order API** cocok untuk katalog bot sendiri: bisa register user, bayar QRIS, order saldo, dan cek status.

**Reseller H2H** memakai `reseller_saldo` bot dan order instan dari Star Seller. Endpoint reseller tidak menyediakan endpoint pembayaran customer. Jadi jangan menganggap `reseller/order` sebagai payment gateway customer. Jika ingin pelanggan membayar dahulu lalu VanzShop melakukan fulfillment reseller, payment flow perlu dipasangkan dengan gateway customer + mekanisme order state terpisah.
