const { Op } = require('sequelize');
const { sequelize, MataKuliah, Kurikulum, Jurusan, TahunAjaran, MatakuliahAktif, JadwalKuliah } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * Matakuliah Aktif: prodi membuka mata kuliah (milik kurikulum) untuk satu tahun akademik (TahunAjaran =
 * satu periode ganjil/genap) pada semester tertentu ("Aktif Semester"). Mata kuliah dari beberapa
 * kurikulum (mis. 2023 & 2026) boleh aktif bersamaan karena aktivasi disimpan per mata kuliah.
 * Hanya mata kuliah aktif yang muncul di pilihan mata kuliah saat BAAK menambah jadwal.
 */

const assertTahunAjaran = async (tahunAjaranId) => {
  const tahunAjaran = await TahunAjaran.findByPk(tahunAjaranId);
  if (!tahunAjaran) throw new ApiError(404, 'Tahun akademik tidak ditemukan');
  return tahunAjaran;
};

const includeKurikulum = (where) => ({
  model: Kurikulum,
  as: 'kurikulum',
  attributes: ['id', 'nama', 'jurusanId', 'tahunKurikulum'],
  required: true,
  ...(where ? { where } : {}),
  include: [{ model: Jurusan, as: 'jurusan', attributes: ['id', 'namaJurusan'], required: false }],
});

/**
 * Daftar mata kuliah (filter kurikulumId / prodi / tahun kurikulum / semester kurikulum) beserta status
 * aktifnya pada tahun akademik + aktif semester terpilih. Tanpa aktifSemester, `aktif` = aktif di
 * semester mana pun pada tahun akademik tsb. `status` = 'aktif' | 'nonaktif' menyaring hasil.
 */
const listMatakuliahAktif = async (query) => {
  const tahunAjaranId = Number(query.tahunAjaranId);
  if (!tahunAjaranId) throw new ApiError(400, 'Pilih tahun akademik');
  await assertTahunAjaran(tahunAjaranId);
  const aktifSemester = Number(query.aktifSemester) || null;

  const where = {};
  if (query.kurikulumId) where.kurikulumId = Number(query.kurikulumId);
  if (query.semester) where.semester = Number(query.semester);
  if (query.search) {
    where[Op.or] = [{ kode: { [Op.like]: `%${query.search}%` } }, { mataKuliah: { [Op.like]: `%${query.search}%` } }];
  }
  const whereKur = {};
  if (query.jurusanId) whereKur.jurusanId = query.jurusanId;
  if (query.tahunKurikulum) whereKur.tahunKurikulum = Number(query.tahunKurikulum);

  const [mkList, aktifRows, jadwalRows] = await Promise.all([
    MataKuliah.findAll({
      where,
      include: [includeKurikulum(Object.keys(whereKur).length ? whereKur : null)],
      order: [
        [{ model: Kurikulum, as: 'kurikulum' }, 'tahunKurikulum', 'DESC'],
        ['semester', 'ASC'],
        ['kode', 'ASC'],
      ],
    }),
    MatakuliahAktif.findAll({ where: { tahunAjaranId }, attributes: ['mataKuliahId', 'semester'], raw: true }),
    JadwalKuliah.findAll({
      where: { tahunAjaranId, mataKuliahId: { [Op.ne]: null }, ...(aktifSemester ? { semester: aktifSemester } : {}) },
      attributes: ['mataKuliahId', [sequelize.fn('COUNT', sequelize.col('id')), 'total']],
      group: ['mataKuliahId'],
      raw: true,
    }),
  ]);
  const semestersByMk = new Map();
  aktifRows.forEach((r) => {
    const list = semestersByMk.get(r.mataKuliahId) ?? [];
    list.push(r.semester);
    semestersByMk.set(r.mataKuliahId, list);
  });
  const jadwalCount = new Map(jadwalRows.map((r) => [r.mataKuliahId, Number(r.total)]));

  let rows = mkList.map((m) => {
    const aktifSemesters = (semestersByMk.get(m.id) ?? []).sort((a, b) => a - b);
    return {
      id: m.id,
      kode: m.kode,
      mataKuliah: m.mataKuliah,
      kurikulumId: m.kurikulumId,
      kurikulum: m.kurikulum?.nama ?? null,
      jurusanId: m.kurikulum?.jurusanId ?? null,
      prodi: m.kurikulum?.jurusan?.namaJurusan ?? null,
      tahunKurikulum: m.kurikulum?.tahunKurikulum ?? null,
      semester: m.semester,
      sksTeori: m.sksTeori,
      sksPraktek: m.sksPraktek,
      sksLab: m.sksLab,
      sksSimulasi: m.sksSimulasi,
      sksTotal: m.sksTotal,
      aktifSemesters,
      aktif: aktifSemester ? aktifSemesters.includes(aktifSemester) : aktifSemesters.length > 0,
      jumlahJadwal: jadwalCount.get(m.id) ?? 0,
    };
  });
  if (query.status === 'aktif') rows = rows.filter((r) => r.aktif);
  if (query.status === 'nonaktif') rows = rows.filter((r) => !r.aktif);

  // Ringkasan tahun kurikulum yang berjalan di tahun akademik ini (dihitung tanpa filter tabel).
  const ringkasan = await sequelize.query(
    `SELECT k.tahun_kurikulum AS tahunKurikulum, COUNT(DISTINCT ma.mata_kuliah_id) AS jumlah,
            GROUP_CONCAT(DISTINCT ma.semester ORDER BY ma.semester) AS semesters
       FROM matakuliah_aktif ma
       JOIN mata_kuliah m ON m.id = ma.mata_kuliah_id AND m.is_delete = 0
       JOIN kurikulum k ON k.id = m.kurikulum_id AND k.is_delete = 0
      WHERE ma.tahun_ajaran_id = :tahunAjaranId
      GROUP BY k.tahun_kurikulum
      ORDER BY k.tahun_kurikulum DESC`,
    { replacements: { tahunAjaranId }, type: sequelize.QueryTypes.SELECT }
  );

  return {
    rows,
    ringkasan: ringkasan.map((r) => ({
      tahunKurikulum: r.tahunKurikulum,
      jumlah: Number(r.jumlah),
      semesters: String(r.semesters ?? '')
        .split(',')
        .filter(Boolean)
        .map(Number),
    })),
  };
};

