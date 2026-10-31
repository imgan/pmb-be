'use strict';

/**
 * Obrolan mahasiswa (E-learning):
 * - obrolan: KELAS (grup per jadwal kuliah, kunci 'K:<jadwalId>') atau PRIBADI (dua mahasiswa, kunci 'P:<idKecil>:<idBesar>');
 * - obrolan_anggota: anggota chat pribadi + penanda pesan terakhir dibaca (grup kelas: baris dibuat saat pertama membaca);
 * - obrolan_pesan: isi pesan.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const waktu = {
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    };
    await queryInterface.createTable('obrolan', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      jenis: { type: Sequelize.ENUM('KELAS', 'PRIBADI'), allowNull: false },
      kunci: { type: Sequelize.STRING(40), allowNull: false, unique: true },
      jadwal_kuliah_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'jadwal_kuliah', key: 'id' }, onDelete: 'CASCADE' },
      ...waktu,
    });
    await queryInterface.createTable('obrolan_anggota', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      obrolan_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'obrolan', key: 'id' }, onDelete: 'CASCADE' },
      mahasiswa_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'mahasiswa', key: 'id' }, onDelete: 'CASCADE' },
      terakhir_dibaca_id: { type: Sequelize.INTEGER, allowNull: true },
      ...waktu,
    });
    await queryInterface.addIndex('obrolan_anggota', ['obrolan_id', 'mahasiswa_id'], { unique: true });
    await queryInterface.addIndex('obrolan_anggota', ['mahasiswa_id']);
    await queryInterface.createTable('obrolan_pesan', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      obrolan_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'obrolan', key: 'id' }, onDelete: 'CASCADE' },
      mahasiswa_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'mahasiswa', key: 'id' }, onDelete: 'CASCADE' },
      isi: { type: Sequelize.TEXT, allowNull: false },
      ...waktu,
    });
    await queryInterface.addIndex('obrolan_pesan', ['obrolan_id', 'id']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('obrolan_pesan');
    await queryInterface.dropTable('obrolan_anggota');
    await queryInterface.dropTable('obrolan');
  },
};
