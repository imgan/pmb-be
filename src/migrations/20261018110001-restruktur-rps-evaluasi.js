'use strict';

/**
 * Rencana Evaluasi (RPS) model baru, tabel lama masih kosong:
 * - rps_evaluasi: metode evaluasi per periode (baris induk: metode + bobot evaluasi % nilai akhir) dan sub
 *   metode (parent_id terisi: jenis evaluasi, mis. "Tugas 1").
 * - rps_evaluasi_cpmk: nilai bobot tiap CPMK pada metode / sub metode evaluasi.
 */
const METODE = ['TUGAS_INDIVIDU', 'TUGAS_KELOMPOK', 'KUIS', 'UTS', 'UAS', 'PRAKTIKUM', 'PROYEK', 'PRESENTASI', 'PARTISIPASI', 'LAINNYA'];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const ts = {
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    };
    await queryInterface.dropTable('rps_evaluasi');
    await queryInterface.createTable('rps_evaluasi', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      mata_kuliah_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'mata_kuliah', key: 'id' }, onDelete: 'CASCADE' },
      tahun_ajaran_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'tahun_ajaran', key: 'id' }, onDelete: 'CASCADE' },
      parent_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'rps_evaluasi', key: 'id' }, onDelete: 'CASCADE' },
      urutan: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      metode: { type: Sequelize.ENUM(...METODE), allowNull: true },
      jenis_evaluasi: { type: Sequelize.TEXT, allowNull: true },
      // Bobot evaluasi (% nilai akhir) — hanya baris metode (induk).
      bobot: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
      ...ts,
    });
    await queryInterface.addIndex('rps_evaluasi', ['mata_kuliah_id', 'tahun_ajaran_id'], { name: 'idx_rps_evaluasi_mk_ta' });

    await queryInterface.createTable('rps_evaluasi_cpmk', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      rps_evaluasi_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'rps_evaluasi', key: 'id' }, onDelete: 'CASCADE' },
      cpmk_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'cpmk', key: 'id' }, onDelete: 'CASCADE' },
      bobot: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
      ...ts,
    });
    await queryInterface.addIndex('rps_evaluasi_cpmk', ['rps_evaluasi_id', 'cpmk_id'], { name: 'uq_rps_evaluasi_cpmk', unique: true });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('rps_evaluasi_cpmk');
    await queryInterface.dropTable('rps_evaluasi');
    await queryInterface.createTable('rps_evaluasi', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      mata_kuliah_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'mata_kuliah', key: 'id' }, onDelete: 'CASCADE' },
      tahun_ajaran_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'tahun_ajaran', key: 'id' }, onDelete: 'CASCADE' },
      cpmk_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'cpmk', key: 'id' }, onDelete: 'SET NULL' },
      komponen: { type: Sequelize.ENUM('TUGAS', 'KUIS', 'UTS', 'UAS', 'PRAKTIKUM', 'PROYEK', 'PARTISIPASI', 'LAINNYA'), allowNull: false },
      sesi: { type: Sequelize.STRING(50), allowNull: true },
      bentuk_penilaian: { type: Sequelize.TEXT, allowNull: true },
      bobot: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
  },
};
