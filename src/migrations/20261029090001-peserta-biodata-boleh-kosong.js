'use strict';

/**
 * Biodata peserta boleh dibuat sebagian: admin bisa menyimpan Data Pendidikan (menu Peserta) sebelum biodata pribadi
 * (NIK, tempat/tanggal lahir, alamat, dst.) diisi. Kolom pribadi jadi boleh NULL; kewajiban isi tetap dicek di form
 * biodata peserta & admin. Unique index NIK tetap (MySQL mengizinkan banyak NULL).
 */
const KOLOM = (Sequelize) => [
  ['tempat_lahir', Sequelize.STRING(100)],
  ['tanggal_lahir', Sequelize.DATEONLY],
  ['jenis_kelamin', Sequelize.ENUM('L', 'P')],
  ['agama', Sequelize.STRING(50)],
  ['kewarganegaraan', Sequelize.STRING(50)],
  ['nik', Sequelize.STRING(16)],
  ['nama_ibu_kandung', Sequelize.STRING(150)],
  ['jalan', Sequelize.STRING(255)],
  ['rt', Sequelize.STRING(3)],
  ['rw', Sequelize.STRING(3)],
  ['desa_kelurahan', Sequelize.STRING(100)],
  ['provinsi', Sequelize.STRING(100)],
  ['kabupaten', Sequelize.STRING(100)],
  ['kecamatan', Sequelize.STRING(100)],
  ['kode_pos', Sequelize.STRING(10)],
  ['no_whatsapp', Sequelize.STRING(20)],
];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    for (const [nama, type] of KOLOM(Sequelize)) {
      await queryInterface.changeColumn('peserta_biodata', nama, { type, allowNull: true });
    }
  },
  down: async (queryInterface, Sequelize) => {
    for (const [nama, type] of KOLOM(Sequelize)) {
      await queryInterface.changeColumn('peserta_biodata', nama, { type, allowNull: false });
    }
  },
};
