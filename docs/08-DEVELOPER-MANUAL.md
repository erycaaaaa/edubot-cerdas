# Manual Book Developer — EduBuz Chatbot dari Versi Awal sampai Running

Dokumen ini dibuat sebagai panduan developer untuk membangun ulang, menjalankan, dan memahami chatbot EduBuz dari tahap awal sampai aplikasi bisa dipakai secara lokal. Dokumen ini merangkum alur setup, konfigurasi, integrasi layanan, dan cara kerja sistem yang sudah ada di repositori ini.

Catatan penting:
- Dokumentasi source di repo ini lebih diutamakan daripada catatan umum.
- Migrasi Supabase harus diterapkan sesuai urutan yang benar; jangan melewatkan langkah.
- Chatbot EduBuz membutuhkan 3 komponen utama yang berjalan bersamaan: frontend, backend Node/Express, dan reward API Python.
- Layanan moderasi dan generator adalah dependency eksternal; app tidak menyertakan server modelnya.

## 1. Tujuan dan cakupan

Tujuan dari manual ini adalah membantu developer untuk:
- memahami struktur aplikasi EduBuz;
- menyiapkan environment dari nol;
- menjalankan chatbot secara lokal;
- menghubungkan frontend, backend, Supabase, dan reward service;
- memecahkan masalah saat setup atau pengembangan;
- mengetahui alur kerja aplikasi secara lengkap.

Aplikasi yang dibahas adalah sistem pendidikan berbasis chat yang mencakup:
- login/register;
- chat siswa dengan moderasi input/output;
- mekanisme strike dan pembatasan akun;
- reward XP/EXP;
- avatar dan pembelian avatar;
- admin sekolah dan undangan guru;
- monitoring dari teacher dan parent dashboard.

## 2. Arsitektur aplikasi

EduBuz terdiri dari beberapa komponen utama:

1. Frontend React + Vite
   - Folder: `frontend-vite`
   - Port lokal: 5175
   - Fungsi: UI untuk login, register, chat, avatar, dashboard admin/guru/orang tua.

2. Backend Express + TypeScript
   - Folder: `backend-vite`
   - Port lokal: 5000
   - Fungsi: autentikasi, REST API, validasi request, integrasi dengan Supabase, moderasi, generator, reward, dan logika chat.

3. Reward API Python (FastAPI)
   - Folder: `reward-gamification-api`
   - Port lokal: 8002
   - Fungsi: menghitung reward XP, badge, dan level dari aktivitas user.

4. Supabase PostgreSQL
   - Fungsi: database utama, auth, RLS, profil user, transaksi reward, avatar, school, strike, dan admin access.

5. Layanan eksternal moderasi + generator
   - Tidak ada di repo ini.
   - Backend akan memanggil HTTP endpoint eksternal untuk moderasi input/output dan generasi jawaban.

Diagram alur sederhana:

```text
User -> Frontend -> Backend -> Supabase
                         -> Moderation API
                         -> Generator API
                         -> Reward API
```

## 3. Persyaratan perangkat

Sebelum mulai, pastikan perangkat Anda sudah memiliki:
- Node.js LTS
- npm
- Python 3.10+ (disarankan 3.11 atau 3.12)
- Git
- Editor seperti VS Code
- Akun Supabase aktif
- Akses ke endpoint moderasi dan generator yang akan dipakai

Validasi cepat:

```powershell
node -v
npm -v
python --version
```

Jika versi belum sesuai, install ulang atau sesuaikan dengan project requirement.

## 4. Clone project dan struktur folder

Clone repository dari Git:

```powershell
git clone <repo-url>
cd edubuz
```

Struktur utama yang relevan:

```text
frontend-vite/
backend-vite/
reward-gamification-api/
SUPABASE/
/docs/
README.md
```

Folder penting:
- `frontend-vite/src/routes.ts` = route utama frontend
- `backend-vite/src/server.ts` = entry backend Express
- `backend-vite/src/controllers/*` = handler request HTTP
- `backend-vite/src/services/*` = logic service
- `reward-gamification-api/reward_api.py` = reward API
- `supabase/migrations/` = schema database

## 5. Setup database Supabase

Langkah ini sangat penting sebelum menjalankan backend.

### 5.1 Buat project Supabase baru

- Masuk ke Supabase
- Buat project baru
- Catat:
  - project URL
  - anon key
  - service role key

### 5.2 Terapkan migration database

Urutan migrasi yang benar adalah:

```text
001_strikes_notifications.sql
002_profile_strike_columns.sql
003_profile_gamification.sql
004_avatar_economy.sql
005_profile_access.sql
006_atomic_strikes.sql
007_admin_schools.sql
```

