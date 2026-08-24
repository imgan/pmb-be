const ExcelJS = require('exceljs');

/**
 * @param {string} sheetName
 * @param {{ header: string, key: string, width?: number }[]} columns
 * @param {Record<string, unknown>[]} rows
 */
const buildWorkbook = (sheetName, columns, rows) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  sheet.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 22 }));
  sheet.getRow(1).font = { bold: true };
  rows.forEach((row) => sheet.addRow(row));
  return workbook;
};

const sendWorkbook = async (res, workbook, filename) => {
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  await workbook.xlsx.write(res);
  res.end();
};

/**
 * Parse baris data dari file Excel (base64 data URI atau base64 polos).
 * Baris dipetakan berdasarkan TEKS HEADER di baris pertama, bukan posisi kolom,
 * supaya file hasil export bisa langsung dipakai sebagai template import.
 * @returns {Promise<{ rowNumber: number, data: Record<string, unknown> }[]>}
 */
const parseWorkbookFromBase64 = async (base64) => {
  const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
  const buffer = Buffer.from(base64Data, 'base64');

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const headers = [];
  sheet.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber] = String(cell.value ?? '').trim();
  });

  const rows = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const data = {};
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const header = headers[colNumber];
      if (!header) return;
      let value = cell.value;
      if (value && typeof value === 'object' && 'text' in value) value = value.text;
      if (value && typeof value === 'object' && value instanceof Date) value = value;
      data[header] = value;
    });
    const hasContent = Object.values(data).some((v) => v !== null && v !== undefined && String(v).trim() !== '');
    if (hasContent) rows.push({ rowNumber, data });
  });

  return rows;
};

const cellString = (value) => {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
};

const cellBoolean = (value, defaultValue = true) => {
  const str = cellString(value).toLowerCase();
  if (!str) return defaultValue;
  return ['ya', 'yes', 'true', '1', 'aktif'].includes(str);
};

module.exports = { buildWorkbook, sendWorkbook, parseWorkbookFromBase64, cellString, cellBoolean };
