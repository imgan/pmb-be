'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('mahasiswa', 'tahun_ajaran_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'tahun_ajaran', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('mahasiswa', 'tahun_ajaran_id');
  },
};
