# Perbaikan QRIS dan hasil pembelian WhatsApp

## Bukti produksi (4 Oktober 2026)

- `GET https://store.vanzshop.com/` mengembalikan HTTP 200 dan script `xshop.js?v=32`.
- `GET /bayar/tx_probe` mengembalikan HTTP 404.
- Reference `VZ-MUSSDNN4-4FE9B56177`: pembayaran `success`, fulfillment `fulfilled`, `delivered_items=1`, tanpa error.
- Bot lama mengirim hanya URL hasil dan menghapus state lokal begitu backend memberi status fulfilled. Tidak ada pesan berisi akun/link yang dikirim.

Ini membuktikan transaksi tersebut sudah mempunyai receipt. Jangan membuat order baru atau mengurangi stok lagi untuk memulihkannya. Detail Xoftware diambil server-side, bukan disalin dari tampilan katalog publik. Response status publik tidak menyertakan akun/password.

## Perubahan

- Invoice QRIS satu gambar + ringkasan caption; link website default nonaktif.
- Receipt dikirim langsung ke chat, ditandai selesai setelah seluruh bagian dikirim, dan diarsipkan 30 hari.
- `HASIL <reference>` dibatasi chat pemilik; pesanan legacy menggunakan `HASIL <link lengkap bertoken>` untuk membaca receipt yang sudah ada.
- Mode `direct` memakai source backend yang sama di Node.js: Xoftware + SewaPay + Redis bersama, tanpa panggilan HTTP ke website.
- Frontend v34 menerima token link lama maupun hash route baru. Halaman pembayaran tidak menunggu fetch katalog Xoftware. Link tanpa token menampilkan petunjuk pemulihan dan tidak mengarahkan otomatis ke riwayat kosong.
- Rewrite `/bayar/:paymentId` diarahkan ke `/`, sesuai `cleanUrls:true`. [Dokumentasi Vercel](https://vercel.com/docs/project-configuration/vercel-json#rewrites) melarang ekstensi file dalam destination saat cleanUrls aktif.
- `.vercelignore` mengecualikan folder bot dari deployment statis website.

## Aktivasi

Folder runtime Codex sudah diperbarui; tutup satu proses bot dengan Ctrl+C kemudian `npm run dev` dari folder yang sama. Jangan jalankan dua proses/salinan bot pada sesi yang sama.

Pesanan lama: gunakan Balas/Reply pada pesan bot yang memuat URL pembayaran lengkap, lalu ketik `HASIL`. Bisa juga kirim `HASIL ` lalu paste URL lengkap. Verifikasi token dan receipt berjalan di backend. Jika token lama kedaluwarsa, minta admin membuka receipt di dashboard memakai reference; jangan membayar ulang.

Website publik tetap memerlukan commit/push/deployment source baru. Restart bot tidak mendepoy website. Redeploy commit lama tetap menampilkan v32.

Mode direct belum diaktifkan karena `.env` lokal bot belum mempunyai key Xoftware, SewaPay, dan Redis. Isi nilai yang sama dengan Vercel berdasarkan README, baru ubah `WA_BACKEND_MODE=direct`. Tidak ada key yang disertakan dalam ZIP.

Reservasi Redis hanya mengoordinasikan channel yang memakai Redis/prefix sama. Bot Telegram sewaan yang mengonsumsi stok tanpa lock ini perlu pool stok terpisah atau integrasi provider yang mendukung klaim atomik; perlindungan untuk semua channel belum dapat dijamin oleh DELETE API saja.
