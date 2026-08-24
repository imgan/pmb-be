const PDFDocument = require('pdfkit');

const CONTENT_WIDTH = 595.28 - 56 * 2;

const MONTHS_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const longDate = (value) => {
  const d = value ? new Date(value) : new Date();
  return `${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`;
};

const formatRupiah = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const kv = (doc, label, value, { labelWidth = 90 } = {}) => {
  const left = doc.page.margins.left;
  const y = doc.y;
  doc.font('Helvetica-Bold').fontSize(10).text(label, left, y, { width: labelWidth, lineBreak: false });
  doc.font('Helvetica').text(`: ${value ?? '-'}`, left + labelWidth, y, { width: CONTENT_WIDTH - labelWidth });
  doc.x = left;
  doc.moveDown(0.2);
};

const buildVocDosenFtidPdf = (data, kampus) => {
  const { dosen, semesterLabel, tahunAjaranNama, pembuatanSoal, totalPembuatanSoal, koreksiSoal, totalKoreksiSoal, pengawas, totalPengawas, grandTotal } =
    data;
  const doc = new PDFDocument({ size: 'A4', margin: 56, bufferPages: true });
  const tableX = doc.page.margins.left;
  const rowH = 24;

  doc.font('Helvetica-Bold').fontSize(12).text((kampus?.namaKampus || 'Perguruan Tinggi').toUpperCase());
  doc.font('Helvetica').fontSize(9);
  if (kampus?.alamat) doc.text(kampus.alamat);
  if (kampus?.telepon) doc.text(`Telp. ${kampus.telepon}`);
  doc.moveDown(0.8);

  doc.font('Helvetica-Bold').fontSize(12).text('VOUCHER PEMBUATAN SOAL, KOREKSI DAN MENGAWAS UAS', { align: 'center' });
  doc.text(`SEMESTER ${semesterLabel} TAHUN AKADEMIK ${tahunAjaranNama}`, { align: 'center' });
  doc.moveDown(1);

  doc.x = tableX;
  kv(doc, 'Kode', dosen.nidn);
  kv(doc, 'Nama', dosen.namaLengkap);
  doc.moveDown(0.6);

  const drawCell = (x, y, width, height, text, { bold = false, align = 'left', fontSize = 8.5 } = {}) => {
    doc.rect(x, y, width, height).stroke();
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(fontSize);
    doc.text(text, x + 3, y + height / 2 - 4, { width: width - 6, align });
  };

  const drawSectionHeader = (title, width) => {
    const y = doc.y;
    drawCell(tableX, y, width, rowH, title, { bold: true, align: 'center' });
    doc.y = y + rowH;
  };

  const drawTableHeader = (cols) => {
    let x = tableX;
    const y = doc.y;
    cols.forEach((c) => {
      drawCell(x, y, c.width, rowH, c.label, { bold: true, align: c.align ?? 'center' });
      x += c.width;
    });
    doc.y = y + rowH;
  };

  const drawDataRow = (cols, values) => {
    let x = tableX;
    const y = doc.y;
    cols.forEach((c, idx) => {
      drawCell(x, y, c.width, rowH, values[idx], { align: c.align ?? 'left', fontSize: 7.5 });
      x += c.width;
    });
    doc.y = y + rowH;
  };

  const drawTotalRow = (label, labelWidth, valueLabel, valueWidth) => {
    const y = doc.y;
    drawCell(tableX, y, labelWidth, rowH, label, { bold: true, align: 'right' });
    drawCell(tableX + labelWidth, y, valueWidth, rowH, valueLabel, { bold: true, align: 'right' });
    doc.y = y + rowH;
  };

  // --- Section 1: Pembuatan & Penggandaan Soal ---
  drawSectionHeader('Pembuatan & Penggandaan Soal', CONTENT_WIDTH);
  const cols1 = [
    { label: 'No', width: 24, align: 'center' },
    { label: 'Kode MK', width: 70, align: 'center' },
    { label: 'Kelas - Matakuliah', width: CONTENT_WIDTH - 24 - 70 - 90 },
    { label: 'Nominal (Rp)', width: 90, align: 'right' },
  ];
  drawTableHeader(cols1);
  pembuatanSoal.forEach((r, i) => drawDataRow(cols1, [String(i + 1), r.kodeMk, r.kelasMatakuliah, formatRupiah(r.nominal)]));
  drawTotalRow('Jumlah', CONTENT_WIDTH - 90, formatRupiah(totalPembuatanSoal), 90);
  doc.moveDown(0.4);

  // --- Section 2: Koreksi Soal ---
  drawSectionHeader('Koreksi Soal (Tarif Rp. 3.000)', CONTENT_WIDTH);
  const cols2 = [
    { label: 'No', width: 24, align: 'center' },
    { label: 'Kode MK', width: 55, align: 'center' },
    { label: 'Kelas - Matakuliah', width: CONTENT_WIDTH - 24 - 55 - 50 - 70 - 85 },
    { label: 'Jml Mhs', width: 50, align: 'center' },
    { label: 'Persentase', width: 70, align: 'center' },
    { label: 'Nominal (Rp)', width: 85, align: 'right' },
  ];
  drawTableHeader(cols2);
  koreksiSoal.forEach((r, i) =>
    drawDataRow(cols2, [
      String(i + 1),
      r.kodeMk,
      r.kelasMatakuliah,
      String(r.jumlahMhs),
      r.persentaseLabel,
      r.nominal > 0 ? formatRupiah(r.nominal) : '',
    ])
  );
  drawTotalRow('Jumlah', CONTENT_WIDTH - 90, formatRupiah(totalKoreksiSoal), 90);
  doc.moveDown(0.4);

  // --- Section 3: Pengawas ---
  drawSectionHeader('Pengawas', CONTENT_WIDTH);
  const cols3 = [
    { label: 'No', width: 24, align: 'center' },
    { label: 'Kode MK', width: 70, align: 'center' },
    { label: 'Kelas - Matakuliah', width: CONTENT_WIDTH - 24 - 70 - 50 - 90 },
    { label: 'SKS', width: 50, align: 'center' },
    { label: 'Nominal (Rp)', width: 90, align: 'right' },
  ];
  drawTableHeader(cols3);
  pengawas.forEach((r, i) => drawDataRow(cols3, [String(i + 1), r.kodeMk, r.kelasMatakuliah, String(r.sks), formatRupiah(r.nominal)]));
  drawTotalRow('Jumlah', CONTENT_WIDTH - 90, formatRupiah(totalPengawas), 90);
  doc.moveDown(0.2);

  drawTotalRow('Jumlah Keseluruhan', CONTENT_WIDTH - 90, formatRupiah(grandTotal), 90);

  doc.moveDown(2);
  doc.font('Helvetica').fontSize(10);
  const sigY = doc.y;
  doc.text('Petugas Pengarsipan', tableX, sigY, { width: 200 });
  doc.text(`${longDate(new Date())}`, tableX + 260, sigY, { width: 200, align: 'right' });
  doc.text('Dosen Pengampu', tableX + 260, sigY + 14, { width: 200, align: 'right' });
  doc.moveDown(3);
  const nameY = doc.y;
  doc.text('(....................................)', tableX, nameY, { width: 200 });
  doc.text(dosen.namaLengkap, tableX + 260, nameY, { width: 200, align: 'right' });

  doc.end();
  return doc;
};

module.exports = { buildVocDosenFtidPdf };
