# ifs24046-pabwe-p3

**Nama:** Ester Melati Manurung
**NIM:** 11S24046
**Aplikasi:** LinkVault — Catatan Keuangan, Manajemen Tautan & Kuis Interaktif

Studi kasus Praktikum 3 PABWE: aplikasi web satu halaman dengan JavaScript murni (tanpa backend),
dipisah menjadi 3 tab.

## Struktur

```
ifs24046-pabwe-p3/
├── index.html
├── assets/
│   └── script.js
└── README.md
```

## Fitur

1. **Catatan Keuangan (Expense Tracker)**
   - Tambah, ubah (modal), hapus (modal konfirmasi) transaksi
   - Ringkasan total pemasukan, pengeluaran, dan saldo
   - Cari judul, filter tipe & kategori, urutkan (terbaru / terlama / jumlah terbesar / terkecil)
   - Validasi: field wajib terisi, jumlah angka > 0
   - Empty state, data tersimpan di `localStorage`

2. **Manajemen Tautan (Bookmark Manager)**
   - Tambah, ubah (modal), hapus (modal konfirmasi) tautan
   - Validasi URL (wajib `http://` / `https://`)
   - Judul, URL, dan tombol "Buka" membuka tab baru (`target="_blank"` + `rel="noopener noreferrer"`)
   - Cari nama / URL / kategori, urutkan terbaru / A–Z / Z–A
   - Empty state, data tersimpan di `localStorage` (key terpisah)

3. **Kuis Interaktif (Quiz App)**
   - 5 soal (array of object), 4 opsi per soal
   - Skor, feedback benar/salah, hasil akhir, tombol main lagi
   - High score di `localStorage`
   - Bonus: timer 20 detik per soal (`setInterval`)

4. **Integrasi**
   - 3 tab, hanya satu panel aktif; tab terakhir diingat setelah refresh
   - Key `localStorage` berbeda per fitur:
     `linkvault_expenses`, `linkvault_bookmarks`, `linkvault_high_score`, `linkvault_active_tab`
   - Semantic HTML5, responsive (desktop & mobile)

## Menjalankan

Buka `index.html` di browser (atau pakai ekstensi Live Server di VS Code). Tidak butuh instalasi.

## Deploy (GitHub Pages)

1. Push repo ke GitHub dengan nama `ifs24046-pabwe-p3`.
2. Buka **Settings → Pages**.
3. Pada **Build and deployment**, pilih **Deploy from a branch**, branch `main`, folder `/ (root)`, lalu **Save**.
4. Tunggu 1–2 menit, situs tersedia di `https://<username-github>.github.io/ifs24046-pabwe-p3/`.