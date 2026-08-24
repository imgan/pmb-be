'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('peserta_dokumen', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      peserta_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'peserta', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      dokumen_kelengkapan_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'dokumen_kelengkapan', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      file_name: { type: Sequelize.STRING(255), allowNull: false },
      file: { type: Sequelize.TEXT('long'), allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addConstraint('peserta_dokumen', {
      fields: ['peserta_id', 'dokumen_kelengkapan_id'],
      type: 'unique',
      name: 'uq_peserta_dokumen_peserta_kelengkapan',
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('peserta_dokumen');
  },
};
