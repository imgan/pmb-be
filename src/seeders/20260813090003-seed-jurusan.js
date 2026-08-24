'use strict';

module.exports = {
  up: async (queryInterface) => {
    const [users] = await queryInterface.sequelize.query("SELECT id FROM users WHERE username = 'superadmin' LIMIT 1");
    const actorId = users[0].id;

    const [golonganList] = await queryInterface.sequelize.query(
      "SELECT id, nama_kelas FROM golongan_kelas WHERE nama_kelas IN ('Reguler', 'Karyawan', 'Kelas Malam')"
    );
    const golonganMap = {};
    golonganList.forEach((g) => {
      golonganMap[g.nama_kelas] = g.id;
    });

    const now = new Date();
    const jurusanByKelas = {
      Reguler: ['D3 Farmasi', 'D3 Manajemen Logistik', 'D3 Administrasi Rumah Sakit', 'D4 Teknologi Rekayasa Multimedia'],
      Karyawan: ['D3 Manajemen Logistik', 'D3 Administrasi Rumah Sakit'],
      'Kelas Malam': ['D3 Manajemen Logistik', 'D4 Teknologi Rekayasa Multimedia'],
    };

    const rows = [];
    Object.entries(jurusanByKelas).forEach(([kelas, jurusanNames]) => {
      jurusanNames.forEach((namaJurusan) => {
        rows.push({
          golongan_kelas_id: golonganMap[kelas],
          nama_jurusan: namaJurusan,
          is_delete: false,
          created_by: actorId,
          updated_by: actorId,
          created_at: now,
          updated_at: now,
        });
      });
    });

    await queryInterface.bulkInsert('jurusan', rows);
  },
  down: async (queryInterface) => {
    const [golonganList] = await queryInterface.sequelize.query(
      "SELECT id FROM golongan_kelas WHERE nama_kelas IN ('Reguler', 'Karyawan', 'Kelas Malam')"
    );
    const ids = golonganList.map((g) => g.id);
    if (ids.length) {
      await queryInterface.bulkDelete('jurusan', { golongan_kelas_id: ids });
    }
  },
};
