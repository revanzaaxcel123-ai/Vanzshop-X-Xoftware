# TEST REPORT — HARDMAX v11

Run locally:

```text
node --check api/xo.js
node --check assets/xshop.js
node tests/gateway.test.js
node tests/shared-mode.test.js
node tests/frontend.test.js
node tests/package.test.js
```

Coverage includes documented user checkout, registration-disabled response, shared-sender checkout without `/v1/register`, order status fulfillment, catalog, admin auth, Product API limits, and stock batching.