Catatan penting:
- file `003_profile_gamification.sql` berada di path nested:
  `supabase/migrations/supabase/migrations/003_profile_gamification.sql`
- jangan abaikan file ini
- migrasi harus dijalankan secara berurutan sesuai manifest `supabase/migrations.json`
- migrasi 007 diperlukan untuk fitur admin/sekolah

Cara mengeksekusi di Supabase SQL editor:
- buka SQL Editor
- jalankan migration satu per satu sesuai urutan
- pastikan tidak ada error SQL

Untuk project baru, lakukan secara manual agar struktur RLS, trigger, fungsi, dan tabel muncul dengan benar.

### 5.3 Verifikasi hasil apply migration

Pastikan di database sudah ada tabel-tabel penting seperti:
- `profiles`
- `schools`
- `user_avatars`
- `avatar_catalog`
- `exp_transactions`
- `student_strikes`
- `notification_logs`
- `profiles` dengan kolom akses admin dan relasi sekolah

Cek juga bahwa fungsi RPC seperti:
- `credit_learning_reward`
- `unlock_avatar`
- `equip_avatar`
- `reset_student_strikes`

sudah tersedia.

## 6. Setup environment frontend

Masuk ke folder frontend:

```powershell
cd frontend-vite
npm ci
```

Buat file `.env` di `frontend-vite/.env`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
VITE_API_URL=http://localhost:5000
```

Jangan memakai service-role key di frontend. Variabel browser hanya untuk anon key dan API URL.

Jalankan frontend:

```powershell
npm run dev
```

Frontend akan tampil di:
- http://localhost:5175

## 7. Setup environment backend

Masuk ke folder backend:

```powershell
cd backend-vite
npm ci
```

Buat file `backend-vite/.env`:

```env
PORT=5000
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_SERVICE_ROLE_KEY
MODERATION_API_URL=http://127.0.0.1:8000
MODERATION_API_KEY=
MODERATION_TIMEOUT=30000
GENERATOR_API_URL=http://127.0.0.1:8001
GENERATOR_API_KEY=
GENERATOR_TIMEOUT=180000
GAMIFICATION_API_URL=http://127.0.0.1:8002
GAMIFICATION_API_KEY=
```

Penjelasan:
- `SUPABASE_SERVICE_ROLE_KEY` hanya dipakai di backend
- `MODERATION_API_URL` dan `GENERATOR_API_URL` adalah endpoint eksternal model
- `GAMIFICATION_API_URL` adalah reward service FastAPI
- `GAMIFICATION_API_KEY` harus sama dengan key reward service jika autentikasi aktif

Jalankan backend untuk mode dev:

```powershell
npm run dev
```

Untuk build production:

```powershell
npm run build
npm start
```

Backend default port:
- http://localhost:5000

## 8. Setup reward API Python

Masuk ke folder reward service:

```powershell
cd reward-gamification-api
python -m venv .venv-local
.\.venv-local\Scripts\python.exe -m pip install -r requirements.txt
```

Jalankan service:

```powershell
.\.venv-local\Scripts\python.exe -m uvicorn reward_api:app --host 127.0.0.1 --port 8002
```

Atau jika ada script `start-local.ps1`, langsung jalankan:

```powershell
./start-local.ps1
```

Pastikan environment service reward memiliki key jika backend menggunakannya:

```powershell
$env:REWARD_API_KEY = 'YOUR_LOCAL_REWARD_KEY'
```

Reward API hanya menghitung reward secara stateless; data XP/EXP sebenarnya disimpan di database melalui Express backend dan RPC Supabase.

## 9. Langkah menjalankan semua komponen

Setelah semua environment siap, jalankan urutan berikut:

### 9.1 Jalankan Supabase
- project sudah aktif
- migrasi sudah diterapkan
- schema database siap

### 9.2 Jalankan reward API

```powershell
cd reward-gamification-api
.\.venv-local\Scripts\python.exe -m uvicorn reward_api:app --host 127.0.0.1 --port 8002
```

### 9.3 Jalankan backend

```powershell
cd backend-vite
npm run dev
```

### 9.4 Jalankan frontend

```powershell
cd frontend-vite
npm run dev
```

### 9.5 Cek liveness endpoint

Backend:

```powershell
Invoke-RestMethod http://localhost:5000/health
```

Reward API:

```powershell
Invoke-RestMethod http://127.0.0.1:8002/health
```

## 10. Alur chatbot EduBuz sebenarnya

Berikut alur kerja utama chatbot dari sisi user:

1. User masuk ke frontend dan login/register
2. Frontend memanggil backend API
3. Backend memvalidasi session user dan role
4. User mengirim chat ke `/api/chat`
5. Backend menerima pesan dan memeriksa moderation
6. Jika input aman, backend memanggil generator API
7. Response dari model dikirim kembali ke frontend
8. Backend memeriksa hasil output untuk moderasi akhir
9. Jika aman, chat dijadikan jawaban yang dikirim user
10. Backend mengevaluasi reward, XP, level, dan badge
11. Reward API menghitung delta XP
12. Backend menyimpan hasil ke Supabase melalui RPC/database transaction
13. User melihat saldo XP/EXP, level, dan avatar yang mungkin bisa dibeli

Flow penting:
- reward tidak dipicu jika chat berbahaya
- not safe message tidak menambah XP
- feedback helpful menghasilkan reward tambahan bila syarat terpenuhi
- replay requestId yang sama tidak menambah reward yang dobel

## 11. Endpoint penting yang harus diketahui

### Frontend API
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/chat`
- `GET /api/me/strikes`
- `GET /api/me/gamification`
- `POST /api/me/gamification/feedback`
- `GET /api/me/avatars`
- `POST /api/me/avatars/:avatarId/unlock`
- `POST /api/me/avatars/:avatarId/equip`

