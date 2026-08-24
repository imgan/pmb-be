const { Op } = require('sequelize');
const { Dosen, JadwalKuliah, VocUjianDosen, TahunAjaran } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');

const RATE_PEMBUATAN_SOAL = 70000;
const RATE_KOREKSI_SOAL = 3000;
const RATE_PENGAWAS = 50000;

const SORTABLE_COLUMNS = {
  nidn: ['nidn'],
  namaLengkap: ['namaLengkap'],
};

const listVocDosenFtid = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = { kelompokFakultas: 'FTID' };
  if (query.search) {
    where[Op.or] = [{ namaLengkap: { [Op.like]: `%${query.search}%` } }, { nidn: { [Op.like]: `%${query.search}%` } }];
  }

  const { rows, count } = await Dosen.findAndCountAll({
    where,
    attributes: ['id', 'nidn', 'namaLengkap'],
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS, [['namaLengkap', 'ASC']]),
  });
  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

const getFtidDosenById = async (id) => {
  const dosen = await Dosen.findOne({ where: { id, kelompokFakultas: 'FTID' } });
  if (!dosen) throw new ApiError(404, 'Dosen FTID tidak ditemukan');
  return dosen;
};

const getJadwalWithVoc = async (dosenId) => {
  const jadwalList = await JadwalKuliah.findAll({
    where: { dosenKordinatorId: dosenId },
    order: [['namaMataKuliah', 'ASC']],
  });
  const jadwalIds = jadwalList.map((j) => j.id);
  const vocRows = jadwalIds.length
    ? await VocUjianDosen.findAll({
        where: { jadwalKuliahId: { [Op.in]: jadwalIds } },
        include: [{ model: Dosen, as: 'pengawasReal', attributes: ['id', 'namaLengkap', 'nidn'], required: false }],
      })
    : [];
  const vocByJadwalId = new Map(vocRows.map((v) => [v.jadwalKuliahId, v]));
  return { jadwalList, vocByJadwalId };
};

const getDosenDetail = async (dosenId) => {
  const dosen = await getFtidDosenById(dosenId);
  const { jadwalList, vocByJadwalId } = await getJadwalWithVoc(dosenId);

  const rows = jadwalList.map((jadwal) => {
    const voc = vocByJadwalId.get(jadwal.id);
    return {
      jadwalKuliahId: jadwal.id,
      namaMataKuliah: jadwal.namaMataKuliah,
      kelas: jadwal.kelas,
      rencanaPengawas: dosen.namaLengkap,
      ruangan: jadwal.ruangan,
      jumlah: voc?.jumlah ?? 0,
      tanggalBerkas: voc?.tanggalBerkas ?? null,
      pengawasRealId: voc?.pengawasRealId ?? null,
      pengawasReal: voc?.pengawasReal ?? null,
    };
  });

  return { dosen: { id: dosen.id, nidn: dosen.nidn, namaLengkap: dosen.namaLengkap }, rows };
};

const upsertVocUjianDosen = async (jadwalKuliahId, payload, actorId) => {
  const jadwal = await JadwalKuliah.findByPk(jadwalKuliahId);
  if (!jadwal) throw new ApiError(404, 'Jadwal kuliah tidak ditemukan');

  const [voc] = await VocUjianDosen.findOrCreate({
    where: { jadwalKuliahId },
    defaults: { ...payload, createdBy: actorId, updatedBy: actorId },
  });
  await voc.update({ ...payload, updatedBy: actorId });
  return voc;
};

const getVoucherData = async (dosenId) => {
  const dosen = await getFtidDosenById(dosenId);
  const { jadwalList, vocByJadwalId } = await getJadwalWithVoc(dosenId);

  const complete = jadwalList
    .map((jadwal) => ({ jadwal, voc: vocByJadwalId.get(jadwal.id) }))
    .filter((r) => r.voc && r.voc.jumlah > 0 && r.voc.pengawasRealId);

  const pembuatanSoal = complete.map((r) => ({
    kodeMk: r.jadwal.kodeMataKuliah,
    kelasMatakuliah: `${r.jadwal.kelas} - ${r.jadwal.namaMataKuliah}`,
    nominal: RATE_PEMBUATAN_SOAL,
  }));
  const totalPembuatanSoal = pembuatanSoal.reduce((sum, r) => sum + r.nominal, 0);

  const koreksiSoal = jadwalList.map((jadwal) => {
    const voc = vocByJadwalId.get(jadwal.id);
    const jumlah = voc?.jumlah ?? 0;
    const isEntered = jumlah > 0;
    return {
      kodeMk: jadwal.kodeMataKuliah,
      kelasMatakuliah: `${jadwal.kelas} - ${jadwal.namaMataKuliah}`,
      jumlahMhs: jumlah,
      persentaseLabel: isEntered ? '100 %' : 'entry nilai 0.00 %',
      nominal: isEntered ? jumlah * RATE_KOREKSI_SOAL : 0,
    };
  });
  const totalKoreksiSoal = koreksiSoal.reduce((sum, r) => sum + r.nominal, 0);

  const pengawas = complete.map((r) => ({
    kodeMk: r.jadwal.kodeMataKuliah,
    kelasMatakuliah: `${r.jadwal.kelas} - ${r.jadwal.namaMataKuliah}`,
    sks: r.jadwal.sks ?? 0,
    nominal: RATE_PENGAWAS,
  }));
  const totalPengawas = pengawas.reduce((sum, r) => sum + r.nominal, 0);

  const semesterAngka = jadwalList.find((j) => j.semester)?.semester ?? null;
  const semesterLabel = semesterAngka ? (semesterAngka % 2 === 1 ? 'GANJIL' : 'GENAP') : 'GANJIL';
  const tahunAjaranId = jadwalList.find((j) => j.tahunAjaranId)?.tahunAjaranId ?? null;
  const tahunAjaran = tahunAjaranId
    ? await TahunAjaran.findByPk(tahunAjaranId)
    : await TahunAjaran.findOne({ where: { isActive: true } });

  return {
    dosen: { id: dosen.id, nidn: dosen.nidn, namaLengkap: dosen.namaLengkap },
    semesterLabel,
    tahunAjaranNama: tahunAjaran?.nama ?? '-',
    pembuatanSoal,
    totalPembuatanSoal,
    koreksiSoal,
    totalKoreksiSoal,
    pengawas,
    totalPengawas,
    grandTotal: totalPembuatanSoal + totalKoreksiSoal + totalPengawas,
  };
};

module.exports = {
  listVocDosenFtid,
  getFtidDosenById,
  getDosenDetail,
  upsertVocUjianDosen,
  getVoucherData,
};
