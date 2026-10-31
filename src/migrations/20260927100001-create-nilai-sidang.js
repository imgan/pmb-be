'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('nilai_sidang', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      pendaftar_sidang_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'pendaftar_sidang', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      peran: {
        type: Sequelize.ENUM('PEMBIMBING_1', 'PEMBIMBING_2', 'PENGUJI_1', 'PENGUJI_2'),
        allowNull: false,
      },
      dosen_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'dosen', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      nilai: { type: Sequelize.DECIMAL(5, 2), allowNull: false },
      grade: { type: Sequelize.STRING(2), allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    // Satu nilai per peran per pendaftar sidang.
    await queryInterface.addIndex('nilai_sidang', ['pendaftar_sidang_id', 'peran'], {
      unique: true,
      name: 'nilai_sidang_pendaftar_peran_unique',
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('nilai_sidang');
  },
};