### Admin API
- `/api/admin/*`
- memerlukan `requireAuth` dan `requireRole('admin')`

### Teacher API
- `/api/teacher/*`
- mengelola siswa, notifikasi, reset strike, dan sekolah

### Reward API
- `GET /health`
- `POST /reward/evaluate`
- `POST /reward/badges`

## 12. Alur admin dan guru

Admin sekolah memiliki peran terpisah dari public registration.

Langkah setup admin awal:
1. Terapkan migration 007
2. Siapkan `APP_URL` untuk redirect undangan
3. Atur konfigurasi email Supabase agar flow undangan bisa berjalan
4. Buat admin pertama secara manual di database
5. Login ke `/login/admin`
6. Masuk ke `/admin/dashboard`
7. Kelola sekolah, guru, undangan, dan akses

Catatan:
- Guru tidak bisa mendaftar public seperti siswa
- Undangan guru diproses server-side
- Role admin harus berasal dari profil database

## 13. Cara kerja reward, level, dan avatar

### Reward
Reward API menerima event seperti:
- `conversation_completed`
- `helpful_feedback`
- `challenge_completed`
- `learning_milestone`
- `safe_interaction`

Contoh logika level:
- level 1 = 0 XP
- level 2 = 100 XP
- level 3 = 250 XP
- level 4 = 500 XP
- level 5 = 1000 XP

### EXP dan avatar
- total XP menentukan level
- EXP dapat dibelanjakan untuk avatar
- pembelian avatar memotong saldo EXP tanpa mengurangi XP total
- semua transaksi harus konsisten dengan database/SQL logic

### Badge
Badge didasarkan pada statistik seperti:
- first conversation
- helpful feedback minimal 5
- 1 challenge
- streak 3 hari

Badge ini diproduksi oleh reward service dan bisa dipakai untuk UI/logic ke depan.

## 14. Langkah validasi dan testing

### Backend

```powershell
cd backend-vite
npm test
```

### Frontend

```powershell
cd frontend-vite
npm run build
npm run lint
```

### Reward API

```powershell
cd reward-gamification-api
.\.venv-local\Scripts\python.exe -m unittest discover -p test_reward_api.py
```

Catatan penting:
- build dan test lokal adalah indikasi validasi source-based, bukan jaminan operasi produksi live
- database live, email, AI service, dan Supabase runtime belum tentu teruji dalam mesin lokal Anda

## 15. Troubleshooting umum

### Error login / auth tidak masuk
- cek `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY`
- cek `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`
- pastikan user profile sudah dibuat di database
- pastikan role sesuai dengan route yang dipanggil

### Backend error 500 / database error
- cek migrasi belum selesai
- cek fungsi RPC ada atau belum dibuat
- cek `SUPABASE_SERVICE_ROLE_KEY` benar
- cek kolom tabel sesuai skema

### Chat tidak merespon
- cek `MODERATION_API_URL` dan `GENERATOR_API_URL`
- cek endpoint eksternal aktif
- cek timeout dan key API moderasi/generator
- cek backend logs

### Reward API tidak merespons
- cek port 8002
- cek Python virtual environment
- cek `uvicorn` atau `start-local.ps1`
- cek `REWARD_API_KEY` jika backend mengharuskan autentikasi

### Frontend tidak bisa akses API
- cek `VITE_API_URL`
- cek CORS backend
- pastikan backend sudah running di port 5000
- cek access token Supabase valid

