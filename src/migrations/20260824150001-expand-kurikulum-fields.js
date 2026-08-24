'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('kurikulum', 'jurusan_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn('kurikulum', 'tahun_ajaran_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn('kurikulum', 'mata_kuliah_en', {
      type: Sequelize.STRING(200),
      allowNull: true,
    });
    await queryInterface.addColumn('kurikulum', 'kelompok_mata_kuliah', {
      type: Sequelize.ENUM('MPK', 'MKK', 'MKB', 'MPB', 'MBB'),
      allowNull: true,
    });
    await queryInterface.addColumn('kurikulum', 'kelompok_kurikulum', {
      type: Sequelize.ENUM('WAJIB', 'PILIHAN'),
      allowNull: true,
    });
    await queryInterface.addColumn('kurikulum', 'jenis_mata_kuliah', {
      type: Sequelize.ENUM('TEORI', 'PRAKTIK', 'TEORI_PRAKTIK'),
      allowNull: true,
    });
    await queryInterface.addColumn('kurikulum', 'kelompok_kompetensi', {
      type: Sequelize.ENUM('UTAMA', 'PENDUKUNG', 'LAINNYA'),
      allowNull: true,
    });
    await queryInterface.addColumn('kurikulum', 'komp_ilmu_komputer', {
      type: Sequelize.STRING(100),
      allowNull: true,
    });
    await queryInterface.addColumn('kurikulum', 'mata_kuliah_minat', {
      type: Sequelize.STRING(100),
      allowNull: true,
    });
    await queryInterface.addColumn('kurikulum', 'muatan_mata_kuliah', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
    await queryInterface.removeColumn('kurikulum', 'bidang_minat');
    await queryInterface.removeColumn('kurikulum', 'tahun_akademik');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('kurikulum', 'bidang_minat', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.addColumn('kurikulum', 'tahun_akademik', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.removeColumn('kurikulum', 'jurusan_id');
    await queryInterface.removeColumn('kurikulum', 'tahun_ajaran_id');
    await queryInterface.removeColumn('kurikulum', 'mata_kuliah_en');
    await queryInterface.removeColumn('kurikulum', 'kelompok_mata_kuliah');
    await queryInterface.removeColumn('kurikulum', 'kelompok_kurikulum');
    await queryInterface.removeColumn('kurikulum', 'jenis_mata_kuliah');
    await queryInterface.removeColumn('kurikulum', 'kelompok_kompetensi');
    await queryInterface.removeColumn('kurikulum', 'komp_ilmu_komputer');
    await queryInterface.removeColumn('kurikulum', 'mata_kuliah_minat');
    await queryInterface.removeColumn('kurikulum', 'muatan_mata_kuliah');
  },
};
