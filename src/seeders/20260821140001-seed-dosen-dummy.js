'use strict';

const DOSEN_LIST = [
  { nidn: '0414128801', nama: 'Ns. Amzal Mortin Andas, M.Kep, Ph.D', kelompok: 'FKF', jk: 'L', tempat: 'Jakarta', lahir: '1988-03-12', pendidikan: 'S3', agama: 'Islam', status: 'TETAP', waktu: 'P' },
  { nidn: '0925048902', nama: 'Ns. Ashar Prima, M.Kep', kelompok: 'FKF', jk: 'L', tempat: 'Bandung', lahir: '1987-07-21', pendidikan: 'S2', agama: 'Islam', status: 'TETAP', waktu: 'P' },
  { nidn: '0418037703', nama: 'Ns. Aty Nurillawaty Rahayu, M.Kep, Sp.Kep.J', kelompok: 'FKF', jk: 'P', tempat: 'Bekasi', lahir: '1975-11-02', pendidikan: 'S2', agama: 'Islam', status: 'TETAP', waktu: 'M' },
  { nidn: '0417067404', nama: 'Ns. Muftadi, S.Kep, SKM, M.Kes', kelompok: 'FKF', jk: 'L', tempat: 'Bogor', lahir: '1972-06-17', pendidikan: 'S2', agama: 'Islam', status: 'TETAP', waktu: 'P' },
  { nidn: '0410086605', nama: 'Ns. Sunirah, M.Kep, Sp.Kep.Mat', kelompok: 'FKF', jk: 'P', tempat: 'Depok', lahir: '1964-10-08', pendidikan: 'S2', agama: 'Islam', status: 'TETAP', waktu: 'P' },
  { nidn: '0406056606', nama: 'Ns. Ponirah, S.Kep, M.Kes', kelompok: 'FKF', jk: 'P', tempat: 'Tangerang', lahir: '1964-06-04', pendidikan: 'S2', agama: 'Islam', status: 'TIDAK_TETAP', waktu: 'M' },
  { nidn: '0412039007', nama: 'dr. Ratna Widiastuti, M.Biomed', kelompok: 'FKF', jk: 'P', tempat: 'Jakarta', lahir: '1990-03-12', pendidikan: 'S2', agama: 'Kristen', status: 'TETAP', waktu: 'P' },
  { nidn: '0421077808', nama: 'apt. Dedi Kurniawan, M.Farm', kelompok: 'FKF', jk: 'L', tempat: 'Cirebon', lahir: '1978-07-21', pendidikan: 'S2', agama: 'Islam', status: 'TETAP', waktu: 'P' },

  { nidn: '0503089001', nama: 'Rian Hidayat, S.Kom, M.Kom', kelompok: 'FTID', jk: 'L', tempat: 'Jakarta', lahir: '1990-08-05', pendidikan: 'S2', agama: 'Islam', status: 'TETAP', waktu: 'P' },
  { nidn: '0511069102', nama: 'Heri Juhari, S.T, M.Kom', kelompok: 'FTID', jk: 'L', tempat: 'Jakarta', lahir: '1991-06-11', pendidikan: 'S2', agama: 'Islam', status: 'TETAP', waktu: 'M' },
  { nidn: '0519038503', nama: 'Sari Puspita, S.Kom, M.T', kelompok: 'FTID', jk: 'P', tempat: 'Bekasi', lahir: '1985-03-19', pendidikan: 'S2', agama: 'Kristen', status: 'TETAP', waktu: 'P' },
  { nidn: '0527098604', nama: 'Bayu Aji Nugroho, S.T, M.Eng', kelompok: 'FTID', jk: 'L', tempat: 'Semarang', lahir: '1986-09-27', pendidikan: 'S2', agama: 'Islam', status: 'TETAP', waktu: 'P' },
  { nidn: '0501029205', nama: 'Dinda Amalia, S.Kom, M.Kom', kelompok: 'FTID', jk: 'P', tempat: 'Bandung', lahir: '1992-02-01', pendidikan: 'S2', agama: 'Islam', status: 'TIDAK_TETAP', waktu: 'M' },
  { nidn: '0515047706', nama: 'Faisal Rahman, S.T, M.Kom', kelompok: 'FTID', jk: 'L', tempat: 'Medan', lahir: '1977-04-15', pendidikan: 'S2', agama: 'Islam', status: 'TETAP', waktu: 'P' },
  { nidn: '0523088807', nama: 'Rizky Ananda, S.Kom, M.T.I', kelompok: 'FTID', jk: 'L', tempat: 'Surabaya', lahir: '1988-08-23', pendidikan: 'S2', agama: 'Kristen', status: 'TETAP', waktu: 'M' },

  { nidn: '0602087901', nama: 'Siti Nur Halimah, S.Pd, M.Pd', kelompok: 'FIP', jk: 'P', tempat: 'Yogyakarta', lahir: '1979-02-06', pendidikan: 'S2', agama: 'Islam', status: 'TETAP', waktu: 'P' },
  { nidn: '0614058202', nama: 'Agus Setiawan, S.Pd, M.Pd', kelompok: 'FIP', jk: 'L', tempat: 'Solo', lahir: '1982-05-14', pendidikan: 'S2', agama: 'Islam', status: 'TETAP', waktu: 'P' },
  { nidn: '0622039303', nama: 'Wulan Sari, S.Pd, M.Si', kelompok: 'FIP', jk: 'P', tempat: 'Malang', lahir: '1993-03-22', pendidikan: 'S2', agama: 'Hindu', status: 'TIDAK_TETAP', waktu: 'M' },
  { nidn: '0608067004', nama: 'Bambang Purnomo, S.Pd, M.M.Pd', kelompok: 'FIP', jk: 'L', tempat: 'Purwokerto', lahir: '1970-06-08', pendidikan: 'S2', agama: 'Islam', status: 'TETAP', waktu: 'P' },

  { nidn: '0703099001', nama: 'Yusuf Maulana, S.E, M.M', kelompok: 'NON_BASE', jk: 'L', tempat: 'Jakarta', lahir: '1990-09-03', pendidikan: 'S2', agama: 'Islam', status: 'TETAP', waktu: 'P' },
  { nidn: '0711078402', nama: 'Rina Marlina, S.E, M.Ak', kelompok: 'NON_BASE', jk: 'P', tempat: 'Bekasi', lahir: '1984-07-11', pendidikan: 'S2', agama: 'Islam', status: 'TETAP', waktu: 'P' },
  { nidn: '0719068703', nama: 'Hendra Gunawan, S.H, M.H', kelompok: 'NON_BASE', jk: 'L', tempat: 'Jakarta', lahir: '1987-06-19', pendidikan: 'S2', agama: 'Kristen', status: 'TIDAK_TETAP', waktu: 'M' },
  { nidn: '0727049604', nama: 'Fitriani Anggraeni, S.Psi, M.Psi', kelompok: 'NON_BASE', jk: 'P', tempat: 'Depok', lahir: '1996-04-27', pendidikan: 'S2', agama: 'Islam', status: 'TETAP', waktu: 'P' },
];

