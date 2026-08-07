# IR Souvenir Stock Management System

Aplikasi web statis untuk mendigitalisasi logbook stok souvenir dari Excel ke sistem online berbasis Supabase.

## Stack

- HTML5
- Bootstrap 5
- Bootstrap Icons
- Vanilla JavaScript ES Modules
- Supabase JavaScript SDK
- PostgreSQL Supabase
- GitHub Pages

Tidak membutuhkan PHP, Laravel, Express, Node.js backend, Firebase, atau Google Apps Script.

## Struktur Folder

```text
/assets
/css
/js
/components
/pages
/services
/utils
/data
/docs
/supabase
index.html
login.html
dashboard.html
items.html
incoming.html
outgoing.html
history.html
reports.html
```

## File Penting

- `js/config.js`: konfigurasi Supabase Project URL dan anon key.
- `supabase/schema.sql`: schema database, trigger stok, RLS, dan generator kode barang.
- `supabase/seed_sheet2.sql`: seed master barang dari Sheet2.
- `data/items_sheet2.csv`: hasil ekstraksi 48 barang dari Sheet2.
- `data/transactions_sheet2.csv`: transaksi historis yang terlihat dari Sheet2.
- `docs/sheet2-digitalization-analysis.md`: catatan analisis Sheet2.

## Setup Supabase

1. Buat project baru di Supabase.
2. Buka SQL Editor.
3. Jalankan `supabase/schema.sql`.
4. Jalankan `supabase/seed_sheet2.sql` untuk mengisi master barang dari Sheet2.
5. Buka Authentication > Users, lalu buat user login.
6. Buka Project Settings > API.
7. Salin Project URL dan anon public key ke `js/config.js`.

```js
export const SUPABASE_URL = 'https://PROJECT_ID.supabase.co';
export const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
```

## Menjalankan Lokal

Karena aplikasi memakai ES Modules, jalankan melalui local web server.

```powershell
python -m http.server 8080
```

Lalu buka:

```text
http://localhost:8080/login.html
```

## Deploy GitHub Pages

1. Push seluruh folder proyek ke repository GitHub.
2. Buka repository Settings > Pages.
3. Pilih branch utama dan root folder.
4. Simpan konfigurasi.
5. Buka URL GitHub Pages yang diberikan.

## Aturan Stok

- Transaksi `IN` menambah `current_stock`.
- Transaksi `OUT` mengurangi `current_stock`.
- Transaksi keluar akan ditolak database jika stok tidak cukup.
- Item tidak dapat dihapus jika sudah memiliki transaksi karena relasi `transactions.item_id` memakai `on delete restrict`.
- Item code dibuat otomatis dengan format `BRG0001`, `BRG0002`, dan seterusnya.

## Catatan Migrasi Sheet2

Seed utama memasukkan stok terkini dari Excel. Transaksi historis disimpan di CSV terpisah agar tidak mengurangi stok dua kali. Jika ingin migrasi berbasis replay penuh, mulai dari stok awal lalu insert transaksi historis secara terkontrol.
