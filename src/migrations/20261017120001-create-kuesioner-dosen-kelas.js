'use strict';

/**
 * Status "Isi Kuesioner" per dosen pengajar per kelas: apakah dosen tsb dinilai mahasiswa lewat
 * kuesioner kelas. Tidak ada baris = ya (default); prodi bisa mencentang/menghapus centang.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('kuesioner_dosen_kelas', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      jadwal_kuliah_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'jadwal_kuliah', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      dosen_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'dosen', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      isi_kuesioner: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      updated_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('kuesioner_dosen_kelas', ['jadwal_kuliah_id', 'dosen_id'], { unique: true, name: 'kuesioner_dosen_kelas_unik' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('kuesioner_dosen_kelas');
  },
};
