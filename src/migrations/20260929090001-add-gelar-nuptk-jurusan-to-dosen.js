'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('dosen', 'gelar', { type: Sequelize.STRING(100), allowNull: true });
    await queryInterface.addColumn('dosen', 'nuptk', { type: Sequelize.STRING(30), allowNull: true });
    await queryInterface.addColumn('dosen', 'jurusan_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'jurusan', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('dosen', 'gelar');
    await queryInterface.removeColumn('dosen', 'nuptk');
    await queryInterface.removeColumn('dosen', 'jurusan_id');
  },
};
