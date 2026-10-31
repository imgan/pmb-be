const router = require('express').Router();
const { Op, fn, col } = require('sequelize');
const Joi = require('joi');
const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const { Dosen, Jurusan, JadwalKuliah, TahunAjaran } = require('../models');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { formatTahunAjaran } = require('../utils/tahunAjaran');
const { jadwalIdsScope } = require('../services/jadwalUjian.service');
const dosenService = require('../services/dosen.service');
const dosenKelasService = require('../services/dosenKelas.service');
const validate = require('../middlewares/validate.middleware');
const { createDosen, updateDosen } = require('../validations/dosen.validation');
const ApiError = require('../utils/ApiError');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

/**
 * Prodi → Dosen: daftar & CRUD dosen prodi sesi, dibatasi lewat `req.query.jurusanId`
 * (prodiScope). cakupan=homebase (default) → dosen ber-homebase prodi; cakupan=pengajar → dosen
 * kordinator/pengampu kelas prodi pada tahun ajaran terpilih (default aktif), termasuk dosen luar.
 * Tambah/ubah/hapus hanya untuk dosen ber-homebase prodi sesi (logika & validasi sama dengan SDI).
 */
router.use(authenticate);

const ATTRS = [
  'id', 'nik', 'nidn', 'nuptk', 'namaLengkap', 'gelar', 'jenisKelamin', 'pendidikanAkhir', 'jabatanFungsional',
  'statusDosen', 'jenisDosen', 'telpHp', 'noWhatsapp', 'email', 'jurusanId', 'isActive',
];

/** Id dosen pengajar kelas prodi (scope) pada satu tahun ajaran. */
const dosenPengajarIds = async (jurusanId, tahunAjaranId) => {
  const scope = await jadwalIdsScope(jurusanId);
  const where = { isActive: true };
  if (tahunAjaranId) where.tahunAjaranId = tahunAjaranId;
  if (scope) where.id = scope.length ? scope : [0];
  const jadwal = await JadwalKuliah.findAll({
    where,
    attributes: ['id', 'dosenKordinatorId'],
    include: [{ model: Dosen.unscoped(), as: 'dosenPengampu', attributes: ['id'], through: { attributes: [] }, required: false }],
  });
  const ids = new Set();
  const jumlahKelas = new Map();
  jadwal.forEach((j) => {
    const pengajar = new Set([j.dosenKordinatorId, ...(j.dosenPengampu ?? []).map((d) => d.id)].filter(Boolean));
    pengajar.forEach((id) => {
      ids.add(id);
      jumlahKelas.set(id, (jumlahKelas.get(id) ?? 0) + 1);
    });
  });
  return { ids: [...ids], jumlahKelas };
};

