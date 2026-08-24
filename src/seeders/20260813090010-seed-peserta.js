'use strict';

const bcrypt = require('bcryptjs');

const findJurusanId = async (queryInterface, kelasName, jurusanName) => {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT j.id AS jurusanId, j.golongan_kelas_id AS golonganKelasId
     FROM jurusan j
     INNER JOIN golongan_kelas gk ON gk.id = j.golongan_kelas_id
     WHERE gk.nama_kelas = :kelasName AND j.nama_jurusan = :jurusanName
     LIMIT 1`,
    { replacements: { kelasName, jurusanName } }
  );
  return rows[0];
};

module.exports = {
  up: async (queryInterface) => {
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    const now = new Date();

    const pick = [
      { kelas: 'Reguler', jurusan: 'Teknik Informatika', nama: 'Ahmad Fauzi', sekolah: 'SMA Negeri 1 Jakarta', telp: '081234567001', email: 'ahmad.fauzi@example.com' },
      { kelas: 'Reguler', jurusan: 'Sistem Informasi', nama: 'Siti Nurhaliza', sekolah: 'SMA Negeri 2 Bandung', telp: '081234567002', email: 'siti.nurhaliza@example.com' },
      { kelas: 'Reguler', jurusan: 'Manajemen', nama: 'Budi Santoso', sekolah: 'SMK Telkom Malang', telp: '081234567003', email: 'budi.santoso@example.com' },
      { kelas: 'Karyawan', jurusan: 'Akuntansi', nama: 'Dewi Lestari', sekolah: 'SMA Kristen Petra Surabaya', telp: '081234567004', email: 'dewi.lestari@example.com' },
      { kelas: 'Kelas Malam', jurusan: 'Teknik Informatika', nama: 'Rizky Pratama', sekolah: 'MA Al-Hikmah Yogyakarta', telp: '081234567005', email: 'rizky.pratama@example.com' },
    ];

    const rows = [];
    for (const p of pick) {
      const ref = await findJurusanId(queryInterface, p.kelas, p.jurusan);
      rows.push({
        nama_lengkap: p.nama,
        asal_sekolah: p.sekolah,
        golongan_kelas_id: ref.golonganKelasId,
        jurusan_id: ref.jurusanId,
        no_telepon: p.telp,
        email: p.email,
        password: hashedPassword,
        is_active: true,
        created_by: null,
        updated_by: null,
        created_at: now,
        updated_at: now,
      });
    }

    await queryInterface.bulkInsert('peserta', rows);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('peserta', {
      email: [
        'ahmad.fauzi@example.com',
        'siti.nurhaliza@example.com',
        'budi.santoso@example.com',
        'dewi.lestari@example.com',
        'rizky.pratama@example.com',
      ],
    });
  },
};
