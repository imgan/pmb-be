const { PembayaranWisuda, Mahasiswa } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');
const { postJurnal, getAkunByKode } = require('./jurnal.service');

const SORTABLE_COLUMNS = {
  tanggalBayar: ['tanggalBayar'],
  noBukti: ['noBukti'],
  bayar: ['bayar'],
};

const listPembayaranWisuda = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.mahasiswaId) where.mahasiswaId = query.mahasiswaId;

  const { rows, count } = await PembayaranWisuda.findAndCountAll({
    where,
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS, [['id', 'DESC']]),
  });
  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

const getPembayaranWisudaById = async (id) => {
  const item = await PembayaranWisuda.findByPk(id);
  if (!item) throw new ApiError(404, 'Data pembayaran wisuda tidak ditemukan');
  return item;
};

const resolveMahasiswaId = async (nim) => {
  const mahasiswa = await Mahasiswa.findOne({ where: { nim } });
  if (!mahasiswa) throw new ApiError(404, `Mahasiswa dengan NIM "${nim}" tidak ditemukan`);
  return mahasiswa.id;
};

const createPembayaranWisuda = async (payload, actorId) => {
  const { nim, ...rest } = payload;
  const mahasiswaId = await resolveMahasiswaId(nim);
  const item = await PembayaranWisuda.create({ ...rest, mahasiswaId, createdBy: actorId, updatedBy: actorId });

  const akunKas = await getAkunByKode('1-1001');
  const akunPendapatan = await getAkunByKode('4-1003');
  await postJurnal({
    tanggal: payload.tanggalBayar,
    noBukti: payload.noBukti,
    keterangan: `Pembayaran wisuda - ${nim}`,
    referensiTipe: 'PEMBAYARAN_WISUDA',
    referensiId: item.id,
    createdBy: actorId,
    lines: [
      { akunId: akunKas.id, debit: payload.bayar, kredit: 0 },
      { akunId: akunPendapatan.id, debit: 0, kredit: payload.bayar },
    ],
  });

  return item;
};

const deletePembayaranWisuda = async (id) => {
  const item = await getPembayaranWisudaById(id);
  await item.destroy();
};

module.exports = {
  listPembayaranWisuda,
  getPembayaranWisudaById,
  createPembayaranWisuda,
  deletePembayaranWisuda,
};
