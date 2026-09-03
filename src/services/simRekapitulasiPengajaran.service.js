const { KehadiranDosen, Dosen, JadwalKuliah } = require('../models');

const listRekapitulasiPengajaran = async ({ tahunAjaranId } = {}) => {
  const jadwalWhere = {};
  if (tahunAjaranId) jadwalWhere.tahunAjaranId = tahunAjaranId;

  const rows = await KehadiranDosen.findAll({
    include: [
      { model: Dosen, as: 'dosen', attributes: ['id', 'nidn', 'namaLengkap'] },
      {
        model: JadwalKuliah,
        as: 'jadwalKuliah',
        attributes: [],
        where: Object.keys(jadwalWhere).length ? jadwalWhere : undefined,
        required: !!tahunAjaranId,
      },
    ],
  });

  const byDosen = new Map();
  rows.forEach((row) => {
    const key = row.dosen.id;
    if (!byDosen.has(key)) {
      byDosen.set(key, {
        dosenId: row.dosen.id,
        nidn: row.dosen.nidn,
        namaLengkap: row.dosen.namaLengkap,
        hadir: 0,
        tidakHadir: 0,
        izin: 0,
        sakit: 0,
        totalPertemuan: 0,
      });
    }
    const entry = byDosen.get(key);
    if (row.status === 'HADIR') entry.hadir += 1;
    else if (row.status === 'TIDAK_HADIR') entry.tidakHadir += 1;
    else if (row.status === 'IZIN') entry.izin += 1;
    else if (row.status === 'SAKIT') entry.sakit += 1;
    entry.totalPertemuan += 1;
  });

  return [...byDosen.values()].sort((a, b) => a.namaLengkap.localeCompare(b.namaLengkap));
};

module.exports = { listRekapitulasiPengajaran };
