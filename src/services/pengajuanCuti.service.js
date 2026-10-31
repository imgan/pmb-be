const { Op } = require('sequelize');
const { sequelize, PengajuanCuti, Mahasiswa, Jurusan, TahunAjaran, User } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { formatTahunAjaran } = require('../utils/tahunAjaran');
const { resolveSemesterMahasiswa } = require('../utils/hitungSemester');
const { getKampus } = require('./kampus.service');
const { buildPengajuanCutiPdf, pengajuanCutiPdfFilename } = require('./pengajuanCutiPdf.service');

/**
 * Pengajuan cuti akademik. Mahasiswa mengajukan dari portal (Pengajuan → Cuti): semester, rentang
 * tanggal cuti & alasan. Prodi menyetujui/menolak di menu Master Cuti — saat disetujui mahasiswa
 * ditandai statusKeluar = CUTI (data yang sama dengan input manual Master Cuti, jadi kenaikan
 * jumlahSemesterCuti saat ganti tahun ajaran tetap berjalan seperti biasa).
 */

const hariIni = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const includeTahunAjaran = { model: TahunAjaran, as: 'tahunAjaran', attributes: ['id', 'nama', 'jenisSemester'], required: false };

const toPengajuan = (item) => ({
  id: item.id,
  semester: item.semester,
  tanggalAwal: item.tanggalAwal,
  tanggalAkhir: item.tanggalAkhir,
  tanggalAjuan: item.tanggalAjuan,
  alasan: item.alasan,
  status: item.status,
  catatanProdi: item.catatanProdi,
  tahunAjaran: formatTahunAjaran(item.tahunAjaran),
});

// ===================== Portal mahasiswa =====================

const findMahasiswa = async (mahasiswaId) => {
  const mahasiswa = await Mahasiswa.findByPk(mahasiswaId, {
    attributes: ['id', 'nim', 'namaLengkap', 'tahunMasuk', 'statusMasuk', 'semesterDiakui', 'jumlahSemesterCuti', 'semesterOverride', 'statusKeluar'],
    include: [
      { model: Jurusan, as: 'jurusan', attributes: ['namaJurusan'], required: false },
      { model: TahunAjaran, as: 'tahunAjaran', attributes: ['jenisSemester'], required: false },
    ],
  });
  if (!mahasiswa) throw new ApiError(404, 'Mahasiswa tidak ditemukan');
  return mahasiswa;
};

/** Data form: identitas, semester berjalan & riwayat pengajuan cuti mahasiswa. */
const getFormCuti = async (mahasiswaId) => {
  const [mahasiswa, tahunAjaran, riwayat] = await Promise.all([
    findMahasiswa(mahasiswaId),
    TahunAjaran.findOne({ where: { isActive: true } }),
    PengajuanCuti.findAll({ where: { mahasiswaId }, include: [includeTahunAjaran], order: [['id', 'DESC']] }),
  ]);
  return {
    mahasiswa: { nim: mahasiswa.nim, namaLengkap: mahasiswa.namaLengkap, prodi: mahasiswa.jurusan?.namaJurusan ?? '-' },
    tahunAjaran: formatTahunAjaran(tahunAjaran),
    semesterBerjalan: tahunAjaran ? resolveSemesterMahasiswa(mahasiswa, tahunAjaran) : null,
    sedangCuti: mahasiswa.statusKeluar === 'CUTI',
    riwayat: riwayat.map(toPengajuan),
  };
};

const ajukanCuti = async (mahasiswaId, payload) => {
  const mahasiswa = await findMahasiswa(mahasiswaId);
  if (mahasiswa.statusKeluar === 'CUTI') throw new ApiError(400, 'Anda sedang berstatus cuti');
  if (mahasiswa.statusKeluar) throw new ApiError(400, 'Status mahasiswa tidak aktif, tidak dapat mengajukan cuti');
  if (String(payload.tanggalAkhir) < String(payload.tanggalAwal)) {
    throw new ApiError(400, 'Tanggal akhir cuti tidak boleh sebelum tanggal awal');
  }
  const menunggu = await PengajuanCuti.count({ where: { mahasiswaId, status: 'DIAJUKAN' } });
  if (menunggu) throw new ApiError(400, 'Masih ada pengajuan cuti yang menunggu persetujuan prodi');

  const tahunAjaran = await TahunAjaran.findOne({ where: { isActive: true } });
  const pengajuan = await PengajuanCuti.create({
    mahasiswaId,
    tahunAjaranId: tahunAjaran?.id ?? null,
    semester: payload.semester,
    tanggalAwal: payload.tanggalAwal,
    tanggalAkhir: payload.tanggalAkhir,
    tanggalAjuan: hariIni(),
    alasan: payload.alasan,
    status: 'DIAJUKAN',
  });
  return toPengajuan(await PengajuanCuti.findByPk(pengajuan.id, { include: [includeTahunAjaran] }));
};

