'use strict';

/**
 * Data Pendidikan peserta (form pendaftaran & menu Peserta). Nama asal sekolah tetap di peserta.asal_sekolah; kolom
 * lainnya opsional karena biodata lama belum memilikinya.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const kolom = [
      ['jurusan_sekolah', Sequelize.STRING(100)],
      ['tahun_lulus', Sequelize.STRING(4)],
      ['jenis_pengelolaan_sekolah', Sequelize.STRING(20)],
      ['alamat_sekolah', Sequelize.STRING(255)],
      ['nisn', Sequelize.STRING(10)],
    ];
    let setelah = 'no_whatsapp';
    for (const [nama, type] of kolom) {
      await queryInterface.addColumn('peserta_biodata', nama, { type, allowNull: true, after: setelah });
      setelah = nama;
    }
  },
  down: async (queryInterface) => {
    for (const nama of ['nisn', 'alamat_sekolah', 'jenis_pengelolaan_sekolah', 'tahun_lulus', 'jurusan_sekolah']) {
      await queryInterface.removeColumn('peserta_biodata', nama);
    }
  },
};
