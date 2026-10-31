'use strict';

/**
 * Lonceng notifikasi portal Dosen & Mahasiswa: notifikasi disusun dari data yang sudah ada (obrolan, komentar konten,
 * pengumpulan tugas, konten baru, nilai tugas); tabel ini hanya menyimpan kapan pemilik terakhir membuka lonceng
 * (notifikasi lebih baru dari itu = belum dibaca). pemilik_tipe: D = dosen, M = mahasiswa.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('notifikasi_baca', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      pemilik_tipe: { type: Sequelize.ENUM('D', 'M'), allowNull: false },
      pemilik_id: { type: Sequelize.INTEGER, allowNull: false },
      terakhir_dibaca: { type: Sequelize.DATE, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('notifikasi_baca', ['pemilik_tipe', 'pemilik_id'], { unique: true, name: 'uq_notifikasi_baca_pemilik' });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('notifikasi_baca');
  },
};
