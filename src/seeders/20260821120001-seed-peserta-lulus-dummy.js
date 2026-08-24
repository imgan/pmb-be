'use strict';

// Password dummy untuk semua akun di bawah: Dummy@12345
const DUMMY_PASSWORD_HASH = '$2a$10$kt1KR/Ebk8OkxErh9Jr2o.P0qpVXST3GBYruxVKyLW2uTAwi8vyKq';

const DUMMY_PESERTA = [
  {
    nama_lengkap: 'Farel Adiyaksa',
    asal_sekolah: 'SMKN 1 Cilegon',
    jurusan_id: 1,
    golongan_kelas_id: 1,
    no_telepon: '081211110001',
    email: 'farel.adiyaksa@example.com',
  },
  {
    nama_lengkap: 'Putri Ramadhani',
    asal_sekolah: 'SMAN 3 Serang',
    jurusan_id: 1,
    golongan_kelas_id: 1,
    no_telepon: '081211110002',
    email: 'putri.ramadhani@example.com',
  },
  {
    nama_lengkap: 'Bagas Wijaya',
    asal_sekolah: 'SMKS YP 17 Cilegon',
    jurusan_id: 2,
    golongan_kelas_id: 1,
    no_telepon: '081211110003',
    email: 'bagas.wijaya@example.com',
  },
  {
    nama_lengkap: 'Intan Permatasari',
    asal_sekolah: 'SMAN 1 Anyer',
    jurusan_id: 4,
    golongan_kelas_id: 1,
    no_telepon: '081211110004',
    email: 'intan.permatasari@example.com',
  },
  {
    nama_lengkap: 'Yoga Firmansyah',
    asal_sekolah: 'SMKN 2 Serang',
    jurusan_id: 6,
    golongan_kelas_id: 2,
    no_telepon: '081211110005',
    email: 'yoga.firmansyah@example.com',
  },
  {
    nama_lengkap: 'Nadia Kusuma',
    asal_sekolah: 'SMAN 2 Cilegon',
    jurusan_id: 6,
    golongan_kelas_id: 2,
    no_telepon: '081211110006',
    email: 'nadia.kusuma@example.com',
  },
];

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    await queryInterface.bulkInsert(
      'peserta',
      DUMMY_PESERTA.map((p) => ({
        ...p,
        password: DUMMY_PASSWORD_HASH,
        is_active: true,
        status_ujian: 'lulus',
        status_kelulusan: 'diterima',
        created_at: now,
        updated_at: now,
      }))
    );
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('peserta', { email: DUMMY_PESERTA.map((p) => p.email) });
  },
};
