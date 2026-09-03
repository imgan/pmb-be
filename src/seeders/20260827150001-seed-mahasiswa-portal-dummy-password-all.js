'use strict';

const bcrypt = require('bcryptjs');

// Seeder 20260825160002 hanya mengisi password untuk 1 NIM dummy (D3FR20260001) sehingga
// baru 1 dari puluhan mahasiswa yang bisa login ke portal Mahasiswa. Seeder ini melengkapi
// seluruh mahasiswa dummy lain yang masih punya password NULL, memakai password yang sama
// supaya mudah dipakai untuk smoke-test/demo portal Mahasiswa.
const MAHASISWA_PORTAL_PASSWORD = 'Mahasiswa@12345';

module.exports = {
  up: async (queryInterface) => {
    const hashed = await bcrypt.hash(MAHASISWA_PORTAL_PASSWORD, 10);
    await queryInterface.sequelize.query('UPDATE mahasiswa SET password = :password WHERE password IS NULL', {
      replacements: { password: hashed },
    });
  },
  down: async (queryInterface) => {
    // Tidak menyentuh mahasiswa yang sudah punya password sebelum seeder ini berjalan
    // (mis. dari seeder 20260825160002) — hanya set NULL kembali untuk yang password-nya
    // sama persis dengan hash yang di-generate seeder ini tidak bisa dibedakan, jadi down
    // ini sengaja dibiarkan no-op untuk keamanan (hindari menghapus password yang mungkin
    // sudah diganti user).
  },
};
