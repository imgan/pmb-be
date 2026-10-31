const PDFDocument = require('pdfkit');
const { drawLogoEmblem } = require('../utils/pdfKop');
const { suratPdfDocOptions } = require('../utils/suratPdfName');
const { tahunAkademikFromDate } = require('../utils/tahunAjaran');
const { programStudiLengkap } = require('./formulirSidangTaPdf.service');

const DOTS = '..................................................................';
const NAMA_INSTITUSI = 'POLITEKNIK BHAKTI KARTINI';
const KOTA = 'BEKASI';
// Daftar konsultasi per pembimbing: 16 baris, dipecah 8 + 8 di dua halaman.
const TOTAL_ROWS = 16;
const ROWS_PER_PAGE = 8;
const ROW_HEIGHT = 60;

/**
 * Jurnal Konsultasi Tugas Akhir: halaman sampul + dua halaman "Daftar Konsultasi" (16 baris) per dosen
 * pembimbing. Sistem belum mencatat log konsultasi, jadi baris tabel (Tanggal/Materi/Paraf)
 * sengaja kosong untuk diisi tangan & diparaf pembimbing di tiap pertemuan.
 */
const buildJurnalKonsultasiTaPdf = (data, kampus) => {
  const { surat, mahasiswa, jurusan, pembimbing = [], sidang } = data;
  const doc = new PDFDocument(suratPdfDocOptions(data));
  const left = doc.page.margins.left;
  const contentWidth = doc.page.width - left - doc.page.margins.right;
  const centerX = left + contentWidth / 2;
  const ta = sidang?.tahunAjaran || tahunAkademikFromDate(surat.tanggalInput);

  // ---- Halaman sampul ----
  doc.font('Times-Bold').fontSize(13).fillColor('black');
  doc.y = doc.page.margins.top + 10;
  [
    'JURNAL KONSULTASI TUGAS AKHIR',
    `PROGRAM STUDI ${programStudiLengkap(jurusan).toUpperCase()}`,
    `TA ${ta}`,
  ].forEach((line) => {
    doc.text(line, left, doc.y, { width: contentWidth, align: 'center' });
    doc.moveDown(0.3);
  });

  const logoY = doc.y + 60;
  const logoH = 150;
  drawLogoEmblem(doc, kampus?.logoUrl, 0, logoY, { height: logoH, centerX });

  // Blok identitas, label & titik dua sejajar; di-center kira-kira di tengah halaman.
  const identX = left + 50;
  const labelW = 110;
  const valueX = identX + labelW + 10;
  const valueW = left + contentWidth - 40 - valueX;
  let y = logoY + logoH + 90;
  const identRow = (label, value, { showLabel = true } = {}) => {
    doc.font('Times-Bold').fontSize(11);
    if (showLabel) {
      doc.text(label, identX, y, { width: labelW, lineBreak: false });
      doc.text(':', identX + labelW, y, { lineBreak: false });
    }
    doc.font('Times-Roman').text(value, valueX, y, { width: valueW });
    y = doc.y + 6;
  };
  identRow('Nama Mahasiswa', mahasiswa.namaLengkap);
  identRow('NIM', mahasiswa.nim);
  identRow('Dosen Pembimbing', `1. ${pembimbing[0] || DOTS}`);
  identRow('', `2. ${pembimbing[1] || DOTS}`, { showLabel: false });

  doc.font('Times-Bold').fontSize(12);
  const footerY = doc.page.height - doc.page.margins.bottom - 110;
  doc.text(NAMA_INSTITUSI, left, footerY, { width: contentWidth, align: 'center' });
  doc.moveDown(0.3);
  doc.text(KOTA, left, doc.y, { width: contentWidth, align: 'center' });

  // ---- Halaman daftar konsultasi (Pembimbing I selalu; Pembimbing II bila ada) ----
  const dosenList = [['Pembimbing I', pembimbing[0]]];
  if (pembimbing[1]) dosenList.push(['Pembimbing II', pembimbing[1]]);

  dosenList.forEach(([peranLabel, namaDosen]) => {
    doc.addPage();
    doc.font('Times-Bold').fontSize(13).fillColor('black');
    doc.text('DAFTAR KONSULTASI PROPOSAL/TUGAS AKHIR', left, doc.page.margins.top + 10, {
      width: contentWidth,
      align: 'center',
    });
    doc.moveDown(1);

    const infoLabelW = 110;
    const infoX = left + 15;
    const info = (label, value) => {
      const rowY = doc.y;
      doc.font('Times-Roman').fontSize(10);
      doc.text(label, infoX, rowY, { width: infoLabelW, lineBreak: false });
      doc.text(':', infoX + infoLabelW, rowY, { lineBreak: false });
      doc.text(value || DOTS, infoX + infoLabelW + 10, rowY, { width: contentWidth - infoLabelW - 25 });
      doc.moveDown(0.15);
    };
    info('Nama Mahasiswa', mahasiswa.namaLengkap);
    info('N.I.M', mahasiswa.nim);
    info(peranLabel, namaDosen);
    info('Judul KTI', sidang?.judul);
    doc.moveDown(0.8);

    // Tabel: No | Tanggal | Materi | Paraf — 16 baris: 1–8 di halaman ini, 9–16 di halaman
    // lanjutan (header tabel diulang) ditutup kotak catatan, sesuai format resmi.
    const noW = 36;
    const tglW = 80;
    const parafW = 70;
    const materiW = contentWidth - noW - tglW - parafW;
    const cols = [
      [left, noW, 'No.'],
      [left + noW, tglW, 'Tanggal'],
      [left + noW + tglW, materiW, 'Materi'],
      [left + noW + tglW + materiW, parafW, 'Paraf'],
    ];
    const headH = 20;
    const drawTableHeader = (y) => {
      doc.lineWidth(0.8).font('Times-Bold').fontSize(10);
      cols.forEach(([x, w, label]) => {
        doc.rect(x, y, w, headH).fillAndStroke('#D9D9D9', 'black');
        doc.fillColor('black').text(label, x, y + 6, { width: w, align: 'center' });
      });
      return y + headH;
    };
    const drawRows = (y, from, to) => {
      doc.font('Times-Roman').fontSize(10);
      for (let no = from; no <= to; no += 1) {
        cols.forEach(([x, w]) => doc.rect(x, y, w, ROW_HEIGHT).stroke());
        doc.text(`${no}.`, left, y + 10, { width: noW, align: 'center' });
        y += ROW_HEIGHT;
      }
      return y;
    };

    drawRows(drawTableHeader(doc.y), 1, ROWS_PER_PAGE);

    doc.addPage();
    const afterRows = drawRows(drawTableHeader(doc.page.margins.top), ROWS_PER_PAGE + 1, TOTAL_ROWS);

    // Kotak catatan selebar tabel, menempel di bawah baris terakhir.
    const noteX = left + 6;
    const noteW = contentWidth - 12;
    doc.font('Times-Roman').fontSize(9);
    doc.text('*  Coret yang tidak perlu.', noteX, afterRows + 5, { width: noteW });
    doc.text('*  Konsultasi minimum 8 kali, terdiri dari: Isi materi per Bab, intisari dan ', noteX, doc.y, {
      width: noteW,
      continued: true,
    });
    doc.font('Times-Italic').text('abstracts', { continued: true });
    doc.font('Times-Roman').text(', dan Jadwal Sidang Tertutup.');
    const noteBottom = doc.y + 4;
    doc.rect(left, afterRows, contentWidth, noteBottom - afterRows).stroke();
    doc.lineWidth(1);
  });

  doc.end();
  return doc;
};

module.exports = { buildJurnalKonsultasiTaPdf };
