'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('keringanan', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      mahasiswa_id: { type: Sequelize.INTEGER, allowNull: false },
      tanggal: { type: Sequelize.DATEONLY, allowNull: false },
      total_tagihan: { type: Sequelize.DECIMAL(14, 2), allowNull: true },
      jumlah_bayar: { type: Sequelize.DECIMAL(14, 2), allowNull: false },
      alasan: { type: Sequelize.TEXT, allowNull: true },
      status: {
        type: Sequelize.ENUM('DIAJUKAN', 'DISETUJUI', 'DITOLAK'),
        allowNull: false,
        defaultValue: 'DIAJUKAN',
      },
      created_by: { type: Sequelize.INTEGER, allowNull: true },
      updated_by: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('keringanan', ['mahasiswa_id']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('keringanan');
  },
};
