const { Op, fn, col, literal } = require('sequelize');
const { JadwalKuliah, Dosen, KrsDetail, NilaiMahasiswa, Krs, Mahasiswa } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');

const SORTABLE_COLUMNS = {
  kelas: ['kelas'],
  kodeMataKuliah: ['kodeMataKuliah'],
  namaMataKuliah: ['namaMataKuliah'],
};

/**
 * Nilai belum punya kunci relasi ke jadwal kuliah tertentu (nilai_mahasiswa hanya menyimpan
 * `kode_mata_kuliah` sebagai teks bebas, tanpa jadwal_kuliah_id) — jadi Jml UTS/Jml UAS di sini
 * hanya bisa dicocokkan lewat kode MK (ambigu kalau satu kode dipakai di beberapa kelas
 * sekaligus), berbeda dengan Jml FRS yang sudah akurat lewat KrsDetail.jadwalKuliahId.
 */
const listNilaiPerkelas = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.search) {
    where[Op.or] = [
      { kelas: { [Op.like]: `%${query.search}%` } },
      { kodeMataKuliah: { [Op.like]: `%${query.search}%` } },
      { namaMataKuliah: { [Op.like]: `%${query.search}%` } },
    ];
  }
  if (query.kelas) where.kelas = query.kelas;

  const { rows, count } = await JadwalKuliah.findAndCountAll({
    where,
    include: [{ model: Dosen, as: 'dosenKordinator', attributes: ['id', 'namaLengkap'] }],
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS, [['kelas', 'ASC']]),
    subQuery: false,
    distinct: true,
  });

  const jadwalIds = rows.map((r) => r.id);
  const kodeMkList = [...new Set(rows.map((r) => r.kodeMataKuliah))];

  const [frsRows, nilaiRows] = await Promise.all([
    jadwalIds.length
      ? KrsDetail.findAll({
          attributes: ['jadwalKuliahId', [fn('COUNT', col('id')), 'total']],
          where: { jadwalKuliahId: { [Op.in]: jadwalIds } },
          group: ['jadwalKuliahId'],
          raw: true,
        })
      : [],
    kodeMkList.length
      ? NilaiMahasiswa.findAll({
          attributes: [
            'kodeMataKuliah',
            [fn('SUM', literal('CASE WHEN uts > 0 THEN 1 ELSE 0 END')), 'jmlUts'],
            [fn('SUM', literal('CASE WHEN uas > 0 THEN 1 ELSE 0 END')), 'jmlUas'],
          ],
          where: { kodeMataKuliah: { [Op.in]: kodeMkList } },
          group: ['kodeMataKuliah'],
          raw: true,
        })
      : [],
  ]);

  const frsMap = new Map(frsRows.map((r) => [r.jadwalKuliahId, Number(r.total)]));
  const nilaiMap = new Map(nilaiRows.map((r) => [r.kodeMataKuliah, { jmlUts: Number(r.jmlUts), jmlUas: Number(r.jmlUas) }]));

  const data = rows.map((row) => ({
    id: row.id,
    kelas: row.kelas,
    kodeMataKuliah: row.kodeMataKuliah,
    namaMataKuliah: row.namaMataKuliah,
    dosen: row.dosenKordinator?.namaLengkap ?? null,
    jmlFrs: frsMap.get(row.id) ?? 0,
    jmlUts: nilaiMap.get(row.kodeMataKuliah)?.jmlUts ?? 0,
    jmlUas: nilaiMap.get(row.kodeMataKuliah)?.jmlUas ?? 0,
  }));

  return { data, meta: getPagingMeta(count, page, limit) };
};

const getNilaiPerkelasDetail = async (jadwalKuliahId) => {
  const jadwal = await JadwalKuliah.findByPk(jadwalKuliahId, {
    include: [{ model: Dosen, as: 'dosenKordinator', attributes: ['id', 'namaLengkap'] }],
  });
  if (!jadwal) throw new ApiError(404, 'Jadwal kuliah not found');

  const krsDetailRows = await KrsDetail.findAll({
    where: { jadwalKuliahId },
    include: [{ model: Krs, as: 'krs', include: [{ model: Mahasiswa, as: 'mahasiswa', attributes: ['id', 'nim', 'namaLengkap'] }] }],
  });

  const mahasiswaIds = krsDetailRows.map((kd) => kd.krs?.mahasiswa?.id).filter(Boolean);
  const nilaiRows = mahasiswaIds.length
    ? await NilaiMahasiswa.findAll({
        where: { mahasiswaId: { [Op.in]: mahasiswaIds }, kodeMataKuliah: jadwal.kodeMataKuliah },
        raw: true,
      })
    : [];
  const nilaiByMahasiswa = new Map(nilaiRows.map((n) => [n.mahasiswaId, n]));

  const roster = krsDetailRows
    .map((kd) => kd.krs?.mahasiswa)
    .filter(Boolean)
    .map((m) => {
      const nilai = nilaiByMahasiswa.get(m.id);
      return {
        mahasiswaId: m.id,
        nim: m.nim,
        namaLengkap: m.namaLengkap,
        uts: nilai ? Number(nilai.uts) : null,
        uas: nilai ? Number(nilai.uas) : null,
        nilaiAkhir: nilai ? Number(nilai.nilai) : null,
        grade: nilai ? nilai.grade : null,
      };
    });

  return {
    jadwal: {
      id: jadwal.id,
      kelas: jadwal.kelas,
      kodeMataKuliah: jadwal.kodeMataKuliah,
      namaMataKuliah: jadwal.namaMataKuliah,
      dosen: jadwal.dosenKordinator?.namaLengkap ?? null,
    },
    roster,
  };
};

const getKelasOptions = async () => {
  const rows = await JadwalKuliah.findAll({ attributes: ['kelas'], group: ['kelas'], order: [['kelas', 'ASC']], raw: true });
  return rows.map((r) => r.kelas);
};

module.exports = { listNilaiPerkelas, getNilaiPerkelasDetail, getKelasOptions };