/**
 * @swagger
 * /prodi/dosen:
 *   get:
 *     summary: Daftar dosen prodi sesi (query cakupan homebase|pengajar, tahunAjaranId, jenisDosen, search, page, limit)
 *     tags: [Prodi]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  '/',
  authorize(MENU.PRODI_DOSEN_MANAGEMENT, ACTION.READ),
  catchAsync(async (req, res) => {
    const { page, limit, offset } = getPagination(req.query);
    const jurusanId = req.query.jurusanId ? [].concat(req.query.jurusanId).map(Number) : null;
    const where = {};
    let jumlahKelas = null;
    let tahunAjaran = null;

    if (req.query.cakupan === 'pengajar') {
      tahunAjaran = req.query.tahunAjaranId
        ? await TahunAjaran.findByPk(Number(req.query.tahunAjaranId))
        : await TahunAjaran.findOne({ where: { isActive: true } });
      const hasil = await dosenPengajarIds(jurusanId, tahunAjaran?.id);
      where.id = hasil.ids.length ? hasil.ids : [0];
      where.isActive = true;
      jumlahKelas = hasil.jumlahKelas;
    } else if (jurusanId) {
      where.jurusanId = jurusanId;
    }
    if (req.query.jenisDosen) where.jenisDosen = req.query.jenisDosen;
    if (req.query.search) {
      const like = { [Op.like]: `%${req.query.search}%` };
      where[Op.or] = [{ namaLengkap: like }, { nik: like }, { nidn: like }, { nuptk: like }, { email: like }];
    }

    const { rows, count } = await Dosen.findAndCountAll({
      where,
      attributes: ATTRS,
      include: [{ model: Jurusan, as: 'jurusan', attributes: ['id', 'namaJurusan'], required: false }],
      order: [['isActive', 'DESC'], ['namaLengkap', 'ASC']],
      limit,
      offset,
      distinct: true,
    });
    sendResponse(res, 200, {
      message: 'Dosen prodi fetched',
      data: {
        items: rows.map((d) => ({
          ...d.toJSON(),
          homebase: d.jurusan?.namaJurusan ?? null,
          jumlahKelas: jumlahKelas ? jumlahKelas.get(d.id) ?? 0 : null,
        })),
        tahunAjaran: tahunAjaran ? formatTahunAjaran(tahunAjaran) : null,
      },
      meta: getPagingMeta(count, page, limit),
    });
  })
);

const scopeIds = (req) => (req.query.jurusanId ? [].concat(req.query.jurusanId).map(Number) : null);

/** Homebase untuk tambah/ubah: harus prodi sesi; default id jurusan pertama prodi sesi. */
const resolveHomebase = (req, jurusanId) => {
  const scope = scopeIds(req);
  if (!scope) {
    if (jurusanId === undefined || jurusanId === null) throw new ApiError(400, 'Prodi (homebase) wajib dipilih');
    return jurusanId;
  }
  if (jurusanId && scope.includes(Number(jurusanId))) return Number(jurusanId);
  return Math.min(...scope);
};

/** Dosen yang boleh diubah/hapus: homebase-nya prodi sesi. */
const findDosenProdi = async (req) => {
  const dosen = await dosenService.getDosenById(Number(req.params.id));
  const scope = scopeIds(req);
  if (scope && !scope.includes(dosen.jurusanId)) throw new ApiError(403, 'Dosen ini bukan dosen homebase prodi Anda');
  return dosen;
};

/**
 * @swagger
 * /prodi/dosen/stats:
 *   get:
 *     summary: Jumlah dosen per prodi homebase (kartu ringkasan, sama dengan Master Dosen SDI)
 *     tags: [Prodi]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  '/stats',
  authorize(MENU.PRODI_DOSEN_MANAGEMENT, ACTION.READ),
  catchAsync(async (req, res) => {
    // Digabung per kode prodi (jurusan disimpan per golongan kelas) — hitungan sama dengan SDI.
    const rows = await Dosen.findAll({
      attributes: [[col('jurusan.kode_prodi'), 'kodeProdi'], [fn('MIN', col('jurusan.nama_jurusan')), 'namaJurusan'], [fn('MIN', col('jurusan.id')), 'jurusanId'], [fn('COUNT', col('Dosen.id')), 'total']],
      include: [{ model: Jurusan, as: 'jurusan', attributes: [], required: false }],
      group: [col('jurusan.kode_prodi')],
      raw: true,
    });
    const data = rows
      .map((r) => ({ kodeProdi: r.kodeProdi ?? null, namaJurusan: r.namaJurusan ?? null, jurusanId: r.jurusanId ?? null, total: Number(r.total) }))
      .sort((a, b) => (a.namaJurusan ?? '~').localeCompare(b.namaJurusan ?? '~'));
    sendResponse(res, 200, { message: 'Statistik dosen per prodi fetched', data });
  })
);

/**
 * @swagger
 * /prodi/dosen/{id}/kelas:
 *   get:
 *     summary: Kelas yang diajar dosen (tahunAjaranId, default aktif; dibatasi kelas prodi sesi) + peran di tiap kelas
 *     tags: [Prodi]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  '/:id/kelas',
  authorize(MENU.PRODI_DOSEN_MANAGEMENT, ACTION.READ),
  catchAsync(async (req, res) => {
    const tahunAjaran = req.query.tahunAjaranId
      ? await TahunAjaran.findByPk(Number(req.query.tahunAjaranId))
      : await TahunAjaran.findOne({ where: { isActive: true } });
    const jadwalIds = await jadwalIdsScope(req.query.jurusanId);
    const data = await dosenKelasService.listKelasDosen(Number(req.params.id), { tahunAjaranId: tahunAjaran?.id ?? null, jadwalIds });
    sendResponse(res, 200, {
      message: 'Kelas dosen fetched',
      data: { ...data, tahunAjaranId: tahunAjaran?.id ?? null, tahunAjaran: formatTahunAjaran(tahunAjaran) },
    });
  })
);

/**
 * @swagger
 * /prodi/dosen/{id}/kelas/{jadwalKuliahId}/kuesioner:
 *   put:
 *     summary: Centang / hapus centang "Isi Kuesioner" dosen di satu kelas prodi (body { isiKuesioner })
 *     tags: [Prodi]
 *     security: [{ bearerAuth: [] }]
 */
