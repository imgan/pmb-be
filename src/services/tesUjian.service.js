const { Op } = require('sequelize');
const { sequelize, TesUjian, TesUjianPeserta, TesUjianJawaban, Gelombang, Peserta, Jurusan, CalonMahasiswa, BankUjian, BankUjianSoal } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');
const { hitungStatusDokumen } = require('../utils/statusDokumen');
const { hitungNilai } = require('./ujianPeserta.service');

const INCLUDE_GELOMBANG = [
  { model: Gelombang, as: 'gelombang', attributes: ['id', 'namaGelombang', 'tahunPmbId'] },
  { model: BankUjian, as: 'bankUjian', attributes: ['id', 'judul', 'durasiMenit'] },
];
const SORTABLE_COLUMNS = { namaUjian: ['namaUjian'], tanggal: ['tanggal'], gelombang: [{ model: Gelombang, as: 'gelombang' }, 'namaGelombang'] };

const listTesUjian = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.search) where.namaUjian = { [Op.like]: `%${query.search}%` };
  if (query.gelombangId) where.gelombangId = Number(query.gelombangId);

  const { rows, count } = await TesUjian.findAndCountAll({
    where,
    include: INCLUDE_GELOMBANG,
    attributes: { include: [[sequelize.literal('(SELECT COUNT(*) FROM tes_ujian_peserta tup WHERE tup.tes_ujian_id = TesUjian.id)'), 'jumlahPeserta']] },
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS, [['tanggal', 'DESC']]),
  });
  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

const getTesUjianById = async (id) => {
  const tes = await TesUjian.findByPk(id, { include: INCLUDE_GELOMBANG });
  if (!tes) throw new ApiError(404, 'Tes ujian not found');
  return tes;
};

const ensureGelombang = async (gelombangId) => {
  if (gelombangId && !(await Gelombang.findByPk(gelombangId))) throw new ApiError(400, 'Gelombang tidak ditemukan');
};

const ensureBankUjian = async (bankUjianId) => {
  if (bankUjianId && !(await BankUjian.findByPk(bankUjianId))) throw new ApiError(400, 'Paket soal (bank ujian) tidak ditemukan');
};

const createTesUjian = async (payload, actorId) => {
  await ensureGelombang(payload.gelombangId);
  await ensureBankUjian(payload.bankUjianId);
  const tes = await TesUjian.create({ ...payload, prodi: payload.prodi || null, createdBy: actorId, updatedBy: actorId });
  return getTesUjianById(tes.id);
};

const updateTesUjian = async (id, payload, actorId) => {
  const tes = await getTesUjianById(id);
  await ensureGelombang(payload.gelombangId);
  if ('bankUjianId' in payload && (payload.bankUjianId ?? null) !== tes.bankUjianId) {
    await ensureBankUjian(payload.bankUjianId);
    const mulai = await TesUjianPeserta.count({ where: { tesUjianId: id, mulaiAt: { [Op.ne]: null } } });
    if (mulai) throw new ApiError(400, 'Paket soal tidak bisa diganti karena sudah ada peserta yang mengerjakan');
  }
  await tes.update({ ...payload, ...('prodi' in payload ? { prodi: payload.prodi || null } : {}), updatedBy: actorId });
  return getTesUjianById(id);
};

const deleteTesUjian = async (id) => {
  const tes = await getTesUjianById(id);
  const pesertaIds = (await TesUjianPeserta.findAll({ where: { tesUjianId: id }, attributes: ['pesertaId'] })).map((r) => r.pesertaId);
  await tes.destroy();
  for (const pesertaId of pesertaIds) await syncStatusUjianPeserta(pesertaId);
};

/**
 * Status ujian di akun peserta (dan kolom Lulus Tes Masuk menu Peserta) mengikuti hasil tes terakhir yang sudah dinilai;
 * belum ada hasil → belum_ujian. Hasil tes juga menetapkan status kelulusan (tahap Pengumuman Kelulusan / Status Kuliah):
 * lulus → diterima, tidak lulus → ditolak; tanpa hasil, status kelulusan dibiarkan (bisa diatur manual).
 */
