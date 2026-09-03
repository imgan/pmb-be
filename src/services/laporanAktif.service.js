const { Krs, TahunAjaran, Mahasiswa, Jurusan, GolonganKelas } = require('../models');

// Mengikuti definisi yang sama dengan laporan Student Body & FRS: status masuk 'BARU' dihitung
// sebagai "Baru"; sisanya (TRANSFER_LUAR/TRANSFER_DALAM/TRANSFER_LUAR_KARYAWAN/
// TRANSFER_DALAM_KARYAWAN) digabung sebagai "Pindahan/RPL". Reguler vs Karyawan diambil dari
// golongan_kelas milik mahasiswa (bukan jurusan) karena itu sumber otoritatif per mahasiswa.
const isBaru = (statusMasuk) => statusMasuk === 'BARU';
const isKaryawan = (namaKelas) => (namaKelas ?? '').trim().toLowerCase() === 'karyawan';

const emptyCounters = () => ({ baruReguler: 0, baruKaryawan: 0, pindahReguler: 0, pindahKaryawan: 0 });

const withDerived = (row) => {
  const baruJumlah = row.baruReguler + row.baruKaryawan;
  const pindahJumlah = row.pindahReguler + row.pindahKaryawan;
  return { ...row, baruJumlah, pindahJumlah, total: baruJumlah + pindahJumlah };
};

const sumCounters = (rows) =>
  rows.reduce(
    (acc, r) => ({
      baruReguler: acc.baruReguler + r.baruReguler,
      baruKaryawan: acc.baruKaryawan + r.baruKaryawan,
      baruJumlah: acc.baruJumlah + r.baruJumlah,
      pindahReguler: acc.pindahReguler + r.pindahReguler,
      pindahKaryawan: acc.pindahKaryawan + r.pindahKaryawan,
      pindahJumlah: acc.pindahJumlah + r.pindahJumlah,
      total: acc.total + r.total,
    }),
    { baruReguler: 0, baruKaryawan: 0, baruJumlah: 0, pindahReguler: 0, pindahKaryawan: 0, pindahJumlah: 0, total: 0 }
  );

const listAktif = async ({ tahun, semester } = {}) => {
  const tahunAjaranWhere = {};
  if (tahun) tahunAjaranWhere.tahunMulai = tahun;
  if (semester) tahunAjaranWhere.jenisSemester = semester;

  const krsList = await Krs.findAll({
    attributes: ['id', 'semester'],
    include: [
      { model: TahunAjaran, as: 'tahunAjaran', attributes: ['id', 'tahunMulai', 'jenisSemester'], where: tahunAjaranWhere },
      {
        model: Mahasiswa,
        as: 'mahasiswa',
        attributes: ['id', 'statusMasuk'],
        include: [
          { model: Jurusan, as: 'jurusan', attributes: ['id', 'namaJurusan', 'kodeProdi'] },
          { model: GolonganKelas, as: 'golonganKelas', attributes: ['id', 'namaKelas'] },
        ],
      },
    ],
  });

  // Satu program studi bisa punya beberapa baris jurusan berbeda per golongan kelas, jadi
  // digabung per NAMA jurusan (sama seperti laporan Student Body & FRS), lalu dipecah lagi per SMT.
  const byProdi = new Map();

  krsList.forEach((krs) => {
    const namaJurusan = krs.mahasiswa?.jurusan?.namaJurusan ?? 'Tanpa Jurusan';
    const kodeProdi = krs.mahasiswa?.jurusan?.kodeProdi ?? null;
    if (!byProdi.has(namaJurusan)) byProdi.set(namaJurusan, { kodeProdi, bySmt: new Map() });
    const prodiEntry = byProdi.get(namaJurusan);
    if (!prodiEntry.kodeProdi && kodeProdi) prodiEntry.kodeProdi = kodeProdi;

    const smt = krs.semester;
    if (!prodiEntry.bySmt.has(smt)) prodiEntry.bySmt.set(smt, emptyCounters());
    const counter = prodiEntry.bySmt.get(smt);

    const baru = isBaru(krs.mahasiswa?.statusMasuk);
    const karyawan = isKaryawan(krs.mahasiswa?.golonganKelas?.namaKelas);

    if (baru && !karyawan) counter.baruReguler += 1;
    else if (baru && karyawan) counter.baruKaryawan += 1;
    else if (!baru && !karyawan) counter.pindahReguler += 1;
    else counter.pindahKaryawan += 1;
  });

  return [...byProdi.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([namaJurusan, { kodeProdi, bySmt }]) => {
      const rows = [...bySmt.entries()]
        .sort(([smtA], [smtB]) => smtA - smtB)
        .map(([smt, counter]) => withDerived({ smt, ...counter }));
      return { namaJurusan, kodeProdi, rows, subtotal: sumCounters(rows) };
    });
};

module.exports = { listAktif };
