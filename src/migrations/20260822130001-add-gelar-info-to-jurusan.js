'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('jurusan', 'jenjang_pendidikan', { type: Sequelize.STRING(50), allowNull: true });
    await queryInterface.addColumn('jurusan', 'gelar_singkat', { type: Sequelize.STRING(30), allowNull: true });
    await queryInterface.addColumn('jurusan', 'gelar_lengkap', { type: Sequelize.STRING(150), allowNull: true });
    await queryInterface.addColumn('jurusan', 'nama_fakultas', { type: Sequelize.STRING(150), allowNull: true });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('jurusan', 'jenjang_pendidikan');
    await queryInterface.removeColumn('jurusan', 'gelar_singkat');
    await queryInterface.removeColumn('jurusan', 'gelar_lengkap');
    await queryInterface.removeColumn('jurusan', 'nama_fakultas');
  },
};
