'use strict';

const bcrypt = require('bcryptjs');

// NIDN dosen dummy yang dipakai untuk smoke-test login portal Dosen.
// Diambil dari seeder 20260821140001-seed-dosen-dummy.js (Rian Hidayat, S.Kom, M.Kom - FTID).
const DOSEN_PORTAL_NIDN = '0503089001';
const DOSEN_PORTAL_PASSWORD = 'Dosen@12345';

module.exports = {
  up: async (queryInterface) => {
    const hashed = await bcrypt.hash(DOSEN_PORTAL_PASSWORD, 10);
    await queryInterface.sequelize.query(
      'UPDATE dosen SET password = :password WHERE nidn = :nidn',
      { replacements: { password: hashed, nidn: DOSEN_PORTAL_NIDN } }
    );
  },
  down: async (queryInterface) => {
    await queryInterface.sequelize.query(
      'UPDATE dosen SET password = NULL WHERE nidn = :nidn',
      { replacements: { nidn: DOSEN_PORTAL_NIDN } }
    );
  },
};
