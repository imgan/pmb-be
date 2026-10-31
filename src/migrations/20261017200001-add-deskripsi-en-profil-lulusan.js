'use strict';

// Deskripsi Profil Lulusan dalam Bahasa Inggris (opsional), di samping deskripsi Bahasa Indonesia (wajib).
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('profil_lulusan', 'deskripsi_en', { type: Sequelize.TEXT, allowNull: true, after: 'deskripsi' });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('profil_lulusan', 'deskripsi_en');
  },
};
