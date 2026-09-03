const { PresentaseKehadiranMahasiswa, TahunAjaran, Jurusan } = require('../models');

const listPresentaseKehadiran = async ({ tahun, semester } = {}) => {
  const tahunAjaranWhere = {};
  if (tahun) tahunAjaranWhere.tahunMulai = tahun;
  if (semester) tahunAjaranWhere.jenisSemester = semester;

  const rows = await PresentaseKehadiranMahasiswa.findAll({
    include: [
      { model: TahunAjaran, as: 'tahunAjaran', attributes: ['id', 'tahunMulai', 'jenisSemester'], where: tahunAjaranWhere },
      { model: Jurusan, as: 'jurusan', attributes: ['id', 'namaJurusan'] },
    ],
    order: [
      [{ model: TahunAjaran, as: 'tahunAjaran' }, 'tahunMulai', 'DESC'],
      [{ model: Jurusan, as: 'jurusan' }, 'namaJurusan', 'ASC'],
    ],
  });

  // Satu program studi bisa punya beberapa baris jurusan berbeda per golongan kelas
  // (Reguler/Karyawan/Kelas Malam) — digabung per NAMA jurusan, sama seperti laporan Student Body.
  const grouped = new Map();
  rows.forEach((row) => {
    const key = `${row.tahunAjaran.tahunMulai}|${row.tahunAjaran.jenisSemester}|${row.jurusan.namaJurusan}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        tahunAkademik: row.tahunAjaran.tahunMulai,
        semester: row.tahunAjaran.jenisSemester,
        prodi: row.jurusan.namaJurusan,
        total: 0,
        count: 0,
      });
    }
    const entry = grouped.get(key);
    entry.total += Number(row.rataRataKehadiran);
    entry.count += 1;
  });

  return [...grouped.values()].map(({ total, count, ...rest }) => ({
    ...rest,
    rataRataKehadiran: Number((total / count).toFixed(2)),
  }));
};

module.exports = { listPresentaseKehadiran };
