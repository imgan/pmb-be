const ExcelJS = require('exceljs');
const { Op } = require('sequelize');
const { sequelize, VirtualAccountMahasiswa, Mahasiswa } = require('../models');
const ApiError = require('../utils/ApiError');
const { buildWorkbook } = require('../utils/excel');
const { parseUang, parseTanggal, parseVa, str } = require('./tagihanImport.service');

/**
 * Import Virtual Account dari file bank (menu Tagihan Mahasiswa → Import VA). VA berganti tiap
 * bulan, jadi satu mahasiswa punya banyak VA: identitas baris = NIM + periode_open — import ulang
 * periode yang sama MEMPERBARUI VA/periode_close/nominal, periode baru ditambahkan.
 *
 * Kolom file bank: No VA, Nim, Name, Prodi, periode_open, periode_close, Tagihan
 * (Name & Prodi hanya informasi, tidak disimpan).
 */

const COLUMNS = [
  { header: 'No VA', key: 'noVirtualAccount', width: 22 },
  { header: 'Nim', key: 'nim', width: 16 },
  { header: 'Name', key: 'nama', width: 30 },
  { header: 'Prodi', key: 'prodi', width: 30 },
  { header: 'periode_open', key: 'periodeOpen', width: 14 },
  { header: 'periode_close', key: 'periodeClose', width: 14 },
  { header: 'Tagihan', key: 'nominal', width: 14 },
];

// Header (huruf kecil, spasi/underscore dirapikan) -> key.
const HEADER_ALIASES = {
  'no va': 'noVirtualAccount',
  'no. va': 'noVirtualAccount',
  va: 'noVirtualAccount',
  'no virtual account': 'noVirtualAccount',
  'virtual account': 'noVirtualAccount',
  nim: 'nim',
  name: 'nama',
  nama: 'nama',
  prodi: 'prodi',
  'periode open': 'periodeOpen',
  'periode close': 'periodeClose',
  tagihan: 'nominal',
  nominal: 'nominal',
};
const REQUIRED = ['noVirtualAccount', 'nim', 'periodeOpen', 'periodeClose'];

const readRows = async (fileBase64) => {
  const base64 = fileBase64.includes(',') ? fileBase64.split(',')[1] : fileBase64;
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(Buffer.from(base64, 'base64'));
  } catch {
    throw new ApiError(400, 'File tidak bisa dibaca. Gunakan file Excel (.xlsx) sesuai template.');
  }
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new ApiError(400, 'File tidak berisi sheet');

  const keys = [];
  sheet.getRow(1).eachCell({ includeEmpty: true }, (cell, col) => {
    const norm = str(cell.value).toLowerCase().replace(/[_\s]+/g, ' ').trim();
    keys[col] = HEADER_ALIASES[norm] ?? null;
  });
  const missing = REQUIRED.filter((k) => !keys.includes(k));
  if (missing.length) {
    const labels = missing.map((k) => COLUMNS.find((c) => c.key === k).header);
    throw new ApiError(400, `Kolom wajib tidak ditemukan di baris pertama: ${labels.join(', ')}. Gunakan template import VA.`);
  }

  const rows = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const data = {};
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      if (keys[col]) data[keys[col]] = cell.value;
    });
    if (Object.values(data).some((v) => str(v) !== '')) rows.push({ rowNumber, data });
  });
  return rows;
};

const tampil = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v);

