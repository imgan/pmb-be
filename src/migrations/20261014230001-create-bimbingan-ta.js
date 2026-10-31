'use strict';

// Catatan konsultasi bimbingan TA/Skripsi (kartu bimbingan): diinput dosen pembimbing untuk
// mahasiswa yang pengajuan TA-nya disetujui, dilihat mahasiswa di portal (Data Kampus → Bimbingan).
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('bimbingan_ta', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      pengajuan_ta_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'pengajuan_ta', key: 'id' }, onDelete: 'CASCADE' },
      mahasiswa_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'mahasiswa', key: 'id' }, onDelete: 'CASCADE' },
      dosen_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'dosen', key: 'id' }, onDelete: 'CASCADE' },
      tanggal: { type: Sequelize.DATEONLY, allowNull: false },
      pokok_pembahasan: { type: Sequelize.TEXT, allowNull: false },
      keterangan: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('bimbingan_ta', ['pengajuan_ta_id', 'tanggal'], { name: 'idx_bimbingan_ta_pengajuan' });
    await queryInterface.addIndex('bimbingan_ta', ['dosen_id'], { name: 'idx_bimbingan_ta_dosen' });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('bimbingan_ta');
  },
};
