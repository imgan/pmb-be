const { Op } = require('sequelize');
const {
  JadwalKuliah,
  KehadiranDosen,
  KehadiranMahasiswa,
  MataKuliah,
  KrsDetail,
  Krs,
  Mahasiswa,
  Dosen,
} = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');

// Semua query di service ini WAJIB discope ke dosenId milik dosen yang sedang login
// (req.dosen.id, diisi oleh dosenAuth.middleware.js) — dosen tidak boleh melihat/mengubah
// data dosen lain, dan itu tidak boleh cuma mengandalkan parameter dari client.

/**
 * JadwalKuliah yang diampu dosen: sebagai dosenKordinator ATAU sebagai salah satu dosenPengampu.
 */
const findJadwalKuliahIdsForDosen = async (dosenId) => {
  const rows = await JadwalKuliah.findAll({
    attributes: ['id'],
    where: {
      [Op.or]: [{ dosenKordinatorId: dosenId }, { '$dosenPengampu.id$': dosenId }],
    },
    include: [{ model: Dosen, as: 'dosenPengampu', attributes: [], through: { attributes: [] }, required: false }],
    subQuery: false,
  });
  return [...new Set(rows.map((r) => r.id))];
};

const listJadwalKuliahForDosen = async (dosenId) => {
  const ids = await findJadwalKuliahIdsForDosen(dosenId);
  if (!ids.length) return [];
  return JadwalKuliah.findAll({
    where: { id: ids },
    include: [{ model: MataKuliah, as: 'mataKuliah' }],
    order: [['namaMataKuliah', 'ASC']],
  });
};

const ensureJadwalOwnedByDosen = async (jadwalKuliahId, dosenId) => {
  const ids = await findJadwalKuliahIdsForDosen(dosenId);
  if (!ids.includes(Number(jadwalKuliahId))) {
    throw new ApiError(403, 'Anda tidak mengampu jadwal kuliah ini');
  }
};

const SORTABLE_COLUMNS = {
  tanggalRealisasi: ['tanggalRealisasi'],
  status: ['status'],
};

const listRealisasiMengajar = async (dosenId, query) => {
  const { page, limit, offset } = getPagination(query);
  const jadwalIds = await findJadwalKuliahIdsForDosen(dosenId);

  const where = { dosenId };
  if (query.jadwalKuliahId) {
    await ensureJadwalOwnedByDosen(query.jadwalKuliahId, dosenId);
    where.jadwalKuliahId = query.jadwalKuliahId;
  } else {
    where.jadwalKuliahId = jadwalIds.length ? jadwalIds : [0];
  }

  const { rows, count } = await KehadiranDosen.findAndCountAll({
    where,
    include: [{ model: JadwalKuliah, as: 'jadwalKuliah', include: [{ model: MataKuliah, as: 'mataKuliah' }] }],
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS, [['tanggalRealisasi', 'DESC'], ['id', 'DESC']]),
    subQuery: false,
    distinct: true,
  });

  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

const createRealisasiMengajar = async (dosenId, payload) => {
  await ensureJadwalOwnedByDosen(payload.jadwalKuliahId, dosenId);

  const item = await KehadiranDosen.create({
    jadwalKuliahId: payload.jadwalKuliahId,
    dosenId,
    tanggalRealisasi: payload.tanggalRealisasi,
    jamMasuk: payload.jamMasuk,
    jamKeluar: payload.jamKeluar,
    pertemuanKe: payload.pertemuanKe,
    status: payload.status,
    keterangan: payload.keterangan || null,
    createdBy: null,
    updatedBy: null,
  });

  return KehadiranDosen.findByPk(item.id, {
    include: [{ model: JadwalKuliah, as: 'jadwalKuliah', include: [{ model: MataKuliah, as: 'mataKuliah' }] }],
  });
};

const deleteRealisasiMengajar = async (dosenId, id) => {
  const item = await KehadiranDosen.findOne({ where: { id, dosenId } });
  if (!item) throw new ApiError(404, 'Realisasi mengajar not found');
  await item.update({ isDelete: true });
};

const ensureRealisasiOwnedByDosen = async (id, dosenId) => {
  const realisasi = await KehadiranDosen.findOne({ where: { id, dosenId } });
  if (!realisasi) throw new ApiError(404, 'Realisasi mengajar not found');
  return realisasi;
};

/**
 * Roster mahasiswa (KRS DISETUJUI) untuk jadwalKuliah dari satu realisasi mengajar,
 * digabung dengan presensi yang sudah pernah diisi dosen untuk realisasi tersebut (kalau ada).
 */
