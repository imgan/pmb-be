'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('honor_ujian_pembayaran', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      dosen_id: { type: Sequelize.INTEGER, allowNull: false },
      nominal: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      tanggal_bayar: { type: Sequelize.DATEONLY, allowNull: false },
      created_by: { type: Sequelize.INTEGER, allowNull: true },
      updated_by: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('honor_ujian_pembayaran', ['dosen_id']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('honor_ujian_pembayaran');
  },
};
