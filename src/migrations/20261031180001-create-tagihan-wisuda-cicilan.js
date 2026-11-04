'use strict';

/** Jadwal cicilan bulanan tagihan wisuda (pola tagihan_cicilan SPP); status dihitung dari total dibayar, cicilan awal dulu. */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('tagihan_wisuda_cicilan', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      tagihan_wisuda_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'tagihan_wisuda', key: 'id' }, onDelete: 'CASCADE' },
      cicilan_ke: { type: Sequelize.INTEGER, allowNull: false },
      periode: { type: Sequelize.DATEONLY, allowNull: false },
      nominal: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      tanggal_jatuh_tempo: { type: Sequelize.DATEONLY, allowNull: true },
      no_virtual_account: { type: Sequelize.STRING(30), allowNull: true },
      keterangan: { type: Sequelize.STRING(255), allowNull: true },
      created_by: { type: Sequelize.INTEGER, allowNull: true },
      updated_by: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('tagihan_wisuda_cicilan', ['tagihan_wisuda_id', 'cicilan_ke'], { unique: true, name: 'tagihan_wisuda_cicilan_ke' });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('tagihan_wisuda_cicilan');
  },
};
