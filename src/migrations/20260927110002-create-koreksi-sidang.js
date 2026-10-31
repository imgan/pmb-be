'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('koreksi_sidang', {
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
      bab_halaman: { type: Sequelize.STRING(100), allowNull: true },
      uraian: { type: Sequelize.TEXT, allowNull: false },
      is_selesai: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('koreksi_sidang', ['pendaftar_sidang_id', 'peran'], { name: 'koreksi_sidang_pendaftar_peran' });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('koreksi_sidang');
  },
};
