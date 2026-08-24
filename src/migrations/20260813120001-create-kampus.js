'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('kampus', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      nama_kampus: { type: Sequelize.STRING(150), allowNull: false },
      alamat: { type: Sequelize.TEXT, allowNull: true },
      telepon: { type: Sequelize.STRING(30), allowNull: true },
      kode_pos: { type: Sequelize.STRING(10), allowNull: true },
      email: { type: Sequelize.STRING(100), allowNull: true },
      whatsapp_number: { type: Sequelize.STRING(30), allowNull: true },
      facebook_url: { type: Sequelize.STRING(255), allowNull: true },
      instagram_url: { type: Sequelize.STRING(255), allowNull: true },
      youtube_url: { type: Sequelize.STRING(255), allowNull: true },
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
    await queryInterface.dropTable('kampus');
  },
};
