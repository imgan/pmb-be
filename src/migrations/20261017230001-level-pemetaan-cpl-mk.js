'use strict';

/**
 * Pemetaan CPL → MK dua level: kurikulum.level_pemetaan_cpl_mk — CPL (pemetaan sampai CPL induk) /
 * IK (sampai Indikator Kinerja; CPL tanpa IK tetap dipetakan langsung). cpl_mata_kuliah.cpl_id berisi
 * id CPL induk atau id IK sesuai level.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('kurikulum', 'level_pemetaan_cpl_mk', {
      type: Sequelize.ENUM('CPL', 'IK'),
      allowNull: false,
      defaultValue: 'CPL',
      after: 'metode_bobot_pl_cpl',
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('kurikulum', 'level_pemetaan_cpl_mk');
  },
};
