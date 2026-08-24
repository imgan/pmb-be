const PDFDocument = require('pdfkit');

const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const longDate = (value) => {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) return '-';
  return `${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`;
};

const CONTENT_WIDTH = 595.28 - 56 * 2; // A4 width minus left/right margins

const drawHeader = (doc, kampus) => {
  doc.font('Times-Bold').fontSize(13).text((kampus?.namaKampus || 'Perguruan Tinggi').toUpperCase());
  doc.font('Times-Roman').fontSize(9.5);
  if (kampus?.alamat) doc.text(kampus.alamat);
  if (kampus?.telepon) doc.text(`Telp. ${kampus.telepon}`);
  doc.moveDown(0.3);
  doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.margins.left + CONTENT_WIDTH, doc.y).stroke();
  doc.moveDown(0.8);

  doc.font('Times-Bold').fontSize(13).text('DAFTAR NILAI SEMENTARA', { align: 'center' });
  doc.moveDown(1);
  doc.font('Times-Roman').fontSize(11);
};

const kv = (doc, label, value, { labelWidth = 110 } = {}) => {
  const left = doc.page.margins.left;
  const y = doc.y;
  const valueX = left + labelWidth + 14;
  const valueWidth = left + CONTENT_WIDTH - valueX;
  doc.text(label, left, y, { width: labelWidth, lineBreak: false });
  doc.text(':', left + labelWidth, y, { width: 10, lineBreak: false });
  doc.text(String(value ?? '-'), valueX, y, { width: valueWidth });
  doc.x = left;
  doc.moveDown(0.3);
};

const buildLaporanKhsPdf = (data, kampus) => {
  const { mahasiswa, jurusan, nilai, totalSks, totalMutu, ipk } = data;
  const doc = new PDFDocument({ size: 'A4', margin: 56, bufferPages: true });

  drawHeader(doc, kampus);

  kv(doc, 'N I M', mahasiswa.nim);
  kv(doc, 'Nama', mahasiswa.namaLengkap);
  kv(doc, 'Program Studi', jurusan ? `${jurusan.jenjangPendidikan ?? '-'} / ${jurusan.namaJurusan.toUpperCase()}` : '-');
  doc.moveDown(0.6);

  const cols = [
    { key: 'no', label: 'No', width: 26, align: 'center' },
    { key: 'kode', label: 'Kode', width: 62 },
    { key: 'mk', label: 'Nama Matakuliah', width: CONTENT_WIDTH - 26 - 62 - 44 - 48 - 36 - 48 },
    { key: 'nilai', label: 'Nilai', width: 44, align: 'center' },
    { key: 'bobot', label: 'Bobot', width: 48, align: 'center' },
    { key: 'sks', label: 'SKS', width: 36, align: 'center' },
    { key: 'mutu', label: 'Mutu', width: 48, align: 'center' },
  ];
  const tableX = doc.page.margins.left;
  const rowH = 18;

  const drawRow = (values, { bold = false } = {}) => {
    let x = tableX;
    const y = doc.y;
    doc.font(bold ? 'Times-Bold' : 'Times-Roman').fontSize(9.5);
    cols.forEach((c, idx) => {
      doc.rect(x, y, c.width, rowH).stroke();
      doc.text(values[idx], x + 2, y + 5, { width: c.width - 4, align: c.align ?? 'left' });
      x += c.width;
    });
    doc.y = y + rowH;
  };

  drawRow(cols.map((c) => c.label), { bold: true });

  nilai.forEach((n, i) => {
    drawRow([
      String(i + 1),
      n.kodeMataKuliah,
      n.namaMataKuliah,
      n.grade,
      n.bobot.toFixed(2),
      String(n.sks),
      n.mutu.toFixed(2),
    ]);
  });

  {
    let x = tableX;
    const y = doc.y;
    const labelWidth = cols[0].width + cols[1].width + cols[2].width + cols[3].width + cols[4].width;
    doc.font('Times-Bold').fontSize(9.5);
    doc.rect(x, y, labelWidth, rowH).stroke();
    doc.text('Jumlah', x + 2, y + 5, { width: labelWidth - 4 });
    x += labelWidth;
    [String(totalSks), totalMutu.toFixed(2)].forEach((val, idx) => {
      const c = cols[5 + idx];
      doc.rect(x, y, c.width, rowH).stroke();
      doc.text(val, x + 2, y + 5, { width: c.width - 4, align: 'center' });
      x += c.width;
    });
    doc.y = y + rowH;
  }

  {
    let x = tableX;
    const y = doc.y;
    const labelWidth = cols[0].width + cols[1].width + cols[2].width + cols[3].width + cols[4].width + cols[5].width;
    doc.font('Times-Bold').fontSize(9.5);
    doc.rect(x, y, labelWidth, rowH).stroke();
    doc.text('Indeks Prestasi Kumulatif', x + 2, y + 5, { width: labelWidth - 4 });
    x += labelWidth;
    const c = cols[6];
    doc.rect(x, y, c.width, rowH).stroke();
    doc.text(ipk.toFixed(2), x + 2, y + 5, { width: c.width - 4, align: 'center' });
    doc.y = y + rowH;
  }

  doc.font('Times-Roman').fontSize(11);
  doc.x = tableX;
  doc.moveDown(2.5);
  doc.text(longDate(new Date()), { align: 'right' });
  doc.text('Ketua Program Studi', { align: 'right' });
  doc.moveDown(3);
  doc.text('(....................................)', { align: 'right' });

  doc.end();
  return doc;
};

module.exports = { buildLaporanKhsPdf };
