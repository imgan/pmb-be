'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Uraian materi/pokok bahasan yang disampaikan dosen pada pertemuan ini.
    await queryInterface.addColumn('kehadiran_dosen', 'uraian', { type: Sequelize.TEXT, allowNull: true, after: 'keterangan' });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('kehadiran_dosen', 'uraian');
  },
};
