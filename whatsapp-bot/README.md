# VanzShop WhatsApp Bot

Bot WhatsApp Node.js berbasis Baileys: banner, katalog angka, gambar produk + paket, jumlah, langsung QRIS, lalu detail akun/link ke chat pribadi. Order dari grup memakai pilihan per anggota, QRIS di grup, dan satu notifikasi sukses setelah detail terkirim ke pembeli.

## Prinsip arsitektur

Tersedia dua mode yang memakai proses order/fulfillment yang sama:

- `WA_BACKEND_MODE=website` (default): bot memanggil API website; backend mengakses Xoftware dan SewaPay.
- `WA_BACKEND_MODE=direct`: proses Node.js bot mengakses Xoftware dan SewaPay langsung. Tidak membutuhkan frontend atau HTTP API website untuk berjualan.

Kedua mode mengambil isi stok dari Xoftware melalui `GET /v1/products/:id/stocks`. Setelah SewaPay terverifikasi `COMPLETED`, unit stok yang dipilih dihapus melalui `DELETE /v1/products/stocks/:recordId`. Produk dan variasinya tetap ada. Redis menyimpan order, reservasi, dan salinan hasil pembelian agar retry memakai hasil yang sama.

## Mengaktifkan mode direct

Isi `.env` bot dengan `XSOFTWARE_API_KEY`, `SEWAPAY_API_KEY`, `SEWAPAY_SECRET_KEY`, `UPSTASH_REDIS_REST_URL`, dan `UPSTASH_REDIS_REST_TOKEN` yang sama dengan Vercel. Samakan juga `PAYMENT_TOKEN_SECRET` (atau biarkan kosong jika website juga memakai fallback secret SewaPay) serta `FULFILLMENT_KEY_PREFIX`.

Set `WA_SHARED_STORE_CONFIRMED=true` setelah nilai penyimpanan dan secret dipastikan sama, lalu `WA_BACKEND_MODE=direct`. Tanpa konfigurasi ini bot menolak start dalam mode direct, sehingga tidak membuat order di inventory/namespace kedua. Jangan kirim secret lewat chat atau commit `.env`.

Dalam repository, adapter memakai source `api/xo.js` dan `lib/` langsung. Untuk paket standalone, jalankan `npm run build:backend` lalu sertakan folder `backend` di ZIP. Paket rilis yang disiapkan sudah menyertakannya. Setiap perubahan fulfillment website harus diikuti pembaruan bundle bot.

## Menjalankan lokal

Persyaratan: Node.js 20.9 atau lebih baru.

1. Salin `.env.example` menjadi `.env` atau isi Environment Variables di panel.
2. Jalankan `npm install`.
3. Untuk `.env` lokal jalankan `npm run dev`; untuk environment panel jalankan `npm start`.
4. Masukkan pairing code atau scan QR dari log.

Gunakan `WA_LOGIN_METHOD=qr` untuk QR atau `WA_LOGIN_METHOD=pairing-code` untuk kode delapan karakter. Jangan menjalankan kedua metode bersamaan. Setelah login berhasil, folder `data/auth` harus dipertahankan dan restart berikutnya akan memakai session yang sama.

## Alur pembeli

1. Ketik `MENU` / `START`: banner dan seluruh produk tampil dengan tanggal/jam WIB. Produk diurutkan A–Z, nama pada menu memakai kapital di awal kata, tanpa simbol per item. Nomor pilihan memakai urutan yang sama dengan ID asli provider. Katalog panjang dikirim otomatis dalam beberapa pesan, tanpa perintah halaman berikutnya.
2. Ketik nomor produk: gambar yang dipakai webstore dan daftar variasi Xoftware tampil dengan harga serta stok. Kode SKU tidak ditampilkan kepada pembeli, tetapi ID/SKU aslinya tetap dipakai saat checkout.
3. Ketik nomor paket, kemudian jumlah 1–20. Harga Rp 700 membutuhkan minimal 2 item agar memenuhi minimum pembayaran Rp 1.000. Paket habis tidak dapat dipesan.
4. Setelah jumlah diketik, harga/stok diperiksa ulang dan QRIS langsung dibuat. Tidak ada menu konfirmasi atau perintah BAYAR. Harga aktual, biaya dan total tampil sebelum pembeli membayar.
5. QRIS dan ringkasan singkat dikirim dalam satu pesan gambar ke chat tempat order dimulai, tanpa mention pembuka atau link checkout. Di grup, bot mencoba mengirim chat pribadi sebelum membuat tagihan; jika gagal, pembeli diminta mengetik START sekali di chat pribadi lalu mengetik jumlah lagi di grup.
6. Worker memverifikasi pembayaran, kemudian seluruh isi akun/link/petunjuk dikirim ke chat pribadi pembeli. Jika produk masih diproses, bot memberi pemberitahuan sekali tanpa mengklaim pengiriman berhasil. Detail sensitif dan link bertoken tidak dikirim ke grup.
7. Setelah seluruh bagian produk berhasil dikirim, grup mendapat satu notifikasi “YEAY, PEMBAYARAN BERHASIL!”. Pesanan diarsipkan setelah pengiriman/notifikasi selesai. Jika terputus, bagian yang belum terkirim dilanjutkan setelah restart tanpa mengambil stok baru. Jika grup tidak bisa dijangkau, pengiriman pribadi tetap berjalan dan notifikasi grup dicoba ulang.
8. `CEK` memeriksa pesanan terakhir milik pengirim; `CEK VZ-...` memeriksa nomor tertentu. `HASIL VZ-...` mengirim ulang detail ke pemilik pesanan melalui chat pribadi, termasuk jika diketik dari grup. Arsip lokal disimpan hingga 30 hari dan memuat data produk sensitif.

