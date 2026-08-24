'use strict';

const JADWAL_LIST = [
  {
    kelas: 'TI4AM',
    kode: 'IF401',
    nama: 'Analisis dan Perancangan Sistem Informasi',
    sks: 3,
    kordinator: '0503089001', // Rian Hidayat
    pengampu: ['0511069102'], // Heri Juhari
    hari: 'SENIN',
    jam: 1,
    ruangan: '4.01 A',
    gcr: 'ti4am-apsi',
  },
  {
    kelas: 'TI4AM',
    kode: 'IF402',
    nama: 'Pemrograman Web Lanjut',
    sks: 3,
    kordinator: '0519038503', // Sari Puspita
    pengampu: ['0527098604', '0501029205'], // Bayu Aji Nugroho, Dinda Amalia
    hari: 'SELASA',
    jam: 2,
    ruangan: '4.02 B',
    gcr: 'ti4am-weblanjut',
  },
  {
    kelas: 'TI4AM',
    kode: 'IF403',
    nama: 'Basis Data Lanjut',
    sks: 3,
    kordinator: '0515047706', // Faisal Rahman
    pengampu: [],
    hari: 'RABU',
    jam: 3,
    ruangan: 'Lab Komputer 1',
    gcr: null,
  },
  {
    kelas: 'TI4AM',
    kode: 'MKU101',
    nama: 'Pendidikan Agama',
    sks: 2,
    kordinator: '0719068703', // Hendra Gunawan
    pengampu: [],
    hari: 'JUMAT',
    jam: 3,
    ruangan: '4.01 A',
    gcr: null,
  },
  {
    kelas: 'SI3B',
    kode: 'SI301',
    nama: 'Manajemen Proyek TI',
    sks: 2,
    kordinator: '0523088807', // Rizky Ananda
    pengampu: [],
    hari: 'KAMIS',
    jam: 1,
    ruangan: '4.03 A',
    gcr: null,
  },
  {
    kelas: 'FA2AP',
    kode: 'MKBFF001',
    nama: 'Biologi Sel dan Molekuler',
    sks: 2,
    kordinator: '0421077808', // apt. Dedi Kurniawan
    pengampu: [],
    hari: 'SENIN',
    jam: 1,
    ruangan: '4.01 A',
    gcr: null,
  },
  {
    kelas: 'FA2AP',
    kode: 'MKBFF002',
    nama: 'Botani Farmasi',
    sks: 2,
    kordinator: '0421077808', // apt. Dedi Kurniawan
    pengampu: [],
    hari: 'SENIN',
    jam: 2,
    ruangan: '4.01 A',
    gcr: null,
  },
  {
    kelas: 'FA2AP',
    kode: 'MKBFF003',
    nama: 'Praktikum Botani Farmasi',
    sks: 1,
    kordinator: '0421077808', // apt. Dedi Kurniawan
    pengampu: ['0412039007'], // dr. Ratna Widiastuti
    hari: 'SENIN',
    jam: 3,
    ruangan: 'Lab Farmasi',
    gcr: null,
  },
  {
    kelas: 'FA2AP',
    kode: 'MKDFF007',
    nama: 'Kimia Analisis Farmasi I',
    sks: 2,
    kordinator: '0412039007', // dr. Ratna Widiastuti
    pengampu: [],
    hari: 'SELASA',
    jam: 1,
    ruangan: '4.01 A',
    gcr: null,
  },
  {
    kelas: 'FA2AP',
    kode: 'MKU102',
    nama: 'Kewarganegaraan',
    sks: 2,
    kordinator: '0703099001', // Yusuf Maulana
    pengampu: [],
    hari: 'KAMIS',
    jam: 1,
    ruangan: '4.01 A',
    gcr: null,
  },
  {
    kelas: 'KP3A',
    kode: 'KEP301',
    nama: 'Keperawatan Medikal Bedah I',
    sks: 3,
    kordinator: '0414128801', // Ns. Amzal Mortin Andas
    pengampu: ['0925048902', '0418037703'], // Ns. Ashar Prima, Ns. Aty Nurillawaty Rahayu
    hari: 'RABU',
    jam: 1,
    ruangan: '3.01 A',
    gcr: 'kp3a-kmb1',
  },
  {
    kelas: 'KP3A',
    kode: 'KEP302',
    nama: 'Keperawatan Anak',
    sks: 2,
    kordinator: '0410086605', // Ns. Sunirah
    pengampu: [],
    hari: 'KAMIS',
    jam: 2,
    ruangan: '3.02 A',
    gcr: null,
  },
  {
    kelas: 'KP3A',
    kode: 'KEP303',
    nama: 'Keperawatan Jiwa',
    sks: 2,
    kordinator: '0418037703', // Ns. Aty Nurillawaty Rahayu
    pengampu: [],
    hari: 'JUMAT',
    jam: 1,
    ruangan: '3.01 A',
    gcr: null,
  },
  {
    kelas: 'KP3A',
    kode: 'MKU103',
    nama: 'Bahasa Indonesia',
    sks: 2,
    kordinator: '0711078402', // Rina Marlina
    pengampu: [],
    hari: 'SABTU',
    jam: 1,
    ruangan: '3.01 A',
    gcr: null,
  },
  {
    kelas: 'PGSD2A',
    kode: 'PGSD201',
    nama: 'Pembelajaran Matematika SD',
    sks: 3,
    kordinator: '0602087901', // Siti Nur Halimah
    pengampu: ['0614058202'], // Agus Setiawan
    hari: 'SENIN',
    jam: 1,
    ruangan: '2.01 A',
    gcr: 'pgsd2a-matsd',
  },
  {
    kelas: 'PGSD2A',
    kode: 'PGSD202',
    nama: 'Psikologi Pendidikan',
    sks: 2,
    kordinator: '0622039303', // Wulan Sari
    pengampu: [],
    hari: 'SELASA',
    jam: 2,
    ruangan: '2.01 A',
    gcr: null,
  },
  {
    kelas: 'PGSD2A',
    kode: 'PGSD203',
    nama: 'Pengembangan Kurikulum',
    sks: 2,
    kordinator: '0608067004', // Bambang Purnomo
    pengampu: [],
    hari: 'RABU',
    jam: 1,
    ruangan: '2.02 A',
    gcr: null,
  },
  {
    kelas: 'PGSD2A',
    kode: 'MKU104',
    nama: 'Etika Profesi',
    sks: 2,
    kordinator: '0727049604', // Fitriani Anggraeni
    pengampu: ['0719068703'], // Hendra Gunawan
    hari: 'SABTU',
    jam: 2,
    ruangan: '2.01 A',
    gcr: null,
  },
];

