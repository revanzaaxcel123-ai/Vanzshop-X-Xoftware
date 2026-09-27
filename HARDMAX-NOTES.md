# HARDMAX v13 AUTOCLAIM

Target v13: payment Sewa Pay `COMPLETED` otomatis mengambil akun dari stok aktif Xoftware dengan idempotency persisten.

## Implementasi

- Katalog/harga/stok agregat: `GET/POST /v1/product`.
- Payment: Sewa Pay.
- Stok credential fulfillment: `GET /v1/products/:id/stocks`.
- Claim stok: `DELETE /v1/products/stocks/:id`.
- Idempotency/order/receipt: Redis REST (Upstash/Vercel-compatible env).
- Polling payment dan webhook memakai engine fulfillment yang sama.
- Satu `reference` payment hanya boleh menghasilkan satu receipt fulfillment.
- Lock stok per product/variation mencegah dua payment aplikasi memilih record stok yang sama bersamaan.
- Data akun hasil claim disimpan di receipt Redis dan hanya dikembalikan ke browser dengan signed `payment_token`.

## Env baru wajib

```text
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

Alias yang didukung: `KV_REST_API_URL` + `KV_REST_API_TOKEN`.

Build: `HARDMAX-v13-AUTOCLAIM`
