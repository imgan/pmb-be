'use strict';

/**
 * Batas tagihan akademik (isi KRS & lihat nilai) berubah dari nominal Rupiah menjadi persentase
 * tunggakan terhadap total kewajiban mahasiswa (0–100). Nilai lama berupa Rupiah tidak bisa
 * dikonversi, jadi direset ke 0 (= harus lunas); status aktif/nonaktif filter tetap dipertahankan.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query('UPDATE batas_tagihan_akademik SET batas_krs = 0, batas_nilai = 0');
    await queryInterface.changeColumn('batas_tagihan_akademik', 'batas_krs', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.changeColumn('batas_tagihan_akademik', 'batas_nilai', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('batas_tagihan_akademik', 'batas_krs', {
      type: Sequelize.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.changeColumn('batas_tagihan_akademik', 'batas_nilai', {
      type: Sequelize.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.sequelize.query('UPDATE batas_tagihan_akademik SET batas_krs = 0, batas_nilai = 0');
  },
};
