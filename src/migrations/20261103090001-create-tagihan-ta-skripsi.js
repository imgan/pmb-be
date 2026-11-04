'use strict';

/**
 * Tagihan TA/Skripsi (pola tagihan wisuda): satu tagihan per mahasiswa, nominal disalin dari biaya pendaftaran
 * tarif_ta_skripsi prodinya saat generate. Pembayaran terhubung ke tagihannya, boleh dicicil sesuai jadwal cicilan.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('tagihan_ta_skripsi', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      mahasiswa_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'mahasiswa', key: 'id' }, onDelete: 'CASCADE' },
      tarif_ta_skripsi_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'tarif_ta_skripsi', key: 'id' }, onDelete: 'SET NULL' },
      tahun_ta_skripsi_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'tahun_ta_skripsi', key: 'id' }, onDelete: 'SET NULL' },
      periode: { type: Sequelize.INTEGER, allowNull: false },
      keterangan: { type: Sequelize.STRING(255), allowNull: true },
      total_tagihan: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      created_by: { type: Sequelize.INTEGER, allowNull: true },
      updated_by: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('tagihan_ta_skripsi', ['mahasiswa_id'], { unique: true, name: 'tagihan_ta_skripsi_mahasiswa' });

    await queryInterface.createTable('tagihan_ta_skripsi_cicilan', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      tagihan_ta_skripsi_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'tagihan_ta_skripsi', key: 'id' }, onDelete: 'CASCADE' },
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
    await queryInterface.addIndex('tagihan_ta_skripsi_cicilan', ['tagihan_ta_skripsi_id', 'cicilan_ke'], { unique: true, name: 'tagihan_ta_skripsi_cicilan_ke' });

    await queryInterface.addColumn('pembayaran_ta_skripsi', 'tagihan_ta_skripsi_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: 'mahasiswa_id',
      references: { model: 'tagihan_ta_skripsi', key: 'id' },
      onDelete: 'SET NULL',
    });
    await queryInterface.addColumn('pembayaran_ta_skripsi', 'semester', { type: Sequelize.INTEGER, allowNull: true, after: 'periode' });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('pembayaran_ta_skripsi', 'semester');
    await queryInterface.removeColumn('pembayaran_ta_skripsi', 'tagihan_ta_skripsi_id');
    await queryInterface.dropTable('tagihan_ta_skripsi_cicilan');
    await queryInterface.dropTable('tagihan_ta_skripsi');
  },
};
