const { Op } = require('sequelize');
const { sequelize, JadwalKuliah, Dosen, TahunAjaran, KehadiranDosen } = require('../models');
const ApiError = require('../utils/ApiError');
const { formatTahunAjaran } = require('../utils/tahunAjaran');

// Target tatap muka per semester: 14 pertemuan kuliah + UTS + UAS.
const TARGET_PERTEMUAN = 16;

const HARI_LABEL = { SENIN: 'Senin', SELASA: 'Selasa', RABU: 'Rabu', KAMIS: 'Kamis', JUMAT: 'Jumat', SABTU: 'Sabtu' };
const formatHari = (hari) => (hari ?? []).map((h) => HARI_LABEL[h] ?? h).join(', ') || '-';
const namaDosen = (d) => (d ? [d.namaLengkap, d.gelar].filter(Boolean).join(', ') : null);
const emptyCount = () => ({ HADIR: 0, TIDAK_HADIR: 0, IZIN: 0, SAKIT: 0, terakhir: null });

/**
 * Rekap realisasi mengajar per jadwal kuliah: jumlah pertemuan HADIR / TIDAK_HADIR / IZIN / SAKIT
 * yang tercatat di kehadiran dosen, dibanding target pertemuan per semester.
 */
const listRealisasiDosen = async (query) => {
  const where = { isActive: true };
  if (query.tahunAjaranId) where.tahunAjaranId = Number(query.tahunAjaranId);
  if (query.kelas) where.kelas = query.kelas;
  if (query.dosenId) where.dosenKordinatorId = Number(query.dosenId);

  const jadwalList = await JadwalKuliah.findAll({
    where,
    include: [
      { model: Dosen, as: 'dosenKordinator', attributes: ['id', 'namaLengkap', 'gelar'], required: false },
      { model: TahunAjaran, as: 'tahunAjaran', attributes: ['id', 'nama', 'jenisSemester'], required: false },
    ],
    order: [
      ['kelas', 'ASC'],
      ['kodeMataKuliah', 'ASC'],
    ],
  });

  const ids = jadwalList.map((j) => j.id);
  const counts = ids.length
    ? await sequelize.query(
        `SELECT jadwal_kuliah_id AS jadwalKuliahId, status, COUNT(*) AS total, MAX(tanggal_realisasi) AS terakhir
           FROM kehadiran_dosen
          WHERE is_delete = 0 AND jadwal_kuliah_id IN (:ids)
          GROUP BY jadwal_kuliah_id, status`,
        { replacements: { ids }, type: sequelize.QueryTypes.SELECT }
      )
    : [];
  const byJadwal = new Map();
  counts.forEach((c) => {
    const entry = byJadwal.get(c.jadwalKuliahId) ?? emptyCount();
    entry[c.status] = Number(c.total);
    if (!entry.terakhir || c.terakhir > entry.terakhir) entry.terakhir = c.terakhir;
    byJadwal.set(c.jadwalKuliahId, entry);
  });

  const search = (query.search ?? '').trim().toLowerCase();
  const data = jadwalList
    .map((j) => {
      const c = byJadwal.get(j.id) ?? emptyCount();
      return {
        id: j.id,
        tahunAjaran: formatTahunAjaran(j.tahunAjaran),
        kelas: j.kelas,
        kodeMataKuliah: j.kodeMataKuliah,
        namaMataKuliah: j.namaMataKuliah,
        sks: j.sks,
        hari: formatHari(j.hari),
        jam: j.jam,
        ruangan: j.ruangan,
        dosen: namaDosen(j.dosenKordinator),
        hadir: c.HADIR,
        tidakHadir: c.TIDAK_HADIR,
        izin: c.IZIN,
        sakit: c.SAKIT,
        target: TARGET_PERTEMUAN,
        persentase: Math.round((c.HADIR / TARGET_PERTEMUAN) * 1000) / 10,
        terakhir: c.terakhir,
      };
    })
    .filter(
      (r) =>
        !search ||
        [r.kelas, r.kodeMataKuliah, r.namaMataKuliah, r.dosen, r.ruangan].some((v) => (v ?? '').toLowerCase().includes(search))
    );

  const summary = data.reduce(
    (s, r) => ({
      jadwal: s.jadwal + 1,
      hadir: s.hadir + r.hadir,
      tidakHadir: s.tidakHadir + r.tidakHadir + r.izin + r.sakit,
      target: s.target + r.target,
    }),
    { jadwal: 0, hadir: 0, tidakHadir: 0, target: 0 }
  );

  return { rows: data, summary };
};

/** Riwayat pertemuan satu jadwal kuliah. */
const getRealisasiDetail = async (jadwalKuliahId) => {
  const jadwal = await JadwalKuliah.findByPk(jadwalKuliahId, {
    include: [{ model: Dosen, as: 'dosenKordinator', attributes: ['id', 'namaLengkap', 'gelar'], required: false }],
  });
  if (!jadwal) throw new ApiError(404, 'Jadwal kuliah not found');

  const pertemuan = await KehadiranDosen.findAll({
    where: { jadwalKuliahId, isDelete: false },
    include: [{ model: Dosen, as: 'dosen', attributes: ['id', 'namaLengkap', 'gelar'], required: false }],
    order: [
      ['tanggalRealisasi', 'ASC'],
      ['pertemuanKe', 'ASC'],
    ],
  });

  return {
    jadwal: {
      id: jadwal.id,
      kelas: jadwal.kelas,
      kodeMataKuliah: jadwal.kodeMataKuliah,
      namaMataKuliah: jadwal.namaMataKuliah,
      dosen: namaDosen(jadwal.dosenKordinator),
    },
    pertemuan: pertemuan.map((p) => ({
      id: p.id,
      pertemuanKe: p.pertemuanKe,
      tanggal: p.tanggalRealisasi,
      jamMasuk: p.jamMasuk,
      jamKeluar: p.jamKeluar,
      status: p.status,
      dosen: namaDosen(p.dosen),
      uraian: p.uraian,
      keterangan: p.keterangan,
    })),
  };
};

/** Pilihan filter: tahun ajaran, kelas, dan dosen yang punya jadwal aktif. */
const getFilterOptions = async () => {
  const jadwal = await JadwalKuliah.findAll({
    where: { isActive: true },
    attributes: ['kelas', 'tahunAjaranId', 'dosenKordinatorId'],
    include: [{ model: Dosen, as: 'dosenKordinator', attributes: ['id', 'namaLengkap'], required: false }],
  });
  const tahunIds = [...new Set(jadwal.map((j) => j.tahunAjaranId).filter(Boolean))];
  const tahunAjaran = tahunIds.length
    ? await TahunAjaran.findAll({ where: { id: { [Op.in]: tahunIds } }, attributes: ['id', 'nama', 'jenisSemester'], order: [['nama', 'DESC'], ['jenisSemester', 'ASC']] })
    : [];
  const dosenMap = new Map();
  jadwal.forEach((j) => j.dosenKordinator && dosenMap.set(j.dosenKordinator.id, j.dosenKordinator.namaLengkap));

  return {
    tahunAjaran: tahunAjaran.map((t) => ({ id: t.id, nama: t.nama, jenisSemester: t.jenisSemester })),
    kelas: [...new Set(jadwal.map((j) => j.kelas))].sort(),
    dosen: [...dosenMap.entries()].map(([id, nama]) => ({ id, nama })).sort((a, b) => a.nama.localeCompare(b.nama)),
  };
};

module.exports = { listRealisasiDosen, getRealisasiDetail, getFilterOptions };
