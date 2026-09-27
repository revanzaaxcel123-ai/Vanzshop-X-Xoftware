# HARDMAX v15 Test Report

Build: `HARDMAX-v15-ANTIDOUBLE`

Passed locally:

- `crash-recovery.test.js` — DELETE sukses lalu Redis write gagal; retry mengirim credential yang sama dan tidak memilih stok lain.
- `reservation-antidouble.test.js` — dua payment pending tidak bisa memegang `stock_record_id` yang sama.
- `webhook-fulfillment.test.js` — webhook replay tidak menghapus stok kedua.
- `sewapay.test.js` — create payment, HMAC, status COMPLETED, auto fulfillment, repeated status idempotent.
- `frontend.test.js`
- `gateway.test.js`
- `package.test.js`
- `shared-mode.test.js`

Syntax checks passed:

- `api/xo.js`
- `api/sewapay-webhook.js`
- `lib/fulfillment.js`
- `lib/fulfillment-store.js`
- `assets/xshop.js`