const KELULUSAN_DARI_UJIAN = { lulus: 'diterima', tidak_lulus: 'ditolak' };

const syncStatusUjianPeserta = async (pesertaId) => {
  const terakhir = await TesUjianPeserta.findOne({
    where: { pesertaId, status: { [Op.ne]: 'belum_ujian' } },
    order: [['updatedAt', 'DESC']],
  });
  const statusUjian = terakhir?.status ?? 'belum_ujian';
  const statusKelulusan = KELULUSAN_DARI_UJIAN[statusUjian];
  await Peserta.update({ statusUjian, ...(statusKelulusan ? { statusKelulusan } : {}) }, { where: { id: pesertaId } });
  await CalonMahasiswa.update(
    { lulusTesMasuk: statusUjian === 'lulus', ...(statusKelulusan ? { statusKuliah: statusKelulusan } : {}) },
    { where: { pesertaId } }
  );
};

const labelJurusan = (j) => j?.namaJurusan ?? '-';

/** Dokumen lengkap = semua Dokumen Pendaftaran, + Dokumen Beasiswa bila peserta memilih jalur beasiswa. */
const dokumenLengkapMap = async (pesertaList) => {
  const status = await hitungStatusDokumen(pesertaList.map((p) => p.id));
  return new Map(pesertaList.map((p) => {
    const s = status.get(p.id);
    return [p.id, !!s && s.umum && (!p.beasiswaId || s.beasiswa)];
  }));
};

/** Gelombang & jurusan tiap peserta diambil dari baris menu Peserta (calon mahasiswa) yang tertaut. */
const calonMap = async (pesertaIds) => {
  if (!pesertaIds.length) return new Map();
  const rows = await CalonMahasiswa.findAll({
    where: { pesertaId: pesertaIds },
    attributes: ['pesertaId', 'gelombangId', 'prodi'],
    include: [{ model: Gelombang, as: 'gelombang', attributes: ['id', 'namaGelombang'] }],
  });
  return new Map(rows.map((r) => [r.pesertaId, r]));
};

/** Jurusan peserta: prodi di menu Peserta, fallback ke jurusan akun peserta. */
const jurusanPeserta = (p, calon) => calon?.prodi || labelJurusan(p.jurusan);

const PESERTA_ATTRS = ['id', 'namaLengkap', 'email', 'noTelepon', 'beasiswaId', 'jurusanId'];
const INCLUDE_JURUSAN = { model: Jurusan.scope('withDeleted'), as: 'jurusan', attributes: ['id', 'namaJurusan', 'jenjangPendidikan'], required: false };

/** Daftar peserta ujian (halaman Daftar Peserta). */
const listPesertaUjian = async (tesUjianId, query = {}) => {
  await getTesUjianById(tesUjianId);
  const wherePeserta = query.search ? { namaLengkap: { [Op.like]: `%${query.search}%` } } : undefined;
  const rows = await TesUjianPeserta.findAll({
    where: { tesUjianId },
    include: [{ model: Peserta, as: 'peserta', attributes: PESERTA_ATTRS, where: wherePeserta, include: [INCLUDE_JURUSAN] }],
    order: [[{ model: Peserta, as: 'peserta' }, 'namaLengkap', 'ASC']],
  });
  const [lengkap, calon, essay] = await Promise.all([
    dokumenLengkapMap(rows.map((r) => r.peserta)),
    calonMap(rows.map((r) => r.pesertaId)),
    essayBelumDinilaiMap(rows.map((r) => r.id)),
  ]);
  return rows.map((r) => ({
    id: r.id,
    pesertaId: r.pesertaId,
    namaLengkap: r.peserta.namaLengkap,
    email: r.peserta.email,
    jurusan: jurusanPeserta(r.peserta, calon.get(r.pesertaId)),
    nilai: r.nilai === null ? null : Number(r.nilai),
    status: r.status,
    dokumenLengkap: lengkap.get(r.pesertaId),
    mulaiAt: r.mulaiAt,
    selesaiAt: r.selesaiAt,
    essayBelumDinilai: essay.get(r.id) ?? 0,
  }));
};

