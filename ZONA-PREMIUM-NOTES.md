# Zona Premium redesign

Perubahan lokal: hero krem–hijau, logo dari lampiran, katalog aplikasi premium, pencarian/kategori/urutan, stok habis, diskon dari harga asli, rating berbasis data, dan FAQ. Checkout serta penyimpanan pesanan tetap menggunakan sistem yang ada.

Preview desain: `node scripts/preview.cjs`, lalu buka http://localhost:4173. Server ini hanya berjalan di loopback, memakai data contoh berlabel, dan tidak memproses transaksi. Katalog produksi tetap berasal dari `/api/xo`; tidak ada produk demo yang disisipkan ke katalog produksi.

Rating membutuhkan `rating` (0–5) dan `review_count` dari provider. Tanpa keduanya, kartu menampilkan “Belum ada ulasan”. Tidak ada form kirim ulasan baru dalam perubahan ini.

Untuk instalasi dengan konfigurasi lama, gunakan `STORE_THEME=light`, `STORE_COLOR_MODE=light`, dan `STORE_SITE_THEME=mint`. Pilihan tema yang disimpan pengguna di browser tetap dihormati. Domain vexora.store dan kunci penyimpanan lama dipertahankan agar tautan dan data pesanan tidak terputus; domain pengganti belum diberikan.

Validasi: 12 tes lulus dengan STORE_RESELLER_GROUP yang diharapkan tes gateway lama. Tanpa konfigurasi ini, tes gateway lama gagal karena default grup kosong. Pencarian, filter kategori, dan navigasi detail diperiksa di browser menggunakan data contoh. Pembayaran live tidak diuji karena kredensial layanan tidak tersedia di checkout lokal.
