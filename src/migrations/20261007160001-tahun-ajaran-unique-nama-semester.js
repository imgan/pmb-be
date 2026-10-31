'use strict';

// Ganjil & Genap satu tahun ajaran memakai nama yang sama (mis. 2025/2026), jadi nama unik per semester.
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query('ALTER TABLE tahun_ajaran ADD UNIQUE KEY uq_tahun_ajaran_nama_semester (nama, jenis_semester)');
    await queryInterface.sequelize.query('ALTER TABLE tahun_ajaran DROP INDEX nama');
  },
  down: async (queryInterface) => {
    await queryInterface.sequelize.query('ALTER TABLE tahun_ajaran ADD UNIQUE KEY nama (nama)');
    await queryInterface.sequelize.query('ALTER TABLE tahun_ajaran DROP INDEX uq_tahun_ajaran_nama_semester');
  },
};
