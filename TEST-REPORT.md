# TEST REPORT — VanzShop × Xoftware v4

## Static checks

- `node --check api/xo.js` — PASS
- `node --check assets/xshop.js` — PASS

## Gateway mock integration

- Hardcoded base URL Xoftware — PASS
- Catalog owner normalization — PASS
- Reseller thumbnail passthrough — PASS
- Store appearance config — PASS
- WhatsApp normalization — PASS
- Existing user checked via `/v1/balance` — PASS
- Missing user registered via `/v1/register` — PASS
- HTTP 200 + top-level `status:false` handled as API error — PASS
- `API Registration is disabled for this bot` returns HTTP 409 / `REGISTRATION_DISABLED` — PASS
- Checkout is blocked before `/v1/order/qris` when registration cannot be completed — PASS
- Checkout uses buyer sender, never silent default-sender fallback — PASS
- QRIS transaction token generated — PASS
- `/v1/order/status` called via POST — PASS
- Telegram ID path — PASS
- Admin authentication — PASS
- Reseller order blocked without admin password — PASS
- Product stock batching 205 → 100 + 100 + 5 — PASS

## UI architecture checks

- Owner products always have local SVG fallback art — PASS by code path
- Upstream image/thumbnail overlays fallback only when available — PASS by code path
- No SimpleIcons/CDN dependency for product fallback — PASS
- Account registration page exists — PASS
- Admin dashboard route `#/admin` exists — PASS
- Theme/environment generator exists — PASS
