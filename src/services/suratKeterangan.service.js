const { Op } = require('sequelize');
const { SuratKeterangan, Mahasiswa, MahasiswaBiodata, Jurusan } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');

const includeMahasiswa = [{ model: Mahasiswa, as: 'mahasiswa', attributes: ['id', 'nim', 'namaLengkap'] }];

const SORTABLE_COLUMNS = {
  jenisSurat: ['jenisSurat'],
  nomorSurat: ['nomorSurat'],
  tanggalInput: ['tanggalInput'],
  mahasiswa: [{ model: Mahasiswa, as: 'mahasiswa' }, 'namaLengkap'],
};

const listSurat = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.status) where.status = query.status;
  const mahasiswaWhere = {};
  if (query.search) {
    mahasiswaWhere[Op.or] = [
      { nim: { [Op.like]: `%${query.search}%` } },
      { namaLengkap: { [Op.like]: `%${query.search}%` } },
    ];
  }

  const { rows, count } = await SuratKeterangan.findAndCountAll({
    where,
    include: [
      { model: Mahasiswa, as: 'mahasiswa', attributes: ['id', 'nim', 'namaLengkap'], where: Object.keys(mahasiswaWhere).length ? mahasiswaWhere : undefined },
    ],
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS, [['tanggalInput', 'DESC'], ['id', 'DESC']]),
    subQuery: false,
    distinct: true,
  });

  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

const getSuratById = async (id) => {
  const surat = await SuratKeterangan.findByPk(id, { include: includeMahasiswa });
  if (!surat) throw new ApiError(404, 'Surat keterangan not found');
  return surat;
};

const createSurat = async (payload, actorId) => {
  const mahasiswa = await Mahasiswa.findByPk(payload.mahasiswaId);
  if (!mahasiswa) throw new ApiError(404, 'Mahasiswa not found');

  const surat = await SuratKeterangan.create({ ...payload, createdBy: actorId, updatedBy: actorId });
  return getSuratById(surat.id);
};

const updateSurat = async (id, payload, actorId) => {
  const surat = await SuratKeterangan.findByPk(id);
  if (!surat) throw new ApiError(404, 'Surat keterangan not found');

  await surat.update({ ...payload, updatedBy: actorId });
  return getSuratById(id);
};

const deleteSurat = async (id) => {
  const surat = await SuratKeterangan.findByPk(id);
  if (!surat) throw new ApiError(404, 'Surat keterangan not found');
  await surat.destroy();
};

const composeAlamat = (biodata) => {
  if (!biodata) return null;
  const parts = [
    biodata.jalan,
    biodata.dusun ? `Dusun ${biodata.dusun}` : null,
    biodata.rt && biodata.rw ? `RT ${biodata.rt}/RW ${biodata.rw}` : null,
    biodata.kelurahan ? `Kec. ${biodata.kelurahan}` : null,
    biodata.propinsi,
    biodata.kodePos,
  ].filter(Boolean);
  return parts.length ? parts.join(' ') : null;
};

const getCetakData = async (id) => {
  const surat = await SuratKeterangan.findByPk(id, {
    include: [
      {
        model: Mahasiswa,
        as: 'mahasiswa',
        include: [
          { model: Jurusan, as: 'jurusan' },
          { model: MahasiswaBiodata, as: 'biodata' },
        ],
      },
    ],
  });
  if (!surat) throw new ApiError(404, 'Surat keterangan not found');

  const mahasiswa = surat.mahasiswa;
  const biodata = mahasiswa?.biodata ?? null;
  const jurusan = mahasiswa?.jurusan ?? null;

  return {
    surat: {
      id: surat.id,
      jenisSurat: surat.jenisSurat,
      nomorSurat: surat.nomorSurat,
      tanggalInput: surat.tanggalInput,
      semester: surat.semester,
      alasan: surat.alasan,
      namaInstansi: surat.namaInstansi,
      alamatInstansi: surat.alamatInstansi,
      ipk: surat.ipk,
      jumlahSks: surat.jumlahSks,
      namaKoordinator: surat.namaKoordinator,
      noHpKoordinator: surat.noHpKoordinator,
      tanggalUjianMulai: surat.tanggalUjianMulai,
      tanggalUjianSelesai: surat.tanggalUjianSelesai,
    },
    mahasiswa: {
      id: mahasiswa.id,
      nim: mahasiswa.nim,
      namaLengkap: mahasiswa.namaLengkap,
      tempatLahir: biodata?.tempatLahir ?? null,
      tanggalLahir: biodata?.tanggalLahir ?? null,
      noKtp: biodata?.noKtp ?? null,
      alamat: composeAlamat(biodata),
    },
    jurusan: jurusan
      ? {
          namaJurusan: jurusan.namaJurusan,
          namaFakultas: jurusan.namaFakultas,
          jenjangPendidikan: jurusan.jenjangPendidikan,
        }
      : null,
  };
};

module.exports = { listSurat, getSuratById, createSurat, updateSurat, deleteSurat, getCetakData };
