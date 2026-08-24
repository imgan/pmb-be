'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('mahasiswa', 'pembimbing_akademik_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'pembimbing_akademik', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('mahasiswa', 'pembimbing_akademik_id');
  },
};
