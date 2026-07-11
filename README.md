# Kalkulator Pinjaman Malaysia

Aplikasi web statik untuk laman **ariff.my** bagi mengira anggaran ansuran bulanan pinjaman rumah, kenderaan dan pinjaman peribadi di Malaysia.

Semua pengiraan dilakukan terus dalam pelayar pengguna. Tiada data dihantar ke server dan tiada pangkalan data diperlukan.

## Fungsi Utama

- Kalkulator Pinjaman Perumahan dengan formula baki berkurangan atau amortisasi.
- Kalkulator Pinjaman Kenderaan dengan formula kadar rata.
- Kalkulator Pinjaman Peribadi dengan pilihan kadar rata atau baki berkurangan.
- Penyelarasan automatik deposit RM, deposit peratus dan jumlah pinjaman.
- Kad keputusan untuk ansuran bulanan, jumlah pinjaman, faedah, jumlah bayaran dan tempoh.
- Carta doughnut Chart.js untuk pecahan prinsipal dan faedah.
- Jadual amortisasi tahunan untuk pinjaman rumah.
- Perbandingan tempoh pinjaman berdasarkan data semasa pengguna.
- Anggaran Debt Service Ratio (DSR) berdasarkan pendapatan dan komitmen bulanan.
- Validasi input dengan mesej ralat inline.
- Butang kira semula, tetapkan semula, cetak keputusan dan salin ringkasan.
- CSS cetakan untuk laporan ringkas bersaiz A4.
- Paparan responsif untuk desktop, tablet dan telefon pintar.

## Struktur Fail

```text
loan-calculator/
├── index.html
├── assets/
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── app.js
└── README.md
```

## Cara Pemasangan

1. Muat naik folder `loan-calculator` ke hosting atau cPanel.
2. Pastikan struktur fail dikekalkan seperti di atas.
3. Buka `index.html` melalui pelayar.

Contoh lokasi:

```text
public_html/loan-calculator/index.html
```

Selepas dimuat naik, aplikasi boleh diakses melalui:

```text
https://ariff.my/loan-calculator/
```

## Cara Menjalankan Aplikasi

Aplikasi ini boleh dibuka terus melalui fail:

```text
index.html
```

Tiada proses build diperlukan.

## Formula Yang Digunakan

### Pinjaman Baki Berkurangan

Digunakan untuk pinjaman rumah dan pilihan baki berkurangan bagi pinjaman peribadi.

```text
M = P x [r(1+r)^n] / [(1+r)^n - 1]
```

Dengan:

- `M` = ansuran bulanan
- `P` = jumlah pinjaman
- `r` = kadar faedah bulanan
- `n` = jumlah bulan

Jika kadar faedah ialah `0%`, ansuran dikira sebagai:

```text
Jumlah pinjaman / jumlah bulan
```

### Pinjaman Kadar Rata

Digunakan untuk pinjaman kenderaan dan pilihan kadar rata bagi pinjaman peribadi.

```text
Jumlah faedah = Jumlah pinjaman x kadar faedah x tempoh tahun
Jumlah bayaran = Jumlah pinjaman + jumlah faedah
Ansuran bulanan = Jumlah bayaran / jumlah bulan
```

## Cara Menukar Nilai Lalai

Buka fail:

```text
assets/js/app.js
```

Cari objek `loanMeta`, kemudian ubah nilai dalam bahagian `defaultValues`.

Contoh untuk pinjaman rumah:

```javascript
defaultValues: {
  price: 500000,
  deposit: 50000,
  rate: 4.2,
  years: 30,
  loan: 450000
}
```

## Cara Menukar Warna Tema

Buka fail:

```text
assets/css/style.css
```

Ubah pemboleh ubah CSS di bahagian `:root`.

Contoh:

```css
:root {
  --primary: #0f766e;
  --primary-dark: #115e59;
  --accent: #2f6f9f;
}
```

## Cara Memasukkan Ke Dalam Laman ariff.my

Pilihan paling mudah ialah memuat naik folder ini sebagai subfolder:

```text
public_html/loan-calculator/
```

Kemudian pautkan dari laman utama ariff.my ke:

```text
/loan-calculator/
```

Jika mahu memasukkan aplikasi ke dalam halaman sedia ada, salin kandungan utama daripada `index.html`, kemudian pastikan pautan CSS dan JavaScript ini turut dimasukkan:

```html
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet">
<link href="assets/css/style.css" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"></script>
<script src="assets/js/app.js"></script>
```

Laraskan laluan `assets/css/style.css` dan `assets/js/app.js` jika fail diletakkan di lokasi berbeza.

## Penafian Penggunaan

Semua keputusan pengiraan yang dipaparkan adalah anggaran sahaja. Jumlah sebenar pinjaman, kadar faedah, kadar keuntungan, caj pemprosesan, insurans, takaful, duti setem dan bayaran bulanan adalah tertakluk kepada syarat institusi kewangan yang berkaitan.

Aplikasi ini bukan penasihat kewangan dan tidak menjamin kelulusan pinjaman.
