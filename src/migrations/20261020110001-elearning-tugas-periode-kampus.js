'use strict';

/**
 * E-learning:
 * - jenis konten baru TUGAS (instruksi + lampiran; mahasiswa mengumpulkan jawaban teks / file, dosen menilai);
 * - target baru KAMPUS (semua mahasiswa aktif di kampus, selain SEMUA = peserta kelas & PILIHAN);
 * - periode tayang tersedia_mulai / tersedia_sampai (mahasiswa hanya melihat konten di dalam periode);
 * - tabel elearning_tugas_jawaban (pengumpulan tugas + nilai & catatan dosen).
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('elearning_konten', 'jenis', { type: Sequelize.ENUM('MATERI', 'VIDEO', 'KUIS', 'TUGAS'), allowNull: false });
    await queryInterface.changeColumn('elearning_konten', 'target', { type: Sequelize.ENUM('SEMUA', 'PILIHAN', 'KAMPUS'), allowNull: false, defaultValue: 'SEMUA' });
    await queryInterface.addColumn('elearning_konten', 'tersedia_mulai', { type: Sequelize.DATE, allowNull: true, after: 'tenggat' });
    await queryInterface.addColumn('elearning_konten', 'tersedia_sampai', { type: Sequelize.DATE, allowNull: true, after: 'tersedia_mulai' });

    await queryInterface.createTable('elearning_tugas_jawaban', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      konten_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'elearning_konten', key: 'id' }, onDelete: 'CASCADE' },
      mahasiswa_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'mahasiswa', key: 'id' }, onDelete: 'CASCADE' },
      isi: { type: Sequelize.TEXT, allowNull: true },
      lampiran: { type: Sequelize.TEXT('long'), allowNull: true },
      lampiran_nama: { type: Sequelize.STRING(255), allowNull: true },
      terlambat: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      nilai: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      catatan: { type: Sequelize.TEXT, allowNull: true },
      dinilai_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('elearning_tugas_jawaban', ['konten_id', 'mahasiswa_id'], { unique: true });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('elearning_tugas_jawaban');
    await queryInterface.removeColumn('elearning_konten', 'tersedia_sampai');
    await queryInterface.removeColumn('elearning_konten', 'tersedia_mulai');
    await queryInterface.sequelize.query("DELETE FROM elearning_konten WHERE jenis = 'TUGAS'");
    await queryInterface.sequelize.query("UPDATE elearning_konten SET target = 'SEMUA' WHERE target = 'KAMPUS'");
    await queryInterface.changeColumn('elearning_konten', 'target', { type: Sequelize.ENUM('SEMUA', 'PILIHAN'), allowNull: false, defaultValue: 'SEMUA' });
    await queryInterface.changeColumn('elearning_konten', 'jenis', { type: Sequelize.ENUM('MATERI', 'VIDEO', 'KUIS'), allowNull: false });
  },
};
