'use strict';

/**
 * E-learning: target baru GRUP — penerima dibagi ke beberapa grup (Grup 1, Grup 2, ...).
 * Anggota grup disimpan di elearning_konten_mahasiswa (grup_ke + grup_nama); mahasiswa di luar grup tidak menerima konten.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('elearning_konten', 'target', { type: Sequelize.ENUM('SEMUA', 'PILIHAN', 'KAMPUS', 'GRUP'), allowNull: false, defaultValue: 'SEMUA' });
    await queryInterface.addColumn('elearning_konten_mahasiswa', 'grup_ke', { type: Sequelize.INTEGER, allowNull: true, after: 'mahasiswa_id' });
    await queryInterface.addColumn('elearning_konten_mahasiswa', 'grup_nama', { type: Sequelize.STRING(60), allowNull: true, after: 'grup_ke' });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('elearning_konten_mahasiswa', 'grup_nama');
    await queryInterface.removeColumn('elearning_konten_mahasiswa', 'grup_ke');
    await queryInterface.sequelize.query("UPDATE elearning_konten SET target = 'PILIHAN' WHERE target = 'GRUP'");
    await queryInterface.changeColumn('elearning_konten', 'target', { type: Sequelize.ENUM('SEMUA', 'PILIHAN', 'KAMPUS'), allowNull: false, defaultValue: 'SEMUA' });
  },
};
