const { Op } = require('sequelize');
const { Yudisium, Mahasiswa, MahasiswaBiodata, Jurusan, Dosen, NilaiMahasiswa } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');
const { GRADE_BOBOT } = require('../utils/gradeScale');
const { predikatKelulusan } = require('../utils/predikat');

const includeRelations = [
  {
    model: Mahasiswa,
    as: 'mahasiswa',
    include: [
      { model: Jurusan, as: 'jurusan' },
      { model: MahasiswaBiodata, as: 'biodata' },
    ],
  },
  { model: Dosen, as: 'pembimbing1' },
  { model: Dosen, as: 'pembimbing2' },
];

const SORTABLE_COLUMNS = {
  noSk: ['noSk'],
  tanggalSk: ['tanggalSk'],
  tanggalYudisium: ['tanggalYudisium'],
  pin: ['pin'],
  mahasiswa: [{ model: Mahasiswa, as: 'mahasiswa' }, 'namaLengkap'],
};

/**
 * IPK & predikat kelulusan (Pedoman Akademik Bab II.K.2.f) dihitung on-the-fly dari seluruh
 * NilaiMahasiswa mahasiswa ybs, BUKAN kolom tersimpan — supaya selalu mencerminkan nilai
 * terbaru dan tidak butuh proses "hitung ulang" terpisah tiap ada koreksi nilai.
 */
const withIpkPredikat = async (item) => {
  if (!item) return item;
  const nilaiList = await NilaiMahasiswa.findAll({
    where: { mahasiswaId: item.mahasiswaId },
    attributes: ['sks', 'grade'],
    raw: true,
  });
  const totalSks = nilaiList.reduce((sum, n) => sum + n.sks, 0);
  const totalMutu = nilaiList.reduce((sum, n) => sum + (GRADE_BOBOT[n.grade] ?? 0) * n.sks, 0);
  const ipk = totalSks > 0 ? Math.round((totalMutu / totalSks) * 100) / 100 : 0;

  const plain = item.toJSON ? item.toJSON() : item;
  return { ...plain, ipk, predikat: predikatKelulusan(ipk) };
};

const listYudisium = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};

  const mahasiswaWhere = {};
  if (query.jurusanId) {
    mahasiswaWhere.jurusanId = query.jurusanId;
  }
  if (query.search) {
    mahasiswaWhere[Op.or] = [
      { nim: { [Op.like]: `%${query.search}%` } },
      { namaLengkap: { [Op.like]: `%${query.search}%` } },
    ];
  }

  const include = [
    {
      model: Mahasiswa,
      as: 'mahasiswa',
      where: Object.keys(mahasiswaWhere).length ? mahasiswaWhere : undefined,
      include: [
        { model: Jurusan, as: 'jurusan' },
        { model: MahasiswaBiodata, as: 'biodata' },
      ],
    },
    { model: Dosen, as: 'pembimbing1' },
    { model: Dosen, as: 'pembimbing2' },
  ];

  const { rows, count } = await Yudisium.findAndCountAll({
    where,
    include,
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS, [['id', 'ASC']]),
    subQuery: false,
    distinct: true,
  });

  const data = await Promise.all(rows.map(withIpkPredikat));
  return { data, meta: getPagingMeta(count, page, limit) };
};

const getYudisiumById = async (id) => {
  const item = await Yudisium.findByPk(id, { include: includeRelations });
  if (!item) throw new ApiError(404, 'Yudisium not found');
  return withIpkPredikat(item);
};

const updateYudisium = async (id, payload, actorId) => {
  const item = await getYudisiumById(id);
  await item.update({ ...payload, updatedBy: actorId });
  return getYudisiumById(id);
};

module.exports = { listYudisium, getYudisiumById, updateYudisium };
