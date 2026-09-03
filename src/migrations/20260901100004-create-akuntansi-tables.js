'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('akun', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      kode: { type: Sequelize.STRING(20), allowNull: false, unique: true },
      nama: { type: Sequelize.STRING(150), allowNull: false },
      // Kategori & saldo normal mengikuti struktur PSAK standar: ASET/BEBAN bersaldo normal
      // DEBIT, KEWAJIBAN/EKUITAS/PENDAPATAN bersaldo normal KREDIT.
      kategori: {
        type: Sequelize.ENUM('ASET', 'KEWAJIBAN', 'EKUITAS', 'PENDAPATAN', 'BEBAN'),
        allowNull: false,
      },
      saldo_normal: { type: Sequelize.ENUM('DEBIT', 'KREDIT'), allowNull: false },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.createTable('jurnal', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      tanggal: { type: Sequelize.DATEONLY, allowNull: false },
      no_bukti: { type: Sequelize.STRING(50), allowNull: true },
      keterangan: { type: Sequelize.STRING(255), allowNull: true },
      // referensi_tipe + referensi_id menunjuk balik ke transaksi sumber (mis. 'PEMBAYARAN_KULIAH'
      // + id row pembayaran_kuliah) — dipakai untuk audit trail, bukan foreign key sungguhan
      // karena tabel sumbernya berbeda-beda per tipe.
      referensi_tipe: { type: Sequelize.STRING(50), allowNull: true },
      referensi_id: { type: Sequelize.INTEGER, allowNull: true },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('jurnal', ['tanggal']);
    await queryInterface.addIndex('jurnal', ['referensi_tipe', 'referensi_id']);

    await queryInterface.createTable('jurnal_detail', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      jurnal_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'jurnal', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      akun_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'akun', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      debit: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      kredit: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('jurnal_detail', ['akun_id']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('jurnal_detail');
    await queryInterface.dropTable('jurnal');
    await queryInterface.dropTable('akun');
  },
};
