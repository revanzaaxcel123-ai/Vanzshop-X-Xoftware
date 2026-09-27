# HARDMAX v12 Test Report

Automated checks:

- `node --check api/xo.js` PASS
- `node --check api/sewapay-webhook.js` PASS
- `node --check lib/sewapay.js` PASS
- `node --check assets/xshop.js` PASS
- `node tests/gateway.test.js` PASS
- `node tests/shared-mode.test.js` PASS (legacy Xoftware path)
- `node tests/sewapay.test.js` PASS
- `node tests/frontend.test.js` PASS
- `node tests/package.test.js` PASS

Sewa Pay mock coverage:

- HMAC signature POST body exact JSON
- signed GET methods with `timestamp.`
- unsigned status GET per endpoint docs
- create QRIS amount derived from Xoftware price
- payment token binding to ID/reference
- COMPLETED normalization
- cancel payment
- webhook signature verification primitive

No real merchant credentials are embedded or used by the tests.
