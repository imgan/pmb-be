const { Krs, TahunAjaran, Mahasiswa, Jurusan } = require('../models');

// Mengikuti definisi yang sama dengan laporan Student Body: status masuk 'BARU' dihitung
// sebagai "Reguler"; sisanya (TRANSFER_LUAR/TRANSFER_DALAM/TRANSFER_LUAR_KARYAWAN/
// TRANSFER_DALAM_KARYAWAN) digabung sebagai "Pindahan/RPL".
const isReguler = (statusMasuk) => statusMasuk === 'BARU';

const listFrs = async ({ tahun, semester } = {}) => {
  const tahunAjaranWhere = {};
  if (tahun) tahunAjaranWhere.tahunMulai = tahun;
  if (semester) tahunAjaranWhere.jenisSemester = semester;

  const krsList = await Krs.findAll({
    include: [
      { model: TahunAjaran, as: 'tahunAjaran', attributes: ['id', 'tahunMulai', 'jenisSemester'], where: tahunAjaranWhere },
      {
        model: Mahasiswa,
        as: 'mahasiswa',
        attributes: ['id', 'statusMasuk'],
        include: [{ model: Jurusan, as: 'jurusan', attributes: ['id', 'namaJurusan'] }],
      },
    ],
  });

  // Satu program studi bisa punya beberapa baris jurusan berbeda per golongan kelas
  // (Reguler/Karyawan/Kelas Malam) — digabung per NAMA jurusan & tahun ajaran/semester,
  // sama seperti laporan Student Body.
  const grouped = new Map();
  krsList.forEach((krs) => {
    const namaJurusan = krs.mahasiswa?.jurusan?.namaJurusan ?? 'Tanpa Jurusan';
    const key = `${krs.tahunAjaran.tahunMulai}|${krs.tahunAjaran.jenisSemester}|${namaJurusan}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        tahunAkademik: krs.tahunAjaran.tahunMulai,
        semester: krs.tahunAjaran.jenisSemester,
        prodi: namaJurusan,
        reguler: 0,
        pindahanRpl: 0,
      });
    }
    const entry = grouped.get(key);
    if (isReguler(krs.mahasiswa?.statusMasuk)) entry.reguler += 1;
    else entry.pindahanRpl += 1;
  });

  return [...grouped.values()]
    .sort((a, b) => b.tahunAkademik - a.tahunAkademik || a.prodi.localeCompare(b.prodi))
    .map((row) => ({ ...row, jumlah: row.reguler + row.pindahanRpl }));
};

module.exports = { listFrs };
