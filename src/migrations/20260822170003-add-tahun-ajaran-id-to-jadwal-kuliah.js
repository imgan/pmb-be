'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('jadwal_kuliah', 'tahun_ajaran_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'tahun_ajaran', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('jadwal_kuliah', 'tahun_ajaran_id');
  },
};
