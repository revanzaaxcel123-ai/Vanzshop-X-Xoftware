# TEST REPORT — HARDMAX v7

Basis kontrak: `README.md` di root project.

## Automated checks

```bash
node --check api/xo.js
node --check assets/xshop.js
node tests/gateway.test.js
node tests/frontend.test.js
```

Result: **PASS**.

## Mocked integration scenarios yang lolos

- `/v1/product` GET sukses -> produk dan stok tampil.
- `/v1/product` GET gagal 405 -> otomatis retry POST dan sukses.
- Tidak ada request aktif ke `/v1/reseller-api/*`.
- Produk `is_reseller=true` tetap berada di katalog Order API.
- Variasi mengambil `code`, `price`, dan `stock` yang dipilih.
- Existing user ditemukan lewat `/v1/balance` tanpa memanggil `/v1/register`.
- User baru diregistrasikan melalui `/v1/register`.
- Registration-disabled dipetakan ke `REGISTRATION_DISABLED` tanpa mematikan katalog.
- QRIS memakai sender customer + SKU + quantity.
- Status transaksi memakai `/v1/order/status` + signed local status token.
- `catalog_probe` wajib admin password.
- Diagnostic `/v1/product`, `/v1/balance`, `/v1/order/qris`, dan `/v1/order/status` wajib admin password dan mengembalikan request metadata + raw upstream response.
- Pagination Product Management dipaksa max 20/page.
- Stok 205 akun dibagi otomatis menjadi 100 + 100 + 5.
- Judul produk >100 karakter ditolak lokal.
- Frontend mengandung build marker `HARDMAX-v7`.
- Router admin menerima **dua bentuk URL**: `/admin` dan `/#/admin`.
- Vercel rewrite `/admin` dan `/admin/*` diarahkan ke SPA `index.html`.
- Asset cache-buster dinaikkan ke `v=15`.

## Batas verifikasi

Test ini menggunakan mock response yang mengikuti README. Tidak ada API key produksi di file project, jadi sesi build ini **tidak melakukan request nyata ke akun Xoftware user**. Setelah deploy, buka `/admin` atau `/#/admin`, lalu cek build `HARDMAX-v7` dan gunakan tab **Diagnostik** untuk probe live menggunakan API key Vercel milik user.
