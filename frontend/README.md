# LokalKarya frontend

Frontend React + Vite untuk marketplace LokalKarya Kediri. Aplikasi ini memakai REST API dari folder `backend/`.

## Menjalankan secara lokal

Gunakan Node.js 22.5 atau lebih baru, lalu buka dua terminal dari root repositori.

Terminal pertama:

```powershell
cd backend
npm install
Copy-Item .env.example .env
npm run dev
```

Terminal kedua:

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Frontend berjalan pada `http://localhost:5173` dan secara default mengakses API di `http://localhost:3000/api`. Ubah `VITE_API_URL` pada `frontend/.env` jika alamat API berbeda. Jika origin frontend berubah, sesuaikan `CORS_ORIGIN` di `backend/.env`.

Untuk masuk sebagai admin lokal, gunakan kredensial demo yang tercantum di `backend/README.md`. Ganti kredensial dan `JWT_SECRET` sebelum menggunakan backend di luar lingkungan lokal.

## Fitur

- Katalog produk, pencarian, dan filter kategori yang mengambil data dari API.
- Keranjang belanja dan checkout melalui `POST /api/orders`.
- Daftar akun, login, dan riwayat pesanan pelanggan.
- Dashboard admin untuk ringkasan toko, CRUD produk, dan pembaruan status pesanan.