/** Validasi + bandingkan dengan VA tersimpan. Tidak menulis apa pun. aksi: BARU | UBAH | TETAP | GAGAL. */
const analyze = async (fileBase64) => {
  const rows = await readRows(fileBase64);
  if (!rows.length) throw new ApiError(400, 'File tidak berisi data VA');

  const nims = [...new Set(rows.map((r) => str(r.data.nim)).filter(Boolean))];
  const mahasiswaList = await Mahasiswa.findAll({ where: { nim: { [Op.in]: nims } }, attributes: ['id', 'nim', 'namaLengkap'] });
  const mahasiswaByNim = new Map(mahasiswaList.map((m) => [m.nim, m]));
  const existingList = mahasiswaList.length
    ? await VirtualAccountMahasiswa.findAll({ where: { mahasiswaId: { [Op.in]: mahasiswaList.map((m) => m.id) } } })
    : [];
  const existingByKey = new Map(existingList.map((v) => [`${v.mahasiswaId}|${v.periodeOpen}`, v]));

  const seen = new Map();
  const result = rows.map(({ rowNumber, data }) => {
    const errors = [];
    const nim = str(data.nim);
    const mahasiswa = mahasiswaByNim.get(nim);
    if (!nim) errors.push('NIM kosong');
    else if (!mahasiswa) errors.push(`NIM ${nim} tidak terdaftar`);

    const noVirtualAccount = parseVa(data.noVirtualAccount);
    if (noVirtualAccount === null) errors.push('No VA kosong');
    else if (noVirtualAccount === undefined) errors.push('No VA harus berupa angka (maks. 30 digit)');

    const periodeOpen = parseTanggal(data.periodeOpen);
    const periodeClose = parseTanggal(data.periodeClose);
    if (!periodeOpen) errors.push('periode_open wajib diisi tanggal valid (DD/MM/YYYY atau YYYY-MM-DD)');
    if (!periodeClose) errors.push('periode_close wajib diisi tanggal valid (DD/MM/YYYY atau YYYY-MM-DD)');
    if (periodeOpen && periodeClose && periodeClose < periodeOpen) errors.push('periode_close tidak boleh sebelum periode_open');

    const nominal = parseUang(data.nominal) ?? 0;
    if (Number.isNaN(nominal)) errors.push('Tagihan bukan angka');
    else if (nominal < 0) errors.push('Tagihan tidak boleh negatif');

    if (mahasiswa && periodeOpen) {
      const key = `${mahasiswa.id}|${periodeOpen}`;
      if (seen.has(key)) errors.push(`Duplikat dengan baris ${seen.get(key)} (NIM & periode_open sama)`);
      else seen.set(key, rowNumber);
    }

    const base = {
      rowNumber,
      nim,
      namaLengkap: mahasiswa?.namaLengkap ?? (str(data.nama) || null),
      noVirtualAccount: noVirtualAccount || (str(data.noVirtualAccount) || null),
      periodeOpen: periodeOpen || (str(tampil(data.periodeOpen)) || null),
      periodeClose: periodeClose || (str(tampil(data.periodeClose)) || null),
      nominal: Number.isFinite(nominal) ? nominal : null,
    };
    if (errors.length) return { ...base, aksi: 'GAGAL', error: errors.join('; ') };

    const nilaiBaru = { noVirtualAccount, periodeClose, nominal };
    const existing = existingByKey.get(`${mahasiswa.id}|${periodeOpen}`);
    const internal = { mahasiswa, existing, nilaiBaru: { ...nilaiBaru, periodeOpen } };
    if (!existing) return { ...base, aksi: 'BARU', _internal: internal };
    const berubah = Object.entries(nilaiBaru).some(([k, v]) => String(existing[k] ?? '') !== String(v ?? ''));
    return { ...base, aksi: berubah ? 'UBAH' : 'TETAP', _internal: internal };
  });

  const summary = {
    totalRows: result.length,
    baru: result.filter((r) => r.aksi === 'BARU').length,
    ubah: result.filter((r) => r.aksi === 'UBAH').length,
    tetap: result.filter((r) => r.aksi === 'TETAP').length,
    gagal: result.filter((r) => r.aksi === 'GAGAL').length,
  };
  return { summary, rows: result };
};

const stripInternal = (rows) => rows.map(({ _internal, ...r }) => r);

const previewImportVa = async (fileBase64) => {
  const { summary, rows } = await analyze(fileBase64);
  return { summary, rows: stripInternal(rows) };
};

const commitImportVa = async (fileBase64, actorId) => {
  const { summary, rows } = await analyze(fileBase64);
  await sequelize.transaction(async (transaction) => {
    for (const r of rows) {
      if (r.aksi !== 'BARU' && r.aksi !== 'UBAH') continue;
      const { mahasiswa, existing, nilaiBaru } = r._internal;
      if (existing) await existing.update({ ...nilaiBaru, updatedBy: actorId }, { transaction });
      else {
        await VirtualAccountMahasiswa.create(
          { ...nilaiBaru, mahasiswaId: mahasiswa.id, createdBy: actorId, updatedBy: actorId },
          { transaction }
        );
      }
    }
  });
  return { summary, rows: stripInternal(rows).filter((r) => r.aksi === 'GAGAL') };
};

const exportTemplateVa = () => {
  const workbook = buildWorkbook('VA', COLUMNS, [
    {
      noVirtualAccount: '861634052230001',
      nim: '903462310001',
      nama: 'Contoh (hapus baris ini)',
      prodi: 'D4-Teknologi Rekayasa Multimedia',
      periodeOpen: '01/11/2026',
      periodeClose: '30/11/2026',
      nominal: 1400000,
    },
  ]);
  // Text supaya No VA / NIM panjang tidak dibulatkan Excel.
  const sheet = workbook.getWorksheet('VA');
  ['noVirtualAccount', 'nim'].forEach((key) => {
    sheet.getColumn(key).numFmt = '@';
  });
  return workbook;
};

/** Semua VA satu mahasiswa, terbaru dulu. */
const listVaMahasiswa = async (mahasiswaId) =>
  VirtualAccountMahasiswa.findAll({ where: { mahasiswaId }, order: [['periodeOpen', 'DESC']] });

/** Tanggal hari ini (YYYY-MM-DD) zona lokal server. */
const hariIni = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * VA yang ditampilkan ke mahasiswa: yang sedang berlaku hari ini; kalau tidak ada, yang terdekat
 * akan dibuka; kalau tidak ada juga, null (VA lama yang sudah tutup tidak ditampilkan sebagai VA aktif).
 */
const pilihVaAktif = (vaList, today = hariIni()) => {
  const list = vaList.map((v) => (v.toJSON ? v.toJSON() : v));
  const berlaku = list
    .filter((v) => v.periodeOpen <= today && v.periodeClose >= today)
    .sort((a, b) => b.periodeOpen.localeCompare(a.periodeOpen))[0];
  if (berlaku) return { ...berlaku, status: 'BERLAKU' };
  const akanDatang = list.filter((v) => v.periodeOpen > today).sort((a, b) => a.periodeOpen.localeCompare(b.periodeOpen))[0];
  return akanDatang ? { ...akanDatang, status: 'AKAN_DATANG' } : null;
};

module.exports = { previewImportVa, commitImportVa, exportTemplateVa, listVaMahasiswa, pilihVaAktif };
