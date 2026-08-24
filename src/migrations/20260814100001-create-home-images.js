'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('home_images', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      hero_image: { type: Sequelize.TEXT('long'), allowNull: true },
      program_studi_image: { type: Sequelize.TEXT('long'), allowNull: true },
      kehidupan_kampus_image: { type: Sequelize.TEXT('long'), allowNull: true },
      fasilitas_lab_image: { type: Sequelize.TEXT('long'), allowNull: true },
      fasilitas_gedung_image: { type: Sequelize.TEXT('long'), allowNull: true },
      fasilitas_aula_image: { type: Sequelize.TEXT('long'), allowNull: true },
      beasiswa_slide1_image: { type: Sequelize.TEXT('long'), allowNull: true },
      beasiswa_slide2_image: { type: Sequelize.TEXT('long'), allowNull: true },
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
    await queryInterface.dropTable('home_images');
  },
};