/** Aktifkan / nonaktifkan sekumpulan mata kuliah pada satu tahun akademik + aktif semester. */
const setMatakuliahAktif = async ({ tahunAjaranId, semester, mataKuliahIds, aktif }, actorId) => {
  await assertTahunAjaran(tahunAjaranId);
  const ids = [...new Set(mataKuliahIds)];
  const found = await MataKuliah.count({ where: { id: { [Op.in]: ids } } });
  if (found !== ids.length) throw new ApiError(400, 'Sebagian mata kuliah tidak ditemukan');
  const scope = { tahunAjaranId, semester, mataKuliahId: { [Op.in]: ids } };

  if (aktif) {
    const existing = await MatakuliahAktif.findAll({ where: scope, attributes: ['mataKuliahId'], raw: true });
    const existingIds = new Set(existing.map((r) => r.mataKuliahId));
    const baru = ids.filter((id) => !existingIds.has(id));
    if (baru.length) {
      await MatakuliahAktif.bulkCreate(baru.map((mataKuliahId) => ({ tahunAjaranId, semester, mataKuliahId, createdBy: actorId })));
    }
    return { changed: baru.length };
  }

  // Mata kuliah yang sudah punya jadwal di tahun akademik + semester ini tidak bisa dinonaktifkan.
  const terjadwal = await JadwalKuliah.findAll({ where: scope, attributes: ['kodeMataKuliah'], group: ['kodeMataKuliah'], raw: true });
  if (terjadwal.length) {
    throw new ApiError(409, `Mata kuliah sudah dijadwalkan dan tidak bisa dinonaktifkan: ${terjadwal.map((j) => j.kodeMataKuliah).join(', ')}`);
  }
  const changed = await MatakuliahAktif.destroy({ where: scope });
  return { changed };
};

/**
 * Pilihan mata kuliah untuk form jadwal kuliah: hanya yang aktif pada tahun akademik tsb. Satu
 * opsi = satu aktivasi (mata kuliah + aktif semester), jadi `id` opsi = id baris matakuliah_aktif.
 */
const getJadwalOptions = async (tahunAjaranId) => {
  if (!tahunAjaranId) return [];
  const rows = await MatakuliahAktif.findAll({
    where: { tahunAjaranId },
    include: [{ model: MataKuliah, as: 'mataKuliah', required: true, include: [includeKurikulum()] }],
  });
  return rows
    .map(({ id, semester, mataKuliah: m }) => ({
      id,
      mataKuliahId: m.id,
      semester,
      semesterKurikulum: m.semester,
      kode: m.kode,
      mataKuliah: m.mataKuliah,
      kurikulum: m.kurikulum?.nama ?? null,
      prodi: m.kurikulum?.jurusan?.namaJurusan ?? null,
      tahunKurikulum: m.kurikulum?.tahunKurikulum ?? null,
      sksTeori: m.sksTeori,
      sksPraktek: m.sksPraktek,
      sksLab: m.sksLab,
      sksTotal: m.sksTotal,
    }))
    .sort((a, b) => a.semester - b.semester || (b.tahunKurikulum ?? 0) - (a.tahunKurikulum ?? 0) || a.kode.localeCompare(b.kode));
};

/** Dipakai jadwal kuliah: pastikan mata kuliah aktif di tahun akademik + semester jadwal. */
const assertAktif = async (mataKuliahId, tahunAjaranId, semester) => {
  const aktif = await MatakuliahAktif.findOne({ where: { mataKuliahId, tahunAjaranId, semester } });
  if (!aktif) {
    throw new ApiError(
      400,
      `Mata kuliah belum diaktifkan di menu Matakuliah Aktif untuk tahun akademik ini${semester ? ` (semester ${semester})` : ''}`
    );
  }
  return MataKuliah.findByPk(mataKuliahId);
};

module.exports = { listMatakuliahAktif, setMatakuliahAktif, getJadwalOptions, assertAktif };
