# TEST REPORT — HARDMAX v10

## Automated checks

- `node --check api/xo.js` — PASS
- `node --check assets/xshop.js` — PASS
- `node tests/gateway.test.js` — PASS
- `node tests/frontend.test.js` — PASS
- `node tests/package.test.js` — PASS

## Gateway coverage

Mock tests mencakup:

- `/v1/product` GET dan fallback POST
- normalisasi produk supplier/variation/stock
- existing user dan registration-disabled
- registrasi user baru
- QRIS checkout dan signed public status token
- admin login signed session token
- admin QRIS langsung
- order via saldo
- admin deposit
- admin order status
- diagnostic product/balance/qris/status
- Product Management pagination limit 20
- stock batching 205 => 100 + 100 + 5
- title max validation

## Frontend/package coverage

- build marker `HARDMAX-v10`
- physical `admin.html` route
- asset cache version `v=18`
- admin Control Center route map
- Endpoint Lab, balance-order, variations, environment helper
- signed admin authorization flow

## Live limitation

Tidak ada API key produksi di source/ZIP sehingga automated build **tidak memanggil akun Xoftware produksi**. Probe live dilakukan setelah deploy dari Dashboard Admin menggunakan API key yang ada di Vercel.
