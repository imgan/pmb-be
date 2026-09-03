'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('kehadiran_dosen', 'jam_masuk', {
      type: Sequelize.TIME,
      allowNull: true,
    });
    await queryInterface.addColumn('kehadiran_dosen', 'jam_keluar', {
      type: Sequelize.TIME,
      allowNull: true,
    });
    await queryInterface.addColumn('kehadiran_dosen', 'pertemuan_ke', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('kehadiran_dosen', 'jam_masuk');
    await queryInterface.removeColumn('kehadiran_dosen', 'jam_keluar');
    await queryInterface.removeColumn('kehadiran_dosen', 'pertemuan_ke');
  },
};
