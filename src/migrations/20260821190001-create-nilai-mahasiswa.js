'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('nilai_mahasiswa', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      mahasiswa_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'mahasiswa', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      kode_mata_kuliah: { type: Sequelize.STRING(30), allowNull: false },
      nama_mata_kuliah: { type: Sequelize.STRING(150), allowNull: false },
      sks: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      semester: { type: Sequelize.INTEGER, allowNull: false },
      partisipatif: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
      proyek: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
      quiz: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
      tugas: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
      uts: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
      uas: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
      nilai: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
      grade: { type: Sequelize.STRING(2), allowNull: false, defaultValue: 'E' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('nilai_mahasiswa');
  },
};
