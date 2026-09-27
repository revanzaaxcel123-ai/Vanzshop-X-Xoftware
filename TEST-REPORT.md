# TEST REPORT — HARDMAX v13 AUTOCLAIM

Checks yang dijalankan:

- `node --check api/xo.js` — PASS
- `node --check api/sewapay-webhook.js` — PASS
- `node --check lib/sewapay.js` — PASS
- `node --check lib/fulfillment-store.js` — PASS
- `node --check lib/fulfillment.js` — PASS
- `node --check assets/xshop.js` — PASS
- `tests/frontend.test.js` — PASS
- `tests/gateway.test.js` — PASS
- `tests/package.test.js` — PASS
- `tests/sewapay.test.js` — PASS
- `tests/shared-mode.test.js` — PASS
- `tests/webhook-fulfillment.test.js` — PASS

Coverage penting v13:

- create payment disimpan ke idempotency store;
- Sewa Pay COMPLETED memicu list stok aktif Xoftware;
- record stok yang dikirim ke buyer dihapus lewat endpoint Product Management;
- credential `value` dikembalikan ke browser setelah fulfillment;
- polling status yang sama dua kali tidak menghapus stok kedua;
- webhook `payment.completed` melakukan auto-claim;
- replay webhook tidak menghapus stok kedua;
- signed payment token tetap membatasi akses receipt;
- storefront menolak payment baru jika fulfillment store belum dikonfigurasi.

Mock test menggunakan response sesuai kontrak README/API docs; test tidak melakukan transaksi live ke akun production.
