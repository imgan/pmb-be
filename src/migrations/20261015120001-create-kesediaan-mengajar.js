'use strict';

// Kesediaan mengajar dosen (portal Dosen → Lain-Lain → Kesediaan Mengajar): per tahun akademik, dosen
// mengisi matakuliah yang bersedia diajar beserta jam kesediaan tiap hari — bahan ploting jadwal
// periode berikutnya (biasanya diisi setelah UAS).
const HARI = ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu'];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('kesediaan_mengajar', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      dosen_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'dosen', key: 'id' }, onDelete: 'CASCADE' },
      tahun_ajaran_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'tahun_ajaran', key: 'id' }, onDelete: 'CASCADE' },
      mata_kuliah_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'mata_kuliah', key: 'id' }, onDelete: 'CASCADE' },
      // Rentang jam bersedia per hari, format "HH:MM-HH:MM"; null = tidak bersedia hari itu.
      ...Object.fromEntries(HARI.map((h) => [h, { type: Sequelize.STRING(11), allowNull: true }])),
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('kesediaan_mengajar', ['dosen_id', 'tahun_ajaran_id', 'mata_kuliah_id'], {
      name: 'uq_kesediaan_mengajar_dosen_ta_mk',
      unique: true,
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('kesediaan_mengajar');
  },
};
