const { Op } = require('sequelize');
const { sequelize, PeriodePengajuanTa, PengajuanTa, PembimbingTaSkripsi, Dosen, Mahasiswa, Jurusan, User } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');

/**
 * Pengajuan TA/Skripsi. Prodi membuka periode (tanggal mulai-selesai, per prodi atau semua prodi);
 * selama periode dibuka mahasiswa mengajukan judul, tempat KKP/observasi, dan usulan pembimbing
 * utama/pendamping; prodi lalu menyetujui atau menolak (boleh sambil mengubah judul/pembimbing).
 */

const hariIni = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const namaDosen = (d) => (d ? [d.namaLengkap, d.gelar].filter(Boolean).join(', ') : null);
const dosenAttrs = ['id', 'namaLengkap', 'gelar'];

const includePengajuan = [
  { model: PeriodePengajuanTa, as: 'periode', attributes: ['id', 'tanggalMulai', 'tanggalSelesai'], required: false },
  { model: Dosen.unscoped(), as: 'pembimbingUtama', attributes: dosenAttrs, required: false },
  { model: Dosen.unscoped(), as: 'pembimbingPendamping', attributes: dosenAttrs, required: false },
  { model: User, as: 'verifikator', attributes: ['id', 'name'], required: false },
];

// ===================== Periode (prodi) =====================

/** Tanggal (string 'YYYY-MM-DD' atau Date hasil Joi) -> 'YYYY-MM-DD' untuk dibandingkan. */
const keYmd = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10));
const periodeTidakValid = (mulai, selesai) => mulai && selesai && keYmd(selesai) < keYmd(mulai);

const listPeriode = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.jurusanId) where[Op.or] = [{ jurusanId: query.jurusanId }, { jurusanId: null }];
  const { rows, count } = await PeriodePengajuanTa.findAndCountAll({
    where,
    include: [{ model: Jurusan, as: 'jurusan', attributes: ['id', 'namaJurusan'], required: false }],
    attributes: {
      include: [[sequelize.literal('(SELECT COUNT(*) FROM pengajuan_ta p WHERE p.periode_pengajuan_ta_id = `PeriodePengajuanTa`.`id` AND p.is_delete = 0)'), 'jumlahPengajuan']],
    },
    limit,
    offset,
    order: [['tanggalMulai', 'DESC'], ['id', 'DESC']],
  });
  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

const getPeriodeById = async (id) => {
  const periode = await PeriodePengajuanTa.findByPk(id, { include: [{ model: Jurusan, as: 'jurusan', attributes: ['id', 'namaJurusan'], required: false }] });
  if (!periode) throw new ApiError(404, 'Periode pengajuan tidak ditemukan');
  return periode;
};

const createPeriode = async (payload, actorId) => {
  if (periodeTidakValid(payload.tanggalMulai, payload.tanggalSelesai)) throw new ApiError(400, 'Tanggal selesai tidak boleh sebelum tanggal mulai');
  const periode = await PeriodePengajuanTa.create({ ...payload, keterangan: payload.keterangan || null, createdBy: actorId, updatedBy: actorId });
  return getPeriodeById(periode.id);
};

const updatePeriode = async (id, payload, actorId) => {
  const periode = await getPeriodeById(id);
  const mulai = payload.tanggalMulai ?? periode.tanggalMulai;
  const selesai = payload.tanggalSelesai ?? periode.tanggalSelesai;
  if (periodeTidakValid(mulai, selesai)) throw new ApiError(400, 'Tanggal selesai tidak boleh sebelum tanggal mulai');
  await periode.update({ ...payload, updatedBy: actorId });
  return getPeriodeById(id);
};

const deletePeriode = async (id, actorId) => {
  const periode = await getPeriodeById(id);
  const jumlah = await PengajuanTa.count({ where: { periodePengajuanTaId: periode.id } });
  if (jumlah) throw new ApiError(400, `Periode ini sudah memiliki ${jumlah} pengajuan; nonaktifkan saja periodenya`);
  await periode.update({ isDelete: true, updatedBy: actorId });
};

// ===================== Pengajuan (prodi) =====================

