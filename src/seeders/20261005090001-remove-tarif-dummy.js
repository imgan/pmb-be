'use strict';

// Hapus data dummy master tarif (tarif kuliah, TA/skripsi, pembimbing, lain) dari seeder 20260825120001-4.
// Hanya baris yang nilainya persis sama dengan data dummy yang dihapus, sehingga tarif hasil input user tetap aman.
const JURUSAN_NAMES = ['D3 Farmasi', 'D3 Manajemen Logistik', 'D3 Administrasi Rumah Sakit', 'D4 Teknologi Rekayasa Multimedia'];

const TARIF_KULIAH = {
  'D3 Farmasi': { biayaSks: 150000, biayaBpp: 1200000, biayaSpp: 800000 },
  'D3 Manajemen Logistik': { biayaSks: 140000, biayaBpp: 1100000, biayaSpp: 750000 },
  'D3 Administrasi Rumah Sakit': { biayaSks: 140000, biayaBpp: 1100000, biayaSpp: 750000 },
  'D4 Teknologi Rekayasa Multimedia': { biayaSks: 180000, biayaBpp: 1500000, biayaSpp: 1000000 },
};

const TARIF_TA_SKRIPSI = {
  'D3 Farmasi': { biayaPendaftaran: 500000, biayaPerpanjangan: 250000 },
  'D3 Manajemen Logistik': { biayaPendaftaran: 450000, biayaPerpanjangan: 225000 },
  'D3 Administrasi Rumah Sakit': { biayaPendaftaran: 450000, biayaPerpanjangan: 225000 },
  'D4 Teknologi Rekayasa Multimedia': { biayaPendaftaran: 650000, biayaPerpanjangan: 325000 },
};

const TARIF_PEMBIMBING = {
  'D3 Farmasi': { utama: 750000, pendamping: 500000, asisten: 300000, tunggal: 1000000 },
  'D3 Manajemen Logistik': { utama: 700000, pendamping: 450000, asisten: 275000, tunggal: 950000 },
  'D3 Administrasi Rumah Sakit': { utama: 700000, pendamping: 450000, asisten: 275000, tunggal: 950000 },
  'D4 Teknologi Rekayasa Multimedia': { utama: 900000, pendamping: 600000, asisten: 350000, tunggal: 1200000 },
};

const TARIF_LAIN = [
  { kodeBiaya: 'ALMAMATER', biaya: 350000, keterangan: 'Biaya jaket almamater' },
  { kodeBiaya: 'KTM', biaya: 50000, keterangan: 'Biaya cetak Kartu Tanda Mahasiswa' },
  { kodeBiaya: 'ASURANSI', biaya: 100000, keterangan: 'Biaya asuransi mahasiswa per tahun' },
  { kodeBiaya: 'ORIENTASI', biaya: 250000, keterangan: 'Biaya orientasi mahasiswa baru' },
  { kodeBiaya: 'WISUDA', biaya: 1500000, keterangan: 'Biaya prosesi wisuda' },
];

const q = (queryInterface, sql, replacements) => queryInterface.sequelize.query(sql, { replacements }).then(([rows]) => rows);

module.exports = {
  up: async (queryInterface) => {
    const jurusanList = await q(queryInterface, 'SELECT id, nama_jurusan FROM jurusan WHERE nama_jurusan IN (:names)', {
      names: JURUSAN_NAMES,
    });

    for (const jurusan of jurusanList) {
      const kuliah = TARIF_KULIAH[jurusan.nama_jurusan];
      await q(
        queryInterface,
        `DELETE FROM tarif_kuliah WHERE jurusan_id = :jurusanId AND tahun_angkatan IN (2025, 2026) AND semester = 1
           AND biaya_sks = :biayaSks AND biaya_bpp = :biayaBpp AND biaya_spp = :biayaSpp`,
        { jurusanId: jurusan.id, ...kuliah }
      );

      const ta = TARIF_TA_SKRIPSI[jurusan.nama_jurusan];
      await q(
        queryInterface,
        `DELETE FROM tarif_ta_skripsi WHERE jurusan_id = :jurusanId AND periode = 2026
           AND biaya_pendaftaran = :biayaPendaftaran AND biaya_perpanjangan = :biayaPerpanjangan`,
        { jurusanId: jurusan.id, ...ta }
      );

      const pembimbing = TARIF_PEMBIMBING[jurusan.nama_jurusan];
      await q(
        queryInterface,
        `DELETE FROM tarif_pembimbing WHERE jurusan_id = :jurusanId AND periode = 2026
           AND biaya_pembimbing_utama = :utama AND biaya_pembimbing_pendamping = :pendamping
           AND biaya_pembimbing_asisten = :asisten AND biaya_pembimbing_tunggal = :tunggal`,
        { jurusanId: jurusan.id, ...pembimbing }
      );
    }

    // Tarif lain yang sudah dipakai di pembayaran_lain (FK) dibiarkan agar riwayat pembayaran tidak rusak.
    for (const row of TARIF_LAIN) {
      await q(
        queryInterface,
        `DELETE FROM tarif_lain WHERE kode_biaya = :kodeBiaya AND tahun_masuk = 2026 AND biaya = :biaya AND keterangan = :keterangan
           AND id NOT IN (SELECT tarif_lain_id FROM pembayaran_lain WHERE tarif_lain_id IS NOT NULL)`,
        row
      );
    }
  },
  down: async () => {
    // Data dummy sengaja tidak dikembalikan.
  },
};