## 16. Workflow pengembangan yang disarankan

Untuk proyek ini, workflow yang aman adalah:

1. Update requirement/feature di docs jika ada perubahan behavior
2. Modifikasi backend atau service sesuai contract
3. Validasi schema/database terhadap migrasi
4. Jalankan unit/integration test yang relevan
5. Jalankan build frontend/backend
6. Uji alur nyata mulai login sampai chat dan reward
7. Pastikan admin/guru flow juga berjalan
8. Update dokumentasi bila ada perubahan fungsi

## 17. Checklist sebelum demo atau deployment

Pastikan hal berikut sudah siap:
- Supabase project aktif dan migrasi final sudah diterapkan
- `APP_URL` dan redirect email Supabase sudah diatur
- admin pertama dibuat
- semua env sudah benar
- reward service berjalan
- backend berjalan
- frontend berjalan
- endpoint moderasi dan generator aktif
- login student, teacher, admin, parent bisa diakses
- reward XP/EXP dan avatar transaksi tersimpan dengan benar
- notifikasi dan strike dapat dipantau

## 18. Kesimpulan

EduBuz bukan hanya chatbot sederhana, tetapi gabungan dari:
- UI frontend,
- backend REST,
- database Supabase,
- reward service Python,
- AI moderation dan generator,
- sistem akun dan admin,
- mekanisme gamifikasi.

Untuk membangunnya dari awal, developer harus memerhatikan tiga hal utama:
1. lingkungan database dan migrasi,
2. koneksi service/frontend/backend,
3. keamanan dan validasi request/role.

Jika semua tiga terpenuhi, chatbot akan bisa dijalankan secara lokal dengan struktur yang stabil dan dapat dikembangkan lebih lanjut.

## 19. Snapshot verifikasi kode saat ini

Berdasarkan audit terhadap kode sumber dan eksekusi lokal yang dilakukan pada repositori saat ini:

- Frontend build dengan `npm.cmd run build` dari `frontend-vite` berhasil.
- Frontend lint dengan `npm.cmd run lint` dari `frontend-vite` berhasil.
- Backend build dengan `npm.cmd run build` dari `backend-vite` berhasil.
- Backend test dengan `npm.cmd test` dari `backend-vite` berhasil: `21 passed, 0 failed`.
- Alur chat menandai jawaban bot sebagai berhasil hanya ketika backend mengembalikan `status === 'OK'` dan payload `gamification` tersedia; saat itu `requestId` dipasang ke objek pesan bot untuk validasi feedback.
- UI feedback hanya memanggil endpoint `POST /api/me/gamification/feedback` dengan `feedback: 'helpful'` dan `requestId`; tidak ada tombol `not_helpful` di komponen saat ini.
- Aturan kelayakan feedback dijalankan di backend, bukan di browser. `recordFeedback()` memverifikasi adanya `conversation_completed` yang aman, milik siswa, dan memiliki `reward_delta > 0` sebelum menambahkan reward feedback.
- Dokumentasi yang menyebutkan feedback tidak memverifikasi eligibilitas sudah tidak lagi sesuai dengan source code dan harus dianggap stale.
- Layanan moderasi dan generator tetap dependency eksternal; backend harus gagal tertutup bila salah satu layanan tidak tersedia.

Catatan penting untuk developer:
- Kode adalah sumber kebenaran utama dibandingkan arsip lama atau dokumen sekunder.
- Semua reward dan deduplikasi request ID masih diurus di backend/Supabase; frontend hanya menampilkan dan menyampaikan payload yang dikembalikan server.
- Aktivitas yang mengubah data produksi (misalnya reward, strike, avatar, admin access) tidak boleh dibuat dengan logika browser yang mengandalkan state lokal.

## 20. Referensi utama dalam repositori

- [README utama](../README.md)
- [System Architecture](01-SYSTEM-ARCHITECTURE.md)
- [Project Memory](02-PROJECT-MEMORY.md)
- [PRD](03-PRD-ACADEMIC-PRODUCTIVITY.md)
- [Development Rules](04-DEVELOPMENT-RULES.md)
- [Design System](05-DESIGN-SYSTEM.md)
- [Project Tasks](06-PROJECT-TASKS.md)
- [Admin Setup](07-ADMIN-SETUP.md)
- [README frontend](../frontend-vite/README.md)
- [README backend](../backend-vite/README.md)
- [README reward API](../reward-gamification-api/README.md)

Dokumen ini disusun sebagai panduan developer dari versi awal hingga aplikasi bisa berjalan lengkap. Update dokumen ini bila ada perubahan arsitektur, endpoint, atau flow konfigurasi.
