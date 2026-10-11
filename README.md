# LOKALKARYA KEDIRI - Project Mata Kuliah Software Development

## Nama Anggota Kelompok 11 (TIF2001)
1. [Nama Anda] (QA, DevOps & Integration Specialist)
2. [Nama Teman 1] (Backend & Database Engineer)
3. [Nama Teman 2] (Frontend & UI/UX Specialist)

## Deskripsi Singkat Proyek
LokalKarya Kediri merupakan platform *E-Commerce Hyper-Lokal* berbentuk *niche marketplace* yang mengintegrasikan penjualan produk UMKM kriya, anyaman, aksesoris, dan batik khas Kediri. Platform ini tidak hanya berfokus pada sisi transaksi pelanggan, tetapi juga menyediakan *dashboard manajemen bisnis terpadu* bagi pelaku UMKM lokal untuk melacak performa toko, grafik penjualan harian, serta pengingat otomatis stok inventaris secara *real-time*.

## Fitur Utama Sistem / MVP (Minimum Viable Product)
- **Katalog Terkurasi Khas Kediri:** Pengelompokan produk berdasarkan kategori lokal (Batik, Anyaman, Kerajinan Tangan, Aksesoris) untuk menjaga visibilitas produk dari persaingan produk massal impor.
- **Dashboard Analitik UMKM:** Infografis performa toko yang menampilkan total produk, total pesanan, total pendapatan, serta grafik tren penjualan 7 hari terakhir.
- **Manajemen Inventaris & Alert Stok:** Sistem manajemen produk (CRUD) dilengkapi dengan notifikasi penanda (*alert*) otomatis ketika stok barang mulai menipis di bawah batas minimum.
- **Keranjang Belanja & Checkout Terintegrasi:** Fitur manajemen keranjang belanja multi-produk disertai ringkasan biaya yang menghitung otomatis total harga dan estimasi ongkos kirim.
- **Sistem Otentikasi & Manajemen Akun:** Pendaftaran akun dan sistem masuk (*login*) terenkripsi yang memisahkan hak akses antara pembeli umum dengan admin mitra UMKM.

## Target Pengguna dan Hak Akses
- **Admin UMKM (Penjual):** Pelaku usaha mikro dan pengrajin lokal Kediri. Berhak mengelola stok produk, melihat grafik keuangan, memantau total pesanan, dan memperbarui status toko.
- **Customer (Pembeli):** Masyarakat umum, kolektor kain etnik, atau wisatawan yang ingin mencari cinderamata otentik khas Kediri secara praktis melalui akses digital.

## Teknologi yang Digunakan (Tech Stack)
- **Antarmuka Klien (Frontend):** React.js / Vue.js / HTML5, Tailwind CSS, JavaScript/TypeScript.
- **Layanan Server (Backend):** Node.js, Express.js / Python / PHP (disesuaikan dengan tech stack Anda).
- **Basis Data (Database):** MySQL / PostgreSQL.

## Struktur Repositori
Proyek ini menggunakan arsitektur monorepo yang memisahkan kode program menjadi dua modul utama:
- **frontend/** : Berisi seluruh kode antarmuka pengguna (UI), halaman login, katalog, dan keranjang belanja pembeli.
- **backend/** : Berisi core API, arsitektur basis data, sistem otentikasi JWT, dan logika bisnis utama platform.
