'use strict';

/**
 * Tagihan kuliah berbasis import (billing import-based): nominal ditetapkan bagian keuangan lewat
 * file Excel per NIM + tahun akademik/semester, bukan dihitung dari Master Tarif.
 *
 * - tagihan_kuliah: kolom hasil import. Dibayar = total_bayar_import + transaksi kasir
 *   (pembayaran_kuliah) yang dicatat SETELAH imported_at; tunggakan (utang semester sebelumnya)
 *   disimpan terpisah dari sisa semester berjalan.
 * - tagihan_import_batch: riwayat setiap proses import.
 * - tagihan_import_log: nilai lama & baru per baris untuk audit.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const money = { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 };

    await queryInterface.createTable('tagihan_import_batch', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      file_name: { type: Sequelize.STRING(255), allowNull: true },
      status: { type: Sequelize.ENUM('BERHASIL', 'SEBAGIAN', 'GAGAL'), allowNull: false },
      total_rows: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      created_rows: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      updated_rows: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      unchanged_rows: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      failed_rows: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      errors: { type: Sequelize.JSON, allowNull: true },
      imported_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      imported_at: { type: Sequelize.DATE, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addColumn('tagihan_kuliah', 'total_bayar_import', { ...money, after: 'total_tagihan' });
    await queryInterface.addColumn('tagihan_kuliah', 'tunggakan', { ...money, after: 'total_bayar_import' });
    await queryInterface.addColumn('tagihan_kuliah', 'tanggal_jatuh_tempo', { type: Sequelize.DATEONLY, allowNull: true, after: 'tunggakan' });
    await queryInterface.addColumn('tagihan_kuliah', 'keterangan', { type: Sequelize.STRING(255), allowNull: true, after: 'tanggal_jatuh_tempo' });
    await queryInterface.addColumn('tagihan_kuliah', 'sumber', {
      type: Sequelize.ENUM('GENERATE', 'IMPORT'),
      allowNull: false,
      defaultValue: 'IMPORT',
      after: 'keterangan',
    });
    await queryInterface.addColumn('tagihan_kuliah', 'import_batch_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: 'sumber',
      references: { model: 'tagihan_import_batch', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
    await queryInterface.addColumn('tagihan_kuliah', 'imported_at', { type: Sequelize.DATE, allowNull: true, after: 'import_batch_id' });

    await queryInterface.createTable('tagihan_import_log', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      batch_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'tagihan_import_batch', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      row_number: { type: Sequelize.INTEGER, allowNull: true },
      tagihan_kuliah_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'tagihan_kuliah', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      mahasiswa_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'mahasiswa', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      nim: { type: Sequelize.STRING(30), allowNull: true },
      aksi: { type: Sequelize.ENUM('BARU', 'UBAH', 'TETAP', 'GAGAL'), allowNull: false },
      nilai_lama: { type: Sequelize.JSON, allowNull: true },
      nilai_baru: { type: Sequelize.JSON, allowNull: true },
      pesan: { type: Sequelize.STRING(500), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('tagihan_import_log', ['batch_id']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('tagihan_import_log');
    for (const col of ['imported_at', 'import_batch_id', 'sumber', 'keterangan', 'tanggal_jatuh_tempo', 'tunggakan', 'total_bayar_import']) {
      await queryInterface.removeColumn('tagihan_kuliah', col);
    }
    await queryInterface.dropTable('tagihan_import_batch');
  },
};
