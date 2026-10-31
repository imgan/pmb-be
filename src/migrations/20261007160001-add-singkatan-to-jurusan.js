'use strict';

/**
 * Singkatan prodi (mis. "TI", "FA") — dipakai menyusun nama kelas mahasiswa saat Generate NIM:
 * [singkatan][semester][huruf kelas][P/M], mis. TI1AP. Diisi manual di Master Jurusan.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('jurusan', 'singkatan', {
      type: Sequelize.STRING(5),
      allowNull: true,
      after: 'kode_prodi',
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('jurusan', 'singkatan');
  },
};
