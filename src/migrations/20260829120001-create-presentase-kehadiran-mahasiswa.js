'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('presentase_kehadiran_mahasiswa', {
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
      rata_rata_kehadiran: { type: Sequelize.DECIMAL(6, 2), allowNull: false, defaultValue: 0 },
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

    await queryInterface.addConstraint('presentase_kehadiran_mahasiswa', {
      fields: ['tahun_ajaran_id', 'jurusan_id'],
      type: 'unique',
      name: 'uq_presentase_kehadiran_mahasiswa_ta_jurusan',
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('presentase_kehadiran_mahasiswa');
  },
};
