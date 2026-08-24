const { Op, fn, col } = require('sequelize');
const { JadwalKuliah, Dosen, KehadiranDosen } = require('../models');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');

const HARI_LABEL = {
  SENIN: 'Senin',
  SELASA: 'Selasa',
  RABU: 'Rabu',
  KAMIS: 'Kamis',
  JUMAT: 'Jumat',
  SABTU: 'Sabtu',
};

const SORTABLE_COLUMNS = {
  kelas: ['kelas'],
  kodeMataKuliah: ['kodeMataKuliah'],
  namaMataKuliah: ['namaMataKuliah'],
  jam: ['jam'],
  ruangan: ['ruangan'],
};

const formatHariJam = (jadwal) => {
  const hariLabel = (jadwal.hari ?? []).map((h) => HARI_LABEL[h] ?? h).join(', ');
  const jamLabel = jadwal.jam ? `Jam ke-${jadwal.jam}` : null;
  return [hariLabel, jamLabel].filter(Boolean).join(' / ') || '-';
};

const listRealisasi = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = { isActive: true };
  if (query.kelas) where.kelas = query.kelas;
  if (query.search) {
    where[Op.or] = [
      { kelas: { [Op.like]: `%${query.search}%` } },
      { kodeMataKuliah: { [Op.like]: `%${query.search}%` } },
      { namaMataKuliah: { [Op.like]: `%${query.search}%` } },
    ];
  }

  const { rows, count } = await JadwalKuliah.findAndCountAll({
    where,
    include: [{ model: Dosen, as: 'dosenKordinator' }],
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS, [['kelas', 'ASC']]),
    subQuery: false,
    distinct: true,
  });

  const jadwalIds = rows.map((row) => row.id);
  const realisasiCounts = jadwalIds.length
    ? await KehadiranDosen.findAll({
        attributes: ['jadwalKuliahId', [fn('COUNT', col('id')), 'total']],
        where: { jadwalKuliahId: { [Op.in]: jadwalIds }, status: 'HADIR' },
        group: ['jadwalKuliahId'],
        raw: true,
      })
    : [];
  const countMap = new Map(realisasiCounts.map((row) => [row.jadwalKuliahId, Number(row.total)]));

  const data = rows.map((row) => ({
    id: row.id,
    hariJam: formatHariJam(row),
    kelas: row.kelas,
    kodeMataKuliah: row.kodeMataKuliah,
    namaMataKuliah: row.namaMataKuliah,
    dosen: row.dosenKordinator?.namaLengkap ?? null,
    jam: row.jam,
    ruangan: row.ruangan,
    realisasi: countMap.get(row.id) ?? 0,
  }));

  return { data, meta: getPagingMeta(count, page, limit) };
};

const getKelasOptions = async () => {
  const rows = await JadwalKuliah.findAll({
    attributes: ['kelas'],
    where: { isActive: true },
    group: ['kelas'],
    order: [['kelas', 'ASC']],
    raw: true,
  });
  return rows.map((row) => row.kelas);
};

module.exports = { listRealisasi, getKelasOptions };
