# EduBuz Frontend

Diperbarui 27 September 2026. SPA React 19 + TypeScript + Vite + Tailwind dengan Supabase Auth dan REST API Express.

## Setup

Jalankan dari folder frontend-vite. Gunakan runtime Node yang kompatibel dengan dependency pada package-lock.json.

```powershell
npm ci
npm run dev
```

Vite menggunakan port 5175 dengan strictPort. Buat .env lokal:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
VITE_API_URL=http://localhost:5000
```

Variabel VITE masuk ke browser; jangan gunakan service-role key. Restart Vite setelah mengubah environment. Backend, reward dan layanan model memiliki proses terpisah; lihat [README utama](../README.md).

## Route aktif

main.tsx menginisialisasi tema lalu memasang RouterProvider dari [routes.ts](src/routes.ts). App.tsx adalah pohon route alternatif yang tidak dipakai oleh entry ini.

| Route | Halaman |
| --- | --- |
| / | Landing dengan navigasi sesuai sesi |
| /role-selection | Pilih peran |
| /login/:role | Login |
| /register | Registrasi |
| /forgot-password | Kirim tautan pemulihan lewat email Supabase |
| /reset-password | Validasi pengguna, ubah password dan logout |
| /student/chat | Chat, strike, XP/EXP, feedback Membantu |
| /student/avatars | Ringkasan, preview sampai tiga kartu, 30 riwayat EXP dan panduan reward |
| /student/avatars/collection | Seluruh koleksi kartu |
| /teacher/dashboard | Siswa/notifikasi/reset strike sesuai sekolah |
| /parent/dashboard | Dashboard dengan data statis |
| * | NotFound |

Profile.tsx belum terpasang di route aktif. Route lazy memakai ProtectedRoute untuk verifikasi sesi/peran melalui GET /api/auth/me; API tetap memeriksa token dan hak akses.

## Komponen dan data

- [apiClient.ts](src/services/apiClient.ts): bearer Supabase, timeout umum 15 detik/chat 190 detik, normalisasi GET/chat, feedback dan API avatar.
- [AccountMenu](src/components/AccountMenu.tsx): dialog akun, poin, navigasi, tema dan logout.
- [useHomeAccount](src/hooks/useHomeAccount.ts): mengikuti sesi Supabase dan profil; localStorage bukan bukti autentikasi.
- [useTheme](src/hooks/useTheme.ts): class dark, colorScheme dan preferensi edubuz_theme yang tersinkron antar komponen/tab. Preferensi tersimpan didahulukan dari preferensi sistem saat inisialisasi.
- [AvatarCard](src/components/AvatarCard.tsx), [ExpHistory](src/components/ExpHistory.tsx), [RewardGuide](src/components/RewardGuide.tsx), [HelpfulFeedback](src/components/HelpfulFeedback.tsx): UI koleksi, transaksi WIB, aktivitas reward dan feedback.

XP total menentukan level, sedangkan EXP tersedia untuk membeli avatar. Harga/kepemilikan/saldo berasal dari server. Feedback memakai request ID chat yang sama ketika dicoba ulang. Riwayat chat disimpan di state komponen, bukan tabel percakapan persisten. Counter streak/badge/statistik pada normalisasi belum menjadi data persisten.

Ilustrasi dan label dekoratif kartu dapat diubah melalui [panduan avatar](public/avatars/README.md). Mengubah desain kartu tidak mengubah katalog/harga database atau emoji profil.

## Pemeriksaan

```powershell
npm run build
npm run lint
npm run preview
```

28 September 2026: build berhasil dengan peringatan chunk terbesar 524.59 kB (161.27 kB gzip); lint lulus tanpa error/warning. Belum ada suite tes frontend otomatis. Lihat [hasil lengkap](../docs/06-PROJECT-TASKS.md#22-current-validation-record) dan [design system](../docs/05-DESIGN-SYSTEM.md).

## Admin dan undangan guru

/login/admin memakai Login yang sama; hasil login menentukan dashboard dari role database. /admin/dashboard memakai AdminArea dan menampilkan sekolah, guru, undangan dan kontrol akses. /accept-invite menerima sesi dari tautan Supabase dan meminta password baru. Parent tetap didukung; tidak ada pilihan admin/guru pada registrasi publik. [Panduan setup](../docs/07-ADMIN-SETUP.md).

Tes browser admin: test/admin.browser.cjs memakai Edge headless dan HTTP fixture; perintah terdapat di panduan setup. Tes mencakup redirect role, login, sekolah, undangan, transfer/disable guru, aktivasi dan tampilan 390px. Tidak mengirim email atau mengakses Supabase live.