/** Jumlah jawaban essay yang belum diberi skor per peserta ujian. */
const essayBelumDinilaiMap = async (ids) => {
  if (!ids.length) return new Map();
  const rows = await TesUjianJawaban.findAll({
    where: { tesUjianPesertaId: ids, skor: null },
    include: [{ model: BankUjianSoal, as: 'soal', where: { tipe: 'ESSAY' }, attributes: [] }],
    attributes: ['tesUjianPesertaId', [sequelize.fn('COUNT', sequelize.col('TesUjianJawaban.id')), 'n']],
    group: ['tesUjianPesertaId'],
    raw: true,
  });
  return new Map(rows.map((r) => [r.tesUjianPesertaId, Number(r.n)]));
};

/** Popup Koreksi: soal + jawaban peserta + skor (PG otomatis, essay diisi admin). */
const getKoreksi = async (tesUjianId, id) => {
  const tes = await getTesUjianById(tesUjianId);
  const row = await getPesertaUjian(tesUjianId, id);
  if (!tes.bankUjianId) throw new ApiError(400, 'Tes ini tidak memakai soal online');
  const soal = await BankUjianSoal.findAll({ where: { bankUjianId: tes.bankUjianId }, order: [['urutan', 'ASC']] });
  const jawaban = new Map((await TesUjianJawaban.findAll({ where: { tesUjianPesertaId: row.id } })).map((j) => [j.soalId, j]));
  return {
    id: row.id,
    nilai: row.nilai === null ? null : Number(row.nilai),
    mulaiAt: row.mulaiAt,
    selesaiAt: row.selesaiAt,
    soal: soal.map((s) => {
      const j = jawaban.get(s.id);
      return {
        id: s.id,
        tipe: s.tipe,
        pertanyaan: s.pertanyaan,
        pilihan: s.pilihan,
        jawabanBenar: s.jawabanBenar,
        bobot: s.bobot,
        jawabanPilihan: j?.jawabanPilihan ?? null,
        jawabanTeks: j?.jawabanTeks ?? null,
        skor: j?.skor ?? null,
      };
    }),
  };
};

/** Simpan skor essay { soalId: skor } lalu hitung ulang nilai peserta. */
const simpanKoreksi = async (tesUjianId, id, skor, actorId) => {
  const tes = await getTesUjianById(tesUjianId);
  const row = await getPesertaUjian(tesUjianId, id);
  if (!row.selesaiAt) throw new ApiError(400, 'Peserta belum mengirim jawaban');
  const soal = new Map((await BankUjianSoal.findAll({ where: { bankUjianId: tes.bankUjianId, tipe: 'ESSAY' } })).map((s) => [s.id, s]));
  for (const [soalId, nilai] of Object.entries(skor)) {
    const s = soal.get(Number(soalId));
    if (!s) continue;
    if (nilai !== null && nilai > s.bobot) throw new ApiError(400, `Skor soal essay melebihi bobot (${s.bobot})`);
    const [j] = await TesUjianJawaban.findOrCreate({ where: { tesUjianPesertaId: row.id, soalId: s.id }, defaults: { jawabanTeks: null } });
    await j.update({ skor: nilai });
  }
  row.tesUjian = tes;
  const nilai = await hitungNilai(row);
  await row.update({ updatedBy: actorId });
  return { nilai };
};

/**
 * Kandidat popup Tambah Peserta Ujian: peserta di menu Peserta yang belum terdaftar di tes ini. gelombang=true → hanya
 * peserta gelombang tes ini (default semua gelombang, karena belum semua peserta punya gelombang). Tes untuk jurusan tertentu hanya
 * menampilkan peserta jurusan itu, kecuali semuaJurusan=true.
 */
