const PDFDocument = require('pdfkit');
const { drawKop } = require('../utils/pdfKop');

const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const ROMAN_SEMESTER = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV'];

// Wadir I Bidang Akademik yang menandatangani KHS — belum ada tabel "pejabat" tersendiri di
// sistem ini, jadi mengikuti pola yang sama dengan PDF lain (mis. suratKeteranganPdf.service.js):
// nama/NIP penandatangan konstan per dokumen.
const WADIR1_NAME = 'Hafiz Fauzi, S.Sn., M.Pd';
const WADIR1_NIP = '2510049';
const CITY_NAME = 'Bekasi';

const longDate = (value) => {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) return '-';
  return `${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`;
};

const idNum = (value, decimals = 2) => Number(value ?? 0).toFixed(decimals).replace('.', ',');

/** "D3 Administrasi Rumah Sakit" -> "D3 - Administrasi Rumah Sakit" (format Program Studi di KHS resmi). */
const programStudiLabel = (jurusan) => {
  if (!jurusan?.namaJurusan) return '-';
  const match = jurusan.namaJurusan.match(/^(D[34])\s+(.+)$/i);
  return match ? `${match[1].toUpperCase()} - ${match[2]}` : jurusan.namaJurusan;
};

const CONTENT_WIDTH = 595.28 - 56 * 2; // A4 width minus left/right margins

const drawHeader = (doc, kampus, withKop) => {
  if (withKop) drawKop(doc, kampus);
  doc.font('Times-Bold').fontSize(15).text('KARTU HASIL STUDI (KHS)', { align: 'center' });
};

/** Label:value dicetak pada koordinat tertentu (dipakai untuk blok info dua kolom). */
const kvAt = (doc, x, y, label, value, { labelWidth = 95, columnWidth = CONTENT_WIDTH / 2 } = {}) => {
  doc.font('Times-Roman').fontSize(10);
  doc.text(label, x, y, { width: labelWidth, lineBreak: false });
  doc.text(':', x + labelWidth, y, { width: 10, lineBreak: false });
  // Lebar nilai dibatasi ke kolomnya sendiri — sebelumnya 220pt tetap, sehingga nama panjang
  // menimpa label "Program Studi" di kolom kanan.
  const valueWidth = columnWidth - labelWidth - 18;
  doc.text(String(value ?? '-'), x + labelWidth + 14, y, { width: valueWidth });
  return doc.heightOfString(String(value ?? '-'), { width: valueWidth });
};

/**
 * Satu KHS pada dokumen yang sudah ada. `gabungan` = KHS semua semester digabung jadi satu tabel
 * (tanpa judul Semester/TA dan tanpa baris IPS, karena IPS hanya berlaku per semester).
 */
