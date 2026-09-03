'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('pembayaran_sertifikasi', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      mahasiswa_id: { type: Sequelize.INTEGER, allowNull: false },
      tanggal_bayar: { type: Sequelize.DATEONLY, allowNull: false },
      no_bukti: { type: Sequelize.STRING(50), allowNull: false },
      jenis_pembayaran: { type: Sequelize.STRING(100), allowNull: false },
      cara_pembayaran: { type: Sequelize.STRING(30), allowNull: false },
      tanggal_pelaksanaan: { type: Sequelize.DATEONLY, allowNull: true },
      waktu_pelaksanaan: { type: Sequelize.STRING(20), allowNull: true },
      bayar: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      kode_bank: { type: Sequelize.STRING(30), allowNull: true },
      keterangan: { type: Sequelize.STRING(150), allowNull: true },
      status_sertifikasi: {
        type: Sequelize.ENUM('MENUNGGU', 'LULUS', 'TIDAK_LULUS'),
        allowNull: false,
        defaultValue: 'MENUNGGU',
      },
      bukti_pembayaran: { type: Sequelize.TEXT('long'), allowNull: true },
      created_by: { type: Sequelize.INTEGER, allowNull: true },
      updated_by: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('pembayaran_sertifikasi', ['mahasiswa_id']);
    await queryInterface.addIndex('pembayaran_sertifikasi', ['no_bukti']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('pembayaran_sertifikasi');
  },
};
