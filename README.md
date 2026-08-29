# Portal Hasil Asesmen Siswa BK 2026/2027

Aplikasi web **Portal Hasil Asesmen BK** untuk Layanan Bimbingan & Konseling Bu Praw (Kelas 7E, 7F, 9E, 9F, 9G, 9H).

## 🚀 Fitur Utama
- **Akses Siswa Mandiri & Aman**: Siswa masuk hanya menggunakan NISN resmi mereka masing-masing.
- **7 Jenis Dokumen Asesmen Resmi**:
  1. Biodata Siswa
  2. Gaya Belajar
  3. Kecerdasan Majemuk
  4. Minat Bakat
  5. Jenis Kepribadian
  6. Kartu Sosiometri
  7. Laporan BDI
- **Keamanan Tingkat Tinggi**:
  - Penyimpanan file private di Supabase Cloud Storage.
  - Tautan unduhan dibuat dengan masa berlaku terbatas (Short-lived signed URLs 60 detik).
  - Rate limiting untuk mencegah brute-force.
  - Data bersifat pribadi antar siswa.

## 🛠️ Stack Teknologi
- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS
- **Backend & Database**: Supabase PostgreSQL + Row Level Security (RLS)
- **File Storage**: Supabase Private Storage Bucket (`assessment-results`)
- **Hosting**: Netlify + Serverless Functions

## 📁 Cara Menambah / Bulk Upload File PDF Siswa
1. Masukkan file PDF ke dalam folder siswa:
   `Data Asesmen Siswa 7E 7F 9E 9F 9G 9H 2026-2027/{Kelas}/{Nama Siswa}/`
2. Jalankan perintah:
   ```bash
   npm run bulk-upload
   ```
3. File langsung tersinkronisasi ke cloud dan siap diunduh oleh siswa.
