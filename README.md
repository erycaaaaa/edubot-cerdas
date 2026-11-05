# EduBot Cerdas

EduBot Cerdasadalah aplikasi chat pembelajaran dengan moderasi input/output, strike siswa, pemantauan guru, reward XP, saldo EXP, dan koleksi avatar. Antarmuka juga memakai nama EduBot/Bingo dan materi PJOK.

Diperbarui 28 September 2026 berdasarkan kode lokal. Status implementasi dibedakan dari hasil pengujian dan penerapan di server.

## Fitur yang sudah dibuat

- Registrasi/login melalui Supabase, proteksi route berdasarkan sesi/peran, menu akun, logout, dan tema terang/gelap tersimpan. Registrasi publik menolak peran guru; akun guru harus disediakan administrator.
- Chat melalui REST, moderasi sebelum/sesudah jawaban, tiga strike untuk pemblokiran, serta notifikasi dan reset oleh guru dalam sekolah yang sama.
- +1 XP untuk chat yang mendapat reward dan +2 XP untuk feedback Membantu pada percakapan aman milik siswa yang sudah mendapat reward. requestId wajib dan replay tidak menambah reward. XP total menentukan level; saldo EXP = XP total dikurangi EXP yang sudah dibelanjakan.
- Ringkasan avatar dengan preview tiga kartu, koleksi lengkap, buka/pakai avatar, panduan reward, dan 30 transaksi EXP terbaru dalam WIB.
- Transaksi database untuk kredit reward dan pembelian avatar. Pembelian memakai EXP tanpa menurunkan XP total atau level.

Dashboard orang tua masih memakai data statis. Pemulihan password sudah memakai email Supabase dan halaman reset; pengiriman email dan alur browser belum diverifikasi. Tantangan, milestone, streak/badge persisten, catatan, tugas akademik, dan kalender belum merupakan fitur lengkap.

## Admin pusat

Buka `/login/admin` untuk masuk, lalu `/admin/dashboard` untuk mengelola sekolah, mengundang/memindahkan guru, dan mengaktifkan/menonaktifkan akses guru. Role admin berasal dari profil database; tidak ada registrasi admin publik. Parent tetap didukung.

Sebelum digunakan, terapkan migrasi **007**, atur `APP_URL` dan redirect email Supabase, lalu buat admin pertama secara manual. Ikuti [panduan admin dan laporan implementasi](docs/07-ADMIN-SETUP.md). ID sekolah lama dipertahankan; registrasi baru tidak lagi memakai domain email sebagai sekolah. Penempatan siswa baru dilakukan melalui proses administratif tepercaya, belum melalui UI.

## Struktur dan layanan

| Folder | Teknologi / peran | Port lokal |
| --- | --- | --- |
| [frontend-vite](frontend-vite/README.md) | React 19, TypeScript, Vite, Tailwind; entry main.tsx -> routes.ts | 5175 |
| [backend-vite](backend-vite/README.md) | Express REST, Supabase Auth/database, orkestrasi AI dan ekonomi avatar | 5000 |
| [reward-gamification-api](reward-gamification-api/README.md) | FastAPI stateless untuk perhitungan reward/level/badge | 8002 |
| supabase/migrations | Skema, RLS, grant dan RPC | Supabase |
| Dataset | Berkas IndoSafety untuk penelitian; bukan layanan runtime | — |

Moderasi dan generator adalah layanan HTTP eksternal; implementasi server model tidak disertakan. Backend aktif tidak menggunakan Socket.IO atau n8n. Root tidak memiliki package.json aktif: jalankan perintah dari folder komponen.

## Menjalankan lokal

1. Siapkan Supabase dan periksa riwayat migrasinya. Untuk setup baru, urutan sumber adalah 001 -> 002 -> [003 yang berada di folder bersarang](supabase/migrations/supabase/migrations/003_profile_gamification.sql) -> [004 avatar economy](supabase/migrations/004_avatar_economy.sql). Lanjutkan dengan [005 akses profil](supabase/migrations/005_profile_access.sql) dan [006 strike atomik](supabase/migrations/006_atomic_strikes.sql), sesuai [manifest](supabase/migrations.json). Lanjutkan ke [007 admin/sekolah](supabase/migrations/007_admin_schools.sql). Backend sekarang memerlukan migrasi sampai 007; jangan menjalankan ulang 004 tanpa memeriksa status karena skripnya tidak idempoten.
2. Isi environment frontend/backend sesuai [inventaris konfigurasi](docs/01-SYSTEM-ARCHITECTURE.md#13-environment-configuration). Jangan masukkan service-role key ke variabel VITE.
3. Jalankan reward API mengikuti README layanan, lalu backend dengan npm ci dan npm run dev dari backend-vite.
4. Jalankan npm ci dan npm run dev dari frontend-vite, lalu buka http://localhost:5175. Endpoint moderasi/generator harus tersedia agar chat dapat menghasilkan jawaban.

Petunjuk rinci dan contoh environment ada pada README masing-masing komponen. CORS backend secara default menerima localhost/127.0.0.1 pada port 5175; gunakan CORS_ORIGINS untuk daftar origin tambahan.

## Dokumentasi pengembangan

1. [System Architecture](docs/01-SYSTEM-ARCHITECTURE.md) — layanan, route, API, skema, transaksi, environment.
2. [Project Memory](docs/02-PROJECT-MEMORY.md) — keadaan implementasi, keputusan dan keterbatasan.
3. [Product Requirements](docs/03-PRD-ACADEMIC-PRODUCTIVITY.md) — fitur saat ini dan usulan masa depan.
4. [Development Rules](docs/04-DEVELOPMENT-RULES.md) — aturan kontrak, database, UI dan perintah pengembangan.
5. [Design System](docs/05-DESIGN-SYSTEM.md) — palet, tema, komponen, kartu dan status UI.
6. [Project Tasks](docs/06-PROJECT-TASKS.md) — status pekerjaan dan bukti verifikasi.
7. [Reward & Gamification](docs/10-REWARD-GAMIFICATION.md) — alur reward, level dan badge, serta mekanisme keamanan dan persistence.

Panduan ilustrasi: [kartu avatar](frontend-vite/public/avatars/README.md). Kode adalah acuan implementasi; perbarui dokumen ketika perilaku berubah. docs.zip adalah arsip distribusi lama dan belum disinkronkan pada pembaruan ini; gunakan berkas Markdown di docs sebagai acuan.

## Hasil pemeriksaan 28 September 2026

Build frontend/backend dan lint frontend lulus; 21/21 tes backend dan 5/5 tes reward Python lulus. Build frontend masih memperingatkan chunk 524.81 kB. Tes migrasi/admin/RLS dijalankan pada PostgreSQL PGlite sementara dan tes browser admin memakai fixture. Docker dan Supabase live belum diuji. Detail ada pada [catatan validasi](docs/06-PROJECT-TASKS.md#22-current-validation-record). Migrasi live, layanan AI eksternal dan pengiriman email sungguhan belum diverifikasi; tes browser admin memakai fixture.
