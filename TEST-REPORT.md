# TEST REPORT — v5

Validated locally with Node syntax checks and mocked Xoftware responses.

Passed scenarios:

- Existing user: `/v1/balance` succeeds and `/v1/register` is not called.
- New WhatsApp user: sender normalized and registered before checkout.
- Registration permission disabled: request stops with `REGISTRATION_DISABLED`; no order is sent.
- Registration rate limit `429`: mapped to `REGISTRATION_RATE_LIMIT` with documented limit 3/minute.
- Order API product with `is_reseller=true`: remains `public_checkout=qris` and is treated as a supplier product supported by Order API.
- QRIS request uses customer sender + selected SKU + quantity.
- Order status uses POST with signed local status token.
- Product title >100 chars is rejected instead of silently truncated.
- Stock batching of 205 accounts is sent as 100 + 100 + 5.
- Admin password protection remains active for sensitive H2H/product-management actions.

Commands:

```bash
node --check api/xo.js
node --check assets/xshop.js
node tests/gateway.test.js
```

Result: **PASS**.
