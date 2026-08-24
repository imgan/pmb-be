'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('krs', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      mahasiswa_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'mahasiswa', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      semester: { type: Sequelize.INTEGER, allowNull: false },
      tahun_ajaran_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'tahun_ajaran', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      status: {
        type: Sequelize.ENUM('DRAFT', 'DIAJUKAN', 'DISETUJUI', 'DITOLAK'),
        allowNull: false,
        defaultValue: 'DRAFT',
      },
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

    await queryInterface.addConstraint('krs', {
      fields: ['mahasiswa_id', 'semester', 'tahun_ajaran_id'],
      type: 'unique',
      name: 'krs_mahasiswa_semester_tahun_ajaran_unique',
    });

    await queryInterface.createTable('krs_detail', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      krs_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'krs', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      jadwal_kuliah_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'jadwal_kuliah', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addConstraint('krs_detail', {
      fields: ['krs_id', 'jadwal_kuliah_id'],
      type: 'unique',
      name: 'krs_detail_krs_jadwal_unique',
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('krs_detail');
    await queryInterface.dropTable('krs');
  },
};