router.put(
  '/:id/kelas/:jadwalKuliahId/kuesioner',
  authorize(MENU.PRODI_DOSEN_MANAGEMENT, ACTION.UPDATE),
  validate(Joi.object({ isiKuesioner: Joi.boolean().required() })),
  catchAsync(async (req, res) => {
    const jadwalKuliahId = Number(req.params.jadwalKuliahId);
    // Akun prodi hanya boleh mengubah kelas prodinya.
    const scope = await jadwalIdsScope(req.query.jurusanId);
    if (scope && !scope.includes(jadwalKuliahId)) throw new ApiError(403, 'Kelas ini bukan kelas prodi Anda');
    const data = await dosenKelasService.setIsiKuesioner(Number(req.params.id), jadwalKuliahId, req.body.isiKuesioner, req.user.id);
    sendResponse(res, 200, { message: data.isiKuesioner ? 'Dosen diikutkan kuesioner' : 'Dosen tidak diikutkan kuesioner', data });
  })
);

/**
 * @swagger
 * /prodi/dosen/{id}:
 *   get:
 *     summary: Detail dosen (untuk form ubah)
 *     tags: [Prodi]
 *     security: [{ bearerAuth: [] }]
 *   put:
 *     summary: Ubah dosen homebase prodi sesi
 *     tags: [Prodi]
 *     security: [{ bearerAuth: [] }]
 *   delete:
 *     summary: Hapus (soft delete) dosen homebase prodi sesi
 *     tags: [Prodi]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  '/:id',
  authorize(MENU.PRODI_DOSEN_MANAGEMENT, ACTION.READ),
  catchAsync(async (req, res) => {
    const dosen = await dosenService.getDosenById(Number(req.params.id));
    sendResponse(res, 200, { message: 'Dosen fetched', data: dosen });
  })
);
router.post(
  '/',
  authorize(MENU.PRODI_DOSEN_MANAGEMENT, ACTION.CREATE),
  validate(createDosen),
  catchAsync(async (req, res) => {
    const data = await dosenService.createDosen({ ...req.body, jurusanId: resolveHomebase(req, req.body.jurusanId) }, req.user.id);
    sendResponse(res, 201, { message: 'Dosen ditambahkan', data });
  })
);
router.put(
  '/:id',
  authorize(MENU.PRODI_DOSEN_MANAGEMENT, ACTION.UPDATE),
  validate(updateDosen),
  catchAsync(async (req, res) => {
    const dosen = await findDosenProdi(req);
    const payload = { ...req.body };
    if (payload.jurusanId !== undefined) payload.jurusanId = resolveHomebase(req, payload.jurusanId ?? dosen.jurusanId);
    const data = await dosenService.updateDosen(dosen.id, payload, req.user.id);
    sendResponse(res, 200, { message: 'Dosen diperbarui', data });
  })
);
router.delete(
  '/:id',
  authorize(MENU.PRODI_DOSEN_MANAGEMENT, ACTION.DELETE),
  catchAsync(async (req, res) => {
    const dosen = await findDosenProdi(req);
    await dosenService.deleteDosen(dosen.id, req.user.id);
    sendResponse(res, 200, { message: 'Dosen dihapus' });
  })
);

module.exports = router;
