const PDFDocument = require('pdfkit');
const { drawKop } = require('../utils/pdfKop');

const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const CITY_NAME = 'Bekasi';
const STATUS_LABEL = { DIAJUKAN: 'Menunggu Persetujuan Prodi', DISETUJUI: 'Disetujui', DITOLAK: 'Ditolak' };

const longDate = (value) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return `${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`;
};

const pengajuanCutiPdfFilename = (data) => `FORMULIR_PENGAJUAN_CUTI_${data.mahasiswa.nim}.pdf`;

const kv = (doc, label, value, labelWidth = 140) => {
  const left = doc.page.margins.left;
  const contentWidth = doc.page.width - left - doc.page.margins.right;
  const y = doc.y;
  const valueX = left + labelWidth + 14;
  const valueWidth = left + contentWidth - valueX;
  const text = String(value ?? '') || '-';
  const rowHeight = Math.max(doc.heightOfString(label, { width: labelWidth }), doc.heightOfString(text, { width: valueWidth }));
  doc.text(label, left, y, { width: labelWidth });
  doc.text(':', left + labelWidth, y, { width: 10, lineBreak: false });
  doc.text(text, valueX, y, { width: valueWidth });
  doc.y = y + rowHeight;
  doc.x = left;
  doc.moveDown(0.3);
};

/** Tanda tangan dua kolom: Mengetahui Ketua Prodi (kiri) & Pemohon (kanan). */
const signatureBlock = (doc, { tanggal, namaMahasiswa }) => {
  const left = doc.page.margins.left;
  const contentWidth = doc.page.width - left - doc.page.margins.right;
  const boxWidth = 200;
  const rightX = left + contentWidth - boxWidth;
  doc.moveDown(2);
  const y = doc.y;
  doc.text(`${CITY_NAME}, ${longDate(tanggal)}`, rightX, y, { width: boxWidth, align: 'center' });
  doc.text('Pemohon,', rightX, doc.y, { width: boxWidth, align: 'center' });
  doc.text('Mengetahui,', left, y, { width: boxWidth, align: 'center' });
  doc.text('Ketua Program Studi', left, doc.y, { width: boxWidth, align: 'center' });
  doc.moveDown(4);
  const nameY = doc.y;
  doc.text('(_________________________)', left, nameY, { width: boxWidth, align: 'center' });
  doc.font('Times-Bold').text(namaMahasiswa, rightX, nameY, { width: boxWidth, align: 'center', underline: true });
  doc.font('Times-Roman');
  doc.x = left;
};

const buildPengajuanCutiPdf = (data, kampus) => {
  const { pengajuan, mahasiswa, jurusan, tahunAjaran } = data;
  const doc = new PDFDocument({
    size: 'A4',
    margin: 56,
    bufferPages: true,
    info: { Title: pengajuanCutiPdfFilename(data).replace(/\.pdf$/, '') },
  });
  const left = doc.page.margins.left;
  const contentWidth = doc.page.width - left - doc.page.margins.right;

  drawKop(doc, kampus);

  doc.font('Times-Bold').fontSize(12).text('FORMULIR PENGAJUAN CUTI AKADEMIK', { align: 'center', underline: true });
  if (tahunAjaran) doc.font('Times-Roman').fontSize(11).text(`Tahun Ajaran ${tahunAjaran}`, { align: 'center' });
  doc.moveDown(1.2);

  doc.font('Times-Roman').fontSize(11);
  doc.text('Yth. Ketua Program Studi');
  doc.text(jurusan?.namaJurusan ?? '-');
  doc.text('di Tempat');
  doc.moveDown(1);
  doc.text('Yang bertanda tangan di bawah ini :');
  doc.moveDown(0.4);

  kv(doc, 'Nama', mahasiswa.namaLengkap);
  kv(doc, 'NPM', mahasiswa.nim);
  kv(doc, 'Program Studi', jurusan?.namaJurusan);
  kv(doc, 'Semester', pengajuan.semester);
  kv(doc, 'No. Telepon', mahasiswa.noTelepon);
  kv(doc, 'Alamat', mahasiswa.alamat);

  doc.moveDown(0.6);
  doc.text(
    `Dengan ini mengajukan permohonan cuti akademik terhitung mulai tanggal ${longDate(pengajuan.tanggalAwal)} sampai dengan ${longDate(pengajuan.tanggalAkhir)}, dengan alasan sebagai berikut :`,
    left,
    doc.y,
    { width: contentWidth, align: 'justify' }
  );
  doc.moveDown(0.4);
  doc.text(pengajuan.alasan || '-', left + 20, doc.y, { width: contentWidth - 20 });
  doc.moveDown(0.8);
  doc.text(
    'Selama masa cuti saya bersedia mematuhi ketentuan akademik yang berlaku. Demikian permohonan ini saya sampaikan, atas perhatian dan persetujuannya saya ucapkan terima kasih.',
    left,
    doc.y,
    { width: contentWidth, align: 'justify' }
  );

  doc.moveDown(0.6);
  doc.font('Times-Italic').fontSize(10).text(`Status pengajuan: ${STATUS_LABEL[pengajuan.status] ?? pengajuan.status}`);
  if (pengajuan.catatanProdi) doc.text(`Catatan prodi: ${pengajuan.catatanProdi}`);
  doc.font('Times-Roman').fontSize(11);

  signatureBlock(doc, { tanggal: pengajuan.tanggalAjuan, namaMahasiswa: mahasiswa.namaLengkap });

  doc.end();
  return doc;
};

module.exports = { buildPengajuanCutiPdf, pengajuanCutiPdfFilename };
