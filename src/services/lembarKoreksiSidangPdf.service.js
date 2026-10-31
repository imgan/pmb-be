const PDFDocument = require('pdfkit');
const { drawKop } = require('../utils/pdfKop');
const { programStudiLengkap, longDate } = require('./formulirSidangTaPdf.service');

const CITY_NAME = 'Bekasi';
const DOTS = '..............................................';
// Baris kosong minimal di tabel supaya masih ada ruang koreksi tulisan tangan saat sidang.
const MIN_ROWS = 10;
const PERAN_LABEL = {
  PEMBIMBING_1: 'Pembimbing I',
  PEMBIMBING_2: 'Pembimbing II',
  PENGUJI_1: 'Penguji I',
  PENGUJI_2: 'Penguji II',
};

const lembarKoreksiBaseName = (data) => `LEMBAR_KOREKSI_SIDANG_TA_${data.mahasiswa.nim}`;

/**
 * Lembar Koreksi Sidang Tugas Akhir dari satu dosen (sesuai perannya) untuk satu mahasiswa.
 * Butir koreksi diisi dosen di portal dosen; kolom Keterangan bertanda "Selesai" untuk butir
 * yang revisinya sudah dinyatakan selesai, sisanya kosong untuk paraf.
 */
const buildLembarKoreksiSidangPdf = (data, kampus) => {
  const { peran, dosen, mahasiswa, jurusan, sidang, items } = data;
  const doc = new PDFDocument({ size: 'A4', margin: 56, bufferPages: true, info: { Title: lembarKoreksiBaseName(data) } });
  const left = doc.page.margins.left;
  const contentWidth = doc.page.width - left - doc.page.margins.right;

  drawKop(doc, kampus);

  doc.font('Times-Bold').fontSize(12).fillColor('black');
  doc.text('LEMBAR KOREKSI SIDANG TUGAS AKHIR', left, doc.y, { width: contentWidth, align: 'center', underline: true });
  doc.moveDown(0.2);
  doc.fontSize(11).text(`PROGRAM STUDI ${programStudiLengkap(jurusan).toUpperCase()}`, { width: contentWidth, align: 'center' });
  if (sidang.tahunAjaran) doc.text(`TA ${sidang.tahunAjaran}`, { width: contentWidth, align: 'center' });
  doc.moveDown(1);

  const labelWidth = 110;
  const identitas = (label, value) => {
    const y = doc.y;
    const valueX = left + labelWidth + 10;
    doc.font('Times-Roman').fontSize(11);
    doc.text(label, left, y, { width: labelWidth, lineBreak: false });
    doc.text(':', left + labelWidth, y, { lineBreak: false });
    doc.text(value || DOTS, valueX, y, { width: contentWidth - labelWidth - 10 });
    doc.moveDown(0.35);
  };
  identitas('Nama Mahasiswa', mahasiswa.namaLengkap);
  identitas('NIM', mahasiswa.nim);
  identitas('Judul Tugas Akhir', sidang.judul);
  identitas('Tanggal Sidang', sidang.tanggal ? longDate(sidang.tanggal) : null);
  identitas(PERAN_LABEL[peran] ?? 'Dosen', dosen.namaLengkap);
  doc.moveDown(0.5);

  // ---- Tabel koreksi ----
  const noW = 30;
  const babW = 95;
  const ketW = 75;
  const uraianW = contentWidth - noW - babW - ketW;
  const xNo = left;
  const xBab = xNo + noW;
  const xUraian = xBab + babW;
  const xKet = xUraian + uraianW;
  const pad = 5;
  const minRowH = 22;
  const bottomLimit = doc.page.height - doc.page.margins.bottom;

  const drawHeader = () => {
    const y = doc.y;
    const h = 22;
    doc.font('Times-Bold').fontSize(10).lineWidth(0.8);
    [
      [xNo, noW, 'No.'],
      [xBab, babW, 'Bab / Halaman'],
      [xUraian, uraianW, 'Uraian Koreksi'],
      [xKet, ketW, 'Keterangan'],
    ].forEach(([x, w, label]) => {
      doc.rect(x, y, w, h).stroke();
      doc.text(label, x, y + 6, { width: w, align: 'center' });
    });
    doc.y = y + h;
  };
  drawHeader();

  const rows = items.map((it, i) => [String(i + 1), it.babHalaman || '', it.uraian, it.isSelesai ? 'Selesai' : '']);
  while (rows.length < MIN_ROWS) rows.push([String(rows.length + 1), '', '', '']);

  doc.font('Times-Roman').fontSize(10);
  rows.forEach(([no, bab, uraian, ket]) => {
    const h = Math.max(
      minRowH,
      doc.heightOfString(uraian || ' ', { width: uraianW - pad * 2 }) + pad * 2,
      doc.heightOfString(bab || ' ', { width: babW - pad * 2 }) + pad * 2
    );
    if (doc.y + h > bottomLimit) {
      doc.addPage();
      drawHeader();
      doc.font('Times-Roman').fontSize(10);
    }
    const y = doc.y;
    doc.rect(xNo, y, noW, h).stroke();
    doc.rect(xBab, y, babW, h).stroke();
    doc.rect(xUraian, y, uraianW, h).stroke();
    doc.rect(xKet, y, ketW, h).stroke();
    doc.text(no, xNo, y + pad, { width: noW, align: 'center' });
    if (bab) doc.text(bab, xBab + pad, y + pad, { width: babW - pad * 2 });
    if (uraian) doc.text(uraian, xUraian + pad, y + pad, { width: uraianW - pad * 2 });
    if (ket) doc.text(ket, xKet, y + pad, { width: ketW, align: 'center' });
    doc.y = y + h;
  });
  doc.lineWidth(1);

  // Blok TTD: di-center dalam satu kolom di kanan (pola yang sama dengan KHS), bold hitam.
  const sigBlockH = 110;
  if (doc.y + sigBlockH > bottomLimit) doc.addPage();
  doc.y += 24;
  doc.font('Times-Bold').fontSize(11).fillColor('black');
  const headLines = [`${CITY_NAME}, ${longDate(sidang.tanggal)}`, `${PERAN_LABEL[peran] ?? 'Dosen'},`];
  const sigWidth = Math.ceil(Math.max(...[...headLines, dosen.namaLengkap].map((t) => doc.widthOfString(t)))) + 2;
  const sigX = left + contentWidth - sigWidth;
  headLines.forEach((t) => doc.text(t, sigX, doc.y, { width: sigWidth, align: 'center' }));
  doc.moveDown(3.5);
  doc.text(dosen.namaLengkap, sigX, doc.y, { width: sigWidth, align: 'center', underline: true });

  doc.end();
  return doc;
};

module.exports = { buildLembarKoreksiSidangPdf, lembarKoreksiBaseName };
