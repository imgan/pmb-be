const PDFDocument = require('pdfkit');
const { suratPdfDocOptions } = require('../utils/suratPdfName');
const { tahunAkademikFromDate } = require('../utils/tahunAjaran');
const { drawKop } = require('../utils/pdfKop');
const { programStudiLengkap, longDate } = require('./formulirSidangTaPdf.service');

const CITY_NAME = 'Bekasi';
const NAMA_INSTITUSI = 'POLITEKNIK BHAKTI KARTINI';
const DOTS = '..............................................';

const idNum = (value) => Number(value).toFixed(2).replace('.', ',');

/**
 * Rekapitulasi Nilai Sidang Mahasiswa. Angka/Huruf per dosen diambil dari nilai yang diinput
 * dosen di portal dosen (tabel nilai_sidang); yang belum diinput dicetak kosong untuk diisi
 * tangan. Nilai Akhir hanya terisi bila semua dosen yang ditugaskan sudah menilai.
 */
const buildRekapNilaiSidangPdf = (data, kampus) => {
  const { surat, mahasiswa, jurusan, pembimbing = [], sidang } = data;
  const doc = new PDFDocument(suratPdfDocOptions(data));
  const left = doc.page.margins.left;
  const contentWidth = doc.page.width - left - doc.page.margins.right;

  drawKop(doc, kampus);

  doc.font('Times-Bold').fontSize(11).fillColor('black');
  const titleLines = [
    'REKAPITULASI NILAI SIDANG MAHASISWA',
    NAMA_INSTITUSI,
    `PROGRAM STUDI ${programStudiLengkap(jurusan).toUpperCase()}`,
    `TA ${sidang?.tahunAjaran || tahunAkademikFromDate(surat.tanggalInput)}`,
  ];
  titleLines.forEach((line) => {
    doc.text(line, left, doc.y, { width: contentWidth, align: 'center' });
    doc.moveDown(0.3);
  });
  doc.moveDown(0.8);

  const labelWidth = 40;
  const identitas = (label, value) => {
    const y = doc.y;
    doc.font('Times-Roman').fontSize(11);
    doc.text(label, left, y, { width: labelWidth, lineBreak: false });
    doc.text(':', left + labelWidth, y, { lineBreak: false });
    doc.text(value || DOTS, left + labelWidth + 10, y, { width: contentWidth - labelWidth - 10 });
    doc.moveDown(0.5);
  };
  identitas('Nama', mahasiswa.namaLengkap);
  identitas('NIM', mahasiswa.nim);
  identitas('Judul', sidang?.judul);
  doc.moveDown(0.3);

  // ---- Tabel nilai ----
  const noW = 42;
  const dosenW = 205;
  const angkaW = 130;
  const hurufW = contentWidth - noW - dosenW - angkaW;
  const xNo = left;
  const xDosen = xNo + noW;
  const xAngka = xDosen + dosenW;
  const xHuruf = xAngka + angkaW;
  const headH = 24;
  const rowH = 56;
  const pad = 6;

  let y = doc.y;
  doc.lineWidth(0.8);
  doc.font('Times-Bold').fontSize(10);
  doc.rect(xNo, y, noW, headH * 2).stroke();
  doc.rect(xDosen, y, dosenW, headH * 2).stroke();
  doc.rect(xAngka, y, angkaW + hurufW, headH).stroke();
  doc.rect(xAngka, y + headH, angkaW, headH).stroke();
  doc.rect(xHuruf, y + headH, hurufW, headH).stroke();
  doc.text('No.', xNo, y + pad, { width: noW, align: 'center' });
  doc.text('Dosen', xDosen, y + pad, { width: dosenW, align: 'center' });
  doc.text('Nilai', xAngka, y + pad, { width: angkaW + hurufW, align: 'center' });
  doc.text('Angka', xAngka, y + headH + pad, { width: angkaW, align: 'center' });
  doc.text('Huruf', xHuruf, y + headH + pad, { width: hurufW, align: 'center' });
  y += headH * 2;

  const perPeran = sidang?.nilai?.perPeran ?? [];
  const baris = [
    ['1.', 'Pembimbing I', pembimbing[0], perPeran[0]],
    ['2.', 'Pembimbing II (bila ada)', pembimbing[1], perPeran[1]],
    ['3.', 'Penguji I', sidang?.penguji?.[0], perPeran[2]],
    ['4.', 'Penguji II (bila ada)', sidang?.penguji?.[1], perPeran[3]],
  ];
  const nilaiCells = (rowY, n) => {
    if (!n) return;
    doc.font('Times-Roman').fontSize(11);
    const textY = rowY + (rowH - doc.currentLineHeight()) / 2;
    doc.text(idNum(n.nilai), xAngka, textY, { width: angkaW, align: 'center' });
    doc.text(n.grade, xHuruf, textY, { width: hurufW, align: 'center' });
  };
  baris.forEach(([no, peran, nama, nilai]) => {
    doc.rect(xNo, y, noW, rowH).stroke();
    doc.rect(xDosen, y, dosenW, rowH).stroke();
    doc.rect(xAngka, y, angkaW, rowH).stroke();
    doc.rect(xHuruf, y, hurufW, rowH).stroke();
    doc.font('Times-Bold').fontSize(10);
    doc.text(no, xNo, y + pad, { width: noW, align: 'center' });
    doc.text(peran, xDosen + pad, y + pad, { width: dosenW - pad * 2 });
    if (nama) doc.font('Times-Roman').text(nama, xDosen + pad, doc.y + 4, { width: dosenW - pad * 2 });
    nilaiCells(y, nilai);
    y += rowH;
  });

  doc.rect(xNo, y, noW + dosenW, rowH).stroke();
  doc.rect(xAngka, y, angkaW, rowH).stroke();
  doc.rect(xHuruf, y, hurufW, rowH).stroke();
  doc.font('Times-Bold').fontSize(10).text('Nilai Akhir', xNo, y + pad, { width: noW + dosenW, align: 'center' });
  nilaiCells(y, sidang?.nilai?.nilaiAkhir);
  y += rowH;
  doc.lineWidth(1);

  // Blok TTD: di-center dalam satu kolom di kanan (pola yang sama dengan KHS), bold hitam.
  doc.y = y + 28;
  doc.font('Times-Bold').fontSize(11).fillColor('black');
  const ketua = pembimbing[0];
  const headLines = [`${CITY_NAME}, ${longDate(surat.tanggalInput)}`, 'Ketua Sidang (Pembimbing),'];
  const namaLine = ketua || `(${DOTS})`;
  const sigWidth = Math.ceil(Math.max(...[...headLines, namaLine].map((t) => doc.widthOfString(t)))) + 2;
  const sigX = left + contentWidth - sigWidth;
  headLines.forEach((t) => doc.text(t, sigX, doc.y, { width: sigWidth, align: 'center' }));
  doc.moveDown(3.5);
  doc.text(namaLine, sigX, doc.y, { width: sigWidth, align: 'center', underline: Boolean(ketua) });

  doc.font('Times-Roman').fontSize(8).text('*Coret yang tidak perlu', left, doc.y + 40);

  doc.end();
  return doc;
};

module.exports = { buildRekapNilaiSidangPdf };
