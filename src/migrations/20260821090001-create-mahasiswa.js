'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('mahasiswa', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      nim: { type: Sequelize.STRING(30), allowNull: false, unique: true },
      peserta_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: 'peserta', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      nama_lengkap: { type: Sequelize.STRING(150), allowNull: false },
      email: { type: Sequelize.STRING(100), allowNull: false },
      no_telepon: { type: Sequelize.STRING(20), allowNull: true },
      asal_sekolah: { type: Sequelize.STRING(150), allowNull: true },
      golongan_kelas_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'golongan_kelas', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      jurusan_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'jurusan', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      tahun_masuk: { type: Sequelize.INTEGER, allowNull: false },
      urutan: { type: Sequelize.INTEGER, allowNull: false },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
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

    await queryInterface.addIndex('mahasiswa', ['jurusan_id', 'tahun_masuk'], {
      name: 'mahasiswa_jurusan_tahun_idx',
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('mahasiswa');
  },
};