const listKandidat = async (tesUjianId, query = {}) => {
  const tes = await getTesUjianById(tesUjianId);
  const sudah = (await TesUjianPeserta.findAll({ where: { tesUjianId }, attributes: ['pesertaId'] })).map((r) => r.pesertaId);
  const hanyaGelombang = query.gelombang === 'true' || query.gelombang === true;
  const filterJurusan = tes.prodi && !(query.semuaJurusan === 'true' || query.semuaJurusan === true);

  const where = { isActive: true };
  const and = [];
  if (sudah.length) and.push({ id: { [Op.notIn]: sudah } });
  // Hanya peserta yang sudah ada di menu Peserta (baris calon mahasiswa tertaut akun peserta).
  const whereCalon = { pesertaId: { [Op.ne]: null }, ...(hanyaGelombang ? { gelombangId: tes.gelombangId } : {}) };
  const diMenuPeserta = (await CalonMahasiswa.findAll({ where: whereCalon, attributes: ['pesertaId'] })).map((r) => r.pesertaId);
  and.push({ id: diMenuPeserta.length ? diMenuPeserta : [0] });
  if (query.search) {
    and.push({ [Op.or]: [{ namaLengkap: { [Op.like]: `%${query.search}%` } }, { email: { [Op.like]: `%${query.search}%` } }] });
  }
  if (and.length) where[Op.and] = and;

  const semua = await Peserta.findAll({
    where,
    attributes: PESERTA_ATTRS,
    include: [INCLUDE_JURUSAN],
    order: [['namaLengkap', 'ASC']],
  });
  const calon = await calonMap(semua.map((p) => p.id));
  const pesertaList = (filterJurusan ? semua.filter((p) => jurusanPeserta(p, calon.get(p.id)) === tes.prodi) : semua).slice(0, 500);
  const lengkap = await dokumenLengkapMap(pesertaList);
  return pesertaList.map((p) => ({
    pesertaId: p.id,
    namaLengkap: p.namaLengkap,
    email: p.email,
    jurusan: jurusanPeserta(p, calon.get(p.id)),
    gelombang: calon.get(p.id)?.gelombang?.namaGelombang ?? null,
    dokumenLengkap: lengkap.get(p.id),
  }));
};

const tambahPeserta = async (tesUjianId, pesertaIds, actorId) => {
  await getTesUjianById(tesUjianId);
  const ids = [...new Set(pesertaIds.map(Number))];
  const ada = await Peserta.count({ where: { id: ids } });
  if (ada !== ids.length) throw new ApiError(400, 'Sebagian peserta tidak ditemukan');
  const sudah = new Set((await TesUjianPeserta.findAll({ where: { tesUjianId, pesertaId: ids }, attributes: ['pesertaId'] })).map((r) => r.pesertaId));
  const baru = ids.filter((id) => !sudah.has(id));
  if (baru.length) {
    await TesUjianPeserta.bulkCreate(baru.map((pesertaId) => ({ tesUjianId, pesertaId, createdBy: actorId, updatedBy: actorId })));
  }
  return { ditambahkan: baru.length };
};

const getPesertaUjian = async (tesUjianId, id) => {
  const row = await TesUjianPeserta.findOne({ where: { id, tesUjianId } });
  if (!row) throw new ApiError(404, 'Peserta ujian not found');
  return row;
};

/** Set nilai + hasil (lulus / tidak lulus); status ujian akun peserta ikut diperbarui. */
const setNilai = async (tesUjianId, id, { nilai, status }, actorId) => {
  const row = await getPesertaUjian(tesUjianId, id);
  await row.update({ nilai, status, updatedBy: actorId });
  await syncStatusUjianPeserta(row.pesertaId);
  return row;
};

/** Batalkan = keluarkan peserta dari tes ini. */
const batalkanPeserta = async (tesUjianId, id) => {
  const row = await getPesertaUjian(tesUjianId, id);
  await row.destroy();
  await syncStatusUjianPeserta(row.pesertaId);
};

module.exports = {
  listTesUjian,
  getTesUjianById,
  createTesUjian,
  updateTesUjian,
  deleteTesUjian,
  listPesertaUjian,
  listKandidat,
  tambahPeserta,
  setNilai,
  getKoreksi,
  simpanKoreksi,
  batalkanPeserta,
};
