'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('kurikulum', 'metode_pembelajaran', { type: Sequelize.STRING(100), allowNull: true });
    await queryInterface.addColumn('kurikulum', 'tanggal_mulai_efektif', { type: Sequelize.DATEONLY, allowNull: true });
    await queryInterface.addColumn('kurikulum', 'tanggal_akhir_efektif', { type: Sequelize.DATEONLY, allowNull: true });
    await queryInterface.addColumn('kurikulum', 'id_matkul', { type: Sequelize.STRING(30), allowNull: true });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('kurikulum', 'metode_pembelajaran');
    await queryInterface.removeColumn('kurikulum', 'tanggal_mulai_efektif');
    await queryInterface.removeColumn('kurikulum', 'tanggal_akhir_efektif');
    await queryInterface.removeColumn('kurikulum', 'id_matkul');
  },
};
