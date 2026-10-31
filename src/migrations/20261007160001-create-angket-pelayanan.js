'use strict';

/**
 * Angket pelayanan (kepuasan mahasiswa terhadap layanan institusi). Wajib diisi sekali per tahun
 * ajaran (periode semester) sebelum mahasiswa bisa menyimpan/mengajukan KRS periode tsb.
 *
 * - angket_pelayanan_pertanyaan: butir angket (skala 1-5), diisi default di bawah.
 * - angket_pelayanan_jawaban: satu baris per (mahasiswa, tahun ajaran); skor per butir disimpan JSON
 *   { [pertanyaanId]: skor } supaya perubahan daftar pertanyaan tidak mengubah isian lama.
 */
const DEFAULT_PERTANYAAN = [
  ['Layanan Akademik', 'Petugas akademik (BAAK/Prodi) melayani dengan ramah dan sopan'],
  ['Layanan Akademik', 'Informasi akademik (jadwal, KRS, nilai) disampaikan dengan jelas dan tepat waktu'],
  ['Layanan Akademik', 'Pengurusan surat dan administrasi akademik selesai dengan cepat'],
  ['Layanan Keuangan', 'Informasi tagihan dan pembayaran kuliah jelas dan mudah diakses'],
  ['Layanan Keuangan', 'Petugas keuangan responsif dalam menangani pertanyaan/keluhan'],
  ['Perpustakaan', 'Koleksi buku dan referensi perpustakaan memadai untuk perkuliahan'],
  ['Perpustakaan', 'Layanan dan jam buka perpustakaan memudahkan mahasiswa'],
  ['Sarana & Prasarana', 'Ruang kelas bersih, nyaman, dan peralatannya berfungsi baik'],
  ['Sarana & Prasarana', 'Laboratorium dan peralatan praktik memadai'],
  ['Sarana & Prasarana', 'Fasilitas umum (toilet, tempat ibadah, parkir, internet) memadai'],
  ['Kemahasiswaan', 'Kampus mendukung kegiatan kemahasiswaan dan pengembangan diri'],
  ['Sistem Informasi', 'Portal/sistem informasi mahasiswa mudah digunakan'],
];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const timestamps = {
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    };

    await queryInterface.createTable('angket_pelayanan_pertanyaan', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      kategori: { type: Sequelize.STRING(100), allowNull: true },
      pertanyaan: { type: Sequelize.TEXT, allowNull: false },
      urutan: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      ...timestamps,
    });

    await queryInterface.createTable('angket_pelayanan_jawaban', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      mahasiswa_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'mahasiswa', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      tahun_ajaran_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'tahun_ajaran', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      jawaban: { type: Sequelize.JSON, allowNull: false },
      saran: { type: Sequelize.TEXT, allowNull: true },
      ...timestamps,
    });

    await queryInterface.addConstraint('angket_pelayanan_jawaban', {
      fields: ['mahasiswa_id', 'tahun_ajaran_id'],
      type: 'unique',
      name: 'uq_angket_pelayanan_mahasiswa_tahun_ajaran',
    });

    const now = new Date();
    await queryInterface.bulkInsert(
      'angket_pelayanan_pertanyaan',
      DEFAULT_PERTANYAAN.map(([kategori, pertanyaan], index) => ({
        kategori,
        pertanyaan,
        urutan: index + 1,
        is_active: true,
        created_at: now,
        updated_at: now,
      }))
    );
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('angket_pelayanan_jawaban');
    await queryInterface.dropTable('angket_pelayanan_pertanyaan');
  },
};