/** Mahasiswa hanya bisa membatalkan pengajuan yang belum diproses prodi. */
const batalkanCuti = async (mahasiswaId, id) => {
  const pengajuan = await PengajuanCuti.findOne({ where: { id, mahasiswaId } });
  if (!pengajuan) throw new ApiError(404, 'Pengajuan cuti tidak ditemukan');
  if (pengajuan.status !== 'DIAJUKAN') throw new ApiError(400, 'Pengajuan yang sudah diproses prodi tidak dapat dibatalkan');
  await pengajuan.destroy();
};

const buildPdf = async (pengajuan) => {
  const [mahasiswa, kampus] = await Promise.all([
    Mahasiswa.findByPk(pengajuan.mahasiswaId, {
      attributes: ['id', 'nim', 'namaLengkap', 'noTelepon', 'alamat'],
      include: [{ model: Jurusan, as: 'jurusan', attributes: ['namaJurusan'], required: false }],
    }),
    getKampus(),
  ]);
  const data = { pengajuan, mahasiswa, jurusan: mahasiswa.jurusan, tahunAjaran: formatTahunAjaran(pengajuan.tahunAjaran) };
  return { doc: buildPengajuanCutiPdf(data, kampus), filename: pengajuanCutiPdfFilename(data) };
};

/** Cetak formulir; mahasiswaId diisi untuk portal mahasiswa supaya hanya bisa mencetak miliknya. */
const getPengajuanCutiPdf = async (id, mahasiswaId = null) => {
  const where = mahasiswaId ? { id, mahasiswaId } : { id };
  const pengajuan = await PengajuanCuti.findOne({ where, include: [includeTahunAjaran] });
  if (!pengajuan) throw new ApiError(404, 'Pengajuan cuti tidak ditemukan');
  return buildPdf(pengajuan);
};

// ===================== Prodi =====================

const listPengajuan = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.status) where.status = query.status;
  if (query.jurusanId) where['$mahasiswa.jurusan_id$'] = query.jurusanId;
  if (query.search) {
    const like = { [Op.like]: `%${query.search}%` };
    where[Op.and] = [{ [Op.or]: [{ '$mahasiswa.nim$': like }, { '$mahasiswa.nama_lengkap$': like }] }];
  }
  const { rows, count } = await PengajuanCuti.findAndCountAll({
    where,
    include: [
      includeTahunAjaran,
      {
        model: Mahasiswa,
        as: 'mahasiswa',
        attributes: ['id', 'nim', 'namaLengkap', 'jurusanId'],
        include: [{ model: Jurusan, as: 'jurusan', attributes: ['namaJurusan'], required: false }],
      },
      { model: User, as: 'verifikator', attributes: ['id', 'name'], required: false },
    ],
    limit,
    offset,
    distinct: true,
    subQuery: false,
    order: [['id', 'DESC']],
  });
  return {
    data: rows.map((r) => ({
      ...toPengajuan(r),
      mahasiswa: { id: r.mahasiswa.id, nim: r.mahasiswa.nim, namaLengkap: r.mahasiswa.namaLengkap, prodi: r.mahasiswa.jurusan?.namaJurusan ?? '-' },
      verifikator: r.verifikator?.name ?? null,
      diverifikasiAt: r.diverifikasiAt,
    })),
    meta: getPagingMeta(count, page, limit),
  };
};

/** Setujui → mahasiswa jadi CUTI; Tolak → wajib catatan. Hanya pengajuan berstatus DIAJUKAN. */
const verifikasiPengajuan = async (id, payload, actorId) => {
  const pengajuan = await PengajuanCuti.findByPk(id);
  if (!pengajuan) throw new ApiError(404, 'Pengajuan cuti tidak ditemukan');
  if (pengajuan.status !== 'DIAJUKAN') throw new ApiError(400, 'Pengajuan cuti sudah diproses');
  if (payload.status === 'DITOLAK' && !String(payload.catatanProdi ?? '').trim()) throw new ApiError(400, 'Isi alasan penolakan');

  await sequelize.transaction(async (transaction) => {
    if (payload.status === 'DISETUJUI') {
      const mahasiswa = await Mahasiswa.findByPk(pengajuan.mahasiswaId, { transaction });
      if (mahasiswa.statusKeluar && mahasiswa.statusKeluar !== 'CUTI') {
        throw new ApiError(400, 'Mahasiswa sudah tidak aktif, pengajuan cuti tidak dapat disetujui');
      }
      await mahasiswa.update(
        { statusKeluar: 'CUTI', tanggalKeluar: pengajuan.tanggalAjuan, alasanKeluar: pengajuan.alasan },
        { transaction }
      );
    }
    await pengajuan.update(
      { status: payload.status, catatanProdi: payload.catatanProdi || null, diverifikasiOleh: actorId, diverifikasiAt: new Date() },
      { transaction }
    );
  });
  return toPengajuan(await PengajuanCuti.findByPk(id, { include: [includeTahunAjaran] }));
};

module.exports = { getFormCuti, ajukanCuti, batalkanCuti, getPengajuanCutiPdf, listPengajuan, verifikasiPengajuan };
