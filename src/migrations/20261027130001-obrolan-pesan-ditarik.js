'use strict';

/**
 * Tarik pesan obrolan: pengirim dapat menarik pesannya (tombol ×). Isi & lampiran dihapus, baris pesan tetap ada dengan
 * penanda ditarik_at agar semua anggota melihat "Pesan ini telah ditarik".
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('obrolan_pesan', 'ditarik_at', { type: Sequelize.DATE, allowNull: true, after: 'lampiran_ukuran' });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('obrolan_pesan', 'ditarik_at');
  },
};
