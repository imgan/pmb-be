'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('voc_ujian_dosen', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      jadwal_kuliah_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: 'jadwal_kuliah', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      jumlah: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      tanggal_berkas: { type: Sequelize.DATEONLY, allowNull: true },
      pengawas_real_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'dosen', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      created_by: { type: Sequelize.INTEGER, allowNull: true },
      updated_by: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('voc_ujian_dosen');
  },
};
