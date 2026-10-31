# Mengisi desain kartu avatar

Diperbarui 27 September 2026. Konfigurasi dipakai bersama oleh preview di `/student/avatars` dan grid lengkap di `/student/avatars/collection`.

1. Simpan gambar PNG, WebP, atau JPG di folder ini, misalnya `lion.png`.
2. Edit [src/config/avatarCards.ts](../../src/config/avatarCards.ts), pada ID avatar yang sesuai:

```ts
lion: {
  number: '001',
  name: 'Nama karakter',
  description: 'Cerita singkat karakter buatanmu.',
  image: '/avatars/lion.png',
  imageFit: 'contain',
  rarity: 'Common',
  edition: 'Seri Pertama',
},
```

Area ilustrasi menggunakan rasio 4:3; ukuran yang disarankan 1200 × 900 px.
`contain` menampilkan seluruh gambar, `cover` memenuhi area dengan memotong tepi.
PNG transparan cocok jika ingin memakai latar bawaan kartu. Tidak perlu menggambar
nama, harga, atau tombol di ilustrasi karena template sudah menyediakan semuanya.
Jika gambar kosong atau gagal dimuat, kartu menampilkan emoji avatar.

Kelangkaan dekoratif: `Common` (hijau), `Rare` (biru), `Legendary` (emas).
Nomor koleksi tetap mengikuti konfigurasi, bukan urutan harga.
Nama dan deskripsi di konfigurasi hanya mengubah tampilan kartu.
Gambar ini untuk ilustrasi kartu; avatar profil/chat masih memakai emoji dari server.
Harga EXP, kepemilikan, dan status pemakaian berasal dari database.
Menambahkan entri konfigurasi saja tidak membuat avatar baru: ID juga harus ada
di tabel `avatar_catalog`. Untuk mengganti desain avatar yang ada, tidak perlu
mengubah database.

## Katalog dan aturan tampilan

ID yang saat ini disediakan seed database: lion, panda, fox, frog, unicorn, koala, butterfly, turtle, runner, astronaut, dragon. Konfigurasi memberi nomor 001–011; delapan starter Common, runner/astronaut Rare, dan dragon Legendary. Kelangkaan hanya dekorasi.

Seed harga: starter 0 EXP, runner 100, astronaut 250, dragon 500. UI tetap memakai harga yang dikirim API, sehingga jangan mengandalkan angka di panduan ini sebagai konfigurasi harga live. Membuka avatar tidak otomatis memakainya; pengguna memilih Pakai sesudah memiliki avatar. Pembelian hanya mengurangi saldo EXP, bukan XP total atau level.

Untuk avatar baru, tambahkan katalog melalui migrasi database yang sesuai, kemudian desain berdasarkan ID yang sama. Gambar kartu tidak menggantikan emoji profil. Lihat [migration 004](../../../supabase/migrations/004_avatar_economy.sql) untuk seed awal dan [design system](../../../docs/05-DESIGN-SYSTEM.md) untuk komponen/states.
