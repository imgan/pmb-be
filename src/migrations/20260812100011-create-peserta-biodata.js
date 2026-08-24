'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('peserta_biodata', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      peserta_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: 'peserta', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      tempat_lahir: { type: Sequelize.STRING(100), allowNull: false },
      tanggal_lahir: { type: Sequelize.DATEONLY, allowNull: false },
      jenis_kelamin: { type: Sequelize.ENUM('L', 'P'), allowNull: false },
      agama: { type: Sequelize.STRING(50), allowNull: false },
      kewarganegaraan: { type: Sequelize.STRING(50), allowNull: false },
      nik: { type: Sequelize.STRING(16), allowNull: false, unique: true },
      nama_ibu_kandung: { type: Sequelize.STRING(150), allowNull: false },
      jalan: { type: Sequelize.STRING(255), allowNull: false },
      rt: { type: Sequelize.STRING(3), allowNull: false },
      rw: { type: Sequelize.STRING(3), allowNull: false },
      desa_kelurahan: { type: Sequelize.STRING(100), allowNull: false },
      provinsi: { type: Sequelize.STRING(100), allowNull: false },
      kabupaten: { type: Sequelize.STRING(100), allowNull: false },
      kecamatan: { type: Sequelize.STRING(100), allowNull: false },
      kode_pos: { type: Sequelize.STRING(10), allowNull: false },
      no_whatsapp: { type: Sequelize.STRING(20), allowNull: false },
      is_agree: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('peserta_biodata');
  },
};
