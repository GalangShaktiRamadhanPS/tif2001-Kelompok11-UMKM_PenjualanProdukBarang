# LokalKarya Kediri API

REST API untuk katalog dan transaksi marketplace UMKM lokal Kediri. Data disimpan di SQLite pada `backend/data/localkarya.sqlite` dan akan tetap ada setelah server dimatikan.

## Menjalankan

Perlu Node.js 22.5 atau lebih baru.

```powershell
cd backend
npm install
Copy-Item .env.example .env
npm run dev
```

Server berjalan di `http://localhost:3000`. Endpoint pemeriksaan: `GET /api/health`.

Admin demo lokal: `admin@localkarya.test` / `KediriDemo123!`. Ganti `JWT_SECRET` dan `ADMIN_PASSWORD` di `.env` sebelum memakai backend di lingkungan selain lokal. Kredensial demo ini tidak aman untuk produksi.

## Endpoint

- `GET /api/categories`
- `GET /api/products?search=&category=&page=1&limit=12`
- `GET /api/products/:id`
- `POST /api/auth/register` dengan `{ "name", "email", "password" }`
- `POST /api/auth/login` dengan `{ "email", "password" }`
- `POST /api/orders` dengan token customer dan `{ "items": [{ "productId", "quantity" }] }`
- `GET /api/orders/me` dengan token pengguna
- `POST /api/products`, `PUT /api/products/:id`, `DELETE /api/products/:id` (admin)
- `GET /api/admin/dashboard`, `GET /api/admin/orders`, `PATCH /api/admin/orders/:id/status` (admin)

Kirim token dengan header `Authorization: Bearer <token>`. Harga menggunakan bilangan rupiah, misalnya `150000` berarti Rp150.000. Kategori: `Batik`, `Anyaman`, `Kerajinan Tangan`, dan `Aksesoris`.

Frontend dapat diizinkan melalui `CORS_ORIGIN` di `.env`; pisahkan beberapa origin dengan koma.