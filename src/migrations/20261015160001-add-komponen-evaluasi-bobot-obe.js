'use strict';

/** Rincian Komponen Evaluasi Bobot OBE: [{ metode, jenis, bobot, syaratLulus }]. */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('bobot_obe', 'komponen_evaluasi', {
      type: Sequelize.JSON,
      allowNull: true,
      after: 'uas',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('bobot_obe', 'komponen_evaluasi');
  },
};
