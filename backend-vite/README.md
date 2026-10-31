# EduBuz Backend

Diperbarui 27 September 2026. Express + TypeScript, REST API dengan Supabase Auth/PostgreSQL dan integrasi HTTP moderasi, generator, serta reward.

## Setup

Jalankan dari backend-vite:

```powershell
npm ci
npm run dev
```

Buat .env lokal dengan nilai milik lingkungan pengembangan:

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

Port 8000/8001 di atas hanya contoh alamat layanan model eksternal. Gunakan URL/key aktual layanan tersebut; server model tidak disertakan. GAMIFICATION_API_KEY harus sama dengan REWARD_API_KEY bila autentikasi reward diaktifkan. Semua key server tetap di backend, bukan environment browser. Restart backend setelah perubahan environment.

## Prasyarat database

Periksa riwayat penerapan sebelum menjalankan migrasi. Urutan sumber: 001, 002, [003 bersarang](../supabase/migrations/supabase/migrations/003_profile_gamification.sql), lalu [004](../supabase/migrations/004_avatar_economy.sql), [005](../supabase/migrations/005_profile_access.sql), dan [006](../supabase/migrations/006_atomic_strikes.sql), sesuai [manifest](../supabase/migrations.json). Runner biasa mungkin tidak menemukan 003. Migration 004 tidak dirancang untuk dijalankan ulang tanpa pemeriksaan.

Backend memerlukan exp_spent, avatar_catalog, user_avatars, equipped_avatar_id, serta RPC credit_learning_reward/unlock_avatar/equip_avatar dan record_student_strike/reset_student_strikes. Migrasi 005 membatasi akses profil; 006 membuat strike/notifikasi dan reset/audit atomik. Database hanya sampai 003 tidak memenuhi kontrak saat ini. XP adalah total seumur pemakaian; EXP = xp - exp_spent. Kredit reward dan pembelian memakai transaksi/row lock bersama agar replay tidak menggandakan kredit atau biaya. Verifikasi penerapannya pada database sebelum menganggap fitur siap.

## Endpoint

| Prefix | Fungsi / akses |
| --- | --- |
| GET /, /health, /api/health | Publik: discovery/liveness |
| POST /api/auth/register, /api/auth/login | Publik: Supabase auth dan profil |
| POST /api/chat | Bearer valid dan tidak diblokir; input/output moderation |
| GET /api/me/strikes, /api/me/gamification | Status milik identitas terautentikasi |
| POST /api/me/gamification/feedback | helpful/not_helpful, requestId wajib (maksimal 200 karakter) |
| GET /api/me/avatars | Koleksi, saldo, avatar aktif, 30 event terbaru |
| POST /api/me/avatars/:avatarId/unlock | Body kosong atau {}; harga/saldo dari SQL |
| POST /api/me/avatars/:avatarId/equip | Body kosong atau {}; harus sudah dimiliki |
| /api/teacher/* | Bearer + peran teacher, query sesuai sekolah |

Detail payload/status: [arsitektur API](../docs/01-SYSTEM-ARCHITECTURE.md#10-api-architecture). /api/me dan chat mewajibkan peran student. Feedback hanya diterima untuk percakapan aman milik pengguna yang sudah mendapat reward; ID tidak valid menghasilkan 400 dan tidak memenuhi syarat 409. Registrasi guru publik ditolak; guru disediakan administrator. Sekolah sekarang berasal dari schools.id; registrasi baru tidak lagi menentukan sekolah dari domain email. GET /api/auth/me menyediakan profil terverifikasi untuk proteksi route.

Kegagalan moderasi tidak memberi strike dan tidak melanjutkan ke generator; output berbahaya tidak memberi strike siswa. Tiga strike memblokir akun. Kegagalan reward tidak membatalkan jawaban aman, sehingga respons chat berhasil belum membuktikan XP tersimpan.

supabaseAdmin hanya untuk operasi server; login menggunakan createLoginClient() baru per request. Jangan melakukan signInWithPassword/setSession pada admin client bersama.

## Menjalankan dan memeriksa

```powershell
npm run build
npm start
```

npm start memakai dist/server.js hasil build. Untuk pengembangan gunakan npm run dev. CORS_ORIGINS mengatur origin yang diizinkan, default http://localhost:5175 dan http://127.0.0.1:5175; /health hanya liveness backend, bukan pemeriksaan seluruh dependency.

```powershell
npm test
```

28 September 2026: build berhasil dan 16/16 tes lokal lulus, termasuk kontrak model/RPC, isolasi login, CORS, role, feedback, avatar, sekolah dan alur moderasi. Lihat [catatan validasi](../docs/06-PROJECT-TASKS.md#22-current-validation-record). Tidak ada klaim bahwa PostgreSQL/RLS/layanan AI live telah teruji.

## Admin dan sekolah

Backend membutuhkan migrasi 007 setelah 006. APP_URL menentukan origin frontend untuk redirect /accept-invite; allowlist URL tersebut di Supabase. /api/admin/* wajib requireAuth + requireRole('admin'). Semua undangan diproses server-side; jangan masukkan service-role key ke frontend. POST /api/auth/accept-invite hanya untuk teacher terautentikasi. [Daftar endpoint, setup admin pertama dan penanganan kegagalan](../docs/07-ADMIN-SETUP.md).

Validasi setelah fitur admin: build lulus; 21/21 tes backend lulus. Supabase live/email belum dihubungi.
