# Perubahan antarmuka

Referensi utama: [Industrial IoT Dashboard di Dribbble](https://dribbble.com/shots/27501289-Industrial-IoT-Dashboard), melalui screenshot yang diberikan pengguna. Tautan web ditolak oleh proxy lingkungan, tetapi gambar referensinya tersedia langsung dalam percakapan dan digunakan untuk penilaian visual.

Elemen yang diterapkan:

- Permukaan abu-abu arang dan panel yang menyatu dengan workspace.
- Aksen jingga untuk tindakan utama, posisi slider, seleksi dan gauge tekanan. Tidak ada gradient neon atau palet biru dashboard sebelumnya.
- Model 3D berada di pusat, judul menumpang di sudut viewport, metrik pindah ke panel kanan.
- Gauge tekanan bersumber dari pembacaan simulasi dan memakai skala 0–4 bar. Debit dan kehilangan air tetap memakai hasil mesin yang sama.
- Label 3D hanya muncul pada objek penting, objek terpilih atau hover. Detail lengkap tetap tersedia melalui daftar komponen dan inspektor.
- Grafik dan riwayat dapat ditutup; sidebar dan inspektor memiliki scroll sendiri. Mobile memakai drawer kontrol dan inspektor di bawah viewport.
- Copy pendek dalam Bahasa Indonesia, tanpa em dash, pemisah Markdown atau slogan dekoratif.
- Pengujian ONNX dipisahkan dari inspektor jaringan, karena data BattLeDIM tidak sama dengan sensor jaringan kecil di scene.

Referensi pendukung yang dibaca sebelum screenshot tersedia:

- [IBM Carbon UI Shell](https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/UIShell/Header.tsx): header aplikasi dan navigasi konsisten.
- [GitHub Primer PageLayout](https://github.com/primer/react/blob/main/packages/react/src/PageLayout/PageLayout.tsx): pembagian konten dan pane responsif.

Tidak ada gambar, kode berlisensi atau aset industri dari Dribbble yang disalin. Model tangki, pompa dan pipa tetap memakai tiga GLB milik proyek. Karena aset dan fungsi berbeda, implementasi mengambil komposisi dan bahasa visual referensi, bukan mengaku sebagai salinan pixel-perfect.

Rumus hidraulika, fixed-step timer, kontrol, skenario dan batas riwayat tidak diubah. Perubahan engine/store hanya merapikan teks deskripsi.
