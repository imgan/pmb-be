const { Op } = require('sequelize');
const { Krs, KrsDetail, JadwalKuliah, Mahasiswa, Jurusan, TahunAjaran, PembimbingAkademik, Dosen } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * Persetujuan KRS oleh Dosen Pembimbing Akademik (portal dosen). Dosen hanya melihat & memproses
 * KRS mahasiswa bimbingannya sendiri (mahasiswa.pembimbingAkademikId -> pembimbing_akademik.dosenId).
 * BAAK tetap punya hak prerogatif mengubah status KRS lewat menu KRS Mahasiswa.
 */

const mahasiswaIdsBimbingan = async (dosenId) => {
  const pa = await PembimbingAkademik.findAll({ where: { dosenId }, attributes: ['id'] });
  if (!pa.length) return [];
  const mahasiswa = await Mahasiswa.findAll({
    where: { pembimbingAkademikId: { [Op.in]: pa.map((p) => p.id) } },
    attributes: ['id'],
  });
  return mahasiswa.map((m) => m.id);
};

const include = [
  {
    model: Mahasiswa,
    as: 'mahasiswa',
    attributes: ['id', 'nim', 'namaLengkap', 'tahunMasuk'],
    include: [{ model: Jurusan, as: 'jurusan', attributes: ['id', 'namaJurusan'], required: false }],
  },
  { model: TahunAjaran, as: 'tahunAjaran', attributes: ['id', 'nama', 'jenisSemester'], required: false },
  {
    model: KrsDetail,
    as: 'detailList',
    include: [
      {
        model: JadwalKuliah,
        as: 'kelasKuliah',
        attributes: ['id', 'kelas', 'kodeMataKuliah', 'namaMataKuliah', 'sks', 'hari', 'jam'],
        include: [{ model: Dosen, as: 'dosenKordinator', attributes: ['id', 'namaLengkap'], required: false }],
      },
    ],
  },
];

const toRow = (krs) => {
  const json = krs.toJSON();
  return { ...json, totalSks: (json.detailList ?? []).reduce((sum, d) => sum + (d.kelasKuliah?.sks ?? 0), 0) };
};

/** `status` default DIAJUKAN (menunggu persetujuan); 'SEMUA' = semua status selain draft. */
const listKrsBimbingan = async (dosenId, query = {}) => {
  const ids = await mahasiswaIdsBimbingan(dosenId);
  if (!ids.length) return { jumlahBimbingan: 0, rows: [] };
  const where = { mahasiswaId: { [Op.in]: ids } };
  const status = query.status ?? 'DIAJUKAN';
  where.status = status === 'SEMUA' ? { [Op.ne]: 'DRAFT' } : status;
  if (query.tahunAjaranId) where.tahunAjaranId = Number(query.tahunAjaranId);

  const rows = await Krs.findAll({ where, include, order: [['updatedAt', 'DESC']] });
  return { jumlahBimbingan: ids.length, rows: rows.map(toRow) };
};

/** Setujui / tolak KRS (hanya yang berstatus DIAJUKAN dan milik mahasiswa bimbingan dosen ini). */
const setStatusKrsBimbingan = async (dosenId, krsId, status) => {
  if (!['DISETUJUI', 'DITOLAK'].includes(status)) throw new ApiError(400, 'Status tidak valid');
  const krs = await Krs.findByPk(krsId);
  if (!krs) throw new ApiError(404, 'KRS tidak ditemukan');
  const ids = await mahasiswaIdsBimbingan(dosenId);
  if (!ids.includes(krs.mahasiswaId)) throw new ApiError(403, 'KRS ini bukan milik mahasiswa bimbingan Anda');
  if (krs.status !== 'DIAJUKAN') throw new ApiError(400, `KRS berstatus ${krs.status}, hanya KRS yang diajukan yang bisa diproses`);
  await krs.update({ status, updatedBy: null });
  return toRow(await Krs.findByPk(krsId, { include }));
};

/** Setujui banyak KRS sekaligus — hanya KRS Diajukan milik mahasiswa bimbingan dosen ini; sisanya dilewati. */
const setujuiMassalKrsBimbingan = async (dosenId, ids) => {
  const bimbingan = new Set(await mahasiswaIdsBimbingan(dosenId));
  const list = await Krs.findAll({ where: { id: { [Op.in]: ids } } });
  const byId = new Map(list.map((k) => [k.id, k]));
  const dilewati = [];
  const disetujui = [];
  ids.forEach((id) => {
    const krs = byId.get(id);
    if (!krs) dilewati.push({ id, alasan: 'KRS tidak ditemukan' });
    else if (!bimbingan.has(krs.mahasiswaId)) dilewati.push({ id, alasan: 'Bukan mahasiswa bimbingan Anda' });
    else if (krs.status !== 'DIAJUKAN') dilewati.push({ id, alasan: `Status ${krs.status}, hanya KRS diajukan yang bisa disetujui` });
    else disetujui.push(id);
  });
  if (disetujui.length) await Krs.update({ status: 'DISETUJUI', updatedBy: null }, { where: { id: { [Op.in]: disetujui } } });
  return { disetujui: disetujui.length, dilewati };
};

module.exports = { listKrsBimbingan, setStatusKrsBimbingan, setujuiMassalKrsBimbingan };
