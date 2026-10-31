'use strict';

// Manajemen PL: Profil Lulusan punya nama (mis. "Pemikir Kritis & Analitis") dan profesi lulusan,
// selain kode & deskripsi.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('profil_lulusan', 'nama', { type: Sequelize.STRING(200), allowNull: false, defaultValue: '', after: 'kode' });
    await queryInterface.addColumn('profil_lulusan', 'profesi', { type: Sequelize.TEXT, allowNull: true, after: 'deskripsi' });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('profil_lulusan', 'profesi');
    await queryInterface.removeColumn('profil_lulusan', 'nama');
  },
};