const listPengajuan = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.periodeId) where.periodePengajuanTaId = query.periodeId;
  if (query.status) where.status = query.status;
  if (query.jurusanId) where['$mahasiswa.jurusan_id$'] = query.jurusanId;
  if (query.search) {
    const like = { [Op.like]: `%${query.search}%` };
    where[Op.and] = [{ [Op.or]: [{ judul: like }, { '$mahasiswa.nim$': like }, { '$mahasiswa.nama_lengkap$': like }] }];
  }
  const { rows, count } = await PengajuanTa.findAndCountAll({
    where,
    include: [
      ...includePengajuan,
      {
        model: Mahasiswa,
        as: 'mahasiswa',
        attributes: ['id', 'nim', 'namaLengkap', 'jurusanId'],
        include: [{ model: Jurusan, as: 'jurusan', attributes: ['namaJurusan'], required: false }],
      },
    ],
    limit,
    offset,
    distinct: true,
    subQuery: false,
    order: [['id', 'DESC']],
  });
  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

const verifikasiPengajuan = async (id, payload, actorId) => {
  const pengajuan = await PengajuanTa.findByPk(id);
  if (!pengajuan) throw new ApiError(404, 'Pengajuan tidak ditemukan');
  if (payload.status === 'DITOLAK' && !String(payload.catatanProdi ?? '').trim()) throw new ApiError(400, 'Isi alasan penolakan');
  const utama = payload.pembimbingUtamaId !== undefined ? payload.pembimbingUtamaId : pengajuan.pembimbingUtamaId;
  const pendamping = payload.pembimbingPendampingId !== undefined ? payload.pembimbingPendampingId : pengajuan.pembimbingPendampingId;
  if (utama && pendamping && utama === pendamping) throw new ApiError(400, 'Pembimbing utama dan pendamping tidak boleh sama');
  await pengajuan.update({
    status: payload.status,
    catatanProdi: payload.catatanProdi || null,
    ...(payload.judul ? { judul: payload.judul } : {}),
    pembimbingUtamaId: utama,
    pembimbingPendampingId: pendamping,
    diverifikasiOleh: payload.status === 'DIAJUKAN' ? null : actorId,
    diverifikasiAt: payload.status === 'DIAJUKAN' ? null : new Date(),
  });
  return PengajuanTa.findByPk(id, { include: includePengajuan });
};

// ===================== Portal mahasiswa =====================

/** Periode yang sedang dibuka untuk prodi mahasiswa (yang paling akhir dimulai). */
const findPeriodeAktif = (jurusanId) => {
  const today = hariIni();
  return PeriodePengajuanTa.findOne({
    where: {
      isActive: true,
      tanggalMulai: { [Op.lte]: today },
      tanggalSelesai: { [Op.gte]: today },
      [Op.or]: [{ jurusanId: null }, { jurusanId }],
    },
    order: [['tanggalMulai', 'DESC'], ['id', 'DESC']],
  });
};

/**
 * Pilihan pembimbing: dosen yang terdaftar di Pembimbing TA/Skripsi (prodi) sesuai peran & masih
 * dalam periode SK-nya; bila belum ada data, semua dosen aktif.
 */
const pilihanPembimbing = async () => {
  const today = hariIni();
  const terdaftar = await PembimbingTaSkripsi.findAll({
    where: { periodeMulai: { [Op.lte]: today }, periodeSelesai: { [Op.gte]: today } },
    include: [{ model: Dosen, as: 'dosen', attributes: dosenAttrs, required: true }],
  });
  const opsi = (peran) => {
    const map = new Map();
    terdaftar.filter((p) => p.pembimbingKe === peran).forEach((p) => map.set(p.dosen.id, { value: p.dosen.id, label: namaDosen(p.dosen) }));
    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
  };
  let utama = opsi('UTAMA');
  let pendamping = opsi('PENDAMPING');
  if (!utama.length || !pendamping.length) {
    const semua = (await Dosen.findAll({ where: { isActive: true }, attributes: dosenAttrs, order: [['namaLengkap', 'ASC']] })).map((d) => ({
      value: d.id,
      label: namaDosen(d),
    }));
    if (!utama.length) utama = semua;
    if (!pendamping.length) pendamping = semua;
  }
  return { utama, pendamping };
};

