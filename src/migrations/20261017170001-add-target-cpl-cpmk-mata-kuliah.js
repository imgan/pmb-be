'use strict';

// Target capaian mata kuliah OBE (Setting Kurikulum): CPL (Capaian Pembelajaran Lulusan) & CPMK
// (Capaian Pembelajaran Mata Kuliah), dalam persen/skor 0–100. Hanya berarti untuk MK OBE.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('mata_kuliah', 'target_cpl', { type: Sequelize.DECIMAL(5, 2), allowNull: true, after: 'is_obe' });
    await queryInterface.addColumn('mata_kuliah', 'target_cpmk', { type: Sequelize.DECIMAL(5, 2), allowNull: true, after: 'target_cpl' });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('mata_kuliah', 'target_cpmk');
    await queryInterface.removeColumn('mata_kuliah', 'target_cpl');
  },
};
