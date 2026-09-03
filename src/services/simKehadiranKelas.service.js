const { JadwalKuliah, TahunAjaran, MataKuliah, KehadiranDosen, KehadiranMahasiswa, KrsDetail, Krs } = require('../models');

/**
 * Rekap rata-rata kehadiran mahasiswa per kelas (jadwalKuliah), untuk satu tahun & semester.
 * "Tahun" = TahunAjaran.tahunMulai, "Semester" = JadwalKuliah.semester (semester ke- 1..8, sama
 * dengan yang dipakai KRS) — BUKAN GANJIL/GENAP seperti pada laporan Presentase Kehadiran.
 *
 * Persentase per kelas = rata-rata dari persentase kehadiran tiap mahasiswa yang KRS-nya
 * DISETUJUI di kelas itu, dan persentase tiap mahasiswa = (jumlah pertemuan dia HADIR) /
 * (jumlah pertemuan yang sudah direalisasikan dosen). Kelas tanpa pertemuan terealisasi atau
 * tanpa mahasiswa terdaftar dilaporkan 0%, bukan dilewati — supaya tetap kelihatan di daftar.
 */
const listKehadiranKelas = async ({ tahun, semester } = {}) => {
  const tahunAjaranWhere = {};
  if (tahun) tahunAjaranWhere.tahunMulai = tahun;

  const jadwalWhere = {};
  if (semester) jadwalWhere.semester = semester;

  const jadwalList = await JadwalKuliah.findAll({
    where: jadwalWhere,
    include: [
      { model: TahunAjaran, as: 'tahunAjaran', attributes: ['id', 'tahunMulai'], where: tahunAjaranWhere, required: true },
      { model: MataKuliah, as: 'mataKuliah', attributes: ['id', 'kodeMk', 'namaMk'] },
    ],
    order: [['namaMataKuliah', 'ASC']],
  });
  if (!jadwalList.length) return [];

  const jadwalIds = jadwalList.map((j) => j.id);

  const [meetings, rosterRows, hadirRows] = await Promise.all([
    KehadiranDosen.findAll({ where: { jadwalKuliahId: jadwalIds }, attributes: ['id', 'jadwalKuliahId'] }),
    KrsDetail.findAll({
      where: { jadwalKuliahId: jadwalIds },
      include: [{ model: Krs, as: 'krs', required: true, where: { status: 'DISETUJUI' }, attributes: ['mahasiswaId'] }],
      attributes: ['jadwalKuliahId'],
    }),
    KehadiranMahasiswa.findAll({
      where: { status: 'HADIR' },
      include: [{ model: KehadiranDosen, as: 'kehadiranDosen', required: true, where: { jadwalKuliahId: jadwalIds }, attributes: ['jadwalKuliahId'] }],
      attributes: ['mahasiswaId'],
    }),
  ]);

  const meetingCountByJadwal = new Map();
  meetings.forEach((m) => {
    meetingCountByJadwal.set(m.jadwalKuliahId, (meetingCountByJadwal.get(m.jadwalKuliahId) ?? 0) + 1);
  });

  const rosterByJadwal = new Map();
  rosterRows.forEach((r) => {
    if (!rosterByJadwal.has(r.jadwalKuliahId)) rosterByJadwal.set(r.jadwalKuliahId, new Set());
    rosterByJadwal.get(r.jadwalKuliahId).add(r.krs.mahasiswaId);
  });

  const hadirCountByJadwalMahasiswa = new Map();
  hadirRows.forEach((h) => {
    const jadwalKuliahId = h.kehadiranDosen.jadwalKuliahId;
    const key = `${jadwalKuliahId}|${h.mahasiswaId}`;
    hadirCountByJadwalMahasiswa.set(key, (hadirCountByJadwalMahasiswa.get(key) ?? 0) + 1);
  });

  return jadwalList.map((jadwal) => {
    const totalPertemuan = meetingCountByJadwal.get(jadwal.id) ?? 0;
    const roster = rosterByJadwal.get(jadwal.id) ?? new Set();

    let rataRataKehadiranPersentase = 0;
    if (totalPertemuan > 0 && roster.size > 0) {
      const totalPersentase = [...roster].reduce((sum, mahasiswaId) => {
        const hadir = hadirCountByJadwalMahasiswa.get(`${jadwal.id}|${mahasiswaId}`) ?? 0;
        return sum + (hadir / totalPertemuan) * 100;
      }, 0);
      rataRataKehadiranPersentase = Number((totalPersentase / roster.size).toFixed(2));
    }

    return {
      mataKuliah: jadwal.mataKuliah?.namaMk ?? jadwal.namaMataKuliah,
      kodeMataKuliah: jadwal.mataKuliah?.kodeMk ?? jadwal.kodeMataKuliah,
      kelas: jadwal.kelas,
      rataRataKehadiranPersentase,
    };
  });
};

module.exports = { listKehadiranKelas };
