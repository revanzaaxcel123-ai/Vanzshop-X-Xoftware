# Jalur migrasi inventory VanzShop

Bot memakai kontrak order yang sama dalam dua transport: `website` lewat HTTP API VanzShop, dan `direct` menjalankan source backend yang sama di Node.js lalu mengakses Xoftware + SewaPay langsung. Pilihan transport tidak mengubah sumber inventory: keduanya masih Xoftware.

## Kondisi sekarang

```text
WhatsApp Bot → Backend VanzShop → Xoftware (katalog + stok)
                              → Sewa Pay (pembayaran)
                              → Redis (order, reservasi, receipt)

Mode direct:
WhatsApp Bot / Node.js → Xoftware (GET stocks, DELETE unit terjual)
                     → Sewa Pay (verifikasi pembayaran)
                     → Redis yang SAMA dengan website (order, lock, receipt)
```

Checkout dari WhatsApp masuk ke order store yang sama dengan checkout website. Karena itu pesanan dapat dilacak di dashboard admin dan pengurangan stok tetap mengikuti proses fulfillment yang sudah dipakai website.

Jangan mengganti namespace Redis/secret saat pindah dari website ke direct. Pesanan pending dan receipt lama harus tetap terbaca. Backend direct dibundel dengan `npm run build:backend`; file generated `backend/` bukan sumber edit utama.

Hasil dikirim langsung ke chat, bukan hanya berupa link. `HASIL <reference>` hanya mengakses arsip milik JID pembeli. Pesanan legacy bisa dibuka dengan `HASIL <link lengkap>` melalui endpoint receipt bertoken, tanpa mengambil stok baru. Riwayat 30 hari ada di `data/pending-orders.json` versi 2; jangan hapus saat migrasi.

Untuk order dari grup, `jid` pada arsip selalu identitas privat pembeli, sedangkan `groupJid`/`chatJid` menyimpan grup asal. `buyerAliases` menyimpan pasangan PN/LID dari metadata WhatsApp. Jangan mengganti `jid` dengan ID grup. Status `processingNotified`, `deliveredParts`, dan `groupDeliveredNotified` menjaga progres pengiriman saat restart. Field legacy `paidNotified` diabaikan: versi baru hanya mengumumkan sukses di grup setelah detail pribadi berhasil dikirim. Format arsip versi 2 tetap kompatibel dengan order pribadi lama.

Menu memakai banner.png dan gambar produk dari API yang sama dengan webstore, diformat horizontal 16:9 tanpa memotong logo. Checkout mengikuti produk → paket → jumlah → langsung QRIS, tanpa konfirmasi BAYAR. Pengubahan template tidak mengubah provider stok; saat migrasi tetap pertahankan ID produk/paket atau berikan pemetaan yang konsisten di API.

## Saat siap pindah ke stok native

Pertahankan kontrak endpoint berikut agar bot tidak perlu diubah:

- `GET /api/xo?a=init`
- `POST /api/xo?a=payment_create`
- `POST /api/xo?a=payment_status`
- `GET /api/xo?a=order_lookup&reference=...`
- `POST /api/xo?a=fulfillment_status` (token wajib; receipt saja)

Yang diganti hanya implementasi inventory di backend VanzShop:

1. Pembacaan katalog Xoftware diganti database produk VanzShop.
2. `reserveCheckoutStock` diarahkan ke tabel stok native.
3. `claimPaidOrder` mengunci dan mengambil stok native secara idempotent.
4. Setelah staging lolos, nonaktifkan kredensial Xoftware.

## Mode transisi dua lapis

Jangan menulis atau mengurangi dua inventory sekaligus. Gunakan satu konfigurasi server-side, misalnya `INVENTORY_PROVIDER=xoftware|native`, lalu pilih satu provider sebagai sumber kebenaran untuk setiap order. Simpan nama provider pada order agar retry lama tetap kembali ke inventory asalnya.

Sebelum memutus Xoftware, uji minimal: katalog, stok habis, dua checkout bersamaan, payment sukses, retry fulfillment, pembatalan, dan pelacakan reference.
