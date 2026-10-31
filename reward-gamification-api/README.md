# EduBuz Reward & Gamification API

Diperbarui 27 September 2026. FastAPI stateless: menghitung reward, level dan badge. Backend Express menyimpan hasil melalui RPC Supabase; layanan ini tidak menyimpan akun, XP, saldo EXP, atau kepemilikan avatar.

## Install dan jalankan lokal

Dari folder reward-gamification-api:

```powershell
python -m venv .venv-local
.\.venv-local\Scripts\python.exe -m pip install -r requirements.txt
.\start-local.ps1
```

start-local.ps1 memakai .venv-local dan membuka 127.0.0.1:8002. Jika script PowerShell diblokir, jalankan Python langsung:

```powershell
.\.venv-local\Scripts\python.exe -m uvicorn reward_api:app --host 127.0.0.1 --port 8002
```

Environment .venv lama juga bisa digunakan dengan mengganti path interpreter jika masih valid. Script start-local.ps1 khusus memakai .venv-local. requirements.txt tetap deklarasi umum; requirements-tested.txt mematok tiga dependency utama dari lingkungan lokal, bukan lockfile seluruh dependency transitif. .env.example tersedia. Clean install/lintas versi belum diverifikasi.

## Konfigurasi

Backend .env:

```env
GAMIFICATION_API_URL=http://127.0.0.1:8002
GAMIFICATION_API_KEY=
```

REWARD_API_KEY pada proses Python bersifat opsional; kosong berarti endpoint reward/badge tanpa autentikasi. Jika diaktifkan, isi GAMIFICATION_API_KEY backend dengan nilai yang sama. Contoh pengaturan PowerShell memakai placeholder:

```powershell
$env:REWARD_API_KEY = 'YOUR_LOCAL_REWARD_KEY'
.\start-local.ps1
```

Python membaca environment proses dan tidak memuat .env otomatis. PORT default 8002 digunakan pada python reward_api.py; jika memakai Uvicorn CLI, --port menentukan port listener. Restart layanan terkait setelah perubahan. Layanan reward sendiri tidak memerlukan Kaggle/ngrok. Moderasi dan generator adalah dependency terpisah backend.

## Endpoint dan kontrak

| Endpoint | Perilaku |
| --- | --- |
| GET / | Informasi service/version/endpoints |
| GET /health | Liveness publik, stateless: true |
| POST /reward/evaluate | event, current_xp >= 0, moderation_label opsional, feedback opsional, request_id opsional |
| POST /reward/badges | conversation_count, helpful_feedback_count, challenge_count, streak_days >= 0; default 0 |

POST memakai Authorization: Bearer jika REWARD_API_KEY diatur. Model tidak valid atau helpful_feedback tanpa feedback menghasilkan 422; key salah menghasilkan 401. Label yang diterima NON_TOXIC/TOXIC. Label kosong tidak memblokir kalkulasi; backend bertanggung jawab menentukan kelayakan sebelum meminta reward.

Respons evaluasi: reward_delta, new_xp, level, reason, safety_gate, request_id. Level berisi level/name/current_xp/next_level_xp/progress_to_next_level. Progress adalah pecahan 0..1; level tertinggi memakai next_level_xp null dan progress 1. Request ID hanya diteruskan kembali; deduplikasi persisten ada pada database backend.

| Event | XP | Status alur produk |
| --- | ---: | --- |
| conversation_completed | 1 | Chat aman yang memenuhi syarat |
| helpful_feedback | 2 | Feedback helpful; not_helpful mendapat 0 |
| challenge_completed | 20 | Kalkulator tersedia; fitur tantangan belum tersedia |
| learning_milestone | 50 | Kalkulator tersedia; fitur target belum tersedia |
| safe_interaction | 1 | Belum dipanggil sebagai reward terpisah pada chat |

TOXIC menghasilkan reward_delta 0 dan BLOCK_REWARD tanpa pengurangan XP. Sepuluh chat yang mendapat reward menghasilkan 10 XP. Reward pembelian avatar yang negatif bukan keluaran kalkulator ini; itu event EXP dari unlock_avatar.

| Minimum XP | Level | Nama |
| ---: | ---: | --- |
| 0 | 1 | Learning Explorer |
| 100 | 2 | Curious Learner |
| 250 | 3 | Active Learner |
| 500 | 4 | Problem Solver |
| 1000 | 5 | Learning Champion |

Threshold juga ada di describeLevel TypeScript dan xp_level SQL; perubahan harus selaras. Express meneruskan delta ke credit_learning_reward dan menggunakan total aktual hasil database, bukan menyimpan new_xp kalkulator secara langsung.

Badge dihitung dari statistik masukan: percakapan pertama, minimal lima feedback helpful, satu tantangan, dan streak tiga hari. Respons berisi badges/count; setiap badge berisi badge_id/name/description/condition. Kalkulasi ini tidak membuktikan adanya tracking/persistensi badge dalam produk.

## Smoke check manual

Layanan harus sudah berjalan. Contoh juga mendukung REWARD_API_KEY bila diatur pada terminal pemanggil:

```powershell
Invoke-RestMethod http://127.0.0.1:8002/health
$rewardHeaders = @{}
if ($env:REWARD_API_KEY) {
    $rewardHeaders.Authorization = "Bearer $env:REWARD_API_KEY"
}
$body = @{
    event = 'conversation_completed'
    current_xp = 0
    moderation_label = 'NON_TOXIC'
    request_id = 'test-001'
} | ConvertTo-Json
Invoke-RestMethod -Uri http://127.0.0.1:8002/reward/evaluate -Method POST -ContentType 'application/json' -Headers $rewardHeaders -Body $body
```

Ekspektasi: reward_delta 1, new_xp 1, level 1. Mengubah label menjadi TOXIC menghasilkan reward_delta 0/new_xp 0 untuk input current_xp 0. Tidak ada data Supabase yang berubah dari panggilan langsung ini.

test_reward_api.ps1 tersedia sebagai smoke script pencetak respons, tanpa assertions dan tanpa header autentikasi. Jangan menyebutnya suite regresi otomatis. Suite otomatis terpisah tersedia di test_reward_api.py. Jalankan `.\.venv-local\Scripts\python.exe -m unittest discover -p test_reward_api.py` dari folder ini; 5/5 tes lulus pada 28 September 2026. Smoke HTTP terhadap proses layanan terpisah belum dijalankan. Lihat [arsitektur](../docs/01-SYSTEM-ARCHITECTURE.md) dan [hasil pemeriksaan proyek](../docs/06-PROJECT-TASKS.md#22-current-validation-record).
