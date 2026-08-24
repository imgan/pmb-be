'use strict';

const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface) => {
    const [rows] = await queryInterface.sequelize.query(
      `SELECT j.id AS jurusanId, j.golongan_kelas_id AS golonganKelasId
       FROM jurusan j
       INNER JOIN golongan_kelas gk ON gk.id = j.golongan_kelas_id
       WHERE gk.nama_kelas = 'Reguler' AND j.nama_jurusan = 'Teknik Informatika'
       LIMIT 1`
    );
    const ref = rows[0];
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    const now = new Date();

    await queryInterface.bulkInsert('peserta', [
      {
        nama_lengkap: 'Admin Demo',
        asal_sekolah: 'SMA Demo Testing',
        golongan_kelas_id: ref.golonganKelasId,
        jurusan_id: ref.jurusanId,
        no_telepon: '081200000000',
        email: 'admin@example.com',
        password: hashedPassword,
        is_active: true,
        created_by: null,
        updated_by: null,
        created_at: now,
        updated_at: now,
      },
    ]);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('peserta', { email: 'admin@example.com' });
  },
};
