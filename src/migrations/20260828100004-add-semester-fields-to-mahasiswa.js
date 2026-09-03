'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // semester_diakui: hanya relevan untuk mahasiswa transfer (statusMasuk TRANSFER_*) — nilainya
    // hasil SK penyetaraan/konversi SKS dari prodi asal, jadi input manual oleh akademik/prodi,
    // BUKAN hasil hitungan rumus. Null berarti belum diisi / tidak relevan (mahasiswa baru).
    await queryInterface.addColumn('mahasiswa', 'semester_diakui', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    // jumlah_semester_cuti: tidak ada tabel riwayat cuti per semester di sistem ini (cuti hanya
    // tercatat sebagai salah satu nilai statusKeluar), jadi jumlah semester cuti yang pernah
    // diambil juga input manual oleh akademik/prodi.
    await queryInterface.addColumn('mahasiswa', 'jumlah_semester_cuti', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('mahasiswa', 'jumlah_semester_cuti');
    await queryInterface.removeColumn('mahasiswa', 'semester_diakui');
  },
};
