'use strict';

/**
 * SKS yang diberikan ke tiap dosen pengampu pada satu jadwal kuliah (team teaching). DECIMAL supaya
 * pembagian tidak bulat (mis. 3 SKS dibagi dua dosen = 1,5) tetap bisa dicatat. NULL = belum diisi.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('jadwal_kuliah_dosen_pengampu', 'sks', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true,
      after: 'dosen_id',
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('jadwal_kuliah_dosen_pengampu', 'sks');
  },
};
