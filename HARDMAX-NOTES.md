# HARDMAX v11

- Tidak menambahkan OTP karena README/API Order tidak mendokumentasikan endpoint OTP.
- Menambah `XSOFTWARE_CHECKOUT_MODE=user|shared`.
- Shared mode memakai satu sender Xoftware existing untuk order QRIS dan tidak meregistrasikan buyer.
- Buyer contact tetap disimpan lokal di browser untuk riwayat order.
- `accounts[]` hasil sukses tetap muncul di website melalui polling `/v1/order/status`.
- Deposit publik dimatikan pada shared mode supaya saldo tidak masuk ke akun shared sender tanpa konteks.
- Menambah admin/server action `shared_sender_probe`.
- Build: HARDMAX-v11; asset version: 19.
