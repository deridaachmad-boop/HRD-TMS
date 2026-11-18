/* =========================================================
   DATA LAPORAN MAGANGHUB
   Edit file ini untuk mengisi laporan. Tidak perlu mengubah file lain.
   ========================================================= */
window.MAGANG = {
  contoh: true,                 // true = tampil label "DATA CONTOH". Ganti false setelah diisi data asli.
  sembunyikan: ['pipeline'],    // bagian internal yang disembunyikan di halaman publik: 'pipeline', 'gm'. Kosongkan [] untuk menampilkan semua.
  maxBulan: 6,

  programs: [
    { key: 'kimia',     name: 'S1 Teknik Kimia' },
    { key: 'metalurgi', name: 'S1 Teknik Metalurgi' },
    { key: 'mesin',     name: 'S1 Teknik Mesin' },
    { key: 'industri',  name: 'S1 Teknik Industri' },
    { key: 'elektro',   name: 'S1 Teknik Elektro / Robotik' }
  ],

  /* ---------- LAPORAN BULANAN: nomor = bulan ke ---------- */
  months: {
    2: {
      peserta: 5,
      kehadiran: 97,   // rata-rata kehadiran (%)
      ringkasan: 'Pada bulan kedua, seluruh 5 peserta aktif mengikuti program dengan kehadiran rata-rata 97% dan capaian kurikulum 82%. Empat dari lima program studi berjalan sesuai rencana. Satu program (Teknik Mesin) sedikit tertinggal karena lisensi AutoCAD belum aktif. Dua peserta berpotensi menjadi kandidat talent pipeline perusahaan.',
      progs: {
        kimia:     { kurikulum: 90, nilai: 88, catatan: 'Konsisten dan teliti dalam pencatatan data uji' },
        metalurgi: { kurikulum: 85, nilai: 86, catatan: 'Cepat memahami alur inspeksi, aktif bertanya' },
        mesin:     { kurikulum: 70, nilai: 82, catatan: 'Perlu percepatan praktik CAD setelah lisensi aktif' },
        industri:  { kurikulum: 80, nilai: 84, catatan: 'Rapi dalam pencatatan data waktu siklus' },
        elektro:   { kurikulum: 85, nilai: 87, catatan: 'Disiplin K3, cepat belajar membaca panel kontrol' }
      },
      cerita: [
        'Peserta Teknik Kimia menyelesaikan rekap hasil uji untuk 12 batch produksi dan dipresentasikan kepada mentor.',
        'Peserta Teknik Industri menyusun dokumen process flow untuk 1 lini produksi, sudah diverifikasi pembimbing.'
      ],
      foto: [],        // contoh: ['assets/img/magang-b2-1.jpg', 'assets/img/magang-b2-2.jpg']
      kendala: [
        'Lisensi AutoCAD belum aktif: peserta Teknik Mesin menggunakan materi baca gambar teknik sementara. Target aktivasi: minggu pertama Desember.',
        'Satu peserta izin sakit 1 hari: tidak mengganggu pencapaian indikator bulan ini.'
      ],
      pipeline: [
        { peserta: 'Peserta A', prodi: 'S1 Teknik Kimia', rek: 'Pantau', alasan: 'Nilai tertinggi, data uji selalu akurat' },
        { peserta: 'Peserta E', prodi: 'S1 Teknik Elektro / Robotik', rek: 'Pantau', alasan: 'Disiplin K3 dan cepat belajar sistem kontrol' }
      ],
      rencana: [
        'Melanjutkan kegiatan sesuai kurikulum bulan ke-3 masing-masing program studi.',
        'Mid check-in: sesi umpan balik dua arah antara peserta, mentor, dan HRD.'
      ]
    }
    /* Tambah bulan baru dengan menyalin blok di atas, misalnya:
    3: { peserta: 5, kehadiran: 95, ringkasan: '...', progs: {...}, cerita: [...], kendala: [...], pipeline: [...], rencana: [...] }
    */
  },

  /* ---------- LAPORAN MINGGUAN: nomor = minggu ke (1-24). Bulan 1 = minggu 1-4, Bulan 2 = minggu 5-8, dst. ---------- */
  weeks: {
    6: {
      peserta: 5,
      progs: {
        kimia:     { status: 'hijau',  hadir: '5/5', kegiatan: 'Mendampingi uji kekerasan batch rutin dan mencatat hasil uji coating' },
        metalurgi: { status: 'hijau',  hadir: '5/5', kegiatan: 'Mendampingi inspeksi produk jadi dan merapikan laporan mutu mingguan' },
        mesin:     { status: 'kuning', hadir: '5/5', kegiatan: 'Latihan membaca gambar teknik; pembuatan gambar CAD tertunda (lisensi belum aktif)' },
        industri:  { status: 'hijau',  hadir: '4/5', kegiatan: 'Mencatat data waktu siklus lini thread rolling; 1 hari izin sakit' },
        elektro:   { status: 'hijau',  hadir: '5/5', kegiatan: 'Mendampingi pemeriksaan panel kontrol rutin dan mengisi checklist' }
      },
      highlight: [
        'Peserta Teknik Metalurgi mulai mendampingi inspeksi produk jadi secara langsung bersama mentor.',
        'Peserta Teknik Kimia menyelesaikan rekap hasil uji untuk 3 batch produksi.',
        'Peserta Teknik Elektro / Robotik sudah dapat membaca wiring diagram sederhana pada panel mesin.'
      ],
      foto: [],
      kendala: [
        { kendala: 'Lisensi AutoCAD belum aktif, peserta Teknik Mesin belum bisa praktik gambar CAD', usulan: 'Aktivasi lisensi atau pakai komputer yang sudah terpasang software', gm: 'Ya, mohon persetujuan aktivasi' }
      ]
    }
  }
};
