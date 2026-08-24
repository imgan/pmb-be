'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('dokumen_kelengkapan', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      nama_kelengkapan: { type: Sequelize.STRING(150), allowNull: false },
      is_wajib: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      is_beasiswa: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      file: { type: Sequelize.TEXT('long'), allowNull: true },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      updated_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('dokumen_kelengkapan');
  },
};
