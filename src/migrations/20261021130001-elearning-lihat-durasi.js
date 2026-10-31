'use strict';

/** E-learning: durasi aktif mahasiswa membuka konten (detik; akumulasi dari ping berkala halaman detail). */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('elearning_lihat', 'durasi_detik', { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0, after: 'jumlah' });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('elearning_lihat', 'durasi_detik');
  },
};
