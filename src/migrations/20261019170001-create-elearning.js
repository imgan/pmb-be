'use strict';

/**
 * E-learning portal Dosen: konten per kelas (jadwal kuliah) — MATERI (teks + lampiran file / link), VIDEO (link),
 * KUIS (soal pilihan ganda, dinilai otomatis) — di-assign ke seluruh peserta kelas (KRS disetujui) atau mahasiswa
 * terpilih. Mahasiswa melihat konten & mengerjakan kuis lewat portal Mahasiswa.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const waktu = {
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    };
    await queryInterface.createTable('elearning_konten', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      jadwal_kuliah_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'jadwal_kuliah', key: 'id' }, onDelete: 'CASCADE' },
      dosen_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'dosen', key: 'id' } },
      jenis: { type: Sequelize.ENUM('MATERI', 'VIDEO', 'KUIS'), allowNull: false },
      judul: { type: Sequelize.STRING(200), allowNull: false },
      deskripsi: { type: Sequelize.TEXT, allowNull: true },
      // Isi materi (teks).
      isi: { type: Sequelize.TEXT('long'), allowNull: true },
      // Link video / materi luar.
      url: { type: Sequelize.STRING(500), allowNull: true },
      // Lampiran materi (data URL base64) + nama file.
      lampiran: { type: Sequelize.TEXT('long'), allowNull: true },
      lampiran_nama: { type: Sequelize.STRING(255), allowNull: true },
      pertemuan_ke: { type: Sequelize.INTEGER, allowNull: true },
      // Kuis: batas waktu pengerjaan (opsional).
      tenggat: { type: Sequelize.DATE, allowNull: true },
      target: { type: Sequelize.ENUM('SEMUA', 'PILIHAN'), allowNull: false, defaultValue: 'SEMUA' },
      is_published: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      ...waktu,
    });
    await queryInterface.addIndex('elearning_konten', ['jadwal_kuliah_id']);

    await queryInterface.createTable('elearning_konten_mahasiswa', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      konten_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'elearning_konten', key: 'id' }, onDelete: 'CASCADE' },
      mahasiswa_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'mahasiswa', key: 'id' }, onDelete: 'CASCADE' },
      ...waktu,
    });
    await queryInterface.addIndex('elearning_konten_mahasiswa', ['konten_id', 'mahasiswa_id'], { unique: true });

    await queryInterface.createTable('elearning_soal', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      konten_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'elearning_konten', key: 'id' }, onDelete: 'CASCADE' },
      urutan: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      pertanyaan: { type: Sequelize.TEXT, allowNull: false },
      // Array teks pilihan jawaban (JSON).
      pilihan: { type: Sequelize.TEXT, allowNull: false },
      // Index pilihan yang benar (0-based).
      jawaban_benar: { type: Sequelize.INTEGER, allowNull: false },
      ...waktu,
    });

    await queryInterface.createTable('elearning_jawaban', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      konten_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'elearning_konten', key: 'id' }, onDelete: 'CASCADE' },
      mahasiswa_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'mahasiswa', key: 'id' }, onDelete: 'CASCADE' },
      // { [soalId]: indexPilihan } (JSON).
      jawaban: { type: Sequelize.TEXT, allowNull: false },
      benar: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      jumlah_soal: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      skor: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
      ...waktu,
    });
    await queryInterface.addIndex('elearning_jawaban', ['konten_id', 'mahasiswa_id'], { unique: true });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('elearning_jawaban');
    await queryInterface.dropTable('elearning_soal');
    await queryInterface.dropTable('elearning_konten_mahasiswa');
    await queryInterface.dropTable('elearning_konten');
  },
};
