const { Op } = require('sequelize');
const { Mahasiswa, MahasiswaBiodata, Peserta, GolonganKelas, Jurusan, TahunAjaran, sequelize } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');
const { buildWorkbook, parseWorkbookFromBase64, cellString, cellBoolean } = require('../utils/excel');

/**
 * `required: false` di-set eksplisit pada tiap include — beberapa belongsTo sekaligus tanpa
 * itu terbukti bisa membuat Sequelize men-default salah satunya jadi INNER JOIN, sehingga baris
 * dengan FK nullable yang kosong (mis. tahunAjaranId belum diisi) hilang dari hasil query.
 */
const includeRelations = [
  { model: GolonganKelas, as: 'golonganKelas', required: false },
  { model: Jurusan, as: 'jurusan', required: false },
  { model: Peserta, as: 'peserta', attributes: ['id', 'namaLengkap', 'email'], required: false },
  { model: TahunAjaran, as: 'tahunAjaran', required: false },
];

const includeRelationsWithBiodata = [...includeRelations, { model: MahasiswaBiodata, as: 'biodata', required: false }];

const SORTABLE_COLUMNS = {
  nim: ['nim'],
  namaLengkap: ['namaLengkap'],
  email: ['email'],
  tahunMasuk: ['tahunMasuk'],
  isActive: ['isActive'],
  jurusan: [{ model: Jurusan, as: 'jurusan' }, 'namaJurusan'],
  golonganKelas: [{ model: GolonganKelas, as: 'golonganKelas' }, 'namaKelas'],
};

const listMahasiswa = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.search) {
    where[Op.or] = [
      { nim: { [Op.like]: `%${query.search}%` } },
      { namaLengkap: { [Op.like]: `%${query.search}%` } },
      { email: { [Op.like]: `%${query.search}%` } },
    ];
  }
  if (query.golonganKelasId) where.golonganKelasId = query.golonganKelasId;
  if (query.jurusanId) where.jurusanId = query.jurusanId;
  if (query.tahunMasuk) where.tahunMasuk = query.tahunMasuk;
  if (query.tahunAjaranId) where.tahunAjaranId = query.tahunAjaranId;
  if (query.isActive !== undefined) where.isActive = query.isActive === 'true' || query.isActive === true;
  if (query.statusKeluar) {
    const statuses = String(query.statusKeluar).split(',').filter(Boolean);
    where.statusKeluar = statuses.length > 1 ? { [Op.in]: statuses } : statuses[0];
  }

  const { rows, count } = await Mahasiswa.findAndCountAll({
    where,
    include: includeRelations,
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS),
    subQuery: false,
    distinct: true,
  });

  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

const getMahasiswaById = async (id) => {
  const mahasiswa = await Mahasiswa.findByPk(id, { include: includeRelationsWithBiodata });
  if (!mahasiswa) throw new ApiError(404, 'Mahasiswa not found');
  return mahasiswa;
};

const updateMahasiswa = async (id, payload, actorId) => {
  const mahasiswa = await Mahasiswa.findByPk(id);
  if (!mahasiswa) throw new ApiError(404, 'Mahasiswa not found');

  if (payload.nim) {
    const existing = await Mahasiswa.findOne({ where: { nim: payload.nim, id: { [Op.ne]: id } } });
    if (existing) throw new ApiError(409, 'NIM already registered');
  }

  await mahasiswa.update({ ...payload, updatedBy: actorId });
  return getMahasiswaById(id);
};

const deleteMahasiswa = async (id) => {
  const mahasiswa = await Mahasiswa.findByPk(id);
  if (!mahasiswa) throw new ApiError(404, 'Mahasiswa not found');
  await mahasiswa.destroy();
};

const getBiodata = async (mahasiswaId) => {
  const mahasiswa = await Mahasiswa.findByPk(mahasiswaId);
  if (!mahasiswa) throw new ApiError(404, 'Mahasiswa not found');
  return MahasiswaBiodata.findOne({ where: { mahasiswaId } });
};

