const { Op } = require('sequelize');
const { SyncFingerLog, Karyawan } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');
const { buildWorkbook, parseWorkbookFromBase64, cellString } = require('../utils/excel');

const MESIN_VALUES = ['A1', 'A2'];

const ensureValidMesin = (mesin) => {
  if (!MESIN_VALUES.includes(mesin)) throw new ApiError(400, 'Mesin tidak valid');
};

const SORTABLE_COLUMNS = {
  nik: ['nik'],
  tanggal: ['tanggal'],
  status: ['status'],
};

const listLog = async (mesin, query) => {
  ensureValidMesin(mesin);
  const { page, limit, offset } = getPagination(query);
  const where = { mesin };
  if (query.search) {
    where[Op.or] = [{ nik: { [Op.like]: `%${query.search}%` } }];
  }

  const { rows, count } = await SyncFingerLog.findAndCountAll({
    where,
    include: [{ model: Karyawan, as: 'karyawan', attributes: ['id', 'namaLengkap', 'nip'], required: false }],
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS, [['tanggal', 'DESC']]),
  });
  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

/**
 * Fingerprint machine exports (e.g. ZKTeco attendance dumps) are uploaded here as an
 * Excel file with NIK + Tanggal columns. This simulates "pulling" raw scan logs from the
 * machine since no physical device is reachable from this app.
 */
const parseTanggal = (rawValue) => {
  if (rawValue instanceof Date) return rawValue;
  const str = cellString(rawValue);
  if (!str) return null;
  const parsed = new Date(str);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const pullFromMachine = async (mesin, fileBase64, actorId) => {
  ensureValidMesin(mesin);
  const rows = await parseWorkbookFromBase64(fileBase64);
  const errors = [];
  let successCount = 0;

  for (const { rowNumber, data } of rows) {
    const nik = cellString(data['NIK']);
    const tanggal = parseTanggal(data['Tanggal']);

    if (!nik) {
      errors.push({ row: rowNumber, message: 'NIK wajib diisi' });
      continue;
    }
    if (!tanggal) {
      errors.push({ row: rowNumber, message: 'Tanggal wajib diisi dan harus berupa tanggal yang valid' });
      continue;
    }

    try {
      await SyncFingerLog.create({
        mesin,
        nik,
        tanggal,
        status: 'PENDING',
        createdBy: actorId,
        updatedBy: actorId,
      });
      successCount += 1;
    } catch (err) {
      errors.push({ row: rowNumber, message: err.message });
    }
  }

  return { successCount, errorCount: errors.length, errors };
};

/**
 * Commits every PENDING row for the given mesin: resolves the matching Karyawan by
 * idFinger and marks the row PROCESSED. Rows with no matching karyawan are still marked
 * PROCESSED (karyawanId stays null) so the queue doesn't get stuck on bad/unenrolled NIKs.
 */
const insertToDatabase = async (mesin, actorId) => {
  ensureValidMesin(mesin);
  const pending = await SyncFingerLog.findAll({ where: { mesin, status: 'PENDING' } });
  if (!pending.length) {
    return { processedCount: 0, matchedCount: 0, unmatchedCount: 0 };
  }

  const niks = [...new Set(pending.map((row) => row.nik))];
  const karyawanList = await Karyawan.findAll({ where: { idFinger: { [Op.in]: niks } } });
  const karyawanByNik = new Map(karyawanList.map((k) => [k.idFinger, k]));

  let matchedCount = 0;
  await Promise.all(
    pending.map(async (row) => {
      const karyawan = karyawanByNik.get(row.nik);
      if (karyawan) matchedCount += 1;
      await row.update({
        karyawanId: karyawan ? karyawan.id : null,
        status: 'PROCESSED',
        processedAt: new Date(),
        updatedBy: actorId,
      });
    })
  );

  return { processedCount: pending.length, matchedCount, unmatchedCount: pending.length - matchedCount };
};

const TEMPLATE_COLUMNS = [
  { header: 'NIK', key: 'nik' },
  { header: 'Tanggal', key: 'tanggal' },
];

const exportTemplate = () => {
  const sample = { nik: '1234', tanggal: '2026-08-22 07:55:00' };
  return buildWorkbook('Sync Finger', TEMPLATE_COLUMNS, [sample]);
};

module.exports = { listLog, pullFromMachine, insertToDatabase, exportTemplate };
