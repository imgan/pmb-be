const { Op } = require('sequelize');
const { JadwalUjian, JadwalKuliah, Dosen, Jurusan, TahunAjaran } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { formatTahunAjaran } = require('../utils/tahunAjaran');
const { buildWorkbook } = require('../utils/excel');
const { jadwalIdsForProdi } = require('../utils/prodiJadwal');

/**
 * Jadwal UTS/UAS. Daftarnya = jadwal kuliah yang diinput BAAK (kelas, mata kuliah, dosen, ruangan,
 * jam ke-, rencana pengawas = dosen kelas); prodi (Prodi → Jadwal Kuliah → Jadwal Ujian) dan dosen
 * pengampu (portal Dosen) hanya mengisi Status, Sifat & Tanggal Ujian per jenis ujian.
 */

const SIFAT_UJIAN = ['Essay', 'Pilihan Ganda', 'Project', 'Praktik', 'Lisan', 'Take Home'];
const dosenAttrs = ['id', 'nidn', 'namaLengkap', 'gelar'];
const namaDosen = (d) => (d ? [d.namaLengkap, d.gelar].filter(Boolean).join(', ') : null);

/** Id jadwal kuliah milik prodi-prodi sesi; null = tidak dibatasi (semua prodi). */
const jadwalIdsScope = async (jurusanId) => {
  if (!jurusanId) return null;
  const jurusan = await Jurusan.findAll({ where: { id: [].concat(jurusanId).map(Number) }, attributes: ['kodeProdi'], raw: true });
  const kode = [...new Set(jurusan.map((j) => j.kodeProdi).filter(Boolean))];
  return [...new Set((await Promise.all(kode.map(jadwalIdsForProdi))).flat())];
};

/** Id jadwal kuliah yang diampu dosen (kordinator atau pengampu). */
const jadwalIdsDosen = async (dosenId) => {
  const rows = await JadwalKuliah.findAll({
    attributes: ['id'],
    where: { [Op.or]: [{ dosenKordinatorId: dosenId }, { '$dosenPengampu.id$': dosenId }] },
    include: [{ model: Dosen, as: 'dosenPengampu', attributes: [], through: { attributes: [] }, required: false }],
    subQuery: false,
  });
  return [...new Set(rows.map((r) => r.id))];
};

const resolveTahunAjaran = async (tahunAjaranId) =>
  tahunAjaranId ? TahunAjaran.findByPk(Number(tahunAjaranId)) : TahunAjaran.findOne({ where: { isActive: true } });

const toRow = (j, ujian) => ({
  jadwalKuliahId: j.id,
  kodeMataKuliah: j.kodeMataKuliah,
  namaMataKuliah: j.namaMataKuliah,
  kelas: j.kelas,
  semester: j.semester,
  nidnDosen: j.dosenKordinator?.nidn ?? null,
  dosen: namaDosen(j.dosenKordinator),
  ruangan: j.ruangan,
  jamKe: j.jam,
  // Rencana pengawas = dosen kelas (kordinator + pengampu).
  pengawas: [j.dosenKordinator, ...(j.dosenPengampu ?? [])]
    .filter((d, i, arr) => d && arr.findIndex((x) => x?.id === d.id) === i)
    .map(namaDosen)
    .join('; '),
  tahunAjaran: formatTahunAjaran(j.tahunAjaran),
  status: ujian?.status ?? null,
  sifat: ujian?.sifat ?? null,
  tanggal: ujian?.tanggal ?? null,
});

/**
 * Daftar kelas + isian jadwal ujian. `ids` = batas jadwal kuliah (prodi sesi / kelas dosen);
 * null = semua. `all` = tanpa paginasi (export).
 */
