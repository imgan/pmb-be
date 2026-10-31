'use strict';

/**
 * Status gelombang yang bisa diatur admin: OTOMATIS (aktif bila hari ini di antara tanggal mulai–selesai, perilaku
 * lama), AKTIF (dipaksa aktif), TIDAK_AKTIF (dipaksa nonaktif / disembunyikan dari formulir pendaftaran).
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('gelombang', 'status', {
      type: Sequelize.ENUM('OTOMATIS', 'AKTIF', 'TIDAK_AKTIF'),
      allowNull: false,
      defaultValue: 'OTOMATIS',
      after: 'deskripsi',
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('gelombang', 'status');
  },
};
