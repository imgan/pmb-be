'use strict';

// Keterangan "Menunggu Ukom" (menunggu uji kompetensi) di menu Masa Studi.
const BASE = "'CUTI','MENGUNDURKAN_DIRI','DROP_OUT','HABIS_MASA_STUDI','MUTASI','PUTUS_SEKOLAH','WAFAT','HILANG','LAINNYA'";

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(`ALTER TABLE mahasiswa MODIFY status_keluar ENUM(${BASE},'MENUNGGU_UKOM') NULL`);
  },
  down: async (queryInterface) => {
    await queryInterface.sequelize.query("UPDATE mahasiswa SET status_keluar = NULL WHERE status_keluar = 'MENUNGGU_UKOM'");
    await queryInterface.sequelize.query(`ALTER TABLE mahasiswa MODIFY status_keluar ENUM(${BASE}) NULL`);
  },
};
