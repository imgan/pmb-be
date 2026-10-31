'use strict';

/**
 * Thumbnail kecil gambar materi (dibuat browser saat unggah) — gambar pertama tampil sebagai sampul di daftar materi
 * tanpa memuat file aslinya.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('elearning_konten_berkas', 'thumb', { type: Sequelize.TEXT('medium'), allowNull: true, after: 'data' });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('elearning_konten_berkas', 'thumb');
  },
};
