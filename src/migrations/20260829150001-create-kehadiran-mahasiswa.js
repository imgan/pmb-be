'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('kehadiran_mahasiswa', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      kehadiran_dosen_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'kehadiran_dosen', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      mahasiswa_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'mahasiswa', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      status: {
        type: Sequelize.ENUM('HADIR', 'IZIN', 'SAKIT', 'ALPA'),
        allowNull: false,
        defaultValue: 'ALPA',
      },
      keterangan: { type: Sequelize.TEXT, allowNull: true },
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

    await queryInterface.addConstraint('kehadiran_mahasiswa', {
      fields: ['kehadiran_dosen_id', 'mahasiswa_id'],
      type: 'unique',
      name: 'uq_kehadiran_mahasiswa_dosen_mahasiswa',
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('kehadiran_mahasiswa');
  },
};
