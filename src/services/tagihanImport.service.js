const ExcelJS = require('exceljs');
const { Op } = require('sequelize');
const { sequelize, TagihanKuliah, TagihanImportBatch, TagihanImportLog, Mahasiswa, TahunAjaran, User } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { buildWorkbook } = require('../utils/excel');
const { resolveSemesterMahasiswa } = require('../utils/hitungSemester');
const { syncPotonganTagihan } = require('../utils/potonganTagihan');

// "Total Tagihan" di file = tagihan sebelum potongan -> dibandingkan/disimpan ke kolom tagihanAwal;
// totalTagihan = tagihanAwal - Daftar Potongan (lihat utils/potonganTagihan.js).
const nilaiTersimpan = (existing, key) =>
  key === 'totalTagihan' ? existing.tagihanAwal ?? existing.totalTagihan + existing.potongan : existing[key];
const keKolom = ({ totalTagihan, ...rest }) => ({ ...rest, tagihanAwal: totalTagihan, totalTagihan });

/**
 * Import tagihan kuliah dari file Excel bagian keuangan (sistem tagihan berbasis import).
 * Identitas tagihan = NIM + Tahun Akademik + Semester (Ganjil/Genap): import ulang MEMPERBARUI
 * tagihan yang sama, tidak membuat baris baru. Setiap proses dicatat sebagai batch beserta log
 * nilai lama & baru per baris.
 *
 * Aturan angka:
 * - Sisa Bayar (opsional) harus = Total Tagihan - Total Bayar (tunggakan TIDAK termasuk).
 * - Tunggakan = utang semester sebelumnya, disimpan terpisah.
 * - importedAt hanya diperbarui bila nilai berubah: transaksi kasir setelah importedAt ditambahkan
 *   ke Total Bayar (lihat utils/tagihanSaldo.js), jadi import dengan angka sama tidak "menelan"
 *   pembayaran kasir yang belum tercatat di file keuangan.
 */

const COLUMNS = [
  { header: 'NIM', key: 'nim', width: 16 },
  { header: 'Tahun Akademik', key: 'tahunAkademik', width: 16 },
  { header: 'Semester', key: 'semester', width: 12 },
  { header: 'Total Tagihan', key: 'totalTagihan', width: 16 },
  { header: 'Total Bayar', key: 'totalBayar', width: 16 },
  { header: 'Tunggakan', key: 'tunggakan', width: 16 },
  { header: 'Sisa Bayar', key: 'sisaBayar', width: 16 },
  { header: 'Jatuh Tempo', key: 'jatuhTempo', width: 14 },
  { header: 'No Virtual Account', key: 'noVirtualAccount', width: 22 },
  { header: 'Keterangan', key: 'keterangan', width: 30 },
];

// Header yang diterima (huruf kecil, spasi/underscore dirapikan) -> key.
const HEADER_ALIASES = {
  nim: 'nim',
  'tahun akademik': 'tahunAkademik',
  ta: 'tahunAkademik',
  'tahun ajaran': 'tahunAkademik',
  semester: 'semester',
  'total tagihan': 'totalTagihan',
  'total bayar': 'totalBayar',
  tunggakan: 'tunggakan',
  'sisa bayar': 'sisaBayar',
  'jatuh tempo': 'jatuhTempo',
  'tanggal jatuh tempo': 'jatuhTempo',
  'no virtual account': 'noVirtualAccount',
  'nomor virtual account': 'noVirtualAccount',
  'virtual account': 'noVirtualAccount',
  'no va': 'noVirtualAccount',
  'no. va': 'noVirtualAccount',
  va: 'noVirtualAccount',
  keterangan: 'keterangan',
};
const REQUIRED = ['nim', 'tahunAkademik', 'semester', 'totalTagihan'];
const FIELD_LABEL = {
  totalTagihan: 'Total Tagihan',
  totalBayarImport: 'Total Bayar',
  tunggakan: 'Tunggakan',
  tanggalJatuhTempo: 'Jatuh Tempo',
  noVirtualAccount: 'No Virtual Account',
  keterangan: 'Keterangan',
};

const cellValue = (value) => {
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    if ('result' in value) return value.result;
    if ('text' in value) return value.text;
    if (Array.isArray(value.richText)) return value.richText.map((t) => t.text).join('');
  }
  return value;
};
const str = (value) => {
  const v = cellValue(value);
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).trim();
};

