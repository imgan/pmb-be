'use strict';

// Nomor Virtual Account bank per mahasiswa per periode: VA berganti tiap bulan, jadi satu mahasiswa
// punya banyak VA, masing-masing berlaku dari periode_open s.d. periode_close dengan nominal tagihan
// sendiri. Diisi lewat Import VA (menu Tagihan Mahasiswa) dari file bank.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('virtual_account_mahasiswa', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      mahasiswa_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'mahasiswa', key: 'id' },
        onDelete: 'CASCADE',
      },
      no_virtual_account: { type: Sequelize.STRING(30), allowNull: false },
      periode_open: { type: Sequelize.DATEONLY, allowNull: false },
      periode_close: { type: Sequelize.DATEONLY, allowNull: false },
      nominal: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      created_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      updated_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    // Identitas baris import = mahasiswa + periode_open: import ulang periode yang sama memperbarui.
    await queryInterface.addIndex('virtual_account_mahasiswa', ['mahasiswa_id', 'periode_open'], {
      name: 'uq_va_mahasiswa_periode_open',
      unique: true,
    });
    await queryInterface.addIndex('virtual_account_mahasiswa', ['no_virtual_account'], { name: 'idx_va_mahasiswa_no_va' });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('virtual_account_mahasiswa');
  },
};
