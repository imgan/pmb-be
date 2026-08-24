'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('calon_mahasiswa', 'peserta_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'peserta', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('calon_mahasiswa', 'peserta_id');
  },
};
