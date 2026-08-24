'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('kurikulum', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      kode: { type: Sequelize.STRING(30), allowNull: false },
      mata_kuliah: { type: Sequelize.STRING(200), allowNull: false },
      sks_teori: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      sks_praktek: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      sks_lab: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      sks_simulasi: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      semester: { type: Sequelize.INTEGER, allowNull: true },
      bidang_minat: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      tahun_akademik: { type: Sequelize.INTEGER, allowNull: true },
      is_delete: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_by: { type: Sequelize.INTEGER, allowNull: true },
      updated_by: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('kurikulum', ['kode']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('kurikulum');
  },
};
