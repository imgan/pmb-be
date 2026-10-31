'use strict';

// Cicilan bulanan tagihan kuliah: satu tagihan semester dipecah per bulan, masing-masing punya
// nominal, jatuh tempo & No Virtual Account sendiri. Status cicilan dihitung dari total dibayar
// tagihan (lihat utils/tagihanCicilan.js), jadi alur pembayaran kasir/import tidak berubah.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('tagihan_cicilan', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      tagihan_kuliah_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'tagihan_kuliah', key: 'id' },
        onDelete: 'CASCADE',
      },
      cicilan_ke: { type: Sequelize.INTEGER, allowNull: false },
      // Bulan tagihan, disimpan sebagai tanggal 1 bulan tsb.
      periode: { type: Sequelize.DATEONLY, allowNull: false },
      nominal: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      tanggal_jatuh_tempo: { type: Sequelize.DATEONLY, allowNull: true },
      no_virtual_account: { type: Sequelize.STRING(30), allowNull: true },
      keterangan: { type: Sequelize.STRING(255), allowNull: true },
      created_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      updated_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('tagihan_cicilan', ['tagihan_kuliah_id', 'cicilan_ke'], {
      name: 'uq_tagihan_cicilan_ke',
      unique: true,
    });
    await queryInterface.addIndex('tagihan_cicilan', ['no_virtual_account'], { name: 'idx_tagihan_cicilan_va' });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('tagihan_cicilan');
  },
};
