# TEST REPORT — HARDMAX v6

Basis kontrak: `README.md` di root project.

## Automated checks

```bash
node --check api/xo.js
node --check assets/xshop.js
node tests/gateway.test.js
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
- Pagination Product Management dipaksa max 20/page.
- Stok 205 akun dibagi otomatis menjadi 100 + 100 + 5.
- Judul produk >100 karakter ditolak lokal.

## Batas verifikasi

Test ini menggunakan mock response yang mengikuti README. Tidak ada API key produksi di file project, jadi sesi build ini **tidak melakukan request nyata ke akun Xoftware user**. Setelah deploy, gunakan `/#/admin` -> **Koneksi API** untuk probe live menggunakan API key Vercel milik user.
