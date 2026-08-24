'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('calon_mahasiswa', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      nama: { type: Sequelize.STRING(150), allowNull: false },
      asal_sekolah: { type: Sequelize.STRING(150), allowNull: false },
      prodi: { type: Sequelize.STRING(150), allowNull: false },
      no_telepon: { type: Sequelize.STRING(30), allowNull: true },
      skema_pembiayaan: {
        type: Sequelize.ENUM('beasiswa', 'mandiri'),
        allowNull: false,
        defaultValue: 'mandiri',
      },
      formulir_pendaftaran: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      lulus_tes_masuk: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      akun_beasiswa: { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: null },
      kelengkapan_persyaratan: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      status_beasiswa: {
        type: Sequelize.ENUM('diusulkan', 'disetujui', 'ditolak'),
        allowNull: true,
        defaultValue: null,
      },
      status_kuliah: {
        type: Sequelize.ENUM('menunggu', 'diterima', 'ditolak'),
        allowNull: false,
        defaultValue: 'menunggu',
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      updated_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('calon_mahasiswa');
  },
};
