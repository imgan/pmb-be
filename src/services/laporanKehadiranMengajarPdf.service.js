const PDFDocument = require('pdfkit');

const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const HARI_LABEL = { SENIN: 'Senin', SELASA: 'Selasa', RABU: 'Rabu', KAMIS: 'Kamis', JUMAT: 'Jumat', SABTU: 'Sabtu' };
const STATUS_LABEL = { HADIR: 'Hadir', TIDAK_HADIR: 'Tidak Hadir', IZIN: 'Izin', SAKIT: 'Sakit' };

const longDate = (value) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return `${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`;
};

const todayLong = () => longDate(new Date());

const CONTENT_WIDTH = 595.28 - 56 * 2;

const kv = (doc, label, value, { labelWidth = 150 } = {}) => {
  const left = doc.page.margins.left;
  const y = doc.y;
  const valueX = left + labelWidth + 14;
  doc.text(label, left, y, { width: labelWidth, lineBreak: false });
  doc.text(':', left + labelWidth, y, { width: 10, lineBreak: false });
  doc.text(String(value ?? '-'), valueX, y, { width: left + CONTENT_WIDTH - valueX });
  doc.x = left;
  doc.moveDown(0.3);
};

const ensureSpace = (doc, needed) => {
  const bottom = doc.page.height - doc.page.margins.bottom;
  if (doc.y + needed > bottom) {
    doc.addPage();
    return true;
  }
  return false;
};

const drawHeader = (doc, kampusName, title) => {
  doc.font('Times-Bold').fontSize(15).text((kampusName || 'Perguruan Tinggi').toUpperCase(), { align: 'center' });
  doc.moveDown(0.15);
  doc.fontSize(13).text(title, { align: 'center' });
  doc.moveDown(1);
  doc.font('Times-Roman').fontSize(11);
};

const drawInfoBlock = (doc, jadwal) => {
  const pengampu = (jadwal.dosenPengampu ?? []).map((d) => d.namaLengkap);
  const dosenLine = [jadwal.dosenKordinator?.namaLengkap, ...pengampu].filter(Boolean).join(', ');
  const hariLine = Array.isArray(jadwal.hari) ? jadwal.hari.map((h) => HARI_LABEL[h] ?? h).join(', ') : '-';

  kv(doc, 'Kelas', jadwal.kelas);
  kv(doc, 'Kode MK', jadwal.kodeMataKuliah);
  kv(doc, 'Mata Kuliah', jadwal.namaMataKuliah);
  kv(doc, 'Dosen', dosenLine || '-');
  kv(doc, 'Hari / Jam Ke-', `${hariLine} / ${jadwal.jam ?? '-'}`);
  kv(doc, 'Ruangan', jadwal.ruangan ?? '-');
  doc.moveDown(0.6);
};

const drawSignature = (doc) => {
  doc.moveDown(2.5);
  doc.text(`${todayLong()}`, { align: 'right' });
  doc.text('Ketua Program Studi,', { align: 'right' });
  doc.moveDown(3);
  doc.text('(....................................)', { align: 'right' });
};

const drawTable = (doc, cols, rows, { emptyRowCount = 0 } = {}) => {
  const tableX = doc.page.margins.left;
  const rowH = 20;

  const drawRow = (cells, opts = {}) => {
    let x = tableX;
    const y = doc.y;
    if (opts.bold) doc.font('Times-Bold');
    cols.forEach((c, idx) => {
      doc.rect(x, y, c.width, rowH).stroke();
      doc.text(cells[idx] ?? '', x + 3, y + 6, { width: c.width - 6, align: c.align ?? 'left' });
      x += c.width;
    });
    if (opts.bold) doc.font('Times-Roman');
    doc.y = y + rowH;
  };

  ensureSpace(doc, rowH * 2);
  doc.font('Times-Bold').fontSize(9.5);
  drawRow(cols.map((c) => c.label));
  doc.font('Times-Roman').fontSize(9.5);

  rows.forEach((cells) => {
    if (ensureSpace(doc, rowH)) {
      doc.font('Times-Bold').fontSize(9.5);
      drawRow(cols.map((c) => c.label));
      doc.font('Times-Roman').fontSize(9.5);
    }
    drawRow(cells);
  });

  for (let i = 0; i < emptyRowCount; i += 1) {
    if (ensureSpace(doc, rowH)) {
      doc.font('Times-Bold').fontSize(9.5);
      drawRow(cols.map((c) => c.label));
      doc.font('Times-Roman').fontSize(9.5);
    }
    drawRow([String(rows.length + i + 1)]);
  }

  doc.x = tableX;
  doc.fontSize(11);
};

const buildTemplateKehadiranPdf = (jadwal, kampusName) => {
  const doc = new PDFDocument({ size: 'A4', margin: 56, bufferPages: true });
  drawHeader(doc, kampusName, 'DAFTAR HADIR MENGAJAR DOSEN');
  drawInfoBlock(doc, jadwal);

  const cols = [
    { key: 'no', label: 'No', width: 28, align: 'center' },
    { key: 'tanggal', label: 'Tanggal', width: 90 },
    { key: 'materi', label: 'Materi / Pokok Bahasan', width: CONTENT_WIDTH - 28 - 90 - 90 - 90 },
    { key: 'paraf', label: 'Paraf Dosen', width: 90, align: 'center' },
    { key: 'keterangan', label: 'Keterangan', width: 90 },
  ];
  drawTable(doc, cols, [], { emptyRowCount: 16 });

  drawSignature(doc);
  doc.end();
  return doc;
};

const buildTemplateRealisasiPdf = (jadwal, realisasiRows, kampusName) => {
  const doc = new PDFDocument({ size: 'A4', margin: 56, bufferPages: true });
  drawHeader(doc, kampusName, 'REKAP REALISASI KEHADIRAN MENGAJAR');
  drawInfoBlock(doc, jadwal);

  const cols = [
    { key: 'no', label: 'No', width: 28, align: 'center' },
    { key: 'tanggal', label: 'Tanggal Realisasi', width: 100 },
    { key: 'dosen', label: 'Dosen', width: CONTENT_WIDTH - 28 - 100 - 90 - 130 },
    { key: 'status', label: 'Status', width: 90, align: 'center' },
    { key: 'keterangan', label: 'Keterangan', width: 130 },
  ];
  const rows = realisasiRows.map((r, i) => [
    String(i + 1),
    longDate(r.tanggalRealisasi),
    r.dosen?.namaLengkap ?? '-',
    STATUS_LABEL[r.status] ?? r.status,
    r.keterangan ?? '-',
  ]);
  drawTable(doc, cols, rows);

  doc.moveDown(0.8);
  ensureSpace(doc, 20);
  doc.font('Times-Bold').text(`Total Realisasi: ${realisasiRows.length} pertemuan`, doc.page.margins.left, doc.y, {
    width: CONTENT_WIDTH,
  });
  doc.font('Times-Roman');

  drawSignature(doc);
  doc.end();
  return doc;
};

module.exports = { buildTemplateKehadiranPdf, buildTemplateRealisasiPdf };