const getPresensiMahasiswa = async (dosenId, kehadiranDosenId) => {
  const realisasi = await ensureRealisasiOwnedByDosen(kehadiranDosenId, dosenId);

  const [roster, existing] = await Promise.all([
    KrsDetail.findAll({
      where: { jadwalKuliahId: realisasi.jadwalKuliahId },
      include: [
        {
          model: Krs,
          as: 'krs',
          required: true,
          where: { status: 'DISETUJUI' },
          include: [{ model: Mahasiswa, as: 'mahasiswa', required: true }],
        },
      ],
      order: [[{ model: Krs, as: 'krs' }, { model: Mahasiswa, as: 'mahasiswa' }, 'namaLengkap', 'ASC']],
    }),
    KehadiranMahasiswa.findAll({ where: { kehadiranDosenId } }),
  ]);

  const existingByMahasiswaId = new Map(existing.map((e) => [e.mahasiswaId, e]));

  return roster.map((r) => {
    const mahasiswa = r.krs.mahasiswa;
    const presensi = existingByMahasiswaId.get(mahasiswa.id);
    return {
      mahasiswaId: mahasiswa.id,
      nim: mahasiswa.nim,
      namaLengkap: mahasiswa.namaLengkap,
      status: presensi?.status ?? null,
      keterangan: presensi?.keterangan ?? null,
    };
  });
};

/**
 * Simpan (upsert) presensi mahasiswa untuk satu realisasi mengajar. Hanya mahasiswa yang
 * benar-benar terdaftar (KRS DISETUJUI) pada jadwalKuliah realisasi ini yang boleh diisi —
 * dicek terhadap roster, tidak boleh cuma mengandalkan mahasiswaId dari client.
 */
const savePresensiMahasiswa = async (dosenId, kehadiranDosenId, items) => {
  const realisasi = await ensureRealisasiOwnedByDosen(kehadiranDosenId, dosenId);

  const rosterRows = await KrsDetail.findAll({
    where: { jadwalKuliahId: realisasi.jadwalKuliahId },
    include: [{ model: Krs, as: 'krs', required: true, where: { status: 'DISETUJUI' } }],
  });
  const rosterMahasiswaIds = new Set(rosterRows.map((r) => r.krs.mahasiswaId));

  const invalid = items.find((item) => !rosterMahasiswaIds.has(item.mahasiswaId));
  if (invalid) {
    throw new ApiError(400, `Mahasiswa id ${invalid.mahasiswaId} tidak terdaftar (KRS disetujui) pada kelas ini`);
  }

  await Promise.all(
    items.map(async (item) => {
      const [row] = await KehadiranMahasiswa.findOrCreate({
        where: { kehadiranDosenId, mahasiswaId: item.mahasiswaId },
        defaults: {
          status: item.status,
          keterangan: item.keterangan || null,
          createdBy: null,
          updatedBy: null,
        },
      });
      await row.update({ status: item.status, keterangan: item.keterangan || null, updatedBy: null });
    })
  );

  return getPresensiMahasiswa(dosenId, kehadiranDosenId);
};

const listRekapMahasiswa = async (dosenId, query) => {
  if (!query.jadwalKuliahId) throw new ApiError(400, 'jadwalKuliahId wajib diisi');
  await ensureJadwalOwnedByDosen(query.jadwalKuliahId, dosenId);

  const { page, limit, offset } = getPagination(query);
  const mahasiswaWhere = {};
  if (query.search) {
    mahasiswaWhere[Op.or] = [
      { nim: { [Op.like]: `%${query.search}%` } },
      { namaLengkap: { [Op.like]: `%${query.search}%` } },
    ];
  }

  const { rows, count } = await KrsDetail.findAndCountAll({
    where: { jadwalKuliahId: query.jadwalKuliahId },
    include: [
      {
        model: Krs,
        as: 'krs',
        required: true,
        include: [{ model: Mahasiswa, as: 'mahasiswa', required: true, where: mahasiswaWhere }],
      },
    ],
    limit,
    offset,
    order: [['id', 'ASC']],
    subQuery: false,
    distinct: true,
  });

  const data = rows.map((r) => ({
    id: r.id,
    nim: r.krs?.mahasiswa?.nim ?? null,
    namaLengkap: r.krs?.mahasiswa?.namaLengkap ?? null,
  }));

  return { data, meta: getPagingMeta(count, page, limit) };
};

const listSilabusMataKuliah = async (dosenId) => {
  const jadwalList = await listJadwalKuliahForDosen(dosenId);
  const byMataKuliahId = new Map();
  jadwalList.forEach((j) => {
    const mk = j.mataKuliah;
    const key = mk?.id ?? j.kodeMataKuliah;
    if (!byMataKuliahId.has(key)) {
      byMataKuliahId.set(key, {
        kodeMk: mk?.kodeMk ?? j.kodeMataKuliah,
        namaMk: mk?.namaMk ?? j.namaMataKuliah,
        sks: mk?.sks ?? j.sks ?? null,
        silabus: mk?.silabus ?? null,
      });
    }
  });
  return [...byMataKuliahId.values()];
};

module.exports = {
  listJadwalKuliahForDosen,
  listRealisasiMengajar,
  createRealisasiMengajar,
  deleteRealisasiMengajar,
  getPresensiMahasiswa,
  savePresensiMahasiswa,
  listRekapMahasiswa,
  listSilabusMataKuliah,
};
