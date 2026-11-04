/**
 * Kop surat resmi kampus (logo perisai di kiri + nama kampus, alamat, kontak di tengah,
 * ditutup garis tebal). Dipakai bersama oleh PDF yang mencetak kop — KHS dan Formulir
 * Pendaftaran Sidang TA — supaya tampilannya seragam. Data diambil dari master Kampus.
 */
const WEBSITE = 'www.poltekbhaktikartini.ac.id';

const LOGO_HEIGHT = 70;
// Logo kampus di master Kampus berupa wordmark lebar (perisai + tulisan "POLITEKNIK BHAKTI
// KARTINI" di kanannya). Nama kampus sudah dicetak sebagai teks kop, jadi yang dipakai cuma
// perisainya: potong sisi kiri gambar selebar ~0,9x tingginya. Logo yang sudah berbentuk
// emblem (rasio mendekati persegi) digambar utuh.
const WORDMARK_MIN_RATIO = 1.5;
const EMBLEM_WIDTH_RATIO = 0.9;

const logoBuffer = (logoUrl) => {
  if (!logoUrl) return null;
  try {
    const base64 = logoUrl.includes(',') ? logoUrl.split(',')[1] : logoUrl;
    return Buffer.from(base64, 'base64');
  } catch {
    return null; // logo korup/format tak dikenal — jangan gagalkan seluruh cetak karena ini.
  }
};

/**
 * Gambar emblem logo di (x, y) setinggi `height`; kembalikan lebar yang terpakai (0 bila tak
 * ada logo). Dengan `centerX`, emblem di-center horizontal pada titik itu (x diabaikan).
 */
const drawLogoEmblem = (doc, logoUrl, x, y, { height = LOGO_HEIGHT, centerX = null } = {}) => {
  const buffer = logoBuffer(logoUrl);
  if (!buffer) return 0;
  try {
    const img = doc.openImage(buffer);
    const scale = height / img.height;
    const isWordmark = img.width / img.height > WORDMARK_MIN_RATIO;
    const visibleWidth = (isWordmark ? img.height * EMBLEM_WIDTH_RATIO : img.width) * scale;
    const drawX = centerX !== null ? centerX - visibleWidth / 2 : x;

    doc.save();
    doc.rect(drawX, y, visibleWidth, height).clip();
    doc.image(img, drawX, y, { height });
    doc.restore();
    return visibleWidth;
  } catch {
    return 0; // logo tidak valid sebagai gambar — lanjutkan tanpa logo.
  }
};

/** Cetak kop di awal halaman (atau di `top`); setelah ini doc.y berada sedikit di bawah garis kop. */
const drawKop = (doc, kampus, { top = doc.page.margins.top } = {}) => {
  const left = doc.page.margins.left;
  const contentWidth = doc.page.width - left - doc.page.margins.right;

  const logoWidth = drawLogoEmblem(doc, kampus?.logoUrl, left, top);

  // Teks kop di-center pada area sebelah kanan logo supaya baris alamat yang panjang tidak
  // menimpa logo.
  const textX = logoWidth ? left + logoWidth + 10 : left;
  const textWidth = left + contentWidth - textX;

  doc.fillColor('black');
  doc.font('Times-Bold').fontSize(16).text((kampus?.namaKampus || 'Perguruan Tinggi').toUpperCase(), textX, top + 2, {
    width: textWidth,
    align: 'center',
  });
  doc.font('Times-Roman').fontSize(9);
  const alamatLine = [kampus?.alamat, kampus?.telepon ? `Telp : ${kampus.telepon}` : null].filter(Boolean).join(' ');
  if (alamatLine) doc.text(alamatLine, textX, doc.y, { width: textWidth, align: 'center' });
  const kontakLine = [`Website : ${WEBSITE}`, kampus?.email ? `Email : ${kampus.email}` : null].filter(Boolean).join('   ');
  doc.text(kontakLine, textX, doc.y, { width: textWidth, align: 'center' });

  doc.y = Math.max(doc.y, top + LOGO_HEIGHT);
  doc.x = left;
  doc.moveDown(0.4);
  doc.lineWidth(1.5).moveTo(left, doc.y).lineTo(left + contentWidth, doc.y).stroke();
  doc.lineWidth(1);
  doc.moveDown(0.8);
};

module.exports = { drawKop, drawLogoEmblem };