const renderKhsPage = (doc, data, kampus, withKop) => {
  const { mahasiswa, jurusan, semester, tahunAjaranLabel, periode, nilai, totalSks, ips, ipk, gabungan } = data;

  drawHeader(doc, kampus, withKop);

  if (!gabungan) {
    doc.font('Times-Bold').fontSize(11).text(`Semester ${ROMAN_SEMESTER[semester - 1] ?? semester}`, { align: 'center' });
    doc.text(`TA ${tahunAjaranLabel}`, { align: 'center' });
  }
  doc.moveDown(0.8);

  const left = doc.page.margins.left;
  const infoY = doc.y;
  const rightX = left + CONTENT_WIDTH / 2;
  // Tinggi baris mengikuti isi terpanjang (nama panjang bisa turun ke baris kedua).
  const row1H = Math.max(
    kvAt(doc, left, infoY, 'Nama Mahasiswa', mahasiswa.namaLengkap, { labelWidth: 85 }),
    kvAt(doc, rightX, infoY, 'Program Studi', programStudiLabel(jurusan), { labelWidth: 75 })
  );
  const row2Y = infoY + row1H + 3;
  const row2H = Math.max(
    kvAt(doc, left, row2Y, 'NIM', mahasiswa.nim, { labelWidth: 85 }),
    kvAt(doc, rightX, row2Y, 'Periode', periode, { labelWidth: 75 })
  );
  doc.y = row2Y + row2H + 8;

  // Layout kolom persis mengikuti format resmi KHS Poltek Bhani: grup "Nilai" (Angka/Huruf/
  // Indeks) di bawah satu header, diapit Bobot MK (SKS) di kiri dan SKS*Indeks di kanan.
  const cols = [
    { key: 'no', label: 'No', width: 26, align: 'center' },
    { key: 'kode', label: 'Kode MK', width: 50, headerAlign: 'center' },
    { key: 'mk', label: 'Nama MK', width: 155, headerAlign: 'center' },
    { key: 'bobotSks', label: 'Bobot MK (SKS)', width: 40, align: 'center' },
    { key: 'angka', label: 'Angka', width: 48, align: 'center', group: 'nilai' },
    { key: 'huruf', label: 'Huruf', width: 46, align: 'center', group: 'nilai' },
    { key: 'indeks', label: 'Indeks', width: 46, align: 'center', group: 'nilai' },
    { key: 'sksIndeks', label: 'SKS*Indeks', width: 72, align: 'center' },
  ];
  const tableX = left;
  const rowH = 17;
  const headerH = 15;

  // Header dua baris: kolom tunggal (No/Kode MK/Nama MK/Bobot MK/SKS*Indeks) membentang penuh
  // 2 baris, sedangkan "Nilai" cuma di baris pertama dengan sub-kolom Angka/Huruf/Indeks di
  // baris kedua. Diulang di tiap halaman lanjutan tabel.
  const drawTableHeader = () => {
    let x = tableX;
    const y = doc.y;
    doc.font('Times-Bold').fontSize(8);
    ['no', 'kode', 'mk', 'bobotSks'].forEach((key) => {
      const c = cols.find((cc) => cc.key === key);
      doc.rect(x, y, c.width, headerH * 2).stroke();
      doc.text(c.label, x + 2, y + 2, { width: c.width - 4, align: c.headerAlign ?? c.align ?? 'left' });
      x += c.width;
    });

    const nilaiCols = cols.filter((c) => c.group === 'nilai');
    const nilaiWidth = nilaiCols.reduce((sum, c) => sum + c.width, 0);
    doc.rect(x, y, nilaiWidth, headerH).stroke();
    doc.text('Nilai', x + 2, y + 2, { width: nilaiWidth - 4, align: 'center' });
    let subX = x;
    nilaiCols.forEach((c) => {
      doc.rect(subX, y + headerH, c.width, headerH).stroke();
      doc.text(c.label, subX + 2, y + headerH + 2, { width: c.width - 4, align: 'center' });
      subX += c.width;
    });
    x += nilaiWidth;

    const lastCol = cols.find((c) => c.key === 'sksIndeks');
    doc.rect(x, y, lastCol.width, headerH * 2).stroke();
    doc.text(lastCol.label, x + 2, y + 2, { width: lastCol.width - 4, align: 'center' });

    doc.y = y + headerH * 2;
  };
  drawTableHeader();

  // Pindah halaman SEBELUM menggambar bila sisa ruang kurang. Tanpa ini baris Jumlah/IPK/TTD yang
  // jatuh di dasar halaman meluber: pdfkit otomatis menambah halaman per potongan teks, sehingga isi
  // KHS tercecer di beberapa halaman kosong.
  const pastikanRuang = (h, { ulangHeader = false } = {}) => {
    if (doc.y + h <= doc.page.height - doc.page.margins.bottom) return;
    doc.addPage();
    doc.y = doc.page.margins.top;
    if (ulangHeader) drawTableHeader();
  };

  // Tinggi baris mengikuti teks terpanjang (nama MK panjang dibungkus 2+ baris, tidak menimpa
  // baris berikutnya); teks tiap sel diposisikan di tengah secara vertikal.
  const drawRow = (values, { bold = false } = {}) => {
    doc.font(bold ? 'Times-Bold' : 'Times-Roman').fontSize(9);
    const tinggiTeks = cols.map((c, idx) => (values[idx] === null ? 0 : doc.heightOfString(String(values[idx]), { width: c.width - 4 })));
    const h = Math.max(rowH, Math.max(...tinggiTeks) + 8);
    pastikanRuang(h, { ulangHeader: true });
    let x = tableX;
    const y = doc.y;
    cols.forEach((c, idx) => {
      doc.rect(x, y, c.width, h).stroke();
      if (values[idx] !== null) {
        doc.text(String(values[idx]), x + 2, y + (h - tinggiTeks[idx]) / 2, { width: c.width - 4, align: c.align ?? 'left' });
      }
      x += c.width;
    });
    doc.y = y + h;
  };

  nilai.forEach((n, i) => {
    drawRow([
      String(i + 1),
      n.kodeMataKuliah,
      n.namaMataKuliah,
      String(n.sks),
      idNum(n.nilaiAngka, 1),
      n.grade,
      idNum(n.bobot),
      idNum(n.mutu),
    ]);
  });

  // Baris "Jumlah" — label merangkum kolom No/Kode MK/Nama MK jadi satu sel, cuma total SKS
  // yang terisi (kolom Nilai/SKS*Indeks dikosongkan karena satuannya beda-beda per baris,
  // mengikuti format resmi).
  {
    pastikanRuang(rowH, { ulangHeader: true });
    let x = tableX;
    const y = doc.y;
    const labelWidth = cols[0].width + cols[1].width + cols[2].width;
    doc.font('Times-Bold').fontSize(9);
    doc.rect(x, y, labelWidth, rowH).stroke();
    doc.text('Jumlah', x + 4, y + 5, { width: labelWidth - 8 });
    x += labelWidth;

    doc.rect(x, y, cols[3].width, rowH).stroke();
    doc.text(String(totalSks), x + 2, y + 5, { width: cols[3].width - 4, align: 'center' });
    x += cols[3].width;

    cols.slice(4).forEach((c) => {
      doc.rect(x, y, c.width, rowH).stroke();
      x += c.width;
    });
    doc.y = y + rowH;
  }

  const summaryRow = (label, value) => {
    pastikanRuang(rowH, { ulangHeader: true });
    let x = tableX;
    const y = doc.y;
    const labelWidth = cols.slice(0, 7).reduce((sum, c) => sum + c.width, 0);
    doc.font('Times-Bold').fontSize(9);
    doc.rect(x, y, labelWidth, rowH).stroke();
    doc.text(label, x + 4, y + 5, { width: labelWidth - 8 });
    x += labelWidth;
    const c = cols[7];
    doc.rect(x, y, c.width, rowH).stroke();
    doc.text(idNum(value), x + 2, y + 5, { width: c.width - 4, align: 'center' });
    doc.y = y + rowH;
  };
  if (!gabungan) summaryRow('IPS (Indeks Prestasi Semester)', ips);
  summaryRow('IPK (Index Prestasi Kumulatif)', ipk);

  // Blok TTD mengikuti pola signatureBlock di suratKeteranganPdf.service.js: tiap baris
  // di-center dalam satu kolom di sisi kanan, supaya sisi kiri & kanan blok sejajar
  // (bukan rata kanan yang membuat sisi kirinya bergerigi). Seluruhnya bold hitam.
  // Lebar kolom = baris terpanjang, jadi blok rata dengan tepi kanan tabel.
  doc.font('Times-Bold').fontSize(10).fillColor('black');
  const sigHeadLines = [`${CITY_NAME}, ${longDate(new Date())}`, 'Mengetahui,', 'Wadir I Bidang Akademik'];
  const sigFootLines = [WADIR1_NAME, `NIP : ${WADIR1_NIP}`];
  const sigWidth = Math.ceil(Math.max(...[...sigHeadLines, ...sigFootLines].map((t) => doc.widthOfString(t)))) + 2;
  const sigX = tableX + CONTENT_WIDTH - sigWidth;
  const sigLine = (text, options = {}) => doc.text(text, sigX, doc.y, { width: sigWidth, align: 'center', ...options });
  // Blok TTD tidak boleh terpotong: 2 + 3 baris jeda + 5 baris teks.
  pastikanRuang(doc.currentLineHeight(true) * 10);
  doc.moveDown(2);
  sigHeadLines.forEach((t) => sigLine(t));
  doc.moveDown(3);
  sigLine(sigFootLines[0], { underline: true });
  sigLine(sigFootLines[1]);
  doc.x = tableX;
};

