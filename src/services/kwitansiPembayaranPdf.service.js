const PDFDocument = require('pdfkit');
const { drawKop } = require('../utils/pdfKop');
const { terbilangRupiah } = require('../utils/terbilang');
const { longDate } = require('./formulirSidangTaPdf.service');

/**
 * Kwitansi satu pembayaran kuliah (A5 landscape): identitas mahasiswa, nominal + terbilang,
 * peruntukan (semester & tahun akademik), posisi tagihan s.d. pembayaran ini, dan tanda tangan
 * bagian keuangan (petugas yang mencatat pembayaran).
 */
const KOTA = 'Bekasi';
const rupiah = (n) => `Rp ${Math.round(Number(n) || 0).toLocaleString('id-ID')}`;

const buildKwitansiPembayaranPdf = (data, kampus, { dicetakDari = 'Portal Mahasiswa' } = {}) => {
  const doc = new PDFDocument({
    size: 'A5',
    layout: 'landscape',
    margins: { top: 28, bottom: 24, left: 36, right: 36 },
    info: { Title: `Kwitansi ${data.nomorKwitansi}` },
  });
  const left = doc.page.margins.left;
  const contentWidth = doc.page.width - left - doc.page.margins.right;

  drawKop(doc, kampus);

  doc.font('Times-Bold').fontSize(13).text('KWITANSI PEMBAYARAN KULIAH', left, doc.y - 4, { width: contentWidth, align: 'center' });
  doc.font('Times-Roman').fontSize(10).text(`No. ${data.nomorKwitansi}`, { width: contentWidth, align: 'center' });
  doc.moveDown(0.8);

  const labelWidth = 110;
  const valueX = left + labelWidth + 10;
  const valueWidth = contentWidth - labelWidth - 10;
  const row = (label, value, font = 'Times-Roman') => {
    const y = doc.y;
    doc.font('Times-Roman').fontSize(10.5).text(label, left, y, { width: labelWidth });
    doc.text(':', left + labelWidth, y);
    doc.font(font).text(value || '-', valueX, y, { width: valueWidth });
    doc.y = Math.max(doc.y, y + 14) + 2;
  };

  const { mahasiswa, tagihan } = data;
  row('Telah terima dari', `${mahasiswa.namaLengkap} (NIM ${mahasiswa.nim})`, 'Times-Bold');
  row('Program Studi', mahasiswa.prodi);
  row('Uang sejumlah', terbilangRupiah(data.nominal), 'Times-BoldItalic');
  row(
    'Untuk pembayaran',
    `Biaya Kuliah Semester ${tagihan.semester} Tahun Akademik ${tagihan.tahunAjaran ?? '-'} (pembayaran ke-${tagihan.pembayaranKe})`
  );
  row('Tanggal bayar', longDate(data.tanggalBayar));
  row('Bank / No. Bukti', [data.kodeBank, data.noBukti].filter(Boolean).join(' / '));
  if (data.keterangan) row('Keterangan', data.keterangan);

  // Kotak nominal + posisi tagihan (kiri), tanda tangan (kanan).
  doc.moveDown(0.6);
  const blockY = doc.y;
  const boxWidth = 210;
  doc.lineWidth(1.2).rect(left, blockY, boxWidth, 30).stroke();
  doc.font('Times-Bold').fontSize(15).text(rupiah(data.nominal), left, blockY + 8, { width: boxWidth, align: 'center' });

  doc.font('Times-Roman').fontSize(9);
  const summary = [
    ['Total tagihan semester', rupiah(tagihan.totalTagihan)],
    ['Dibayar s.d. kwitansi ini', rupiah(tagihan.dibayarSampaiIni)],
    ['Sisa tagihan', tagihan.sisaSetelahIni > 0 ? rupiah(tagihan.sisaSetelahIni) : 'LUNAS'],
  ];
  let y = blockY + 38;
  summary.forEach(([label, value]) => {
    doc.text(label, left, y, { width: 120 });
    doc.text(`: ${value}`, left + 120, y, { width: boxWidth - 120 + 40 });
    y += 12;
  });

  const signX = left + contentWidth - 200;
  doc.font('Times-Roman').fontSize(10.5);
  doc.text(`${KOTA}, ${longDate(data.tanggalBayar)}`, signX, blockY, { width: 200, align: 'center' });
  doc.text('Bagian Keuangan,', signX, doc.y, { width: 200, align: 'center' });
  doc.font('Times-Bold').text(data.petugas ?? '(.................................)', signX, blockY + 66, {
    width: 200,
    align: 'center',
    underline: !!data.petugas,
  });

  const footerY = doc.page.height - doc.page.margins.bottom - 10;
  doc.font('Times-Italic').fontSize(7.5).fillColor('#555555');
  doc.text(`Dicetak dari ${dicetakDari} pada ${longDate(new Date())}.`, left, footerY, { width: contentWidth, align: 'left', lineBreak: false });
  doc.fillColor('black');

  doc.end();
  return doc;
};

module.exports = { buildKwitansiPembayaranPdf };
