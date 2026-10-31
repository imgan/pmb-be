'use strict';

/**
 * Materi e-learning: Gambar, Video, Dokumen (bisa lebih dari satu).
 * - elearning_konten.video_urls: array JSON link video YouTube / Google Drive.
 * - elearning_konten_berkas: gambar & dokumen materi, diunggah satu per satu (data URL) agar tidak melampaui batas
 *   ukuran request. Lampiran tunggal lama (elearning_konten.lampiran) tetap dipakai apa adanya.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('elearning_konten', 'video_urls', { type: Sequelize.TEXT, allowNull: true, after: 'url' });
    await queryInterface.createTable('elearning_konten_berkas', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      konten_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'elearning_konten', key: 'id' }, onDelete: 'CASCADE' },
      jenis: { type: Sequelize.ENUM('GAMBAR', 'DOKUMEN'), allowNull: false },
      nama: { type: Sequelize.STRING(255), allowNull: false },
      tipe: { type: Sequelize.STRING(150), allowNull: true },
      ukuran: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      data: { type: Sequelize.TEXT('long'), allowNull: false },
      urutan: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('elearning_konten_berkas', ['konten_id', 'jenis', 'urutan']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('elearning_konten_berkas');
    await queryInterface.removeColumn('elearning_konten', 'video_urls');
  },
};
