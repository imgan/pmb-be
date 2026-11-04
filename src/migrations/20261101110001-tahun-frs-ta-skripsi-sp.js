'use strict';

/**
 * Tahun (FRS), Tahun TA/Skripsi, dan Tahun SP sebagai data tersendiri (CRUD di Modul Admin), strukturnya sama dengan
 * tahun_pmb & tahun_keuangan; satu baris aktif per tabel. Diisi awal dari tahun_ajaran beserta tahun aktifnya.
 */
const TABEL = ['tahun_frs', 'tahun_ta_skripsi', 'tahun_sp'];

const kolom = (Sequelize) => ({
  id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
  nama: { type: Sequelize.STRING(20), allowNull: false },
  tahun_mulai: { type: Sequelize.INTEGER, allowNull: false },
  tahun_selesai: { type: Sequelize.INTEGER, allowNull: false },
  jenis_semester: { type: Sequelize.ENUM('GANJIL', 'GENAP'), allowNull: false, defaultValue: 'GANJIL' },
  is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
  is_delete: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
  created_by: { type: Sequelize.INTEGER, allowNull: true },
  updated_by: { type: Sequelize.INTEGER, allowNull: true },
  created_at: { type: Sequelize.DATE, allowNull: false },
  updated_at: { type: Sequelize.DATE, allowNull: false },
});

module.exports = {
  up: async (queryInterface, Sequelize) => {
    for (const tabel of TABEL) {
      await queryInterface.createTable(tabel, kolom(Sequelize));
      await queryInterface.sequelize.query(
        `INSERT INTO ${tabel} (nama, tahun_mulai, tahun_selesai, jenis_semester, is_active, is_delete, created_at, updated_at)
         SELECT nama, tahun_mulai, tahun_selesai, jenis_semester, is_active, 0, NOW(), NOW() FROM tahun_ajaran WHERE is_delete = 0 ORDER BY tahun_mulai, jenis_semester`
      );
    }
  },

  down: async (queryInterface) => {
    for (const tabel of TABEL) await queryInterface.dropTable(tabel);
  },
};
