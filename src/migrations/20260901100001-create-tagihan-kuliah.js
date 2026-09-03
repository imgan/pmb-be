'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('tagihan_kuliah', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      mahasiswa_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'mahasiswa', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      tahun_ajaran_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'tahun_ajaran', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      semester: { type: Sequelize.INTEGER, allowNull: false },
      biaya_sks: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      biaya_bpp: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      biaya_spp: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      potongan: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      total_tagihan: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
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

    await queryInterface.addConstraint('tagihan_kuliah', {
      fields: ['mahasiswa_id', 'tahun_ajaran_id'],
      type: 'unique',
      name: 'uq_tagihan_kuliah_mahasiswa_ta',
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('tagihan_kuliah');
  },
};
