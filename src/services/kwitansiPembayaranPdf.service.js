const PDFDocument = require('pdfkit');
const { drawKop } = require('../utils/pdfKop');
const { terbilangRupiah } = require('../utils/terbilang');
const { longDate } = require('./formulirSidangTaPdf.service');

/**
 * Kwitansi satu pembayaran kuliah / wisuda (di setengah atas kertas A4; data.judul, data.untukPembayaran, data.labelTotal untuk selain kuliah): identitas mahasiswa, nominal + terbilang,
 * peruntukan (semester & tahun akademik), posisi tagihan s.d. pembayaran ini, dan tanda tangan
 * bagian keuangan (petugas yang mencatat pembayaran).
 */
const KOTA = 'Bekasi';
const rupiah = (n) => `Rp ${Math.round(Number(n) || 0).toLocaleString('id-ID')}`;

const MARGIN_ATAS = 28;

/** Satu kwitansi mulai `top`; tingginya muat di setengah A4. */
const drawKwitansi = (doc, data, kampus, { top }) => {
  const left = doc.page.margins.left;
  const contentWidth = doc.page.width - left - doc.page.margins.right;

  drawKop(doc, kampus, { top: top + MARGIN_ATAS });

  doc.font('Times-Bold').fontSize(13).text(data.judul ?? 'KWITANSI PEMBAYARAN KULIAH', left, doc.y - 4, { width: contentWidth, align: 'center' });
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
    data.untukPembayaran ?? `Biaya Kuliah Semester ${tagihan.semester} Tahun Akademik ${tagihan.tahunAjaran ?? '-'} (pembayaran ke-${tagihan.pembayaranKe})`
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
    [data.labelTotal ?? 'Total tagihan semester', rupiah(tagihan.totalTagihan)],
    ['Dibayar s.d. kwitansi ini', rupiah(tagihan.dibayarSampaiIni)],
    ['Sisa tagihan', tagihan.sisaSetelahIni > 0 ? rupiah(tagihan.sisaSetelahIni) : tagihan.lebihBayar > 0 ? `LUNAS, lebih bayar ${rupiah(tagihan.lebihBayar)}` : 'LUNAS'],
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

};

// Kertas A4 tegak, kwitansi hanya di setengah atas (setengah bawah kosong) supaya tetap memakai setengah A4
// walau printer diatur "Fit to page".
const buildKwitansiPembayaranPdf = (data, kampus) => {
  // Margin atas diatur di drawKwitansi; margin halaman 0 supaya pdfkit tidak membuat halaman baru.
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 0, bottom: 0, left: 36, right: 36 },
    info: { Title: `Kwitansi ${data.nomorKwitansi}` },
  });
  drawKwitansi(doc, data, kampus, { top: 0 });
  doc.end();
  return doc;
};

module.exports = { buildKwitansiPembayaranPdf };
