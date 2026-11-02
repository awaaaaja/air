# LEAKSENSE AI

Simulator digital twin distribusi air, berbahasa Indonesia. Seluruh perhitungan berlangsung di browser; tidak membutuhkan database, API Python, atau layanan simulasi.

## Pengembangan

Node.js 22+ dan npm. Dari root checkout:

```sh
npm ci
npm run dev
```

Buka port 3000 melalui lingkungan pengembangan Anda. Pilih pipa, jalankan simulasi, aktifkan kebocoran, lalu amati tekanan, debit, dan kehilangan air. Sidebar menyediakan enam skenario dan kontrol pompa, katup, serta konsumsi. Inspektor reservoir juga mengatur tinggi sumber. Skenario adalah ground truth, bukan prediksi AI.

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run start
npm run test:e2e
npm run audit:assets
```

Playwright menggunakan Chromium `/usr/bin/chromium` pada lingkungan ini. Di mesin lain, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` ke browser Chromium yang terpasang. Jalankan pengujian browser setelah build; server production akan dimulai otomatis bila port 3000 kosong.

## Arsitektur

- Next.js App Router, React 19, TypeScript strict, Tailwind CSS 4.
- React Three Fiber / Drei / Three.js untuk scene lazy-loaded; GLB di-cache melalui useGLTF.
- Zustand menyinkronkan parameter, pilihan objek, sensor, riwayat, dan kejadian.
- Recharts untuk grafik; Motion dan Lucide untuk antarmuka.
- `src/lib/simulation`: mesin deterministik; `src/components/scene`: model dan efek; `src/components/simulator`: kontrol; `src/lib/ml`: kontrak ONNX.
- Vitest dan Playwright untuk pengujian.

Ketiga GLB asli disimpan di `public/models`; tidak dimodifikasi. Normalisasi bounding box dilakukan di kode. Tidak ada Blender, efek pascaproses berat, atau simulasi fluida. Partikel dibatasi 64 instance, DPR maksimum 1,5. Grafik dan kejadian dibatasi 240 dan 60 entri. Lihat ASSET_LICENSES.md dan SIMULATION_MODEL.md.

## Deployment Vercel

Impor repository sebagai Next.js, gunakan `npm ci` dan `npm run build`. Tidak ada variabel rahasia yang dibutuhkan. `postinstall` menyalin runtime ONNX sesuai versi terkunci ke `public/onnx`; jangan hapus langkah ini bila menambahkan model. Publikasi aset memerlukan penyelesaian verifikasi lisensi pompa. Model ML belum disertakan, dan tidak ada prediksi atau probabilitas buatan. Baca ML_INTEGRATION.md sebelum mengaktifkan inferensi.

## Batasan

Ini vertical slice edukasional, bukan EPANET atau perangkat operasi utilitas. Hanya satu kebocoran aktif; mengganti pipa kebocoran memindahkan sumber tersebut. Riwayat dalam memori dan hilang saat reload. Kontrol sidebar dan label HTML menyediakan alternatif pemilihan dengan keyboard. Tidak ada penyimpanan proyek, impor GIS, atau koneksi sensor fisik. Tidak memakai shadcn karena kontrol native sudah mencukupi.
