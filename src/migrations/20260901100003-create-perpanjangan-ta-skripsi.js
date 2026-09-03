'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('perpanjangan_ta_skripsi', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      mahasiswa_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'mahasiswa', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      periode: { type: Sequelize.INTEGER, allowNull: false },
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
    await queryInterface.addIndex('perpanjangan_ta_skripsi', ['mahasiswa_id']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('perpanjangan_ta_skripsi');
  },
};
