'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('mahasiswa_biodata', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      mahasiswa_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: 'mahasiswa', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      tempat_lahir: { type: Sequelize.STRING(100), allowNull: true },
      tanggal_lahir: { type: Sequelize.DATEONLY, allowNull: true },
      agama: { type: Sequelize.STRING(50), allowNull: true },
      kewarganegaraan: { type: Sequelize.STRING(50), allowNull: true },
      no_ktp: { type: Sequelize.STRING(20), allowNull: true },
      npwp: { type: Sequelize.STRING(30), allowNull: true },
      jalan: { type: Sequelize.STRING(255), allowNull: true },
      dusun: { type: Sequelize.STRING(100), allowNull: true },
      rt: { type: Sequelize.STRING(3), allowNull: true },
      rw: { type: Sequelize.STRING(3), allowNull: true },
      kelurahan: { type: Sequelize.STRING(100), allowNull: true },
      kode_pos: { type: Sequelize.STRING(10), allowNull: true },
      propinsi: { type: Sequelize.STRING(100), allowNull: true },
      jenis_tinggal: { type: Sequelize.STRING(50), allowNull: true },
      alat_transportasi: { type: Sequelize.STRING(50), allowNull: true },
      kelas: { type: Sequelize.STRING(20), allowNull: true },
      program_studi: { type: Sequelize.STRING(150), allowNull: true },
      waktu_kuliah: { type: Sequelize.STRING(20), allowNull: true },
      status_belajar: { type: Sequelize.STRING(20), allowNull: true },
      status_kuliah: { type: Sequelize.STRING(20), allowNull: true },
      status_dikti: { type: Sequelize.STRING(50), allowNull: true },
      email: { type: Sequelize.STRING(100), allowNull: true },
      hp: { type: Sequelize.STRING(20), allowNull: true },
      almamater: { type: Sequelize.STRING(150), allowNull: true },
      nama_ayah: { type: Sequelize.STRING(150), allowNull: true },
      pekerjaan_ayah: { type: Sequelize.STRING(100), allowNull: true },
      nama_ibu: { type: Sequelize.STRING(150), allowNull: true },
      pekerjaan_ibu: { type: Sequelize.STRING(100), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('mahasiswa_biodata');
  },
};
