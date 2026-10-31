const PDFDocument = require('pdfkit');
const { drawLogoEmblem } = require('../utils/pdfKop');

/**
 * Kartu Tanda Mahasiswa (KTM) ukuran kartu ID standar CR80 (85,6 x 54 mm), 2 halaman:
 * halaman 1 = sisi depan (identitas + foto), halaman 2 = sisi belakang (ketentuan + alamat kampus).
 * Data dari mahasiswaPortal.service.getKtmData.
 */
const MM = 72 / 25.4;
const CARD_WIDTH = 85.6 * MM;
const CARD_HEIGHT = 54 * MM;
const PAD = 8;

// Senada dengan warna header portal Mahasiswa.
const COLOR_PRIMARY = '#8A6D1F';
const COLOR_ACCENT = '#B8973A';
const COLOR_TEXT = '#1F2937';
const COLOR_MUTED = '#6B7280';

const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const longDate = (value) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return `${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`;
};

const imageBuffer = (dataUrl) => {
  if (!dataUrl) return null;
  try {
    const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
    return Buffer.from(base64, 'base64');
  } catch {
    return null;
  }
};

const drawHeader = (doc, data) => {
  const headerHeight = 34;
  doc.rect(0, 0, CARD_WIDTH, headerHeight).fill(COLOR_PRIMARY);
  doc.rect(0, headerHeight, CARD_WIDTH, 2).fill(COLOR_ACCENT);

  const logoWidth = drawLogoEmblem(doc, data.kampus?.logoUrl, PAD, 5, { height: 24 });
  const textX = PAD + (logoWidth ? logoWidth + 6 : 0);
  const textWidth = CARD_WIDTH - textX - PAD;

  doc
    .fillColor('#FFFFFF')
    .font('Helvetica-Bold')
    .fontSize(7.5)
    .text((data.kampus?.namaKampus ?? 'Politeknik').toUpperCase(), textX, 8, { width: textWidth, lineBreak: false, ellipsis: true });
  doc.font('Helvetica').fontSize(6).text('KARTU TANDA MAHASISWA', textX, 19, { width: textWidth, characterSpacing: 0.8 });
  return headerHeight + 2;
};

const drawPhoto = (doc, photo, x, y, width, height) => {
  doc.rect(x, y, width, height).lineWidth(0.5).strokeColor(COLOR_ACCENT).stroke();
  const buffer = imageBuffer(photo);
  if (buffer) {
    try {
      doc.save();
      doc.rect(x, y, width, height).clip();
      doc.image(buffer, x, y, { cover: [width, height], align: 'center', valign: 'center' });
      doc.restore();
      return;
    } catch {
      doc.restore();
      // foto korup — jatuh ke placeholder di bawah.
    }
  }
  doc.rect(x, y, width, height).fill('#F3F4F6');
  doc
    .fillColor(COLOR_MUTED)
    .font('Helvetica')
    .fontSize(5.5)
    .text('FOTO\n3 x 4', x, y + height / 2 - 7, { width, align: 'center' });
};

const drawFront = (doc, data) => {
  doc.rect(0, 0, CARD_WIDTH, CARD_HEIGHT).fill('#FFFFFF');
  const top = drawHeader(doc, data) + 6;

  const photoWidth = 46;
  const photoHeight = 60;
  drawPhoto(doc, data.photo, PAD, top, photoWidth, photoHeight);

  const labelX = PAD + photoWidth + 8;
  const valueX = labelX + 34;
  const valueWidth = CARD_WIDTH - valueX - PAD;
  const prodi = data.programStudi || '-';
  const ttl = [data.tempatLahir, data.tanggalLahir ? longDate(data.tanggalLahir) : null].filter(Boolean).join(', ') || '-';

  const rows = [
    ['NIM', data.nim],
    ['Nama', data.namaLengkap],
    ['Prodi', prodi],
    ['Kelas', data.kelas ?? '-'],
    ['TTL', ttl],
    ['Angkatan', String(data.tahunMasuk ?? '-')],
  ];

  let y = top;
  rows.forEach(([label, value], index) => {
    doc.fillColor(COLOR_MUTED).font('Helvetica').fontSize(5.5).text(label, labelX, y + 0.5, { width: 32 });
    doc
      .fillColor(COLOR_TEXT)
      .font(index < 2 ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(index === 1 ? 6.5 : 6)
      .text(`: ${value ?? '-'}`, valueX - 4, y, { width: valueWidth + 4, height: 16, ellipsis: true });
    y = Math.max(doc.y, y + 9) + 1.5;
  });

  // Footer masa berlaku.
  const footerY = CARD_HEIGHT - 13;
  doc.rect(0, footerY, CARD_WIDTH, 13).fill('#F9F5EA');
  doc
    .fillColor(COLOR_PRIMARY)
    .font('Helvetica-Bold')
    .fontSize(5.5)
    .text(`Berlaku s.d. ${longDate(data.berlakuHingga)}`, PAD, footerY + 4, { width: CARD_WIDTH - PAD * 2, align: 'right' });
};

const drawBack = (doc, data) => {
  doc.rect(0, 0, CARD_WIDTH, CARD_HEIGHT).fill('#FFFFFF');
  doc.rect(0, 0, CARD_WIDTH, 4).fill(COLOR_PRIMARY);

  doc.fillColor(COLOR_PRIMARY).font('Helvetica-Bold').fontSize(6.5).text('KETENTUAN', PAD, 10);
  const ketentuan = [
    'Kartu ini adalah identitas resmi mahasiswa dan wajib dibawa selama kegiatan akademik.',
    'Kartu tidak dapat dipindahtangankan.',
    'Kartu tidak berlaku apabila mahasiswa tidak aktif, cuti, atau telah lulus.',
    'Apabila menemukan kartu ini, harap dikembalikan ke alamat kampus di bawah.',
  ];
  doc.fillColor(COLOR_TEXT).font('Helvetica').fontSize(5.5);
  ketentuan.forEach((item, index) => {
    doc.text(`${index + 1}. ${item}`, PAD, doc.y + 1.5, { width: CARD_WIDTH - PAD * 2 });
  });

  const kampus = data.kampus ?? {};
  const kontak = [kampus.telepon ? `Telp. ${kampus.telepon}` : null, kampus.email].filter(Boolean).join(' | ');
  const footerTop = CARD_HEIGHT - 30;
  doc.moveTo(PAD, footerTop).lineTo(CARD_WIDTH - PAD, footerTop).lineWidth(0.5).strokeColor(COLOR_ACCENT).stroke();
  doc
    .fillColor(COLOR_PRIMARY)
    .font('Helvetica-Bold')
    .fontSize(6)
    .text(kampus.namaKampus ?? '', PAD, footerTop + 3, { width: CARD_WIDTH - PAD * 2, align: 'center', lineBreak: false, ellipsis: true });
  doc
    .fillColor(COLOR_MUTED)
    .font('Helvetica')
    .fontSize(5)
    .text([kampus.alamat, kontak].filter(Boolean).join('\n'), PAD, footerTop + 11, {
      width: CARD_WIDTH - PAD * 2,
      height: 18,
      align: 'center',
      ellipsis: true,
    });
};

const buildKtmPdf = (data) => {
  const doc = new PDFDocument({ size: [CARD_WIDTH, CARD_HEIGHT], margin: 0, autoFirstPage: false });
  doc.info.Title = `KTM ${data.nim} - ${data.namaLengkap}`;

  doc.addPage();
  drawFront(doc, data);
  doc.addPage();
  drawBack(doc, data);

  doc.end();
  return doc;
};

module.exports = { buildKtmPdf };
