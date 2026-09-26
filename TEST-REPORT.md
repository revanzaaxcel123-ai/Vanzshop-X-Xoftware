# Integration review — Xoftware API coverage

Basis: Xoftware Order API v1.1.0, Product Management v1.0.0, dan Reseller H2H v1.0.0.

## Status

PASS untuk static syntax + mocked gateway integration tests.

Commands:

```bash
node --check api/xo.js
node --check assets/xshop.js
node tests/gateway.test.js
```

## Fix kritis

1. **Reseller H2H public-spend vulnerability ditutup.** `reseller_order` sekarang admin-only dan storefront tidak lagi menganggap order reseller sebagai checkout customer.
2. **`order/balance` admin-only.** Endpoint yang langsung memakai saldo tidak tersedia anonim.
3. **Variation SKU fix.** Storefront mengirim `variation.code` untuk varian terpilih, fallback ke `product.code` hanya bila produk non-variasi/varian tidak punya kode.
4. **Status privacy hardening.** Checkout QRIS/deposit menghasilkan `status_token` HMAC. Public `order_status` menolak request yang hanya mengetahui `transaction_id`.
5. **Deposit history fix.** Deposit pending membuka invoice lagi, bukan langsung halaman sukses.
6. **Order status total fix.** Parser mengikuti field `total` dari dokumentasi status QRIS.
7. **Catalog route fix.** Navigasi kembali ke root merender ulang katalog.
8. **Product Management coverage nyata.** Semua route yang didokumentasikan sekarang ada di gateway.
9. **Stock batching.** Gateway memecah `accounts` menjadi request maksimal 100 item.

10. **Buyer sender fix.** Checkout publik sekarang memakai nomor WhatsApp pembeli sebagai `sender`, menormalisasi `08/+62/62`, dan email menjadi opsional.
11. **Registration-disabled fallback.** Jika registrasi API diblokir dan `XSOFTWARE_DEFAULT_SENDER` sudah terdaftar, gateway dapat memproses transaksi memakai sender fallback tersebut.
12. **Reliable product artwork.** Storefront tidak lagi bergantung pada CDN logo; fallback artwork SVG lokal selalu tersedia jika API tidak memberi gambar atau URL gambar gagal dimuat.
13. **Compact UI.** Grid desktop dibuat lebih padat dan detail produk memakai layout visual + info horizontal agar tidak terasa terlalu besar.

## Mock scenarios yang lulus

- Init katalog owner + reseller.
- Normalisasi variation code dan `stock_count`.
- QRIS checkout dengan SKU legacy ber-underscore.
- Normalisasi sender WhatsApp pembeli + auto-register.
- Fallback ke sender default yang sudah terdaftar saat API Registration upstream dinonaktifkan.
- Signed status token valid/invalid.
- Reseller order ditolak tanpa admin password.
- Reseller order berhasil diteruskan dengan admin password.
- `pm_stock_add` 205 akun -> batch 100/100/5.
- `pm_product_create` 205 stok -> 100 initial + 100/5 follow-up.
- `pm_variation_create` 205 stok -> 100 initial + 100/5 follow-up.
- Reseller balance POST.

## Belum dapat dites tanpa kredensial produksi

- Respons real Xoftware terhadap API key milik pengguna.
- IP whitelist deployment aktual.
- QRIS real payment lifecycle.
- Webhook delivery real dari Xoftware.
- Bentuk variation object real pada katalog akun pengguna jika berbeda dari dokumentasi.

Tidak ada kredensial produksi yang ditanam di repository.
