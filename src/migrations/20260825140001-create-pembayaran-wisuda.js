'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('pembayaran_wisuda', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      mahasiswa_id: { type: Sequelize.INTEGER, allowNull: false },
      tanggal_bayar: { type: Sequelize.DATEONLY, allowNull: false },
      no_bukti: { type: Sequelize.STRING(50), allowNull: false },
      semester: { type: Sequelize.INTEGER, allowNull: true },
      periode: { type: Sequelize.STRING(20), allowNull: false },
      bayar: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      kode_bank: { type: Sequelize.STRING(30), allowNull: true },
      created_by: { type: Sequelize.INTEGER, allowNull: true },
      updated_by: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('pembayaran_wisuda', ['mahasiswa_id']);
    await queryInterface.addIndex('pembayaran_wisuda', ['no_bukti']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('pembayaran_wisuda');
  },
};