/**
 * Gabungkan KHS beberapa semester jadi satu: mata kuliah diurutkan dari semester terkecil, IPK
 * diambil dari semester terakhir (sudah kumulatif).
 */
const gabungKhs = (list) => {
  const urut = [...list].sort((a, b) => a.semester - b.semester);
  const awal = urut[0];
  const akhir = urut[urut.length - 1];
  return {
    ...akhir,
    gabungan: true,
    periode: awal.periode === akhir.periode ? awal.periode : `${awal.periode} - ${akhir.periode}`,
    nilai: urut.flatMap((d) => d.nilai),
    totalSks: urut.reduce((sum, d) => sum + d.totalSks, 0),
  };
};

/**
 * KHS satu semester (`data` objek) atau beberapa semester sekaligus (`data` array — opsi "Semua
 * Semester", digabung jadi satu tabel, urut semester terkecil). `withKop: false` dipakai KHS yang dicetak mahasiswa sendiri
 * (portal mahasiswa): tanpa kop surat.
 */
const buildLaporanKhsPdf = (data, kampus, { withKop = true } = {}) => {
  const doc = new PDFDocument({ size: 'A4', margin: 56, bufferPages: true });
  renderKhsPage(doc, Array.isArray(data) ? gabungKhs(data) : data, kampus, withKop);
  doc.end();
  return doc;
};

module.exports = { buildLaporanKhsPdf };