const saveBiodata = async (mahasiswaId, payload, actorId) => {
  const mahasiswa = await Mahasiswa.findByPk(mahasiswaId);
  if (!mahasiswa) throw new ApiError(404, 'Mahasiswa not found');

  const biodata = await MahasiswaBiodata.findOne({ where: { mahasiswaId } });
  if (biodata) {
    await biodata.update(payload);
  } else {
    await MahasiswaBiodata.create({ ...payload, mahasiswaId });
  }
  await mahasiswa.update({ updatedBy: actorId });

  return MahasiswaBiodata.findOne({ where: { mahasiswaId } });
};

const eligiblePesertaWhere = (query) => {
  const where = { statusUjian: 'lulus', statusKelulusan: 'diterima', isActive: true };
  if (query.jurusanId) where.jurusanId = query.jurusanId;
  if (query.golonganKelasId) where.golonganKelasId = query.golonganKelasId;
  if (query.search) {
    where[Op.or] = [
      { namaLengkap: { [Op.like]: `%${query.search}%` } },
      { email: { [Op.like]: `%${query.search}%` } },
    ];
  }
  return where;
};

const getConvertedPesertaIds = async () => {
  const rows = await Mahasiswa.findAll({ attributes: ['pesertaId'], raw: true });
  return rows.map((r) => r.pesertaId);
};

const listEligiblePeserta = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const convertedIds = await getConvertedPesertaIds();

  const where = eligiblePesertaWhere(query);
  if (convertedIds.length) where.id = { [Op.notIn]: convertedIds };

  const { rows, count } = await Peserta.findAndCountAll({
    where,
    include: [
      { model: GolonganKelas, as: 'golonganKelas' },
      { model: Jurusan, as: 'jurusan' },
    ],
    limit,
    offset,
    order: [['id', 'ASC']],
  });

  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

const getEligibleSummary = async () => {
  const convertedIds = await getConvertedPesertaIds();
  const where = eligiblePesertaWhere({});
  if (convertedIds.length) where.id = { [Op.notIn]: convertedIds };

  const summaryRows = await Peserta.findAll({
    where,
    include: [{ model: Jurusan, as: 'jurusan', attributes: ['id', 'namaJurusan'] }],
    attributes: ['jurusanId'],
    raw: true,
    nest: true,
  });

  const summaryMap = new Map();
  summaryRows.forEach((row) => {
    const key = row.jurusanId;
    if (!summaryMap.has(key)) {
      summaryMap.set(key, { jurusanId: key, namaJurusan: row.jurusan?.namaJurusan ?? '-', total: 0 });
    }
    summaryMap.get(key).total += 1;
  });

  return Array.from(summaryMap.values());
};

/**
 * Batch-converts peserta yang lulus ujian PMB menjadi mahasiswa dengan NIM digenerate
 * per jurusan (prefix input admin). Seluruh baris disusun di memori lalu ditulis dengan
 * satu kali Mahasiswa.bulkCreate (single batched INSERT), bukan create() per baris di dalam loop.
 */
