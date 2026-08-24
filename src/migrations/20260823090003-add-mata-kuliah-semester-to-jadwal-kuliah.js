'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('jadwal_kuliah', 'mata_kuliah_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'mata_kuliah', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
    await queryInterface.addColumn('jadwal_kuliah', 'semester', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('jadwal_kuliah', 'mata_kuliah_id');
    await queryInterface.removeColumn('jadwal_kuliah', 'semester');
  },
};
