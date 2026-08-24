'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('surat_keterangan', 'nama_instansi', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
    await queryInterface.addColumn('surat_keterangan', 'alamat_instansi', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('surat_keterangan', 'ipk', {
      type: Sequelize.DECIMAL(4, 2),
      allowNull: true,
    });
    await queryInterface.addColumn('surat_keterangan', 'jumlah_sks', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn('surat_keterangan', 'nama_koordinator', {
      type: Sequelize.STRING(150),
      allowNull: true,
    });
    await queryInterface.addColumn('surat_keterangan', 'no_hp_koordinator', {
      type: Sequelize.STRING(30),
      allowNull: true,
    });
    await queryInterface.addColumn('surat_keterangan', 'tanggal_ujian_mulai', {
      type: Sequelize.DATEONLY,
      allowNull: true,
    });
    await queryInterface.addColumn('surat_keterangan', 'tanggal_ujian_selesai', {
      type: Sequelize.DATEONLY,
      allowNull: true,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('surat_keterangan', 'nama_instansi');
    await queryInterface.removeColumn('surat_keterangan', 'alamat_instansi');
    await queryInterface.removeColumn('surat_keterangan', 'ipk');
    await queryInterface.removeColumn('surat_keterangan', 'jumlah_sks');
    await queryInterface.removeColumn('surat_keterangan', 'nama_koordinator');
    await queryInterface.removeColumn('surat_keterangan', 'no_hp_koordinator');
    await queryInterface.removeColumn('surat_keterangan', 'tanggal_ujian_mulai');
    await queryInterface.removeColumn('surat_keterangan', 'tanggal_ujian_selesai');
  },
};