const getFormMahasiswa = async (mahasiswaId) => {
  const mahasiswa = await Mahasiswa.findByPk(mahasiswaId, {
    attributes: ['id', 'nim', 'namaLengkap', 'email', 'noTelepon', 'jurusanId'],
    include: [{ model: Jurusan, as: 'jurusan', attributes: ['namaJurusan'], required: false }],
  });
  if (!mahasiswa) throw new ApiError(404, 'Mahasiswa tidak ditemukan');
  const [periode, pembimbing, kkp, pengajuan] = await Promise.all([
    findPeriodeAktif(mahasiswa.jurusanId),
    pilihanPembimbing(),
    // Tempat KKP/magang yang pernah dicatat untuk mahasiswa ini (pilihan isian "KKP/Observasi di").
    sequelize.query('SELECT DISTINCT lokasi FROM nilai_magang WHERE mahasiswa_id = :id AND is_delete = 0 AND lokasi IS NOT NULL', {
      replacements: { id: mahasiswaId },
      type: sequelize.QueryTypes.SELECT,
    }),
    PengajuanTa.findAll({ where: { mahasiswaId }, include: includePengajuan, order: [['id', 'DESC']] }),
  ]);
  return {
    mahasiswa: {
      nim: mahasiswa.nim,
      namaLengkap: mahasiswa.namaLengkap,
      prodi: mahasiswa.jurusan?.namaJurusan ?? null,
      email: mahasiswa.email,
      noTelepon: mahasiswa.noTelepon,
    },
    periode,
    pilihanPembimbingUtama: pembimbing.utama,
    pilihanPembimbingPendamping: pembimbing.pendamping,
    pilihanTempatKkp: kkp.map((k) => k.lokasi),
    pengajuan,
  };
};

/**
 * Ajukan (atau ubah pengajuan yang masih DIAJUKAN) pada periode yang sedang dibuka. Pengajuan yang
 * sudah disetujui tidak bisa diajukan ulang; yang ditolak boleh mengajukan lagi.
 */
const ajukanMahasiswa = async (mahasiswaId, payload) => {
  const mahasiswa = await Mahasiswa.findByPk(mahasiswaId, { attributes: ['id', 'jurusanId'] });
  const periode = await findPeriodeAktif(mahasiswa.jurusanId);
  if (!periode) throw new ApiError(400, 'Periode pengajuan TA/Skripsi sedang tidak dibuka');
  if (payload.pembimbingPendampingId && payload.pembimbingPendampingId === payload.pembimbingUtamaId) {
    throw new ApiError(400, 'Pembimbing utama dan pendamping tidak boleh sama');
  }
  const disetujui = await PengajuanTa.findOne({ where: { mahasiswaId, status: 'DISETUJUI' } });
  if (disetujui) throw new ApiError(400, 'Pengajuan TA/Skripsi Anda sudah disetujui prodi');

  const data = {
    noTelepon: payload.noTelepon || null,
    email: payload.email || null,
    judul: payload.judul,
    tempatKkp: payload.tempatKkp || null,
    pembimbingUtamaId: payload.pembimbingUtamaId,
    pembimbingPendampingId: payload.pembimbingPendampingId || null,
  };
  const menunggu = await PengajuanTa.findOne({ where: { mahasiswaId, periodePengajuanTaId: periode.id, status: 'DIAJUKAN' } });
  if (menunggu) {
    await menunggu.update(data);
    return { pengajuan: menunggu, diperbarui: true };
  }
  const pengajuan = await PengajuanTa.create({ ...data, mahasiswaId, periodePengajuanTaId: periode.id });
  return { pengajuan, diperbarui: false };
};

const batalkanMahasiswa = async (mahasiswaId, id) => {
  const pengajuan = await PengajuanTa.findOne({ where: { id, mahasiswaId } });
  if (!pengajuan) throw new ApiError(404, 'Pengajuan tidak ditemukan');
  if (pengajuan.status !== 'DIAJUKAN') throw new ApiError(400, 'Pengajuan yang sudah diverifikasi prodi tidak bisa dibatalkan');
  await pengajuan.update({ isDelete: true });
};

module.exports = {
  listPeriode,
  getPeriodeById,
  createPeriode,
  updatePeriode,
  deletePeriode,
  listPengajuan,
  verifikasiPengajuan,
  getFormMahasiswa,
  ajukanMahasiswa,
  batalkanMahasiswa,
};
