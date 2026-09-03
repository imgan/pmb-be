'use strict';

const bcrypt = require('bcryptjs');

// NIM mahasiswa dummy yang dipakai untuk smoke-test login portal Mahasiswa.
// Diambil dari seeder 20260822130003-seed-mahasiswa-biodata-dummy.js dan sudah punya
// data nilai (nilai_mahasiswa) untuk mendemokan KHS/Transkrip.
const MAHASISWA_PORTAL_NIM = 'D3FR20260001';
const MAHASISWA_PORTAL_PASSWORD = 'Mahasiswa@12345';

module.exports = {
  up: async (queryInterface) => {
    const hashed = await bcrypt.hash(MAHASISWA_PORTAL_PASSWORD, 10);
    await queryInterface.sequelize.query(
      'UPDATE mahasiswa SET password = :password WHERE nim = :nim',
      { replacements: { password: hashed, nim: MAHASISWA_PORTAL_NIM } }
    );
  },
  down: async (queryInterface) => {
    await queryInterface.sequelize.query(
      'UPDATE mahasiswa SET password = NULL WHERE nim = :nim',
      { replacements: { nim: MAHASISWA_PORTAL_NIM } }
    );
  },
};