module.exports = {
  up: async (queryInterface) => {
    const [users] = await queryInterface.sequelize.query("SELECT id FROM users WHERE username = 'superadmin' LIMIT 1");
    const actorId = users.length ? users[0].id : null;
    const now = new Date();

    const [dosenRows] = await queryInterface.sequelize.query(
      `SELECT id, nidn FROM dosen WHERE nidn IN (${JADWAL_LIST.flatMap((j) => [j.kordinator, ...j.pengampu])
        .filter((v, i, arr) => arr.indexOf(v) === i)
        .map((nidn) => `'${nidn}'`)
        .join(',')})`
    );
    const dosenIdByNidn = Object.fromEntries(dosenRows.map((row) => [row.nidn, row.id]));

    await queryInterface.bulkInsert(
      'jadwal_kuliah',
      JADWAL_LIST.map((j) => ({
        kelas: j.kelas,
        kode_mata_kuliah: j.kode,
        nama_mata_kuliah: j.nama,
        sks: j.sks,
        dosen_kordinator_id: dosenIdByNidn[j.kordinator],
        hari: j.hari,
        jam: j.jam,
        ruangan: j.ruangan,
        gcr: j.gcr,
        is_active: true,
        created_by: actorId,
        updated_by: actorId,
        created_at: now,
        updated_at: now,
      }))
    );

    const [jadwalRows] = await queryInterface.sequelize.query(
      `SELECT id, kode_mata_kuliah FROM jadwal_kuliah WHERE kode_mata_kuliah IN (${JADWAL_LIST.map(
        (j) => `'${j.kode}'`
      ).join(',')})`
    );
    const jadwalIdByKode = Object.fromEntries(jadwalRows.map((row) => [row.kode_mata_kuliah, row.id]));

    const pengampuRows = JADWAL_LIST.flatMap((j) =>
      j.pengampu.map((nidn) => ({
        jadwal_kuliah_id: jadwalIdByKode[j.kode],
        dosen_id: dosenIdByNidn[nidn],
        created_at: now,
        updated_at: now,
      }))
    );
    if (pengampuRows.length) {
      await queryInterface.bulkInsert('jadwal_kuliah_dosen_pengampu', pengampuRows);
    }
  },
  down: async (queryInterface) => {
    const [jadwalRows] = await queryInterface.sequelize.query(
      `SELECT id FROM jadwal_kuliah WHERE kode_mata_kuliah IN (${JADWAL_LIST.map((j) => `'${j.kode}'`).join(',')})`
    );
    const ids = jadwalRows.map((row) => row.id);
    if (ids.length) {
      await queryInterface.bulkDelete('jadwal_kuliah_dosen_pengampu', { jadwal_kuliah_id: ids });
      await queryInterface.bulkDelete('jadwal_kuliah', { id: ids });
    }
  },
};
