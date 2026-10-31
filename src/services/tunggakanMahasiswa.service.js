const { Op } = require('sequelize');
const { TunggakanMahasiswa, Mahasiswa, TagihanKuliah, PembayaranKuliah, TahunAjaran, Jurusan } = require('../models');
const { hitungSaldoTagihan, urutanPeriode } = require('../utils/tagihanSaldo');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');
const { buildWorkbook, parseWorkbookFromBase64, cellString } = require('../utils/excel');

const includeRelations = [{ model: Mahasiswa, as: 'mahasiswa', required: false }];

const SORTABLE_COLUMNS = {
  tanggal: ['tanggal'],
  nominal: ['nominal'],
};

const EXPORT_COLUMNS = [
  { header: 'NIM', key: 'nim', width: 20 },
  { header: 'Nama Mahasiswa', key: 'namaLengkap', width: 30 },
  { header: 'Tanggal', key: 'tanggal', width: 15 },
  { header: 'Nominal', key: 'nominal', width: 18 },
  { header: 'Keterangan', key: 'keterangan', width: 40 },
];

const listTunggakanMahasiswa = async (query) => {
  const { page, limit, offset } = getPagination(query);

  const include = query.search
    ? [
        {
          ...includeRelations[0],
          required: true,
          where: {
            [Op.or]: [
              { nim: { [Op.like]: `%${query.search}%` } },
              { namaLengkap: { [Op.like]: `%${query.search}%` } },
            ],
          },
        },
      ]
    : includeRelations;

  const { rows, count } = await TunggakanMahasiswa.findAndCountAll({
    include,
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS, [['id', 'DESC']]),
    subQuery: false,
    distinct: true,
  });
  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

/**
 * Tunggakan OTOMATIS dari Tagihan Mahasiswa: sisa tagihan semester-semester SEBELUM tahun ajaran
 * aktif yang belum lunas, per mahasiswa (dihitung saat dibaca, jadi langsung berkurang bila dibayar
 * di kasir). Tunggakan manual di tabel tunggakan_mahasiswa tetap terpisah (saldo awal / penyesuaian).
 */
const buildTunggakanOtomatis = async ({ search } = {}) => {
  const aktif = await TahunAjaran.findOne({ where: { isActive: true } });
  const batas = aktif ? urutanPeriode({ tahunAjaran: aktif }) : Infinity;
  const mahasiswaWhere = search
    ? { [Op.or]: [{ nim: { [Op.like]: `%${search}%` } }, { namaLengkap: { [Op.like]: `%${search}%` } }] }
    : undefined;
  const tagihanList = await TagihanKuliah.findAll({
    include: [
      {
        model: Mahasiswa,
        as: 'mahasiswa',
        required: true,
        where: mahasiswaWhere,
        attributes: ['id', 'nim', 'namaLengkap', 'tahunMasuk'],
        include: [{ model: Jurusan, as: 'jurusan', attributes: ['namaJurusan'], required: false }],
      },
      { model: TahunAjaran, as: 'tahunAjaran' },
      { model: PembayaranKuliah, as: 'pembayaranList' },
    ],
  });

  const byMahasiswa = new Map();
  tagihanList
    .filter((t) => urutanPeriode(t) < batas)
    .forEach((t) => {
      const sisa = hitungSaldoTagihan(t).sisaSemester;
      if (sisa <= 0) return;
      const m = t.mahasiswa;
      if (!byMahasiswa.has(m.id)) {
        byMahasiswa.set(m.id, {
          mahasiswaId: m.id,
          nim: m.nim,
          namaLengkap: m.namaLengkap,
          prodi: m.jurusan?.namaJurusan ?? '-',
          angkatan: m.tahunMasuk,
          rincian: [],
          totalTunggakan: 0,
        });
      }
      const entry = byMahasiswa.get(m.id);
      entry.rincian.push({
        urutan: urutanPeriode(t),
        periode: t.tahunAjaran ? `${t.tahunAjaran.nama} ${t.tahunAjaran.jenisSemester}` : '-',
        semester: t.semester,
        sisa,
      });
      entry.totalTunggakan += sisa;
    });
  return {
    tahunAjaranAktif: aktif ? `${aktif.nama} ${aktif.jenisSemester}` : null,
    rows: [...byMahasiswa.values()]
      .map((e) => ({ ...e, rincian: e.rincian.sort((a, b) => a.urutan - b.urutan).map(({ urutan, ...r }) => r) }))
      .sort((a, b) => b.totalTunggakan - a.totalTunggakan),
  };
};

const listTunggakanOtomatis = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const { tahunAjaranAktif, rows } = await buildTunggakanOtomatis({ search: query.search });
  return {
    data: rows.slice(offset, offset + limit),
    meta: { ...getPagingMeta(rows.length, page, limit), tahunAjaranAktif, totalNominal: rows.reduce((s, r) => s + r.totalTunggakan, 0) },
  };
};

