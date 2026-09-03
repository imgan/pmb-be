const { Op } = require('sequelize');
const { PembayaranKuliah, TagihanKuliah, Mahasiswa, Jurusan } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { postJurnal, getAkunByKode } = require('./jurnal.service');

const includeRelations = [
  {
    model: TagihanKuliah,
    as: 'tagihan',
    include: [{ model: Mahasiswa, as: 'mahasiswa', include: [{ model: Jurusan, as: 'jurusan' }] }],
  },
];

const listPembayaranKuliah = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.tagihanKuliahId) where.tagihanKuliahId = query.tagihanKuliahId;

  const mahasiswaWhere = {};
  if (query.search) {
    mahasiswaWhere[Op.or] = [
      { nim: { [Op.like]: `%${query.search}%` } },
      { namaLengkap: { [Op.like]: `%${query.search}%` } },
    ];
  }

  const { rows, count } = await PembayaranKuliah.findAndCountAll({
    where,
    include: [
      {
        model: TagihanKuliah,
        as: 'tagihan',
        required: true,
        include: [
          {
            model: Mahasiswa,
            as: 'mahasiswa',
            required: true,
            where: Object.keys(mahasiswaWhere).length ? mahasiswaWhere : undefined,
            include: [{ model: Jurusan, as: 'jurusan' }],
          },
        ],
      },
    ],
    limit,
    offset,
    order: [['tanggalBayar', 'DESC'], ['id', 'DESC']],
    subQuery: false,
    distinct: true,
  });

  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

const createPembayaranKuliah = async (payload, actorId) => {
  const tagihan = await TagihanKuliah.findByPk(payload.tagihanKuliahId);
  if (!tagihan) throw new ApiError(404, 'Tagihan kuliah tidak ditemukan');

  const pembayaran = await PembayaranKuliah.create({ ...payload, createdBy: actorId, updatedBy: actorId });

  const akunKas = await getAkunByKode('1-1001');
  const akunPendapatan = await getAkunByKode('4-1001');
  await postJurnal({
    tanggal: payload.tanggalBayar,
    noBukti: payload.noBukti,
    keterangan: `Pembayaran kuliah - tagihan #${tagihan.id}`,
    referensiTipe: 'PEMBAYARAN_KULIAH',
    referensiId: pembayaran.id,
    createdBy: actorId,
    lines: [
      { akunId: akunKas.id, debit: payload.nominal, kredit: 0 },
      { akunId: akunPendapatan.id, debit: 0, kredit: payload.nominal },
    ],
  });

  return PembayaranKuliah.findByPk(pembayaran.id, { include: includeRelations });
};

const deletePembayaranKuliah = async (id) => {
  const pembayaran = await PembayaranKuliah.findByPk(id);
  if (!pembayaran) throw new ApiError(404, 'Pembayaran kuliah tidak ditemukan');
  await pembayaran.destroy();
};

module.exports = { listPembayaranKuliah, createPembayaranKuliah, deletePembayaranKuliah };
