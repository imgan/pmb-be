'use strict';

/**
 * EDOM (Evaluasi Dosen Oleh Mahasiswa). Nilai mata kuliah di modul mahasiswa baru tampil setelah
 * mahasiswa mengisi angket untuk SETIAP dosen pengajar kelas tsb (koordinator + pengampu, team
 * teaching). Satu isian = satu (mahasiswa, jadwal kuliah, dosen); jawaban skala 1-5 per pertanyaan.
 */
const PERTANYAAN_DEFAULT = [
  ['Perencanaan', 'Dosen menyampaikan RPS/kontrak kuliah dan tujuan pembelajaran di awal perkuliahan.'],
  ['Perencanaan', 'Materi yang disampaikan sesuai dengan RPS/silabus mata kuliah.'],
  ['Pelaksanaan', 'Dosen hadir dan memulai/mengakhiri perkuliahan tepat waktu.'],
  ['Pelaksanaan', 'Dosen menjelaskan materi dengan jelas dan mudah dipahami.'],
  ['Pelaksanaan', 'Dosen menggunakan metode dan media pembelajaran yang menarik.'],
  ['Pelaksanaan', 'Dosen memberi kesempatan bertanya dan menanggapi pertanyaan dengan baik.'],
  ['Evaluasi', 'Tugas, kuis, dan ujian sesuai dengan materi yang diajarkan.'],
  ['Evaluasi', 'Dosen memberikan umpan balik atas tugas/ujian mahasiswa.'],
  ['Sikap', 'Dosen bersikap adil, sopan, dan menghargai mahasiswa.'],
  ['Sikap', 'Secara keseluruhan, saya puas dengan cara dosen mengajar.'],
];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const timestamps = {
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    };

    await queryInterface.createTable('edom_pertanyaan', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      urutan: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      kategori: { type: Sequelize.STRING(100), allowNull: true },
      pertanyaan: { type: Sequelize.TEXT, allowNull: false },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      ...timestamps,
    });

    await queryInterface.createTable('edom_jawaban', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      mahasiswa_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'mahasiswa', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      jadwal_kuliah_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'jadwal_kuliah', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      dosen_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'dosen', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      // [{ pertanyaanId, skor }] — snapshot jawaban, skor 1-5.
      jawaban: { type: Sequelize.JSON, allowNull: false },
      saran: { type: Sequelize.TEXT, allowNull: true },
      ...timestamps,
    });
    await queryInterface.addIndex('edom_jawaban', ['mahasiswa_id', 'jadwal_kuliah_id', 'dosen_id'], {
      unique: true,
      name: 'uq_edom_jawaban',
    });

    const now = new Date();
    await queryInterface.bulkInsert(
      'edom_pertanyaan',
      PERTANYAAN_DEFAULT.map(([kategori, pertanyaan], i) => ({
        urutan: i + 1,
        kategori,
        pertanyaan,
        is_active: true,
        created_at: now,
        updated_at: now,
      }))
    );
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('edom_jawaban');
    await queryInterface.dropTable('edom_pertanyaan');
  },
};