/** "Rp 5.000.000", "5,000,000", 5000000 -> 5000000; '' -> null; selain angka -> NaN. */
const parseUang = (value) => {
  const v = cellValue(value);
  if (v === null || v === undefined || String(v).trim() === '') return null;
  if (typeof v === 'number') return Math.round(v);
  const text = String(v).trim().replace(/^rp\.?\s*/i, '');
  if (/[^0-9.,\s-]/.test(text)) return NaN;
  const digits = text.replace(/[.,\s](?=\d{3}(\D|$))/g, '').replace(/[.,]\d{1,2}$/, '');
  return digits === '' ? null : Number(digits.replace(/[^0-9-]/g, ''));
};

/** Date / 'YYYY-MM-DD' / 'DD/MM/YYYY' / 'DD-MM-YYYY' -> 'YYYY-MM-DD'; '' -> null; tidak valid -> undefined. */
const parseTanggal = (value) => {
  const v = cellValue(value);
  if (v === null || v === undefined || String(v).trim() === '') return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? undefined : v.toISOString().slice(0, 10);
  const text = String(v).trim();
  let m = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return undefined;
};

/**
 * Nomor VA: hanya angka (spasi/titik/strip pemisah dibuang); '' -> null; tidak valid -> undefined.
 * Sel angka dari Excel dibaca tanpa notasi eksponen — tetapi angka > 15 digit sudah kehilangan
 * presisi di Excel, jadi kolom ini sebaiknya diformat Text (template sudah begitu).
 */
const parseVa = (value) => {
  const v = cellValue(value);
  if (v === null || v === undefined || String(v).trim() === '') return null;
  const text = typeof v === 'number' ? v.toLocaleString('fullwide', { useGrouping: false }) : String(v).replace(/[\s.-]/g, '');
  return /^[0-9]{1,30}$/.test(text) ? text : undefined;
};

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
    throw new ApiError(400, `Kolom wajib tidak ditemukan di baris pertama: ${labels.join(', ')}. Gunakan template import.`);
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
  return { rows, kolom: new Set(keys.filter(Boolean)) };
};

const periodeLabel = (ta) => `${ta.nama} ${ta.jenisSemester}`;

/**
 * Validasi + bandingkan dengan tagihan yang sudah ada. Tidak menulis apa pun.
 * aksi: BARU | UBAH | TETAP | GAGAL.
 */
