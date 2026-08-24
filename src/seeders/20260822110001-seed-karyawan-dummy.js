'use strict';

const KARYAWAN_LIST = [
  { nama: 'Ahmad Fauzi, S.Kom', jk: 'L', tempat: 'Jakarta', lahir: '1985-04-12', pendidikan: 'S1', agama: 'Islam', bagian: 'IT Support', status: 'TETAP' },
  { nama: 'Siti Nurhaliza, S.E', jk: 'P', tempat: 'Bandung', lahir: '1990-07-22', pendidikan: 'S1', agama: 'Islam', bagian: 'Keuangan', status: 'TETAP' },
  { nama: 'Budi Santoso, A.Md', jk: 'L', tempat: 'Surabaya', lahir: '1988-01-30', pendidikan: 'D3', agama: 'Islam', bagian: 'Administrasi Umum', status: 'TETAP' },
  { nama: 'Dewi Lestari, S.Psi', jk: 'P', tempat: 'Semarang', lahir: '1992-09-15', pendidikan: 'S1', agama: 'Kristen', bagian: 'Sumber Daya Insani', status: 'TETAP' },
  { nama: 'Eko Prasetyo', jk: 'L', tempat: 'Yogyakarta', lahir: '1995-03-05', pendidikan: 'SMA', agama: 'Islam', bagian: 'Keamanan', status: 'KONTRAK' },
  { nama: 'Fitriani, S.Sos', jk: 'P', tempat: 'Malang', lahir: '1991-11-18', pendidikan: 'S1', agama: 'Islam', bagian: 'Kemahasiswaan', status: 'TETAP' },
  { nama: 'Gunawan Wibisono, S.T', jk: 'L', tempat: 'Depok', lahir: '1987-06-25', pendidikan: 'S1', agama: 'Islam', bagian: 'Sarana Prasarana', status: 'TETAP' },
  { nama: 'Hesti Handayani, S.Pd', jk: 'P', tempat: 'Bekasi', lahir: '1993-02-14', pendidikan: 'S1', agama: 'Islam', bagian: 'Akademik', status: 'TETAP' },
  { nama: 'Irwan Setiawan', jk: 'L', tempat: 'Tangerang', lahir: '1994-08-09', pendidikan: 'SMA', agama: 'Islam', bagian: 'Keamanan', status: 'KONTRAK' },
  { nama: 'Juliana Putri, A.Md.Keb', jk: 'P', tempat: 'Bogor', lahir: '1996-12-01', pendidikan: 'D3', agama: 'Islam', bagian: 'Klinik Kampus', status: 'KONTRAK' },
  { nama: 'Kurniawan Saputra, S.Kom', jk: 'L', tempat: 'Jakarta', lahir: '1989-05-20', pendidikan: 'S1', agama: 'Kristen', bagian: 'IT Support', status: 'TETAP' },
  { nama: 'Lina Marlina, S.E', jk: 'P', tempat: 'Cirebon', lahir: '1990-10-11', pendidikan: 'S1', agama: 'Islam', bagian: 'Keuangan', status: 'TETAP' },
  { nama: 'Muhammad Rizki', jk: 'L', tempat: 'Medan', lahir: '1997-04-27', pendidikan: 'SMA', agama: 'Islam', bagian: 'Rumah Tangga', status: 'KONTRAK' },
  { nama: 'Nurul Aini, S.Ip', jk: 'P', tempat: 'Solo', lahir: '1992-01-08', pendidikan: 'S1', agama: 'Islam', bagian: 'Perpustakaan', status: 'TETAP' },
  { nama: 'Oktavianus Simanjuntak', jk: 'L', tempat: 'Medan', lahir: '1986-03-17', pendidikan: 'D3', agama: 'Kristen', bagian: 'Keamanan', status: 'TETAP' },
  { nama: 'Putri Ramadhani, S.Farm', jk: 'P', tempat: 'Palembang', lahir: '1994-07-30', pendidikan: 'S1', agama: 'Islam', bagian: 'Klinik Kampus', status: 'TETAP' },
  { nama: 'Qori Amrullah, S.Kom', jk: 'L', tempat: 'Jakarta', lahir: '1991-09-23', pendidikan: 'S1', agama: 'Islam', bagian: 'IT Support', status: 'TIDAK_AKTIF' },
  { nama: 'Rahmawati, S.Pd', jk: 'P', tempat: 'Purwokerto', lahir: '1988-11-05', pendidikan: 'S1', agama: 'Islam', bagian: 'Akademik', status: 'TETAP' },
  { nama: 'Sandi Pratama', jk: 'L', tempat: 'Bandung', lahir: '1998-06-02', pendidikan: 'SMA', agama: 'Islam', bagian: 'Rumah Tangga', status: 'KONTRAK' },
  { nama: 'Tuti Wulandari, S.E', jk: 'P', tempat: 'Jakarta', lahir: '1990-02-19', pendidikan: 'S1', agama: 'Islam', bagian: 'Keuangan', status: 'TETAP' },
];

module.exports = {
  up: async (queryInterface) => {
    const [users] = await queryInterface.sequelize.query("SELECT id FROM users WHERE username = 'superadmin' LIMIT 1");
    const actorId = users.length ? users[0].id : null;
    const now = new Date();

    const rows = KARYAWAN_LIST.map((k, index) => ({
      nip: `K${String(index + 1).padStart(4, '0')}`,
      id_finger: String(1000 + index),
      nama_lengkap: k.nama,
      tempat_lahir: k.tempat,
      tanggal_lahir: k.lahir,
      jenis_kelamin: k.jk,
      pendidikan_akhir: k.pendidikan,
      agama: k.agama,
      telp_hp: `0813${String(20000000 + index * 111).slice(0, 8)}`,
      email: `${k.nama.split(',')[0].toLowerCase().replace(/[^a-z ]/g, '').trim().replace(/\s+/g, '.')}@kampus.ac.id`,
      alamat: `Jl. Contoh No. ${index + 1}, ${k.tempat}`,
      bagian: k.bagian,
      status: k.status,
      tmt: `${2012 + (index % 10)}-01-01`,
      is_active: k.status !== 'TIDAK_AKTIF',
      is_delete: false,
      created_by: actorId,
      updated_by: actorId,
      created_at: now,
      updated_at: now,
    }));

    await queryInterface.bulkInsert('karyawan', rows);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('karyawan', { nip: KARYAWAN_LIST.map((_, index) => `K${String(index + 1).padStart(4, '0')}`) });
  },
};
