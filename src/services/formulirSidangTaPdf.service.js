const PDFDocument = require('pdfkit');
const { suratPdfDocOptions } = require('../utils/suratPdfName');
const { drawKop } = require('../utils/pdfKop');

const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const CITY_NAME = 'Bekasi';
// Nomor formulir baku (dokumen mutu), bukan nomor surat per pengajuan.
const NOMOR_FORMULIR = 'FM/05/42/2023';
const NAMA_INSTITUSI = 'Politeknik Bhakti Kartini';
const JENJANG_LABEL = { D3: 'Diploma Tiga', D4: 'Diploma Empat', S1: 'Sarjana' };

const longDate = (value) => {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) return '-';
  return `${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`;
};

/** "D3 Administrasi Rumah Sakit" -> "Diploma Tiga Administrasi Rumah Sakit". */
const programStudiLengkap = (jurusan) => {
  if (!jurusan?.namaJurusan) return '-';
  const match = jurusan.namaJurusan.match(/^(D3|D4|S1)\s+(.+)$/i);
  const kode = (match?.[1] ?? jurusan.jenjangPendidikan ?? '').toUpperCase();
  const nama = match ? match[2] : jurusan.namaJurusan;
  return JENJANG_LABEL[kode] ? `${JENJANG_LABEL[kode]} ${nama}` : nama;
};

const BLANK_LINE = '_______________________________';

