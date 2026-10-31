'use strict';

/**
 * RPS per mata kuliah (dibuka dari menu Prodi → Kurikulum → Matakuliah Aktif):
 * - cpmk: CPMK mata kuliah; parent_id terisi = Sub-CPMK milik CPMK induk tsb.
 * - cpmk_cpl: pemetaan CPMK (induk) → CPL/IK kurikulum yang dibebankan ke mata kuliah tsb.
 * - rps: identitas/detail RPS per mata kuliah per periode (tahun ajaran "berlaku sejak").
 * - rps_pertemuan: rencana pembelajaran tiap sesi per periode.
 * - rps_evaluasi: rencana evaluasi (komponen penilaian + bobot) per periode.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const ts = {
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    };
    const fkMk = { type: Sequelize.INTEGER, allowNull: false, references: { model: 'mata_kuliah', key: 'id' }, onDelete: 'CASCADE' };
    const fkTa = { type: Sequelize.INTEGER, allowNull: false, references: { model: 'tahun_ajaran', key: 'id' }, onDelete: 'CASCADE' };

    await queryInterface.createTable('cpmk', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      mata_kuliah_id: fkMk,
      parent_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'cpmk', key: 'id' }, onDelete: 'CASCADE' },
      kode: { type: Sequelize.STRING(20), allowNull: false },
      deskripsi: { type: Sequelize.TEXT, allowNull: false },
      deskripsi_en: { type: Sequelize.TEXT, allowNull: true },
      ...ts,
    });
    await queryInterface.addIndex('cpmk', ['mata_kuliah_id', 'kode'], { name: 'uq_cpmk_mk_kode', unique: true });

    await queryInterface.createTable('cpmk_cpl', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      cpmk_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'cpmk', key: 'id' }, onDelete: 'CASCADE' },
      cpl_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'cpl', key: 'id' }, onDelete: 'CASCADE' },
      ...ts,
    });
    await queryInterface.addIndex('cpmk_cpl', ['cpmk_id', 'cpl_id'], { name: 'uq_cpmk_cpl', unique: true });

    await queryInterface.createTable('rps', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      mata_kuliah_id: fkMk,
      tahun_ajaran_id: fkTa,
      deskripsi: { type: Sequelize.TEXT, allowNull: true },
      bahan_kajian: { type: Sequelize.TEXT, allowNull: true },
      pustaka_utama: { type: Sequelize.TEXT, allowNull: true },
      pustaka_pendukung: { type: Sequelize.TEXT, allowNull: true },
      media_software: { type: Sequelize.TEXT, allowNull: true },
      media_hardware: { type: Sequelize.TEXT, allowNull: true },
      mk_prasyarat: { type: Sequelize.STRING(255), allowNull: true },
      dosen_pengembang: { type: Sequelize.STRING(255), allowNull: true },
      koordinator_rmk: { type: Sequelize.STRING(255), allowNull: true },
      team_teaching: { type: Sequelize.TEXT, allowNull: true },
      tanggal_penyusunan: { type: Sequelize.DATEONLY, allowNull: true },
      ...ts,
    });
    await queryInterface.addIndex('rps', ['mata_kuliah_id', 'tahun_ajaran_id'], { name: 'uq_rps_mk_ta', unique: true });

    await queryInterface.createTable('rps_pertemuan', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      mata_kuliah_id: fkMk,
      tahun_ajaran_id: fkTa,
      sesi: { type: Sequelize.INTEGER, allowNull: false },
      jenis_pertemuan: { type: Sequelize.ENUM('KULIAH', 'PRAKTIKUM', 'UTS', 'UAS', 'LAINNYA'), allowNull: false, defaultValue: 'KULIAH' },
      // Id CPMK / Sub-CPMK (JSON array) yang dicapai pada sesi ini.
      cpmk_ids: { type: Sequelize.TEXT, allowNull: true },
      materi: { type: Sequelize.TEXT, allowNull: false },
      materi_en: { type: Sequelize.TEXT, allowNull: true },
      indikator: { type: Sequelize.TEXT, allowNull: true },
      kriteria_penilaian: { type: Sequelize.TEXT, allowNull: true },
      metode_pembelajaran: { type: Sequelize.TEXT, allowNull: true },
      waktu: { type: Sequelize.STRING(100), allowNull: true },
      bobot: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      referensi: { type: Sequelize.TEXT, allowNull: true },
      ...ts,
    });
    await queryInterface.addIndex('rps_pertemuan', ['mata_kuliah_id', 'tahun_ajaran_id', 'sesi'], { name: 'uq_rps_pertemuan_sesi', unique: true });

    await queryInterface.createTable('rps_evaluasi', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      mata_kuliah_id: fkMk,
      tahun_ajaran_id: fkTa,
      cpmk_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'cpmk', key: 'id' }, onDelete: 'SET NULL' },
      komponen: {
        type: Sequelize.ENUM('TUGAS', 'KUIS', 'UTS', 'UAS', 'PRAKTIKUM', 'PROYEK', 'PARTISIPASI', 'LAINNYA'),
        allowNull: false,
      },
      // Minggu / sesi pelaksanaan, mis. "8" atau "3, 6".
      sesi: { type: Sequelize.STRING(50), allowNull: true },
      bentuk_penilaian: { type: Sequelize.TEXT, allowNull: true },
      bobot: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
      ...ts,
    });
    await queryInterface.addIndex('rps_evaluasi', ['mata_kuliah_id', 'tahun_ajaran_id'], { name: 'idx_rps_evaluasi_mk_ta' });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('rps_evaluasi');
    await queryInterface.dropTable('rps_pertemuan');
    await queryInterface.dropTable('rps');
    await queryInterface.dropTable('cpmk_cpl');
    await queryInterface.dropTable('cpmk');
  },
};
