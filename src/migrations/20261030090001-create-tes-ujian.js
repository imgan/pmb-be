'use strict';

/**
 * Menu Tes Ujian (modul PMB): jadwal tes seleksi per gelombang + daftar peserta yang berhak ikut beserta nilainya.
 * prodi null = Semua Jurusan (nama prodi, bukan jurusan_id, karena master jurusan punya varian per golongan kelas).
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('tes_ujian', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      nama_ujian: { type: Sequelize.STRING(150), allowNull: false },
      gelombang_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'gelombang', key: 'id' }, onDelete: 'RESTRICT' },
      prodi: { type: Sequelize.STRING(150), allowNull: true },
      tanggal: { type: Sequelize.DATEONLY, allowNull: false },
      lokasi: { type: Sequelize.TEXT, allowNull: true },
      waktu: { type: Sequelize.STRING(100), allowNull: true },
      created_by: { type: Sequelize.INTEGER, allowNull: true },
      updated_by: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable('tes_ujian_peserta', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      tes_ujian_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'tes_ujian', key: 'id' }, onDelete: 'CASCADE' },
      peserta_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'peserta', key: 'id' }, onDelete: 'CASCADE' },
      nilai: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      status: { type: Sequelize.ENUM('belum_ujian', 'lulus', 'tidak_lulus'), allowNull: false, defaultValue: 'belum_ujian' },
      created_by: { type: Sequelize.INTEGER, allowNull: true },
      updated_by: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('tes_ujian_peserta', ['tes_ujian_id', 'peserta_id'], { unique: true, name: 'tes_ujian_peserta_unik' });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('tes_ujian_peserta');
    await queryInterface.dropTable('tes_ujian');
  },
};
