'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('tarif_kuliah', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      jurusan_id: { type: Sequelize.INTEGER, allowNull: false },
      tahun_angkatan: { type: Sequelize.INTEGER, allowNull: false },
      semester: { type: Sequelize.INTEGER, allowNull: false },
      biaya_sks: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      biaya_bpp: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      biaya_spp: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      status_belajar: { type: Sequelize.STRING(30), allowNull: false },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_by: { type: Sequelize.INTEGER, allowNull: true },
      updated_by: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('tarif_kuliah', ['jurusan_id']);
    await queryInterface.addIndex('tarif_kuliah', ['tahun_angkatan']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('tarif_kuliah');
  },
};
