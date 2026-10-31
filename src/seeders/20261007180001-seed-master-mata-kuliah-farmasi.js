'use strict';

// Master mata kuliah (menu BAAK "Mata Kuliah") dari kurikulum D3 Farmasi; dummy lama dihapus.
// SKS = tatap muka + praktek + praktek lapangan + simulasi. Kode MK unik, jadi baris Excel dengan
// kode ganda (FAR105 "Morfologi dan Fisiologi Tumbuhan", FAR106 "Aplikasi Komputer") dilewati —
// yang dipakai sama dengan yang tersimpan di kurikulum.
const MATA_KULIAH = [
  ['MKDU01', 'Pendidikan Agama', 2],
  ['MKDU02', 'Pancasila dan Kewarganegaraan', 2],
  ['FAR102', 'Farmasetika Dasar', 3],
  ['FAR105', 'Anatomi Fisiologi Manusia', 2],
  ['FAR103', 'Kimia Dasar', 3],
  ['FAR106', 'Kalkulasi Farmasi', 3],
  ['F3106', 'Pengantar Fitokimia', 2],
  ['F3103', 'Komunikasi Farmasi', 2],
  ['F3102', 'Teknologi Sediaan Steril', 3],
  ['F3101', 'Teknologi Sediaan Solid', 3],
  ['F3104', 'Manajemen Farmasi', 2],
  ['F3105', 'Etika Profesi dan UU Kesehatan', 3],
  ['F5103', 'Bahasa Indonesia', 2],
  ['F5101', 'Swamedikasi', 2],
  ['F5102', 'Dasar-Dasar Farmasi Klinik', 2],
  ['F5204', 'Biostatistika', 2],
  ['F5206', 'Farmasi Rumah Sakit', 3],
  ['F5405', 'Metodologi Penelitian', 2],
  ['F5207', 'Teknologi Sediaan Kosmetik', 3],
];

const DUMMY_KODE = [
  'BP1', 'IF401', 'IF402', 'IF403', 'KEP301', 'KEP302', 'KEP303', 'MKBFF001', 'MKBFF002', 'MKBFF003',
  'MKDFF007', 'MKU101', 'MKU102', 'MKU103', 'MKU104', 'PGSD201', 'PGSD202', 'PGSD203', 'SI301', 'TEST999',
];

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    // Dummy hanya dihapus kalau belum dipakai jadwal kuliah / nilai transfer feeder.
    await queryInterface.sequelize.query(
      `DELETE FROM mata_kuliah WHERE kode_mk IN (:kode)
        AND id NOT IN (SELECT mata_kuliah_id FROM jadwal_kuliah WHERE mata_kuliah_id IS NOT NULL)
        AND id NOT IN (SELECT mata_kuliah_id FROM feeder_nilai_transfer WHERE mata_kuliah_id IS NOT NULL)`,
      { replacements: { kode: DUMMY_KODE } }
    );

    const [users] = await queryInterface.sequelize.query("SELECT id FROM users WHERE username = 'superadmin' LIMIT 1");
    const actorId = users.length ? users[0].id : null;
    const [existing] = await queryInterface.sequelize.query('SELECT kode_mk FROM mata_kuliah');
    const has = new Set(existing.map((r) => r.kode_mk));
    const rows = MATA_KULIAH.filter(([kode]) => !has.has(kode)).map(([kode, nama, sks]) => ({
      kode_mk: kode,
      nama_mk: nama,
      sks,
      is_delete: false,
      created_by: actorId,
      updated_by: actorId,
      created_at: now,
      updated_at: now,
    }));
    if (rows.length) await queryInterface.bulkInsert('mata_kuliah', rows);

    // Jadwal kuliah dari kurikulum yang belum tertaut ke master: cocokkan lewat kode.
    await queryInterface.sequelize.query(
      `UPDATE jadwal_kuliah j JOIN mata_kuliah m ON m.kode_mk = j.kode_mata_kuliah
        SET j.mata_kuliah_id = m.id WHERE j.mata_kuliah_id IS NULL AND m.kode_mk IN (:kode)`,
      { replacements: { kode: MATA_KULIAH.map(([kode]) => kode) } }
    );
  },
  down: async (queryInterface) => {
    const { Op } = require('sequelize');
    await queryInterface.bulkDelete('mata_kuliah', { kode_mk: { [Op.in]: MATA_KULIAH.map(([kode]) => kode) } });
  },
};
