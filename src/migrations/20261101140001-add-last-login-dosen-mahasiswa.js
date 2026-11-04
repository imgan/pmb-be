'use strict';

// Login terakhir portal dosen & mahasiswa (ditampilkan di menu Impersonasi Akun), setara users.last_login_at.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('dosen', 'last_login_at', { type: Sequelize.DATE, allowNull: true });
    await queryInterface.addColumn('mahasiswa', 'last_login_at', { type: Sequelize.DATE, allowNull: true });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('dosen', 'last_login_at');
    await queryInterface.removeColumn('mahasiswa', 'last_login_at');
  },
};
