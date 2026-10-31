'use strict';

/**
 * Tahun aktif terpisah per modul: PMB & Keuangan bisa berjalan di tahun ajaran yang berbeda dari tahun akademik
 * (mis. PMB sudah membuka penerimaan tahun depan, kasir masih menagih semester lalu).
 * - tahun_ajaran.is_active_pmb / is_active_keuangan: satu baris aktif per modul (diatur di Modul Admin), awalnya
 *   disamakan dengan tahun akademik aktif saat ini;
 * - gelombang.tahun_ajaran_id: Tahun PMB gelombang (opsional; gelombang lama tetap tanpa tahun).
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('tahun_ajaran', 'is_active_pmb', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false, after: 'is_active' });
    await queryInterface.addColumn('tahun_ajaran', 'is_active_keuangan', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false, after: 'is_active_pmb' });
    await queryInterface.sequelize.query('UPDATE tahun_ajaran SET is_active_pmb = is_active, is_active_keuangan = is_active WHERE is_delete = 0');

    await queryInterface.addColumn('gelombang', 'tahun_ajaran_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: 'nama_gelombang',
      references: { model: 'tahun_ajaran', key: 'id' },
      onDelete: 'SET NULL',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('gelombang', 'tahun_ajaran_id');
    await queryInterface.removeColumn('tahun_ajaran', 'is_active_keuangan');
    await queryInterface.removeColumn('tahun_ajaran', 'is_active_pmb');
  },
};
