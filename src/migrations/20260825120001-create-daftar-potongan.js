'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('daftar_potongan', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      mahasiswa_id: { type: Sequelize.INTEGER, allowNull: false },
      biaya: { type: Sequelize.DECIMAL(14, 2), allowNull: false },
      semester: { type: Sequelize.INTEGER, allowNull: true },
      alasan: { type: Sequelize.TEXT, allowNull: true },
      asal: { type: Sequelize.STRING(100), allowNull: true },
      created_by: { type: Sequelize.INTEGER, allowNull: true },
      updated_by: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('daftar_potongan', ['mahasiswa_id']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('daftar_potongan');
  },
};
