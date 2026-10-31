'use strict';

/**
 * Mata kuliah: ikon ilustrasi pilihan (kunci tema, mis. "database", "jaringan") untuk kartu kelas E-learning.
 * null = otomatis (ditebak dari nama mata kuliah).
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('mata_kuliah', 'ikon', { type: Sequelize.STRING(40), allowNull: true, after: 'silabus' });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('mata_kuliah', 'ikon');
  },
};
