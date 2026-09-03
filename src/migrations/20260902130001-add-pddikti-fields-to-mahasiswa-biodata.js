'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('mahasiswa_biodata', 'jenis_kelamin', { type: Sequelize.ENUM('L', 'P'), allowNull: true });
    await queryInterface.addColumn('mahasiswa_biodata', 'nisn', { type: Sequelize.STRING(20), allowNull: true });
    await queryInterface.addColumn('mahasiswa_biodata', 'jalur_pendaftaran', { type: Sequelize.STRING(100), allowNull: true });
    await queryInterface.addColumn('mahasiswa_biodata', 'jenis_pendaftaran', { type: Sequelize.STRING(100), allowNull: true });
    await queryInterface.addColumn('mahasiswa_biodata', 'tanggal_masuk_kuliah', { type: Sequelize.DATEONLY, allowNull: true });
    await queryInterface.addColumn('mahasiswa_biodata', 'mulai_semester', { type: Sequelize.STRING(20), allowNull: true });
    await queryInterface.addColumn('mahasiswa_biodata', 'kecamatan', { type: Sequelize.STRING(100), allowNull: true });
    await queryInterface.addColumn('mahasiswa_biodata', 'telepon_rumah', { type: Sequelize.STRING(20), allowNull: true });
    await queryInterface.addColumn('mahasiswa_biodata', 'terima_kps', { type: Sequelize.STRING(10), allowNull: true });
    await queryInterface.addColumn('mahasiswa_biodata', 'no_kps', { type: Sequelize.STRING(30), allowNull: true });
    await queryInterface.addColumn('mahasiswa_biodata', 'nik_ayah', { type: Sequelize.STRING(20), allowNull: true });
    await queryInterface.addColumn('mahasiswa_biodata', 'tanggal_lahir_ayah', { type: Sequelize.DATEONLY, allowNull: true });
    await queryInterface.addColumn('mahasiswa_biodata', 'pendidikan_ayah', { type: Sequelize.STRING(50), allowNull: true });
    await queryInterface.addColumn('mahasiswa_biodata', 'penghasilan_ayah', { type: Sequelize.STRING(50), allowNull: true });
    await queryInterface.addColumn('mahasiswa_biodata', 'nik_ibu', { type: Sequelize.STRING(20), allowNull: true });
    await queryInterface.addColumn('mahasiswa_biodata', 'tanggal_lahir_ibu', { type: Sequelize.DATEONLY, allowNull: true });
    await queryInterface.addColumn('mahasiswa_biodata', 'pendidikan_ibu', { type: Sequelize.STRING(50), allowNull: true });
    await queryInterface.addColumn('mahasiswa_biodata', 'penghasilan_ibu', { type: Sequelize.STRING(50), allowNull: true });
    await queryInterface.addColumn('mahasiswa_biodata', 'nama_wali', { type: Sequelize.STRING(150), allowNull: true });
    await queryInterface.addColumn('mahasiswa_biodata', 'tanggal_lahir_wali', { type: Sequelize.DATEONLY, allowNull: true });
    await queryInterface.addColumn('mahasiswa_biodata', 'pendidikan_wali', { type: Sequelize.STRING(50), allowNull: true });
    await queryInterface.addColumn('mahasiswa_biodata', 'pekerjaan_wali', { type: Sequelize.STRING(100), allowNull: true });
    await queryInterface.addColumn('mahasiswa_biodata', 'penghasilan_wali', { type: Sequelize.STRING(50), allowNull: true });
    await queryInterface.addColumn('mahasiswa_biodata', 'jenis_pembiayaan', { type: Sequelize.STRING(100), allowNull: true });
    await queryInterface.addColumn('mahasiswa_biodata', 'biaya_masuk', { type: Sequelize.DECIMAL(14, 2), allowNull: true });
    await queryInterface.addColumn('mahasiswa_biodata', 'sks_diakui', { type: Sequelize.INTEGER, allowNull: true });
    await queryInterface.addColumn('mahasiswa_biodata', 'perguruan_tinggi_asal', { type: Sequelize.STRING(150), allowNull: true });
    await queryInterface.addColumn('mahasiswa_biodata', 'program_studi_asal', { type: Sequelize.STRING(150), allowNull: true });
  },
  down: async (queryInterface) => {
    const columns = [
      'jenis_kelamin',
      'nisn',
      'jalur_pendaftaran',
      'jenis_pendaftaran',
      'tanggal_masuk_kuliah',
      'mulai_semester',
      'kecamatan',
      'telepon_rumah',
      'terima_kps',
      'no_kps',
      'nik_ayah',
      'tanggal_lahir_ayah',
      'pendidikan_ayah',
      'penghasilan_ayah',
      'nik_ibu',
      'tanggal_lahir_ibu',
      'pendidikan_ibu',
      'penghasilan_ibu',
      'nama_wali',
      'tanggal_lahir_wali',
      'pendidikan_wali',
      'pekerjaan_wali',
      'penghasilan_wali',
      'jenis_pembiayaan',
      'biaya_masuk',
      'sks_diakui',
      'perguruan_tinggi_asal',
      'program_studi_asal',
    ];
    for (const column of columns) {
      await queryInterface.removeColumn('mahasiswa_biodata', column);
    }
  },
};
