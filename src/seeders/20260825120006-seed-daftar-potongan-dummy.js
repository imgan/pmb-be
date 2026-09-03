'use strict';

const ROWS = [
  { nim: 'D3FR20260001', biaya: 500000, semester: 1, alasan: 'Potongan biaya prestasi akademik', asal: 'Beasiswa Prestasi' },
  { nim: 'D3AR20260001', biaya: 750000, semester: 1, alasan: 'Potongan biaya anak yatim piatu', asal: 'Program Sosial Kampus' },
  { nim: 'D3ML20260001', biaya: 300000, semester: 2, alasan: 'Potongan biaya referral pendaftaran', asal: 'Promo Ajak Teman' },
];

module.exports = {
  up: async (queryInterface) => {
    const [users] = await queryInterface.sequelize.query("SELECT id FROM users WHERE username = 'superadmin' LIMIT 1");
    const actorId = users[0].id;
    const now = new Date();

    for (const row of ROWS) {
      const [mhsRows] = await queryInterface.sequelize.query(`SELECT id FROM mahasiswa WHERE nim = '${row.nim}' LIMIT 1`);
      if (mhsRows.length === 0) continue;
      const mahasiswaId = mhsRows[0].id;

      const [existing] = await queryInterface.sequelize.query(
        `SELECT id FROM daftar_potongan WHERE mahasiswa_id = ${mahasiswaId} AND asal = '${row.asal}' LIMIT 1`
      );
      if (existing.length > 0) continue;

      await queryInterface.bulkInsert('daftar_potongan', [
        {
          mahasiswa_id: mahasiswaId,
          biaya: row.biaya,
          semester: row.semester,
          alasan: row.alasan,
          asal: row.asal,
          created_by: actorId,
          updated_by: actorId,
          created_at: now,
          updated_at: now,
        },
      ]);
    }
  },
  down: async (queryInterface) => {
    const nims = ROWS.map((r) => r.nim);
    const [mhsRows] = await queryInterface.sequelize.query(
      `SELECT id FROM mahasiswa WHERE nim IN (${nims.map((n) => `'${n}'`).join(', ')})`
    );
    if (mhsRows.length) {
      await queryInterface.bulkDelete('daftar_potongan', { mahasiswa_id: mhsRows.map((r) => r.id) });
    }
  },
};