`KEMBALI` kembali satu tahap; `MENU` kembali ke daftar produk. Di grup, hanya perintah bot dan angka dari anggota yang sedang memilih produk yang diproses. Chat umum/angka anggota yang belum mengetik MENU diabaikan. Setiap anggota memiliki pilihan sendiri; tidak wajib menggunakan fitur Reply atau button. Identitas LID WhatsApp dipetakan ke identitas pengirim, bukan dianggap nomor HP.

## Banner dan gambar produk

Taruh gambar toko bernama `banner.png` di folder bot, satu lokasi dengan `package.json` dan `.env`. Bisa memakai path berbeda melalui `WA_BANNER_FILE`. File banner dibaca setiap kali MENU dikirim, jadi mengganti gambar tidak perlu menghapus auth. Paket menyertakan banner jika file tersebut ada saat ZIP dibuat.

Gambar paket diambil otomatis dari `thumbnail`/gambar produk API webstore. Gambar manual dashboard diprioritaskan, lalu gambar provider Xoftware jika tersedia. Gambar dibuat horizontal 16:9 (960 × 540) menggunakan sharp, dengan warna latar yang sesuai dan logo utuh tanpa dipotong atau diregangkan. Mendukung PNG, JPG dan WebP, upload data URL, URL publik dan path relatif website (maksimum 5 MB). Gambar dicache hingga 5 menit. Jika URL tidak bisa diakses, isinya HTML/SVG, atau pengiriman gambar gagal, pilihan tetap dikirim sebagai teks. Untuk SVG pengganti di webstore, pasang JPG/PNG dari dashboard agar bisa dikirim sebagai foto WhatsApp.

QRIS memakai PNG 512 × 512 dengan quiet zone empat modul agar mudah dipindai. Ukuran pratinjau di chat tetap mengikuti aplikasi WhatsApp; bot tidak bisa mengatur tinggi tampilannya secara pasti.

`WA_GROUPS_ENABLED=true` adalah default. Undang nomor bot ke grup yang ingin dipakai, lalu ketik MENU dari nomor pembeli. Jika grup hanya mengizinkan admin mengirim pesan, jadikan bot admin atau ubah izin grup. Pesan dari nomor bot sendiri (`fromMe`) diabaikan; tes dengan nomor lain.

Untuk transaksi lama yang sudah dihapus dari daftar pending oleh versi bot sebelumnya: gunakan fitur **Balas/Reply** pada pesan bot yang berisi link pembayaran lengkap, lalu ketik `HASIL`. Alternatifnya, kirim `HASIL` diikuti link lengkap. Bot memverifikasi token ke endpoint receipt dan mengirim hasil lama tanpa claim stok kedua. Token lama harus masih berlaku; jika kedaluwarsa, admin membuka receipt dari dashboard dengan reference. Reference publik saja tidak boleh membuka akun/password.

Template QRIS baru tidak menampilkan link checkout, termasuk jika konfigurasi lama `WA_WEB_PAYMENT_LINKS=true`. Link bertoken tetap disimpan secara privat untuk kompatibilitas pemulihan pesanan lama. Bot tidak memerlukan link untuk mengirim hasil pembelian.

Flow menggunakan angka dan perintah teks sehingga pembeli dapat mengikuti instruksi tanpa native button.

## Pterodactyl

- Egg: Node.js
- Node: 20.9 atau lebih baru
- Working directory: `whatsapp-bot`
- Install command: `npm ci --omit=dev`
- Start command: `npm start`
- `data/auth` dan `data/pending-orders.json` wajib berada pada storage persisten.
- Jangan menjalankan dua instance memakai session WhatsApp yang sama.

Pterodactyl sudah mengawasi proses dan melakukan restart, sehingga PM2 tidak diperlukan di dalam container.

## Keamanan

- Gunakan nomor toko terpisah.
- Jangan commit direktori `data/auth` atau file pending order.
- Jangan log payment token, password produk, OTP, atau detail akun.
- Detail hasil pembelian dikirim hanya ke chat pembeli atau pemegang tautan bertoken yang valid. Backup `data/` harus privat; jangan masukkan ke ZIP publik.
- Lock Redis melindungi website dan bot yang memakai Redis/prefix sama. Bot Telegram sewaan yang mengurangi stok di luar lock ini belum termasuk; stoknya perlu dipisahkan atau seluruh channel diarahkan ke alur yang sama sebelum menjanjikan tidak ada benturan antar-channel.
