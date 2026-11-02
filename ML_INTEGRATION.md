# Integrasi model BattLeDIM

Model dari `LEAKSENSE_AI_ONNX_Artifacts.zip` dipasang tanpa mengubah artefak aslinya di `public/ml`. Model LogisticRegression 6.920 byte memakai ONNX Runtime Web 1.31.1 dengan execution provider WASM lokal. SHA-256 diverifikasi terhadap metadata sebelum sesi dibuat:

`916c441f9cb5651e6693039ad2657ccf17e9b0f8da168f133d7003c3538f76d9`

## Menggunakan model

Buka **Pengujian model** dari panel kanan. Pilih salah satu dari enam sampel BattLeDIM, lalu jalankan inferensi. Kelas, kedua probabilitas, sumber data, waktu pembacaan, dan durasi inferensi ditampilkan setelah `session.run` berhasil. Tombol **Uji 6 sampel** menjalankan semua contoh dan memeriksa kesesuaian fitur, kelas, serta probabilitas dengan hasil ekspor Python.

Anda juga dapat mengunggah JSON. Unduh contoh dari dialog atau `public/ml/example_sensor_window.json`. Format:

```json
{
  "pressureUnit": "m water head",
  "flowUnit": "m3/h",
  "rows": [
    { "timestamp": "2018-01-07 01:20:00", "values": { "pressure__n1": 28.03 } }
  ]
}
```

Potongan di atas hanya menjelaskan struktur, bukan input lengkap. Diperlukan tepat 12 baris, semua 36 kanal sesuai `raw_sensor_order`, waktu lokal dataset tanpa suffix zona, berurutan lima menit. Tidak ada konversi satuan terselubung. Tekanan dalam metre water head, debit dalam m³/jam. Data kosong boleh diisi dari nilai sebelumnya maksimum dua slot; nilai awal yang kosong atau tiga slot berurutan ditolak. Nilai nonfinite, waktu tidak valid, kanal tidak lengkap, urutan fitur salah dan unit yang tidak cocok ditolak.

## Kontrak ekspor sebenarnya

- 33 kanal tekanan dan 3 kanal debit; urutan dibaca dari `feature_schema.json`.
- 12 observasi per kanal, interval lima menit.
- Tujuh statistik per kanal: current, mean, min, max, population standard deviation, last-minus-previous, dan (last-minus-first)/11.
- Dua fitur waktu sin/cos dari jam lokal dataset. Parsing tidak memakai zona browser sehingga hasil konsisten untuk pengguna di zona berbeda.
- Total 254 fitur float32. Input shape `[1,254]`; nama input dan kedua output dibaca dari skema.
- Tidak ada normalisasi tambahan: scaler dan imputer sudah di dalam graph ONNX.
- Output label int64 dan dua probabilitas NORMAL/LEAK; pemeriksaan jumlah, finite values, rentang, total probabilitas dan kesesuaian threshold 0,5 wajib lolos.
- Runtime dan file WASM berasal dari package terkunci yang sama. Tidak ada API, server Python atau inferensi berbayar.

## Hubungan dengan simulasi

Jaringan 3D hanya memiliki satu pengukuran tekanan dan satu debit, bukan seluruh kanal L-Town. Tidak ada data yang digandakan, diisi nol, atau diganti dengan kecepatan pompa untuk membuat input palsu. Skenario dan rumus simulasi tetap terpisah dari prediksi. Pengujian model menggunakan sampel asli atau data unggahan yang memenuhi kontrak. Mengubah skenario 3D tidak mengubah prediksi sampel BattLeDIM. Menghubungkan inferensi langsung ke jaringan memerlukan pemetaan hidraulika terkalibrasi atau model baru yang dilatih untuk sensor simulator.

Model hanya mendukung NORMAL dan LEAK; sensor fault, demand spike dan pump fault bukan kelas yang didukung. Metadata mencatat evaluasi eksploratif, ketidakseimbangan kelas dan leak interval yang bertumpang tindih. Hasil tidak membuktikan akurasi pada jaringan lain atau kinerja deteksi per kejadian.

## Validasi browser

Pengujian Chromium menjalankan ONNX WASM sebenarnya dan mencocokkan keenam sampel dengan Python: 3 NORMAL, 3 LEAK. Toleransi fitur 2e-4 dan probabilitas 1e-3. `npm test` memeriksa semua vektor fitur beserta input tidak valid; `npm run test:e2e` memeriksa inferensi nyata, impor, kegagalan aset model dan kelanjutan simulasi.

Metadata dan README yang disertakan dalam ZIP tetap dipertahankan sebagai catatan asal, termasuk tulisan `onnx_web_wasm_smoke_test: NOT RUN` pada metadata ekspor. Status pengujian aplikasi saat ini dicatat terpisah di TEST_REPORT.md; metadata sumber tidak ditulis ulang.
