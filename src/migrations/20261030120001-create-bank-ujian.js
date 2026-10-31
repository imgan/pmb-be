'use strict';

/**
 * LMS → Kuis & Ujian: bank ujian (paket soal pilihan ganda + essay) yang dibuat admin, dipakai tes seleksi PMB.
 *  - bank_ujian        : paket ujian (judul, durasi, acak soal)
 *  - bank_ujian_soal   : soal PG (pilihan JSON + jawaban benar) / ESSAY, masing-masing berbobot
 *  - tes_ujian.bank_ujian_id         : paket soal yang dikerjakan peserta tes PMB
 *  - tes_ujian_peserta.mulai_at/selesai_at : waktu pengerjaan online
 *  - tes_ujian_jawaban : jawaban peserta per soal + skor (PG otomatis, essay dinilai admin)
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('bank_ujian', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      judul: { type: Sequelize.STRING(200), allowNull: false },
      deskripsi: { type: Sequelize.TEXT, allowNull: true },
      durasi_menit: { type: Sequelize.INTEGER, allowNull: true },
      acak_soal: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_by: { type: Sequelize.INTEGER, allowNull: true },
      updated_by: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable('bank_ujian_soal', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      bank_ujian_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'bank_ujian', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      urutan: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      tipe: { type: Sequelize.ENUM('PG', 'ESSAY'), allowNull: false, defaultValue: 'PG' },
      pertanyaan: { type: Sequelize.TEXT, allowNull: false },
      pilihan: { type: Sequelize.TEXT, allowNull: true },
      jawaban_benar: { type: Sequelize.INTEGER, allowNull: true },
      bobot: { type: Sequelize.DECIMAL(6, 2), allowNull: false, defaultValue: 1 },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addColumn('tes_ujian', 'bank_ujian_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'bank_ujian', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
    await queryInterface.addColumn('tes_ujian_peserta', 'mulai_at', { type: Sequelize.DATE, allowNull: true });
    await queryInterface.addColumn('tes_ujian_peserta', 'selesai_at', { type: Sequelize.DATE, allowNull: true });

    await queryInterface.createTable('tes_ujian_jawaban', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      tes_ujian_peserta_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'tes_ujian_peserta', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      soal_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'bank_ujian_soal', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      jawaban_pilihan: { type: Sequelize.INTEGER, allowNull: true },
      jawaban_teks: { type: Sequelize.TEXT, allowNull: true },
      skor: { type: Sequelize.DECIMAL(6, 2), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('tes_ujian_jawaban', ['tes_ujian_peserta_id', 'soal_id'], { unique: true, name: 'tes_ujian_jawaban_unik' });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('tes_ujian_jawaban');
    await queryInterface.removeColumn('tes_ujian_peserta', 'selesai_at');
    await queryInterface.removeColumn('tes_ujian_peserta', 'mulai_at');
    await queryInterface.removeColumn('tes_ujian', 'bank_ujian_id');
    await queryInterface.dropTable('bank_ujian_soal');
    await queryInterface.dropTable('bank_ujian');
  },
};
