'use strict';

/** Rencana Pembelajaran (RPS): bentuk pembelajaran tiap sesi — Luring / Daring / Hybrid. */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('rps_pertemuan', 'bentuk_pembelajaran', {
      type: Sequelize.ENUM('LURING', 'DARING', 'HYBRID'),
      allowNull: true,
      after: 'kriteria_penilaian',
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('rps_pertemuan', 'bentuk_pembelajaran');
  },
};
