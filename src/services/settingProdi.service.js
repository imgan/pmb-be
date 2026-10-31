const { SettingProdi, Jurusan, TahunAjaran, Kurikulum } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * Setting Program Studi per periode (tahun ajaran). Satu baris per prodi + periode. Data dibatasi prodi
 * sesi lewat `jurusanId` (prodiScope). Nilai setting disimpan untuk dipakai fitur lain (KRS, KHS, nilai, ujian).
 */
const INCLUDE = [
  { model: Jurusan, as: 'jurusan', attributes: ['id', 'namaJurusan', 'kodeProdi', 'jenjangPendidikan'] },
  { model: TahunAjaran, as: 'tahunAjaran', attributes: ['id', 'nama', 'jenisSemester', 'tahunMulai', 'isActive'] },
  { model: Kurikulum, as: 'kurikulumMahasiswaBaru', attributes: ['id', 'nama', 'tahunKurikulum'], required: false },
];
const lingkup = (jurusanId) => (jurusanId ? [].concat(jurusanId).map(Number) : null);
const cekLingkup = (jurusanIdData, jurusanId) => {
  const scope = lingkup(jurusanId);
  if (scope && !scope.includes(Number(jurusanIdData))) throw new ApiError(403, 'Program studi ini di luar akses Anda');
};

const list = async (query = {}) => {
  const scope = lingkup(query.jurusanId);
  const where = {};
  if (scope) where.jurusanId = scope;
  if (query.tahunAjaranId) where.tahunAjaranId = Number(query.tahunAjaranId);
  const rows = await SettingProdi.findAll({ where, include: INCLUDE });
  // Periode terbaru di atas.
  const urut = (r) => (r.tahunAjaran?.tahunMulai ?? 0) * 10 + (r.tahunAjaran?.jenisSemester === 'GENAP' ? 2 : 1);
  return rows.sort((a, b) => urut(b) - urut(a) || String(a.jurusan?.namaJurusan).localeCompare(String(b.jurusan?.namaJurusan)));
};

const findById = async (id, jurusanId) => {
  const item = await SettingProdi.findByPk(id, { include: INCLUDE });
  if (!item) throw new ApiError(404, 'Setting program studi tidak ditemukan');
  cekLingkup(item.jurusanId, jurusanId);
  return item;
};

/** Detail + pilihan kurikulum prodi tsb (untuk "Kurikulum Mahasiswa Baru"). */
const detail = async (id, jurusanId) => {
  const item = await findById(id, jurusanId);
  const kurikulumOptions = await Kurikulum.findAll({
    where: { jurusanId: item.jurusanId },
    attributes: ['id', 'nama', 'tahunKurikulum', 'isActive'],
    order: [['tahunKurikulum', 'DESC']],
  });
  return { ...item.toJSON(), kurikulumOptions };
};

/** Kurikulum mahasiswa baru harus milik prodi yang sama. */
const cekKurikulum = async (kurikulumId, jurusanIdData) => {
  if (!kurikulumId) return;
  const k = await Kurikulum.findByPk(kurikulumId);
  if (!k || Number(k.jurusanId) !== Number(jurusanIdData)) throw new ApiError(400, 'Kurikulum mahasiswa baru harus kurikulum program studi ini');
};
const nilai = (payload) => Object.fromEntries(SettingProdi.FIELDS.filter((f) => f in payload).map((f) => [f, payload[f] === '' ? null : payload[f]]));

const create = async (payload, userId, jurusanId) => {
  cekLingkup(payload.jurusanId, jurusanId);
  if (!(await Jurusan.findByPk(payload.jurusanId))) throw new ApiError(400, 'Program studi tidak ditemukan');
  if (!(await TahunAjaran.findByPk(payload.tahunAjaranId))) throw new ApiError(400, 'Periode tidak ditemukan');
  const dobel = await SettingProdi.findOne({ where: { jurusanId: payload.jurusanId, tahunAjaranId: payload.tahunAjaranId } });
  if (dobel) throw new ApiError(400, 'Setting untuk program studi & periode ini sudah ada');
  await cekKurikulum(payload.kurikulumMahasiswaBaruId, payload.jurusanId);
  const item = await SettingProdi.create({
    jurusanId: payload.jurusanId,
    tahunAjaranId: payload.tahunAjaranId,
    ...nilai(payload),
    createdBy: userId,
    updatedBy: userId,
  });
  return findById(item.id, jurusanId);
};

const update = async (id, payload, userId, jurusanId) => {
  const item = await findById(id, jurusanId);
  await cekKurikulum(payload.kurikulumMahasiswaBaruId, item.jurusanId);
  await item.update({ ...nilai(payload), updatedBy: userId });
  return findById(id, jurusanId);
};

const remove = async (id, jurusanId) => {
  const item = await findById(id, jurusanId);
  await item.destroy();
};

module.exports = { list, detail, create, update, remove };
