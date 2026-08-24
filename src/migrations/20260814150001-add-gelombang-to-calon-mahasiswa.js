'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('calon_mahasiswa', 'gelombang_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'gelombang', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('calon_mahasiswa', 'gelombang_id');
  },
};
