'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('karyawan', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      nip: { type: Sequelize.STRING(20), allowNull: false, unique: true },
      id_finger: { type: Sequelize.STRING(30), allowNull: true },
      nama_lengkap: { type: Sequelize.STRING(150), allowNull: false },
      tempat_lahir: { type: Sequelize.STRING(100), allowNull: true },
      tanggal_lahir: { type: Sequelize.DATEONLY, allowNull: true },
      jenis_kelamin: { type: Sequelize.ENUM('L', 'P'), allowNull: true },
      pendidikan_akhir: { type: Sequelize.STRING(50), allowNull: true },
      agama: { type: Sequelize.STRING(50), allowNull: true },
      telp_hp: { type: Sequelize.STRING(30), allowNull: true },
      email: { type: Sequelize.STRING(150), allowNull: true },
      alamat: { type: Sequelize.TEXT, allowNull: true },
      bagian: { type: Sequelize.STRING(100), allowNull: true },
      status: { type: Sequelize.STRING(50), allowNull: true },
      tmt: { type: Sequelize.DATEONLY, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      is_delete: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      updated_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('karyawan');
  },
};
