'use strict';

/**
 * Login PMB pakai nomor HP: akun peserta baru memakai password awal = nomor HP dan wajib menggantinya saat login
 * pertama. Akun lama tidak diubah (false = tidak wajib ganti).
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('peserta', 'wajib_ganti_password', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false, after: 'password' });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('peserta', 'wajib_ganti_password');
  },
};
