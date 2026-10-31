'use strict';

// Foto profil dosen (base64 data URL) — diubah dosen sendiri lewat popup Profil di portal dosen.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('dosen', 'photo', { type: Sequelize.TEXT('long'), allowNull: true, after: 'password' });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('dosen', 'photo');
  },
};
