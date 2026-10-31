'use strict';

// Tahun ajaran 2022/2023 Ganjil s/d 2026/2027 Ganjil (Ganjil & Genap). Yang sudah ada dilewati;
// status aktif tidak diubah (tahun ajaran aktif tetap dipilih lewat menu Tahun Ajaran).
const START = 2022;
const END_GANJIL = 2026;

const periods = () => {
  const list = [];
  for (let y = START; y <= END_GANJIL; y++) {
    list.push({ tahunMulai: y, jenisSemester: 'GANJIL' });
    if (y < END_GANJIL) list.push({ tahunMulai: y, jenisSemester: 'GENAP' });
  }
  return list;
};

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();
    const [existing] = await queryInterface.sequelize.query('SELECT nama, jenis_semester FROM tahun_ajaran');
    const has = new Set(existing.map((r) => `${r.nama}|${r.jenis_semester}`));
    const rows = periods()
      .map(({ tahunMulai, jenisSemester }) => ({
        nama: `${tahunMulai}/${tahunMulai + 1}`,
        tahun_mulai: tahunMulai,
        tahun_selesai: tahunMulai + 1,
        jenis_semester: jenisSemester,
        is_active: false,
        is_delete: false,
        created_at: now,
        updated_at: now,
      }))
      .filter((r) => !has.has(`${r.nama}|${r.jenis_semester}`));
    if (rows.length) await queryInterface.bulkInsert('tahun_ajaran', rows);
  },
  down: async (queryInterface) => {
    const { Op } = require('sequelize');
    // Hanya hapus yang tidak dipakai data lain & tidak aktif.
    await queryInterface.bulkDelete('tahun_ajaran', {
      tahun_mulai: { [Op.between]: [START, END_GANJIL - 1] },
      is_active: false,
      created_by: null,
    });
  },
};
