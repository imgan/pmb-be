'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('tahun_ajaran', 'jenis_semester', {
      type: Sequelize.ENUM('GANJIL', 'GENAP'),
      allowNull: false,
      defaultValue: 'GANJIL',
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('tahun_ajaran', 'jenis_semester');
  },
};