const buildFormulirSidangTaPdf = (data, kampus) => {
  const { surat, mahasiswa, jurusan, pembimbing = [] } = data;
  const doc = new PDFDocument(suratPdfDocOptions(data));
  const left = doc.page.margins.left;
  const contentWidth = doc.page.width - left - doc.page.margins.right;

  drawKop(doc, kampus);

  doc.font('Times-Bold').fontSize(12).text('FORMULIR PENDAFTARAN SIDANG TUGAS AKHIR', { align: 'center', underline: true });
  doc.text(`No. ${NOMOR_FORMULIR}`, { align: 'center' });
  doc.moveDown(1.2);

  // Blok isi sedikit menjorok dari margin, mengikuti format formulir resmi.
  const indent = left + 24;
  const indentWidth = contentWidth - 24;
  doc.font('Times-Roman').fontSize(11);
  doc.text('Yth. Ketua Program Studi', indent, doc.y, { width: indentWidth });
  doc.text(programStudiLengkap(jurusan), indent, doc.y, { width: indentWidth });
  doc.text(NAMA_INSTITUSI, indent, doc.y, { width: indentWidth });
  doc.moveDown(1);
  doc.text(
    'Kami mengajukan permohonan untuk melaksanakan Sidang Tugas Akhir dengan keterangan sebagai berikut :',
    indent,
    doc.y,
    { width: indentWidth }
  );
  doc.moveDown(0.3);

  // Daftar a–e: huruf, label, titik dua, nilai — kolom nilai sejajar untuk semua baris.
  const letterX = indent + 16;
  const labelX = letterX + 18;
  const colonX = labelX + 170;
  const valueX = colonX + 12;
  const valueWidth = left + contentWidth - valueX;
  const item = (letter, label, values) => {
    const y = doc.y;
    doc.text(`${letter}.`, letterX, y, { lineBreak: false });
    doc.text(label, labelX, y, { width: colonX - labelX - 4, lineBreak: false });
    doc.text(':', colonX, y, { lineBreak: false });
    let rowY = y;
    values.forEach((v) => {
      doc.text(v, valueX, rowY, { width: valueWidth });
      rowY = doc.y;
    });
    doc.y = Math.max(rowY, y + doc.currentLineHeight(true));
    doc.moveDown(0.15);
  };

  const lokasi = [surat.namaInstansi, surat.alamatInstansi].filter(Boolean).join(', ');
  item('a', 'Nama Mahasiswa', [mahasiswa.namaLengkap]);
  item('b', 'NIM', [mahasiswa.nim]);
  item('c', 'Lokasi & Alamat Penelitian', [lokasi || '']);
  item('d', 'Dosen Pembimbing Kampus/DPK', [`1. ${pembimbing[0] || BLANK_LINE}`, `2. ${pembimbing[1] || BLANK_LINE}`]);
  item('e', 'No. HP Mahasiswa', [mahasiswa.hp || '']);

  doc.moveDown(0.8);
  doc.text('Berikut adalah persyaratan yang harus dipenuhi :', indent, doc.y, { width: indentWidth });
  doc.moveDown(0.3);

  // ---- Tabel persyaratan ----
  const noW = 34;
  const adaW = 60;
  const tidakW = 60;
  const itemW = contentWidth - noW - adaW - tidakW;
  const x0 = left;
  const xItem = x0 + noW;
  const xAda = xItem + itemW;
  const xTidak = xAda + adaW;
  const rowH = 17;
  const cellText = (text, x, y, w, h, { bold = false, align = 'left', size = 10 } = {}) => {
    doc.font(bold ? 'Times-Bold' : 'Times-Roman').fontSize(size);
    const textH = doc.heightOfString(text, { width: w - 8 });
    doc.text(text, x + 4, y + (h - textH) / 2, { width: w - 8, align });
  };
  const ketCells = (y, h) => {
    doc.rect(xAda, y, adaW, h).stroke();
    doc.rect(xTidak, y, tidakW, h).stroke();
  };

  let y = doc.y;
  doc.lineWidth(0.8);
  // Header: NO & ITEM membentang 2 baris; KETERANGAN di atas sub-kolom ADA / TIDAK ADA.
  const headH = rowH;
  const subH = 26;
  doc.rect(x0, y, noW, headH + subH).stroke();
  doc.rect(xItem, y, itemW, headH + subH).stroke();
  doc.rect(xAda, y, adaW + tidakW, headH).stroke();
  cellText('NO', x0, y, noW, headH + subH, { bold: true, align: 'center' });
  cellText('ITEM', xItem, y, itemW, headH + subH, { bold: true, align: 'center' });
  cellText('KETERANGAN', xAda, y, adaW + tidakW, headH, { bold: true, align: 'center' });
  ketCells(y + headH, subH);
  cellText('ADA', xAda, y + headH, adaW, subH, { bold: true, align: 'center' });
  cellText('TIDAK\nADA', xTidak, y + headH, tidakW, subH, { bold: true, align: 'center' });
  y += headH + subH;

  // Baris judul kelompok.
  doc.rect(x0, y, contentWidth, rowH).stroke();
  cellText('Persyaratan Administratif :', x0, y, noW + itemW, rowH, { bold: true });
  y += rowH;

  const persyaratan = [
    ['1', ['Kwitansi Lunas Biaya UAP', 'Kwitansi Lunas Biaya Perkuliahan Bulan Terakhir¹']],
    ['2', ['Berkas Laporan Tugas Akhir² (3 eksemplar)']],
    ['3', ['Lembar Konsultasi Tugas Akhir (untuk sidang laporan tugas akhir)']],
    ['4', ['Lembar Persetujuan Dosen Pembimbing']],
  ];
  persyaratan.forEach(([no, lines]) => {
    // Nomor 1 punya dua sub-item: sel NO digabung, tiap sub-item punya baris & kolom
    // keterangannya sendiri.
    const h = rowH * lines.length;
    doc.rect(x0, y, noW, h).stroke();
    cellText(no, x0, y, noW, h, { align: 'center' });
    lines.forEach((line, i) => {
      const ly = y + rowH * i;
      doc.rect(xItem, ly, itemW, rowH).stroke();
      cellText(line, xItem, ly, itemW, rowH);
      ketCells(ly, rowH);
    });
    y += h;
  });
  doc.lineWidth(1);

  doc.x = left;
  doc.y = y + 16;
  doc.font('Times-Roman').fontSize(11);
  doc.text('Demikian permohonan kami, atas perkenannya kami sampaikan terima kasih.', indent, doc.y, {
    width: indentWidth,
  });

  // Blok TTD: di-center dalam satu kolom di kanan (pola yang sama dengan KHS), bold hitam.
  doc.moveDown(2);
  doc.font('Times-Bold').fontSize(11).fillColor('black');
  const headLines = [`${CITY_NAME}, ${longDate(surat.tanggalInput)}`, 'Mahasiswa yang mengajukan'];
  const footLines = [mahasiswa.namaLengkap, `NIM. ${mahasiswa.nim}`];
  const sigWidth = Math.ceil(Math.max(...[...headLines, ...footLines].map((t) => doc.widthOfString(t)))) + 2;
  const sigX = left + contentWidth - sigWidth;
  const sigLine = (text, options = {}) => doc.text(text, sigX, doc.y, { width: sigWidth, align: 'center', ...options });
  headLines.forEach((t) => sigLine(t));
  doc.moveDown(3.5);
  sigLine(footLines[0], { underline: true });
  sigLine(footLines[1]);

  // Keterangan catatan kaki di bawah halaman.
  doc.font('Times-Roman').fontSize(8);
  doc.text('Keterangan:', left, doc.y + 30);
  doc.text('1.  Bulan dilaksanakannya sidang', left + 14);
  doc.text('2.  Coret yang tidak perlu', left + 14);

  doc.end();
  return doc;
};

module.exports = { buildFormulirSidangTaPdf, programStudiLengkap, longDate };
