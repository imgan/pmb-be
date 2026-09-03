'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('pembayaran_lain', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      mahasiswa_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'mahasiswa', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      tarif_lain_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'tarif_lain', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      tanggal_bayar: { type: Sequelize.DATEONLY, allowNull: false },
      no_bukti: { type: Sequelize.STRING(50), allowNull: false },
      nominal: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      kode_bank: { type: Sequelize.STRING(30), allowNull: true },
      keterangan: { type: Sequelize.STRING(150), allowNull: true },
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
    await queryInterface.dropTable('pembayaran_lain');
  },
};
