'use strict';

/** Profil Kampus: tautan akun TikTok (tampil sebagai ikon media sosial di footer website). */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('kampus', 'tiktok_url', { type: Sequelize.STRING(255), allowNull: true, after: 'youtube_url' });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('kampus', 'tiktok_url');
  },
};
