'use strict';

/**
 * Manajemen CPL: CPL bisa punya sub-item Indikator Kinerja (IK) — baris cpl dengan parent_id = CPL
 * induk — dan deskripsi Bahasa Inggris (opsional). Status pengisian & pemetaan hanya memakai CPL induk.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('cpl', 'parent_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: 'kurikulum_id',
      references: { model: 'cpl', key: 'id' },
      onDelete: 'CASCADE',
    });
    await queryInterface.addColumn('cpl', 'deskripsi_en', { type: Sequelize.TEXT, allowNull: true, after: 'deskripsi' });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('cpl', 'deskripsi_en');
    await queryInterface.removeConstraint('cpl', 'cpl_parent_id_foreign_idx').catch(() => {});
    await queryInterface.removeColumn('cpl', 'parent_id');
  },
};
