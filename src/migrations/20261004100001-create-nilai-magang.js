'use strict';

// Nilai magang mahasiswa (diinput Prodi): judul, lokasi/instansi, pembimbing, periode, nilai & grade.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('nilai_magang', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      mahasiswa_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'mahasiswa', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      tahun_ajaran_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'tahun_ajaran', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      semester: { type: Sequelize.INTEGER, allowNull: true },
      judul: { type: Sequelize.TEXT, allowNull: false },
      lokasi: { type: Sequelize.STRING(200), allowNull: false },
      alamat_lokasi: { type: Sequelize.TEXT, allowNull: true },
      pembimbing_lapangan: { type: Sequelize.STRING(150), allowNull: true },
      pembimbing_magang_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'pembimbing_magang', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      tanggal_mulai: { type: Sequelize.DATEONLY, allowNull: true },
      tanggal_selesai: { type: Sequelize.DATEONLY, allowNull: true },
      nilai: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      grade: { type: Sequelize.STRING(2), allowNull: true },
      keterangan: { type: Sequelize.TEXT, allowNull: true },
      is_delete: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_by: { type: Sequelize.INTEGER, allowNull: true },
      updated_by: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('nilai_magang', ['mahasiswa_id']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('nilai_magang');
  },
};