const listJadwalUjian = async (query, ids, { all = false } = {}) => {
  const jenisUjian = query.jenisUjian === 'UAS' ? 'UAS' : 'UTS';
  const tahunAjaran = await resolveTahunAjaran(query.tahunAjaranId);
  const where = { isActive: true };
  if (tahunAjaran) where.tahunAjaranId = tahunAjaran.id;
  if (ids) where.id = ids.length ? ids : [0];
  if (query.kelas) where.kelas = query.kelas;
  if (query.search) {
    const like = { [Op.like]: `%${query.search}%` };
    where[Op.or] = [{ kelas: like }, { kodeMataKuliah: like }, { namaMataKuliah: like }, { ruangan: like }];
  }
  const { page, limit, offset } = getPagination(query);
  const { rows, count } = await JadwalKuliah.findAndCountAll({
    where,
    attributes: ['id', 'kelas', 'kodeMataKuliah', 'namaMataKuliah', 'semester', 'ruangan', 'jam', 'tahunAjaranId'],
    include: [
      { model: Dosen.unscoped(), as: 'dosenKordinator', attributes: dosenAttrs, required: false },
      { model: Dosen.unscoped(), as: 'dosenPengampu', attributes: dosenAttrs, through: { attributes: [] }, required: false },
      { model: TahunAjaran, as: 'tahunAjaran', attributes: ['id', 'nama', 'jenisSemester'], required: false },
    ],
    order: [['kelas', 'ASC'], ['namaMataKuliah', 'ASC']],
    distinct: true,
    ...(all ? {} : { limit, offset }),
  });
  const ujian = rows.length ? await JadwalUjian.findAll({ where: { jadwalKuliahId: rows.map((r) => r.id), jenisUjian } }) : [];
  const ujianBy = new Map(ujian.map((u) => [u.jadwalKuliahId, u]));
  return {
    data: rows.map((j) => toRow(j, ujianBy.get(j.id))),
    meta: getPagingMeta(count, page, all ? count || 1 : limit),
    jenisUjian,
    tahunAjaran: tahunAjaran ? { id: tahunAjaran.id, label: formatTahunAjaran(tahunAjaran) } : null,
  };
};

/** Simpan isian (upsert per kelas & jenis ujian). `ids` = jadwal kuliah yang boleh diubah (null = semua). */
const simpanJadwalUjian = async (jadwalKuliahId, payload, ids, pengisi) => {
  const jadwal = await JadwalKuliah.findByPk(jadwalKuliahId);
  if (!jadwal) throw new ApiError(404, 'Jadwal kuliah tidak ditemukan');
  if (ids && !ids.includes(jadwal.id)) throw new ApiError(403, 'Anda tidak berhak mengubah jadwal ujian kelas ini');
  const values = {
    status: payload.status || null,
    sifat: payload.sifat || null,
    tanggal: payload.tanggal || null,
    updatedBy: pengisi.userId ?? null,
    updatedByDosenId: pengisi.dosenId ?? null,
  };
  const [ujian] = await JadwalUjian.findOrCreate({
    where: { jadwalKuliahId: jadwal.id, jenisUjian: payload.jenisUjian },
    defaults: values,
  });
  await ujian.update(values);
  return ujian;
};

const exportJadwalUjian = async (query, ids) => {
  const { data, jenisUjian, tahunAjaran } = await listJadwalUjian(query, ids, { all: true });
  const workbook = buildWorkbook(
    `Jadwal ${jenisUjian}`,
    [
      { header: 'No', key: 'no', width: 6 },
      { header: 'Kode MK', key: 'kodeMataKuliah', width: 14 },
      { header: 'Mata Kuliah', key: 'namaMataKuliah', width: 34 },
      { header: 'NIDN', key: 'nidnDosen', width: 14 },
      { header: 'Nama Dosen', key: 'dosen', width: 34 },
      { header: 'Kelas', key: 'kelas', width: 12 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Sifat', key: 'sifat', width: 16 },
      { header: 'Ruangan', key: 'ruangan', width: 16 },
      { header: 'Jam ke', key: 'jamKe', width: 8 },
      { header: 'Tanggal Ujian', key: 'tanggal', width: 14 },
      { header: 'Rencana Pengawas', key: 'pengawas', width: 40 },
    ],
    data.map((r, i) => ({ ...r, no: i + 1 }))
  );
  const periode = (tahunAjaran?.label ?? 'semua').replace(/[^A-Za-z0-9]+/g, '-');
  return { workbook, filename: `jadwal-${jenisUjian.toLowerCase()}-${periode}.xlsx` };
};

module.exports = { SIFAT_UJIAN, jadwalIdsScope, jadwalIdsDosen, listJadwalUjian, simpanJadwalUjian, exportJadwalUjian };