const generateMahasiswaFromPeserta = async (payload, actorId) => {
  const { tahunAjaranId, jurusanPrefixes, pesertaIds } = payload;

  const tahunAjaran = await TahunAjaran.findByPk(tahunAjaranId);
  if (!tahunAjaran) throw new ApiError(404, 'Tahun ajaran not found');
  if (!tahunAjaran.isActive) throw new ApiError(400, 'Tahun ajaran ini sudah non-aktif, tidak bisa dipakai untuk generate mahasiswa baru');
  const tahunMasuk = tahunAjaran.tahunMulai;

  const convertedIds = await getConvertedPesertaIds();
  const where = eligiblePesertaWhere({});
  if (convertedIds.length) where.id = { [Op.notIn]: convertedIds };
  if (pesertaIds?.length) where.id = { ...(where.id || {}), [Op.in]: pesertaIds };

  const targetPeserta = await Peserta.findAll({
    where,
    include: [{ model: Jurusan, as: 'jurusan', attributes: ['id', 'namaJurusan'] }],
    order: [['id', 'ASC']],
  });

  if (!targetPeserta.length) {
    throw new ApiError(400, 'Tidak ada peserta lulus ujian yang siap dijadikan mahasiswa');
  }

  const distinctJurusan = new Map();
  targetPeserta.forEach((p) => distinctJurusan.set(p.jurusanId, p.jurusan?.namaJurusan ?? `#${p.jurusanId}`));

  const missingPrefix = [...distinctJurusan.entries()].filter(([jurusanId]) => !jurusanPrefixes[String(jurusanId)]);
  if (missingPrefix.length) {
    const names = missingPrefix.map(([, name]) => name).join(', ');
    throw new ApiError(400, `Prefix NIM belum diisi untuk jurusan: ${names}`);
  }

  const result = await sequelize.transaction(async (t) => {
    // Urutan NIM harus diturunkan dari NIM yang benar-benar sudah ada (kolom `nim`, yang punya
    // unique constraint), bukan dari kolom `urutan` per jurusan_id — supaya kalau dua jurusan
    // kebetulan dikasih prefix yang sama oleh admin, atau ada NIM lama dengan urutan yang tidak
    // sinkron, generator tetap mencari nilai terbesar yang match prefix+tahun lalu lanjut N+1,
    // bukan mengulang angka yang sudah dipakai.
    const distinctPrefixes = [...new Set([...distinctJurusan.keys()].map((jurusanId) => jurusanPrefixes[String(jurusanId)]))];

    const runningSeq = new Map();
    for (const prefix of distinctPrefixes) {
      const pattern = `${prefix}${tahunMasuk}`;
      const [rows] = await sequelize.query(
        'SELECT MAX(CAST(SUBSTRING(nim, :suffixStart) AS UNSIGNED)) AS maxSuffix FROM mahasiswa WHERE nim LIKE :pattern FOR UPDATE',
        {
          replacements: { suffixStart: pattern.length + 1, pattern: `${pattern}%` },
          transaction: t,
        }
      );
      runningSeq.set(prefix, Number(rows[0]?.maxSuffix) || 0);
    }

    const records = targetPeserta.map((peserta) => {
      const jurusanId = peserta.jurusanId;
      const prefix = jurusanPrefixes[String(jurusanId)];
      const nextUrutan = (runningSeq.get(prefix) || 0) + 1;
      runningSeq.set(prefix, nextUrutan);

      const nim = `${prefix}${tahunMasuk}${String(nextUrutan).padStart(4, '0')}`;

      return {
        nim,
        pesertaId: peserta.id,
        namaLengkap: peserta.namaLengkap,
        email: peserta.email,
        noTelepon: peserta.noTelepon,
        asalSekolah: peserta.asalSekolah,
        golonganKelasId: peserta.golonganKelasId,
        jurusanId,
        tahunMasuk,
        tahunAjaranId: tahunAjaran.id,
        urutan: nextUrutan,
        isActive: true,
        createdBy: actorId,
        updatedBy: actorId,
      };
    });

    const created = await Mahasiswa.bulkCreate(records, { transaction: t, validate: true });
    return created;
  });

  return { count: result.length, data: await Mahasiswa.findAll({ where: { id: result.map((r) => r.id) }, include: includeRelations, order: [['id', 'ASC']] }) };
};

const EXPORT_COLUMNS = [
  { header: 'NIM', key: 'nim' },
  { header: 'Nama Lengkap', key: 'namaLengkap' },
  { header: 'Email', key: 'email' },
  { header: 'No Telepon', key: 'noTelepon' },
  { header: 'Asal Sekolah', key: 'asalSekolah' },
  { header: 'Alamat', key: 'alamat' },
  { header: 'Jurusan', key: 'jurusan' },
  { header: 'Golongan Kelas', key: 'golonganKelas' },
  { header: 'Tahun Masuk', key: 'tahunMasuk' },
  { header: 'Tahun Ajaran', key: 'tahunAjaran' },
  { header: 'Status Aktif', key: 'statusAktif' },
];

const exportMahasiswa = async () => {
  const rows = await Mahasiswa.findAll({ include: includeRelations, order: [['nim', 'ASC']] });
  const data = rows.map((m) => ({
    nim: m.nim,
    namaLengkap: m.namaLengkap,
    email: m.email,
    noTelepon: m.noTelepon,
    asalSekolah: m.asalSekolah,
    alamat: m.alamat,
    jurusan: m.jurusan?.namaJurusan ?? '',
    golonganKelas: m.golonganKelas?.namaKelas ?? '',
    tahunMasuk: m.tahunMasuk,
    tahunAjaran: m.tahunAjaran?.nama ?? '',
    statusAktif: m.isActive ? 'Ya' : 'Tidak',
  }));
  return buildWorkbook('Mahasiswa', EXPORT_COLUMNS, data);
};

