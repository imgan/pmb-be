'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('kehadiran_ujian_mahasiswa', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      tahun_ajaran_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'tahun_ajaran', key: 'id' },
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
      jenis_ujian: { type: Sequelize.ENUM('UTS', 'UAS'), allowNull: false },
      jumlah_hadir: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
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

    await queryInterface.addConstraint('kehadiran_ujian_mahasiswa', {
      fields: ['tahun_ajaran_id', 'jurusan_id', 'jenis_ujian'],
      type: 'unique',
      name: 'uq_kehadiran_ujian_mahasiswa_ta_jurusan_jenis',
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('kehadiran_ujian_mahasiswa');
  },
};