const exportTunggakanOtomatis = async (query = {}) => {
  const { rows } = await buildTunggakanOtomatis({ search: query.search });
  const data = rows.flatMap((r) =>
    r.rincian.map((d) => ({
      nim: r.nim,
      namaLengkap: r.namaLengkap,
      prodi: r.prodi,
      angkatan: r.angkatan,
      periode: d.periode,
      semester: d.semester,
      sisa: d.sisa,
      totalTunggakan: r.totalTunggakan,
    }))
  );
  const workbook = buildWorkbook(
    'Tunggakan Otomatis',
    [
      { header: 'NIM', key: 'nim', width: 16 },
      { header: 'Nama', key: 'namaLengkap', width: 30 },
      { header: 'Prodi', key: 'prodi', width: 30 },
      { header: 'Angkatan', key: 'angkatan', width: 10 },
      { header: 'Periode', key: 'periode', width: 18 },
      { header: 'Semester', key: 'semester', width: 10 },
      { header: 'Sisa Tagihan', key: 'sisa', width: 16 },
      { header: 'Total Tunggakan Mahasiswa', key: 'totalTunggakan', width: 22 },
    ],
    data
  );
  const sheet = workbook.getWorksheet('Tunggakan Otomatis');
  ['sisa', 'totalTunggakan'].forEach((k) => (sheet.getColumn(k).numFmt = '#,##0'));
  return workbook;
};

const getTunggakanMahasiswaById = async (id) => {
  const item = await TunggakanMahasiswa.findByPk(id, { include: includeRelations });
  if (!item) throw new ApiError(404, 'Data tunggakan mahasiswa tidak ditemukan');
  return item;
};

const resolveMahasiswaId = async (nim) => {
  const mahasiswa = await Mahasiswa.findOne({ where: { nim } });
  if (!mahasiswa) throw new ApiError(404, `Mahasiswa dengan NIM "${nim}" tidak ditemukan`);
  return mahasiswa.id;
};

const createTunggakanMahasiswa = async (payload, actorId) => {
  const { nim, ...rest } = payload;
  const mahasiswaId = await resolveMahasiswaId(nim);
  const item = await TunggakanMahasiswa.create({ ...rest, mahasiswaId, createdBy: actorId, updatedBy: actorId });
  return getTunggakanMahasiswaById(item.id);
};

const updateTunggakanMahasiswa = async (id, payload, actorId) => {
  const item = await getTunggakanMahasiswaById(id);
  const { nim, ...rest } = payload;
  const updates = { ...rest, updatedBy: actorId };
  if (nim) updates.mahasiswaId = await resolveMahasiswaId(nim);
  await item.update(updates);
  return getTunggakanMahasiswaById(id);
};

const deleteTunggakanMahasiswa = async (id) => {
  const item = await getTunggakanMahasiswaById(id);
  await item.destroy();
};

const exportTunggakanMahasiswa = async () => {
  const rows = await TunggakanMahasiswa.findAll({ include: includeRelations, order: [['tanggal', 'DESC']] });
  const data = rows.map((t) => ({
    nim: t.mahasiswa?.nim ?? '',
    namaLengkap: t.mahasiswa?.namaLengkap ?? '',
    tanggal: t.tanggal,
    nominal: t.nominal,
    keterangan: t.keterangan ?? '',
  }));
  return buildWorkbook('Tunggakan Mahasiswa', EXPORT_COLUMNS, data);
};

const exportTunggakanMahasiswaTemplate = () => {
  const sample = {
    nim: 'TI20260001',
    namaLengkap: 'Contoh Nama Mahasiswa (informasi saja, tidak diproses saat import)',
    tanggal: new Date().toISOString().slice(0, 10),
    nominal: 1500000,
    keterangan: 'Saldo awal migrasi dari sistem kampus lama',
  };
  return buildWorkbook('Tunggakan Mahasiswa', EXPORT_COLUMNS, [sample]);
};

/**
 * Dipakai untuk migrasi saldo awal tunggakan dari sistem kampus lama — sistem ini belum punya
 * ledger pembayaran per mahasiswa, jadi setiap NIM disimpan sebagai SATU baris saldo (bukan
 * riwayat transaksi): re-import NIM yang sama akan MENGGANTI baris yang sudah ada, bukan
 * menambah baris baru.
 */
const importTunggakanMahasiswa = async (fileBase64, actorId) => {
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

    const tanggalRaw = data['Tanggal'];
    const tanggal = tanggalRaw instanceof Date ? tanggalRaw.toISOString().slice(0, 10) : cellString(tanggalRaw);
    if (!tanggal) {
      errors.push({ row: rowNumber, message: 'Tanggal wajib diisi' });
      continue;
    }

    const nominalStr = cellString(data['Nominal']).replace(/[^0-9-]/g, '');
    const nominal = nominalStr ? Number(nominalStr) : NaN;
    if (!Number.isFinite(nominal) || nominal < 0) {
      errors.push({ row: rowNumber, message: 'Nominal wajib diisi dengan angka >= 0' });
      continue;
    }

    const payload = {
      mahasiswaId: mahasiswa.id,
      tanggal,
      nominal,
      keterangan: cellString(data['Keterangan']) || null,
      updatedBy: actorId,
    };

    try {
      const existing = await TunggakanMahasiswa.findOne({ where: { mahasiswaId: mahasiswa.id } });
      if (existing) {
        await existing.update(payload);
      } else {
        await TunggakanMahasiswa.create({ ...payload, createdBy: actorId });
      }
      successCount += 1;
    } catch (err) {
      errors.push({ row: rowNumber, message: err.message });
    }
  }

  return { successCount, errorCount: errors.length, errors };
};

module.exports = {
  listTunggakanMahasiswa,
  getTunggakanMahasiswaById,
  createTunggakanMahasiswa,
  updateTunggakanMahasiswa,
  deleteTunggakanMahasiswa,
  exportTunggakanMahasiswa,
  exportTunggakanMahasiswaTemplate,
  importTunggakanMahasiswa,
  listTunggakanOtomatis,
  exportTunggakanOtomatis,
};
