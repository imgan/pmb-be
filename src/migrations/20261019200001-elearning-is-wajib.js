'use strict';

/** E-learning: penanda konten wajib (harus dibaca / ditonton / dikerjakan mahasiswa) atau opsional. */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('elearning_konten', 'is_wajib', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false, after: 'tagline' });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('elearning_konten', 'is_wajib');
  },
};
