'use strict';

/**
 * Tagihan wisuda (pola tagihan SPP): satu tagihan per mahasiswa per tahun tarif, nominal disalin dari tarif_lain ber-kode
 * WISUDA saat generate. Pembayaran terhubung ke tagihannya dan boleh dicicil sampai lunas.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('tagihan_wisuda', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      mahasiswa_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'mahasiswa', key: 'id' }, onDelete: 'CASCADE' },
      tarif_lain_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'tarif_lain', key: 'id' }, onDelete: 'SET NULL' },
      kode_biaya: { type: Sequelize.STRING(50), allowNull: false, defaultValue: 'WISUDA' },
      tahun: { type: Sequelize.INTEGER, allowNull: false },
      keterangan: { type: Sequelize.STRING(255), allowNull: true },
      total_tagihan: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      created_by: { type: Sequelize.INTEGER, allowNull: true },
      updated_by: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('tagihan_wisuda', ['mahasiswa_id', 'tahun'], { unique: true, name: 'tagihan_wisuda_mahasiswa_tahun' });
    await queryInterface.addColumn('pembayaran_wisuda', 'tagihan_wisuda_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: 'mahasiswa_id',
      references: { model: 'tagihan_wisuda', key: 'id' },
      onDelete: 'SET NULL',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('pembayaran_wisuda', 'tagihan_wisuda_id');
    await queryInterface.dropTable('tagihan_wisuda');
  },
};
