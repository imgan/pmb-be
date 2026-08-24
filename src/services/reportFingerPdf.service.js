const PDFDocument = require('pdfkit');

const CONTENT_WIDTH = 595.28 - 56 * 2;

const COLS = [
  { key: 'no', label: 'No', width: 34, align: 'center' },
  { key: 'hari', label: 'Hari', width: 83 },
  { key: 'tanggal', label: 'Tanggal', width: 94, align: 'center' },
  { key: 'status', label: 'Status', width: 83, align: 'center' },
  { key: 'jamMasuk', label: 'Jam Masuk (hh.mm)', width: 94, align: 'center' },
  { key: 'terlambat', label: 'Terlambat (hh.mm)', width: 88, align: 'center' },
  { key: 'jamKeluar', label: 'Jam Keluar (hh.mm)', width: 94, align: 'center' },
  { key: 'pulangCepat', label: 'Pulang Cepat (hh.mm)', width: 88, align: 'center' },
  { key: 'jumlahJam', label: 'Jumlah Jam (hh.mm)', width: 71, align: 'center' },
];
const PAGI_COLS = ['jamMasuk', 'terlambat', 'jamKeluar', 'pulangCepat'];

const kv = (doc, label, value, { labelWidth = 90 } = {}) => {
  const left = doc.page.margins.left;
  const y = doc.y;
  doc.font('Helvetica-Bold').fontSize(10).text(label, left, y, { width: labelWidth, lineBreak: false });
  doc.font('Helvetica').text(`: ${value ?? '-'}`, left + labelWidth, y, { width: CONTENT_WIDTH - labelWidth });
  doc.x = left;
  doc.moveDown(0.2);
};

const buildReportFingerPdf = (data) => {
  const { karyawan, periodeAwal, periodeAkhir, rows, totalTerlambatHours, totalJumlahJam, grandTotalJam, normalJam, weeks } = data;
  const doc = new PDFDocument({ size: 'A4', margin: 56, bufferPages: true, layout: 'landscape' });
  const tableX = doc.page.margins.left;
  const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  doc.font('Helvetica-Bold').fontSize(15).text('Rekap Kehadiran Karyawan', { align: 'center' });
  doc.font('Helvetica').fontSize(11).text(`${periodeAwal} S/D ${periodeAkhir}`, { align: 'center' });
  doc.moveDown(1);

  kv(doc, 'Nama', karyawan.namaLengkap);
  kv(doc, 'Bagian', karyawan.bagian || '-');
  doc.moveDown(0.6);

  const rowH = 18;
  const headerRowH = 16;
  const headerSubRowH = 28;
  const drawCell = (x, y, width, height, text, { bold = false, align = 'left', fontSize = 8.5, top = false } = {}) => {
    doc.rect(x, y, width, height).stroke();
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(fontSize);
    const textY = top ? y + 3 : y + height / 2 - 4;
    doc.text(text, x + 2, textY, { width: width - 4, align });
  };

  // Header row 1 — draw columns in COLS order; the Pagi group (jamMasuk/terlambat/jamKeluar/pulangCepat)
  // is drawn once as a wide cell spanning its 4 members' combined width, in place.
  const headerY = doc.y;
  const headerTotalH = headerRowH + headerSubRowH;
  const pagiWidth = COLS.filter((c) => PAGI_COLS.includes(c.key)).reduce((sum, c) => sum + c.width, 0);
  let x = tableX;
  let pagiGroupX = null;
  COLS.forEach((c) => {
    if (PAGI_COLS.includes(c.key)) {
      if (pagiGroupX === null) {
        pagiGroupX = x;
        drawCell(x, headerY, pagiWidth, headerRowH, 'Pagi', { bold: true, align: 'center' });
      }
      x += c.width;
      return;
    }
    drawCell(x, headerY, c.width, headerTotalH, c.label, { bold: true, align: c.align, fontSize: 7.5, top: true });
    x += c.width;
  });

  // Header row 2 (Pagi sub-columns)
  let subX = pagiGroupX;
  const subY = headerY + headerRowH;
  COLS.filter((c) => PAGI_COLS.includes(c.key)).forEach((c) => {
    drawCell(subX, subY, c.width, headerSubRowH, c.label, { bold: true, align: c.align, fontSize: 7.5, top: true });
    subX += c.width;
  });

  doc.y = headerY + headerTotalH;

  rows.forEach((r, i) => {
    if (doc.y + rowH > doc.page.height - doc.page.margins.bottom - 60) {
      doc.addPage();
      doc.y = doc.page.margins.top;
    }
    let cx = tableX;
    const cy = doc.y;
    const values = {
      no: String(i + 1),
      hari: r.hari,
      tanggal: r.tanggal.split('-').reverse().join('-'),
      status: r.status || '',
      jamMasuk: r.jamMasuk,
      terlambat: r.terlambatLabel,
      jamKeluar: r.jamKeluar,
      pulangCepat: r.pulangCepatLabel,
      jumlahJam: r.jumlahJam.toFixed(2),
    };
    COLS.forEach((c) => {
      drawCell(cx, cy, c.width, rowH, values[c.key], { align: c.align });
      cx += c.width;
    });
    doc.y = cy + rowH;
  });

  // Total row
  {
    const y = doc.y;
    const labelWidth = COLS[0].width + COLS[1].width + COLS[2].width + COLS[3].width + COLS[4].width;
    drawCell(tableX, y, labelWidth, rowH, 'Total Jam', { bold: true });
    let x2 = tableX + labelWidth;
    drawCell(x2, y, COLS[5].width, rowH, totalTerlambatHours.toFixed(2), { bold: true, align: 'center' });
    x2 += COLS[5].width;
    drawCell(x2, y, COLS[6].width, rowH, '', { align: 'center' });
    x2 += COLS[6].width;
    drawCell(x2, y, COLS[7].width, rowH, '0.00', { bold: true, align: 'center' });
    x2 += COLS[7].width;
    drawCell(x2, y, COLS[8].width, rowH, totalJumlahJam.toFixed(2), { bold: true, align: 'center' });
    doc.y = y + rowH;
  }

  // Grand total block
  {
    const y = doc.y;
    const labelWidth = COLS[0].width + COLS[1].width + COLS[2].width + COLS[3].width + COLS[4].width + COLS[5].width;
    const valueWidth = COLS[6].width + COLS[7].width + COLS[8].width;
    drawCell(tableX, y, labelWidth, rowH * 2, 'Grand Total', { bold: true });
    doc.rect(tableX + labelWidth, y, valueWidth, rowH * 2).stroke();
    doc.font('Helvetica-Bold').fontSize(8.5);
    doc.text(`${grandTotalJam.toFixed(2)} Jam`, tableX + labelWidth + 2, y + 4, { width: valueWidth - 4, align: 'center' });
    doc.font('Helvetica').fontSize(7.5);
    doc.text(`Normalnya ${normalJam} Jam (40 Jam * ${weeks} Minggu)`, tableX + labelWidth + 2, y + 18, {
      width: valueWidth - 4,
      align: 'center',
    });
    doc.y = y + rowH * 2;
  }

  doc.end();
  return doc;
};

module.exports = { buildReportFingerPdf };