const analyze = async (fileBase64) => {
  const { rows, kolom } = await readRows(fileBase64);
  if (!rows.length) throw new ApiError(400, 'File tidak berisi data tagihan');

  const nims = [...new Set(rows.map((r) => str(r.data.nim)).filter(Boolean))];
  const [mahasiswaList, tahunAjaranList] = await Promise.all([
    Mahasiswa.findAll({
      where: { nim: { [Op.in]: nims } },
      attributes: ['id', 'nim', 'namaLengkap', 'tahunMasuk', 'statusMasuk', 'semesterDiakui', 'jumlahSemesterCuti', 'semesterOverride'],
      include: [{ model: TahunAjaran, as: 'tahunAjaran', attributes: ['jenisSemester'], required: false }],
    }),
    TahunAjaran.findAll({ attributes: ['id', 'nama', 'tahunMulai', 'jenisSemester'] }),
  ]);
  const mahasiswaByNim = new Map(mahasiswaList.map((m) => [m.nim, m]));
  const existingList = mahasiswaList.length
    ? await TagihanKuliah.findAll({ where: { mahasiswaId: { [Op.in]: mahasiswaList.map((m) => m.id) } } })
    : [];
  const existingByKey = new Map(existingList.map((t) => [`${t.mahasiswaId}|${t.tahunAjaranId}`, t]));

  const seen = new Map();
  const result = rows.map(({ rowNumber, data }) => {
    const nim = str(data.nim);
    const errors = [];
    const mahasiswa = mahasiswaByNim.get(nim);
    if (!nim) errors.push('NIM kosong');
    else if (!mahasiswa) errors.push(`NIM ${nim} tidak terdaftar`);

    const taText = str(data.tahunAkademik).replace(/\s+/g, '');
    const semText = str(data.semester).toUpperCase();
    const jenis = /^GANJIL$|^1$/.test(semText) ? 'GANJIL' : /^GENAP$|^2$/.test(semText) ? 'GENAP' : null;
    const tahunAjaran = tahunAjaranList.find((t) => t.nama === taText && t.jenisSemester === jenis);
    if (!jenis) errors.push(`Semester "${str(data.semester)}" harus Ganjil atau Genap`);
    else if (!tahunAjaran) errors.push(`Tahun Akademik ${taText || '(kosong)'} ${jenis} belum terdaftar di master Tahun Ajaran`);

    const totalTagihan = parseUang(data.totalTagihan);
    const totalBayar = parseUang(data.totalBayar) ?? 0;
    const tunggakan = parseUang(data.tunggakan) ?? 0;
    const sisaBayar = parseUang(data.sisaBayar);
    const jatuhTempo = parseTanggal(data.jatuhTempo);
    const keterangan = str(data.keterangan).slice(0, 255) || null;
    const noVirtualAccount = parseVa(data.noVirtualAccount);
    if (noVirtualAccount === undefined) errors.push('No Virtual Account harus berupa angka (maks. 30 digit)');
    [['Total Tagihan', totalTagihan], ['Total Bayar', totalBayar], ['Tunggakan', tunggakan], ['Sisa Bayar', sisaBayar]].forEach(([label, v]) => {
      if (Number.isNaN(v)) errors.push(`${label} bukan angka`);
      else if (v !== null && v < 0) errors.push(`${label} tidak boleh negatif`);
    });
    if (totalTagihan === null) errors.push('Total Tagihan wajib diisi');
    if (jatuhTempo === undefined) errors.push('Jatuh Tempo tidak valid (format YYYY-MM-DD atau DD/MM/YYYY)');
    const angkaValid = [totalTagihan, totalBayar, tunggakan].every((v) => Number.isFinite(v));
    if (angkaValid && Number.isFinite(sisaBayar)) {
      const seharusnya = Math.max(totalTagihan - totalBayar, 0);
      if (sisaBayar !== seharusnya) {
        errors.push(
          `Sisa Bayar ${sisaBayar.toLocaleString('id-ID')} tidak sama dengan Total Tagihan - Total Bayar (${seharusnya.toLocaleString('id-ID')}); tunggakan tidak dihitung di Sisa Bayar`
        );
      }
    }

    if (mahasiswa && tahunAjaran) {
      const key = `${mahasiswa.id}|${tahunAjaran.id}`;
      if (seen.has(key)) errors.push(`Duplikat dengan baris ${seen.get(key)} (NIM & periode sama)`);
      else seen.set(key, rowNumber);
    }

    const base = {
      rowNumber,
      nim,
      namaLengkap: mahasiswa?.namaLengkap ?? null,
      periode: tahunAjaran ? periodeLabel(tahunAjaran) : [taText, jenis ?? str(data.semester)].filter(Boolean).join(' '),
      totalTagihan: Number.isFinite(totalTagihan) ? totalTagihan : null,
      totalBayar: Number.isFinite(totalBayar) ? totalBayar : null,
      tunggakan: Number.isFinite(tunggakan) ? tunggakan : null,
      sisaBayar: angkaValid ? Math.max(totalTagihan - totalBayar, 0) : null,
      tanggalJatuhTempo: jatuhTempo ?? null,
      noVirtualAccount: noVirtualAccount ?? null,
      keterangan,
    };
    if (errors.length) return { ...base, aksi: 'GAGAL', error: errors.join('; ') };

    const nilaiBaru = { totalTagihan, totalBayarImport: totalBayar, tunggakan, tanggalJatuhTempo: jatuhTempo, keterangan };
    // VA opsional: kolom tidak ada di file / sel kosong = VA tersimpan dipertahankan (tidak dihapus).
    if (kolom.has('noVirtualAccount') && noVirtualAccount) nilaiBaru.noVirtualAccount = noVirtualAccount;
    const existing = existingByKey.get(`${mahasiswa.id}|${tahunAjaran.id}`);
    const internal = { mahasiswa, tahunAjaran, existing, nilaiBaru };
    if (!existing) return { ...base, aksi: 'BARU', perubahan: [], _internal: internal };

    const perubahan = Object.entries(nilaiBaru)
      .filter(([k, v]) => {
        const lama = nilaiTersimpan(existing, k);
        return String(lama ?? '') !== String(v ?? '') && !(Number(lama) === Number(v) && v !== null && typeof v === 'number');
      })
      .map(([k, v]) => ({ field: FIELD_LABEL[k], lama: nilaiTersimpan(existing, k) ?? null, baru: v }));
    return { ...base, aksi: perubahan.length ? 'UBAH' : 'TETAP', perubahan, _internal: internal };
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

const previewImport = async (fileBase64) => {
  const { summary, rows } = await analyze(fileBase64);
  return { summary, rows: stripInternal(rows) };
};

const commitImport = async (fileBase64, fileName, actorId) => {
  const { summary, rows } = await analyze(fileBase64);
  const sukses = summary.baru + summary.ubah + summary.tetap;
  const now = new Date();

  const batch = await sequelize.transaction(async (transaction) => {
    const created = await TagihanImportBatch.create(
      {
        fileName: fileName ? String(fileName).slice(0, 255) : null,
        status: !sukses ? 'GAGAL' : summary.gagal ? 'SEBAGIAN' : 'BERHASIL',
        totalRows: summary.totalRows,
        createdRows: summary.baru,
        updatedRows: summary.ubah,
        unchangedRows: summary.tetap,
        failedRows: summary.gagal,
        errors: rows.filter((r) => r.aksi === 'GAGAL').map((r) => ({ row: r.rowNumber, nim: r.nim, message: r.error })),
        importedBy: actorId,
        importedAt: now,
      },
      { transaction }
    );

    const logs = [];
    for (const r of rows) {
      const log = { batchId: created.id, rowNumber: r.rowNumber, nim: r.nim || null, aksi: r.aksi };
      if (r.aksi === 'GAGAL') {
        logs.push({ ...log, pesan: r.error.slice(0, 500) });
        continue;
      }
      const { mahasiswa, tahunAjaran, existing, nilaiBaru } = r._internal;
      log.mahasiswaId = mahasiswa.id;
      if (r.aksi === 'TETAP') {
        logs.push({ ...log, tagihanKuliahId: existing.id, nilaiBaru });
        continue;
      }
      const data = { ...keKolom(nilaiBaru), sumber: 'IMPORT', importBatchId: created.id, importedAt: now, updatedBy: actorId };
      if (r.aksi === 'UBAH') {
        const nilaiLama = Object.fromEntries(Object.keys(nilaiBaru).map((k) => [k, nilaiTersimpan(existing, k) ?? null]));
        await existing.update(data, { transaction });
        logs.push({ ...log, tagihanKuliahId: existing.id, nilaiLama, nilaiBaru });
      } else {
        const tagihan = await TagihanKuliah.create(
          {
            ...data,
            mahasiswaId: mahasiswa.id,
            tahunAjaranId: tahunAjaran.id,
            semester: resolveSemesterMahasiswa(mahasiswa, tahunAjaran),
            createdBy: actorId,
          },
          { transaction }
        );
        logs.push({ ...log, tagihanKuliahId: tagihan.id, nilaiBaru });
      }
    }
    await TagihanImportLog.bulkCreate(logs, { transaction });
    await syncPotonganTagihan(
      rows.filter((r) => r.aksi === 'BARU' || r.aksi === 'UBAH').map((r) => r._internal.mahasiswa.id),
      { transaction }
    );
    return created;
  });

  return { batchId: batch.id, status: batch.status, summary, errors: batch.errors };
};

const listBatches = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const { rows, count } = await TagihanImportBatch.findAndCountAll({
    include: [{ model: User, as: 'importer', attributes: ['id', 'name'], required: false }],
    order: [['id', 'DESC']],
    limit,
    offset,
  });
  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

const getBatchDetail = async (id) => {
  const batch = await TagihanImportBatch.findByPk(id, {
    include: [
      { model: User, as: 'importer', attributes: ['id', 'name'], required: false },
      {
        model: TagihanImportLog,
        as: 'logs',
        include: [{ model: Mahasiswa, as: 'mahasiswa', attributes: ['id', 'nim', 'namaLengkap'], required: false }],
      },
    ],
    order: [[{ model: TagihanImportLog, as: 'logs' }, 'rowNumber', 'ASC']],
  });
  if (!batch) throw new ApiError(404, 'Riwayat import tidak ditemukan');
  return batch;
};

const exportTemplate = () => {
  const workbook = buildWorkbook('Tagihan', COLUMNS, [
    {
      nim: '134612610001',
      tahunAkademik: '2026/2027',
      semester: 'Ganjil',
      totalTagihan: 5000000,
      totalBayar: 3000000,
      tunggakan: 500000,
      sisaBayar: 2000000,
      jatuhTempo: '2026-11-30',
      noVirtualAccount: '8808134612610001',
      keterangan: 'Contoh (hapus baris ini)',
    },
  ]);
  // Format Text supaya nomor VA panjang tidak dibulatkan / jadi notasi eksponen oleh Excel.
  workbook.getWorksheet('Tagihan').getColumn('noVirtualAccount').numFmt = '@';
  return workbook;
};

module.exports = { previewImport, commitImport, listBatches, getBatchDetail, exportTemplate, parseUang, parseTanggal, parseVa, cellValue, str };
