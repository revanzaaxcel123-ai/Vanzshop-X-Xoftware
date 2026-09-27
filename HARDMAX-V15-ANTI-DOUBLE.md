# HARDMAX v15 — Anti Double Delivery

## Masalah yang diselesaikan

Xoftware Product Management tidak memberi "order ledger" untuk metode custom Sewa Pay. Yang tersedia adalah stok aktif dan endpoint hapus stok. Karena itu VanzShop memakai dua state:

1. **Xoftware** = sumber stok aktif. Begitu akun berhasil di-claim, record stok dihapus lewat `DELETE /v1/products/stocks/:id` sehingga tidak lagi tersedia sebagai stok aktif.
2. **Redis/Upstash** = ledger transaksi VanzShop. Reference payment, stock record ID, credential yang dikirim, status claim, dan timestamp disimpan di sini.

## Flow v15

```text
Pilih produk
→ refresh katalog Xoftware
→ soft-reserve stock_record_id di Redis (NX)
→ baru buat invoice Sewa Pay
→ customer bayar
→ COMPLETED
→ lock reference + lock inventory
→ pastikan stock_record_id dimiliki reference ini
→ DELETE record stok di Xoftware
→ tulis immutable-ish receipt fulfillment di Redis
→ kirim credential yang sama ke browser
```

Webhook, polling, reload, dan tombol retry semuanya membaca receipt yang sama. Kalau receipt sudah `fulfilled`, engine **tidak memilih stok baru**.

## Triple guard anti-double

- **Reference lock**: satu payment reference hanya diproses satu worker pada satu waktu.
- **Inventory lock**: produk/variasi yang sama tidak dipilih bersamaan oleh worker VanzShop.
- **Stock owner key**: setiap `stock_record_id` punya owner reference Redis via `SET NX`. Dua reference VanzShop tidak bisa memiliki record stok yang sama.

Sebelum QRIS dibuat, stok sudah di-soft-reserve. Ini juga mengurangi kasus dua customer membayar stok terakhir secara bersamaan.

## Batas jaminan

Strict no-double berlaku bila stok Xoftware tersebut **eksklusif dikonsumsi VanzShop** atau semua channel/bot lain memakai reservation Redis yang sama. Jika ada aplikasi lain yang membaca lalu menghapus stok Xoftware yang sama tanpa memakai lock VanzShop, API Xoftware yang tersedia tidak menyediakan transaksi atomic reserve lintas sistem, jadi VanzShop tidak dapat membuktikan ownership global terhadap consumer eksternal tersebut.

Gunakan:

```text
FULFILLMENT_EXCLUSIVE_STOCK=true
```

sebagai reminder operasional bahwa stok tersebut tidak boleh dikonsumsi sistem lain secara independen.
