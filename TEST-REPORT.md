# Integration review — Xoftware API coverage

Checked against the supplied Xoftware Order v1.1.0, Product v1.0.0 and Reseller H2H v1.0.0 documentation.

## Covered

- Order: product, register, balance GET/POST, order/balance, order/qris, order/status GET/POST, deposit, webhook receiver.
- Reseller H2H: balance, product, order, order history pagination, order status by reff_id.
- Product Management: forms, product list/detail/create/update/delete, variation create/get/update/delete, stock add/list/delete.

## Important constraints preserved

- Product management pagination max 20.
- Stock injection max 100 per request is left to upstream validation and is documented in the README.
- Variation max 30 is left to upstream validation and is documented in the README.
- Reseller order requires numeric stock_id and quantity >= 1; variation_id is forwarded only when supplied.
- Order API deposit amount validation follows the supplied documented range 1,000–1,000,000.
- No arbitrary URL proxying.
- Xoftware API key never reaches browser code.

## Vercel networking review

The Reseller H2H documentation requires source IP whitelist. Current Vercel docs state normal outbound IPs are dynamic; Static IPs are available for Vercel Pro/Enterprise, while current custom container images do not support Static IPs. This package therefore uses a normal Vercel Node.js Function instead of a custom PHP container for the API gateway.
