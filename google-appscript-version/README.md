# IR Souvenir Stock Management System - Google Apps Script Version

Versi ini menggunakan Google Apps Script sebagai backend, HTML Service sebagai frontend, dan Google Sheets sebagai database.

## Isi Project

```text
google-appscript-version/
  src/
    Code.gs
    Index.html
    Styles.html
    Scripts.html
    Seed.gs
    appsscript.json
  data/
    items_sheet2.csv
    transactions_sheet2.csv
  docs/
    google-sheets-structure.md
```

## Fitur

- Dashboard stok
- Master Items CRUD
- Checkbox bulk delete item
- Incoming transaction
- Outgoing transaction dengan validasi stok tidak negatif
- Transaction history dengan filter
- Reports daily/monthly/yearly
- Print report
- Export CSV
- Responsive Bootstrap layout

## Cara Membuat Project Apps Script

1. Buka Google Drive.
2. Buat Google Sheets baru, misalnya `IR Souvenir Stock Database`.
3. Buka menu **Extensions > Apps Script**.
4. Buat file berikut di Apps Script Editor:
   - `Code.gs`
   - `Index.html`
   - `Styles.html`
   - `Scripts.html`
   - `Seed.gs`
5. Copy isi file dari folder `google-appscript-version/src/` ke file Apps Script yang sesuai.
6. Buka **Project Settings** di Apps Script.
7. Centang **Show appsscript.json manifest file in editor**.
8. Copy isi `src/appsscript.json` ke manifest Apps Script.

## Inisialisasi Database

1. Di Apps Script Editor, pilih function `setupSpreadsheet`.
2. Klik **Run**.
3. Izinkan permission yang diminta Google.
4. Kembali ke Google Sheets, pastikan sheet berikut dibuat:
   - `Items`
   - `Transactions`
   - `Users`
   - `Settings`

## Seed Data Dari Sheet2

Data hasil ekstraksi Sheet2 sudah disiapkan di:

```text
google-appscript-version/src/Seed.gs
google-appscript-version/data/items_sheet2.csv
```

Cara seed yang disarankan:

1. Copy isi `src/Seed.gs` ke file `Seed.gs` di Apps Script Editor.
2. Pastikan `setupSpreadsheet` sudah pernah dijalankan.
3. Pilih function `seedSheet2Items`.
4. Klik **Run**.
5. Cek sheet `Items`, harus masuk 48 barang.

Function seed akan membuat `ID` otomatis, jadi jangan paste CSV langsung ke sheet kecuali kamu juga mengisi kolom `ID`.

## Deploy Sebagai Web App

1. Di Apps Script Editor, klik **Deploy > New deployment**.
2. Pilih type **Web app**.
3. Description: `Initial deployment`.
4. Execute as:
   - `User accessing the web app` jika ingin memakai Google Account masing-masing.
   - `Me` jika admin ingin semua operasi memakai akses owner script.
5. Who has access:
   - `Anyone with Google account`, atau
   - domain organisasi kamu jika memakai Google Workspace.
6. Klik **Deploy**.
7. Copy Web App URL.

## Business Rules

- Item Code dibuat otomatis saat create item.
- Incoming menambah current stock.
- Outgoing mengurangi current stock.
- Outgoing ditolak jika stok tidak cukup.
- Semua pergerakan stok dicatat di sheet `Transactions`.
- Item yang sudah punya transaksi tidak boleh dihapus.
- Low stock memakai `Minimum Stock`, default 10.

## Catatan Rumus Requirement

Requirement menulis:

```text
Current Stock = Initial Stock - Incoming - Outgoing
```

Untuk inventory normal, rumus yang digunakan aplikasi adalah:

```text
Current Stock = Initial Stock + Incoming - Outgoing
```

Ini sesuai aturan transaksi masuk menambah stok dan transaksi keluar mengurangi stok.
