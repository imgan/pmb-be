'use strict';

/**
 * Tahun Ajaran PMB & Tahun Ajaran Keuangan sebagai data tersendiri (CRUD di Modul Admin), terpisah dari tabel
 * tahun_ajaran (tahun akademik) — PMB & Keuangan dapat berjalan di periode berbeda.
 * - tabel tahun_pmb & tahun_keuangan (struktur sama dengan tahun_ajaran; satu baris aktif per tabel), diisi awal
 *   dari tahun_ajaran beserta tahun aktifnya;
 * - gelombang.tahun_pmb_id menggantikan gelombang.tahun_ajaran_id (migrasi 20261022090001, belum pernah terisi);
 * - kolom penanda tahun_ajaran.is_active_pmb / is_active_keuangan (migrasi 20261022090001) dicabut.
 */
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
    await queryInterface.createTable('tahun_pmb', kolom(Sequelize));
    await queryInterface.createTable('tahun_keuangan', kolom(Sequelize));
    for (const [tabel, aktif] of [
      ['tahun_pmb', 'is_active_pmb'],
      ['tahun_keuangan', 'is_active_keuangan'],
    ]) {
      await queryInterface.sequelize.query(
        `INSERT INTO ${tabel} (nama, tahun_mulai, tahun_selesai, jenis_semester, is_active, is_delete, created_at, updated_at)
         SELECT nama, tahun_mulai, tahun_selesai, jenis_semester, ${aktif}, 0, NOW(), NOW() FROM tahun_ajaran WHERE is_delete = 0 ORDER BY tahun_mulai, jenis_semester`
      );
    }

    await queryInterface.removeColumn('gelombang', 'tahun_ajaran_id');
    await queryInterface.addColumn('gelombang', 'tahun_pmb_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: 'nama_gelombang',
      references: { model: 'tahun_pmb', key: 'id' },
      onDelete: 'SET NULL',
    });
    await queryInterface.removeColumn('tahun_ajaran', 'is_active_keuangan');
    await queryInterface.removeColumn('tahun_ajaran', 'is_active_pmb');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('tahun_ajaran', 'is_active_pmb', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false, after: 'is_active' });
    await queryInterface.addColumn('tahun_ajaran', 'is_active_keuangan', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false, after: 'is_active_pmb' });
    await queryInterface.removeColumn('gelombang', 'tahun_pmb_id');
    await queryInterface.addColumn('gelombang', 'tahun_ajaran_id', { type: Sequelize.INTEGER, allowNull: true, after: 'nama_gelombang', references: { model: 'tahun_ajaran', key: 'id' }, onDelete: 'SET NULL' });
    await queryInterface.dropTable('tahun_keuangan');
    await queryInterface.dropTable('tahun_pmb');
  },
};