const exportMahasiswaTemplate = () => {
  const sample = {
    nim: 'TI20260001',
    namaLengkap: 'Contoh Nama Mahasiswa',
    email: 'contoh@email.com',
    noTelepon: '081234567890',
    asalSekolah: 'SMA Contoh',
    alamat: 'Jl. Contoh No. 1',
    jurusan: 'Nama Jurusan (sesuai master data)',
    golonganKelas: 'Nama Golongan Kelas (sesuai master data)',
    tahunMasuk: 2026,
    tahunAjaran: '2026/2027 (informasi saja, tidak diproses saat import)',
    statusAktif: 'Ya',
  };
  return buildWorkbook('Mahasiswa', EXPORT_COLUMNS, [sample]);
};

/**
 * Import hanya MENGUBAH data mahasiswa yang sudah ada (dicocokkan lewat NIM) — tidak membuat
 * mahasiswa baru, karena pembuatan mahasiswa baru wajib melalui alur generate dari peserta
 * lulus (butuh pesertaId yang tidak bisa disediakan lewat file Excel).
 */
const importMahasiswa = async (fileBase64, actorId) => {
  const rows = await parseWorkbookFromBase64(fileBase64);
  const errors = [];
  let successCount = 0;

  for (const { rowNumber, data } of rows) {
    const nim = cellString(data['NIM']);
    if (!nim) {
      errors.push({ row: rowNumber, message: 'NIM wajib diisi' });
      continue;
    }

    const mahasiswa = await Mahasiswa.findOne({ where: { nim } });
    if (!mahasiswa) {
      errors.push({ row: rowNumber, message: `Mahasiswa dengan NIM ${nim} tidak ditemukan` });
      continue;
    }

    const payload = { updatedBy: actorId };
    const namaLengkap = cellString(data['Nama Lengkap']);
    if (namaLengkap) payload.namaLengkap = namaLengkap;
    const email = cellString(data['Email']);
    if (email) payload.email = email;
    const noTelepon = cellString(data['No Telepon']);
    if (noTelepon) payload.noTelepon = noTelepon;
    const asalSekolah = cellString(data['Asal Sekolah']);
    if (asalSekolah) payload.asalSekolah = asalSekolah;
    const alamat = cellString(data['Alamat']);
    if (alamat) payload.alamat = alamat;
    if (data['Status Aktif'] !== undefined) payload.isActive = cellBoolean(data['Status Aktif'], true);

    const jurusanNama = cellString(data['Jurusan']);
    if (jurusanNama) {
      const jurusan = await Jurusan.findOne({ where: { namaJurusan: jurusanNama } });
      if (!jurusan) {
        errors.push({ row: rowNumber, message: `Jurusan "${jurusanNama}" tidak ditemukan` });
        continue;
      }
      payload.jurusanId = jurusan.id;
    }

    const golonganNama = cellString(data['Golongan Kelas']);
    if (golonganNama) {
      const golongan = await GolonganKelas.findOne({ where: { namaKelas: golonganNama } });
      if (!golongan) {
        errors.push({ row: rowNumber, message: `Golongan Kelas "${golonganNama}" tidak ditemukan` });
        continue;
      }
      payload.golonganKelasId = golongan.id;
    }

    try {
      await mahasiswa.update(payload);
      successCount += 1;
    } catch (err) {
      errors.push({ row: rowNumber, message: err.message });
    }
  }

  return { successCount, errorCount: errors.length, errors };
};

module.exports = {
  listMahasiswa,
  getMahasiswaById,
  updateMahasiswa,
  deleteMahasiswa,
  listEligiblePeserta,
  getEligibleSummary,
  generateMahasiswaFromPeserta,
  getBiodata,
  saveBiodata,
  exportMahasiswa,
  exportMahasiswaTemplate,
  importMahasiswa,
};
