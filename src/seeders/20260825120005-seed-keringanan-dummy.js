'use strict';

const ROWS = [
  { nim: 'D3FR20260001', tanggal: '2026-08-10', totalTagihan: 2350000, jumlahBayar: 1500000, alasan: 'Kesulitan ekonomi keluarga akibat PHK orang tua', status: 'DISETUJUI' },
  { nim: 'D3ML20260001', tanggal: '2026-08-15', totalTagihan: 3400000, jumlahBayar: 2000000, alasan: 'Pengajuan keringanan biaya semester berjalan', status: 'DIAJUKAN' },
  { nim: 'D4TR20260001', tanggal: '2026-08-18', totalTagihan: 3000000, jumlahBayar: 1000000, alasan: 'Orang tua sakit dan tidak dapat bekerja sementara', status: 'DITOLAK' },
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
        `SELECT id FROM keringanan WHERE mahasiswa_id = ${mahasiswaId} AND tanggal = '${row.tanggal}' LIMIT 1`
      );
      if (existing.length > 0) continue;

      await queryInterface.bulkInsert('keringanan', [
        {
          mahasiswa_id: mahasiswaId,
          tanggal: row.tanggal,
          total_tagihan: row.totalTagihan,
          jumlah_bayar: row.jumlahBayar,
          alasan: row.alasan,
          status: row.status,
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
      await queryInterface.bulkDelete('keringanan', { mahasiswa_id: mhsRows.map((r) => r.id) });
    }
  },
};
