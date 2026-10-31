'use strict';

/**
 * Pemetaan CPMK → CPL berbobot (menu RPS → Pemetaan CPMK): cpmk_cpl.bobot (persen; total satu mata kuliah
 * = 100), mata_kuliah.level_pemetaan_cpmk — CPMK (baris = CPMK induk) / SUB_CPMK (baris = Sub-CPMK; CPMK
 * tanpa Sub-CPMK tetap satu baris) dan mata_kuliah.metode_bobot_cpmk — MANUAL / OTOMATIS (dibagi rata).
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('cpmk_cpl', 'bobot', { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 0, after: 'cpl_id' });
    await queryInterface.addColumn('mata_kuliah', 'level_pemetaan_cpmk', {
      type: Sequelize.ENUM('CPMK', 'SUB_CPMK'),
      allowNull: false,
      defaultValue: 'CPMK',
      after: 'target_cpmk',
    });
    await queryInterface.addColumn('mata_kuliah', 'metode_bobot_cpmk', {
      type: Sequelize.ENUM('MANUAL', 'OTOMATIS'),
      allowNull: false,
      defaultValue: 'OTOMATIS',
      after: 'level_pemetaan_cpmk',
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('mata_kuliah', 'metode_bobot_cpmk');
    await queryInterface.removeColumn('mata_kuliah', 'level_pemetaan_cpmk');
    await queryInterface.removeColumn('cpmk_cpl', 'bobot');
  },
};