module.exports = {
  up: async (queryInterface) => {
    const [users] = await queryInterface.sequelize.query("SELECT id FROM users WHERE username = 'superadmin' LIMIT 1");
    const actorId = users.length ? users[0].id : null;
    const now = new Date();

    const rows = DOSEN_LIST.map((d, index) => ({
      nik: `D${String(index + 1).padStart(3, '0')}`,
      nidn: d.nidn,
      nama_lengkap: d.nama,
      tempat_lahir: d.tempat,
      tanggal_lahir: d.lahir,
      jenis_kelamin: d.jk,
      pendidikan_akhir: d.pendidikan,
      agama: d.agama,
      telp_hp: `0812${String(10000000 + index * 137).slice(0, 8)}`,
      email: `${d.nama.split(',')[0].toLowerCase().replace(/[^a-z ]/g, '').trim().replace(/\s+/g, '.')}@kampus.ac.id`,
      alamat: `Jl. Contoh No. ${index + 1}, ${d.tempat}`,
      status_dosen: d.status,
      status: 'INSTITUSI',
      waktu: d.waktu,
      tmt: `${2010 + (index % 12)}-01-01`,
      karyawan_internal: index % 3 !== 0,
      infaq: index % 2 === 0,
      kelompok_fakultas: d.kelompok,
      is_active: true,
      is_delete: false,
      created_by: actorId,
      updated_by: actorId,
      created_at: now,
      updated_at: now,
    }));

    await queryInterface.bulkInsert('dosen', rows);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('dosen', { nidn: DOSEN_LIST.map((d) => d.nidn) });
  },
};
