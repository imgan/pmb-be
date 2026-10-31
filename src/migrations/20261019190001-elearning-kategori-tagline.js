'use strict';

/** E-learning: kategori (mis. Kuliah, Praktikum, Pengayaan) & tagline (badge sorotan, mis. Wajib, Baru) per konten. */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('elearning_konten', 'kategori', { type: Sequelize.STRING(50), allowNull: true, after: 'judul' });
    await queryInterface.addColumn('elearning_konten', 'tagline', { type: Sequelize.STRING(50), allowNull: true, after: 'kategori' });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('elearning_konten', 'tagline');
    await queryInterface.removeColumn('elearning_konten', 'kategori');
  },
};
