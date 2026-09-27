# HARDMAX v10 Notes

- README project tetap menjadi source of truth untuk kontrak Xoftware.
- Storefront mengambil katalog dari `GET/POST /v1/product`.
- Produk supplier ditandai oleh `is_reseller`; tidak ada dependensi aktif ke endpoint reseller-api yang tidak terdokumentasi.
- Admin route tersedia lewat `/admin` dan `/#/admin`.
- Admin login mengeluarkan signed session token 12 jam.
- Dashboard mempunyai lebih dari 20 menu operasional dan 11 panel Endpoint Lab.
- Order API yang diekspos: product, register, balance, order/balance, order/qris, deposit, order/status, webhook receiver.
- Product Management yang diekspos: forms, product list/detail/create/update/delete, variation create/detail/update/delete, stock add/list/delete.
- Stock add >100 otomatis dibatch sesuai limit README.
- UI tools lokal: supplier view, pricing calculator, environment helper, theme/profile, security checklist, local admin logs, browser order history.
- Tidak ada database. Setting preview, admin log, profile customer, dan browser order history yang bersifat lokal menggunakan localStorage/sessionStorage.
- Mutating operations memakai confirmation.
- Build marker `HARDMAX-v10` tersedia di frontend dan endpoint health/admin_ping.
