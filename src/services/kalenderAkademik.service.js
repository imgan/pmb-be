const PDFDocument = require('pdfkit');
const { Op } = require('sequelize');
const { KalenderAkademik, TahunAjaran } = require('../models');
const { buildWorkbook } = require('../utils/excel');
const { formatTahunAjaran } = require('../utils/tahunAjaran');

/**
 * Kalender akademik: daftar kegiatan per tahun akademik, export Excel & cetak PDF (BAAK), dan
 * tampilan hanya-lihat untuk portal mahasiswa. Kategori & warnanya sama dengan
 * KATEGORI_KALENDER di pmb-fe/src/api/kalenderAkademik.ts.
 */
const KATEGORI = [
  ['KKN', 'KKN', '#FF0080'],
  ['PKL', 'PKL', '#A8A83C'],
  ['PENELITIAN', 'Penelitian', '#6600CC'],
  ['PERKULIAHAN', 'Perkuliahan', '#FF8000'],
  ['PEMBAYARAN', 'Pembayaran', '#FF0000'],
  ['YUDISIUM', 'Yudisium', '#B300B3'],
  ['WISUDA', 'Wisuda', '#9933FF'],
  ['LIBUR_AKADEMIK', 'Libur Akademik', '#800000'],
  ['LIBUR_NASIONAL', 'Libur Nasional', '#3D7F7F'],
  ['PENERIMAAN_MAHASISWA_BARU', 'Penerimaan Mahasiswa Baru', '#00FFFF'],
  ['ORIENTASI_MAHASISWA', 'Orientasi Mahasiswa', '#A0675A'],
  ['SEMINAR_PROPOSAL', 'Seminar Proposal', '#00FF00'],
  ['SEMINAR_HASIL', 'Seminar Hasil', '#000000'],
  ['REGISTRASI', 'Registrasi / KRS', '#2A78D6'],
  ['UJIAN', 'Ujian', '#1BAF7A'],
  ['LAINNYA', 'Lainnya', '#A3A29C'],
].map(([value, label, color]) => ({ value, label, color }));
const KATEGORI_KODE = KATEGORI.map((k) => k.value);
const KATEGORI_BY = Object.fromEntries(KATEGORI.map((k) => [k.value, k]));

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const tglPanjang = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return `${d} ${BULAN[m - 1]} ${y}`;
};
const rentang = (k) => (k.tanggalMulai === k.tanggalSelesai ? tglPanjang(k.tanggalMulai) : `${tglPanjang(k.tanggalMulai)} – ${tglPanjang(k.tanggalSelesai)}`);
const durasiHari = (k) => {
  const utc = (s) => Date.UTC(...s.split('-').map((n, i) => (i === 1 ? Number(n) - 1 : Number(n))));
  return Math.round((utc(k.tanggalSelesai) - utc(k.tanggalMulai)) / 86400000) + 1;
};

const toJson = (k) => ({
  id: k.id,
  tahunAjaranId: k.tahunAjaranId,
  namaKegiatan: k.namaKegiatan,
  kategori: k.kategori,
  tanggalMulai: k.tanggalMulai,
  tanggalSelesai: k.tanggalSelesai,
  keterangan: k.keterangan,
});

const list = async ({ tahunAjaranId, kategori } = {}) => {
  const where = {};
  if (tahunAjaranId) where.tahunAjaranId = Number(tahunAjaranId);
  if (KATEGORI_KODE.includes(kategori)) where.kategori = kategori;
  const rows = await KalenderAkademik.findAll({ where, order: [['tanggalMulai', 'ASC'], ['tanggalSelesai', 'ASC'], ['id', 'ASC']] });
  return rows.map(toJson);
};

const labelPeriode = async (tahunAjaranId) => formatTahunAjaran(tahunAjaranId ? await TahunAjaran.findByPk(tahunAjaranId) : null);

const exportExcel = async (query) => {
  const [items, periode] = await Promise.all([list(query), labelPeriode(query.tahunAjaranId)]);
  const workbook = buildWorkbook(
    'Kalender Akademik',
    [
      { header: 'No', key: 'no', width: 6 },
      { header: 'Kegiatan', key: 'namaKegiatan', width: 40 },
      { header: 'Kategori', key: 'kategori', width: 26 },
      { header: 'Tanggal Mulai', key: 'tanggalMulai', width: 16 },
      { header: 'Tanggal Selesai', key: 'tanggalSelesai', width: 16 },
      { header: 'Durasi (hari)', key: 'durasi', width: 13 },
      { header: 'Keterangan', key: 'keterangan', width: 40 },
    ],
    items.map((k, i) => ({
      no: i + 1,
      namaKegiatan: k.namaKegiatan,
      kategori: KATEGORI_BY[k.kategori]?.label ?? k.kategori,
      tanggalMulai: tglPanjang(k.tanggalMulai),
      tanggalSelesai: tglPanjang(k.tanggalSelesai),
      durasi: durasiHari(k),
      keterangan: k.keterangan ?? '',
    }))
  );
  const sheet = workbook.getWorksheet('Kalender Akademik');
  // Warna kategori sebagai isian sel (teks tetap tertulis — warna bukan satu-satunya penanda).
  items.forEach((k, i) => {
    const color = KATEGORI_BY[k.kategori]?.color;
    if (!color) return;
    const cell = sheet.getCell(i + 2, 3);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${color.slice(1)}` } };
    cell.font = { color: { argb: warnaTeks(color) === '#000000' ? 'FF000000' : 'FFFFFFFF' } };
  });
  sheet.insertRow(1, [`Kalender Akademik ${periode}`]);
  sheet.getRow(1).font = { bold: true, size: 13 };
  sheet.getRow(2).font = { bold: true };
  return { workbook, filename: `kalender-akademik-${periode.replace(/[^A-Za-z0-9]+/g, '-')}.xlsx` };
};

/** Teks hitam di atas warna terang, putih di atas warna gelap. */
const warnaTeks = (hex) => {
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const [r, g, b] = [1, 3, 5].map((i) => lin(parseInt(hex.slice(i, i + 2), 16) / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? '#000000' : '#FFFFFF';
};

// ---------- Cetak PDF (format poster seperti kalender akademik cetak kampus) ----------

const BULAN_SINGKAT = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'];
const NAVY = '#1F2A6B';
const AKSEN = '#B08F3E';
const MERAH = '#D32F2F';

/** "5 SEP", "16–17 FEB", "29 SEP–3 OKT" */
const rentangSingkat = (k) => {
  const [y1, m1, d1] = k.tanggalMulai.split('-').map(Number);
  const [y2, m2, d2] = k.tanggalSelesai.split('-').map(Number);
  if (k.tanggalMulai === k.tanggalSelesai) return d1 + ' ' + BULAN_SINGKAT[m1 - 1];
  if (y1 === y2 && m1 === m2) return d1 + '–' + d2 + ' ' + BULAN_SINGKAT[m1 - 1];
  return d1 + ' ' + BULAN_SINGKAT[m1 - 1] + '–' + d2 + ' ' + BULAN_SINGKAT[m2 - 1];
};
const pad2 = (n) => String(n).padStart(2, '0');

/** Logo kampus utuh (wordmark) di tengah; kembalikan tinggi terpakai. */
const drawLogoTengah = (doc, kampus, centerX, y, maxH, maxW) => {
  if (!kampus?.logoUrl) return 0;
  try {
    const img = doc.openImage(Buffer.from(kampus.logoUrl.split(',').pop(), 'base64'));
    const scale = Math.min(maxH / img.height, maxW / img.width);
    doc.image(img, centerX - (img.width * scale) / 2, y, { width: img.width * scale, height: img.height * scale });
    return img.height * scale;
  } catch {
    return 0;
  }
};

/**
 * Satu bulan: judul, baris nama hari (Minggu di depan), sel tanggal diwarnai kategori kegiatan
 * (2 kegiatan = sel dibagi diagonal), lalu daftar kegiatan bulan itu. Mengembalikan jumlah
 * kegiatan yang tidak muat.
 */
const drawBulan = (doc, { x, y, w, h, tahun, bulan, items }) => {
  const cellW = w / 7;
  const cellH = 12.5;
  doc.font('Helvetica-Bold').fontSize(11).fillColor(AKSEN).text(NAMA_BULAN_PANJANG[bulan] + ' ' + tahun, x, y, { width: w, align: 'center', lineBreak: false });
  let cy = y + 15;
  doc.rect(x, cy, w, 10).fill(NAVY);
  ['M', 'S', 'S', 'R', 'K', 'J', 'S'].forEach((hari, i) => {
    doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#FFFFFF').text(hari, x + i * cellW, cy + 2, { width: cellW, align: 'center', lineBreak: false });
  });
  cy += 10;

  const awal = new Date(Date.UTC(tahun, bulan, 1)).getUTCDay(); // 0 = Minggu
  const jumlahHari = new Date(Date.UTC(tahun, bulan + 1, 0)).getUTCDate();
  for (let d = 1; d <= jumlahHari; d += 1) {
    const idx = awal + d - 1;
    const cx = x + (idx % 7) * cellW;
    const ry = cy + Math.floor(idx / 7) * cellH;
    const tgl = tahun + '-' + pad2(bulan + 1) + '-' + pad2(d);
    const warna = [...new Set(items.filter((k) => k.tanggalMulai <= tgl && k.tanggalSelesai >= tgl).map((k) => KATEGORI_BY[k.kategori]?.color ?? '#CCCCCC'))];
    // 1 kategori = sel penuh; 2–4 kategori = pita diagonal sama lebar (2 = dibagi diagonal).
    const pita = warna.slice(0, 4);
    if (pita.length === 1) doc.rect(cx, ry, cellW, cellH).fill(pita[0]);
    else if (pita.length > 1) {
      // Garis pemisah x/w + y/h = s (s = 0..2); pita i mencakup s ∈ [2i/n, 2(i+1)/n], dipotong ke sel.
      const titik = (sv, u) => [cx + (sv - u) * cellW, ry + u * cellH];
      doc.save();
      doc.rect(cx, ry, cellW, cellH).clip();
      pita.forEach((c, i) => {
        const s0 = (2 * i) / pita.length;
        const s1 = (2 * (i + 1)) / pita.length;
        doc.polygon(titik(s0, -1), titik(s0, 2), titik(s1, 2), titik(s1, -1)).fill(c);
      });
      doc.restore();
    }
    doc.rect(cx, ry, cellW, cellH).lineWidth(0.4).stroke('#C9C9C9');
    // Warna angka mengikuti pita di tengah sel.
    const tengah = pita.length ? pita[Math.min(pita.length - 1, Math.floor(pita.length / 2))] : null;
    const teks = tengah ? warnaTeks(tengah) : idx % 7 === 0 ? MERAH : '#222222';
    doc.font(warna.length ? 'Helvetica-Bold' : 'Helvetica').fontSize(6.5).fillColor(teks).text(String(d), cx, ry + 3.2, { width: cellW, align: 'center', lineBreak: false });
  }
  cy += 6 * cellH + 5;

  // Daftar kegiatan bulan ini.
  const awalBulan = tahun + '-' + pad2(bulan + 1) + '-01';
  const akhirBulan = tahun + '-' + pad2(bulan + 1) + '-' + pad2(jumlahHari);
  const kegiatan = items.filter((k) => k.tanggalMulai <= akhirBulan && k.tanggalSelesai >= awalBulan);
  const batas = y + h;
  let sisa = 0;
  kegiatan.forEach((k, i) => {
    const teks = rentangSingkat(k) + '  ' + k.namaKegiatan;
    doc.font('Helvetica').fontSize(5.6);
    const th = doc.heightOfString(teks, { width: w - 9 });
    if (sisa || cy + th > batas - (i < kegiatan.length - 1 ? 7 : 0)) {
      sisa += 1;
      return;
    }
    doc.rect(x, cy + 0.6, 5, 5).fillAndStroke(KATEGORI_BY[k.kategori]?.color ?? '#CCCCCC', '#888888');
    doc.font('Helvetica-Bold').fontSize(5.6).fillColor(MERAH).text(rentangSingkat(k) + '  ', x + 8, cy, { width: w - 9, continued: true });
    doc.font('Helvetica').fillColor('#222222').text(k.namaKegiatan, { width: w - 9 });
    cy += th + 1.5;
  });
  if (sisa) doc.font('Helvetica-Oblique').fontSize(5.6).fillColor('#555555').text('+' + sisa + ' kegiatan lainnya (lihat Daftar Kegiatan)', x + 8, cy, { width: w - 9 });
  return sisa;
};

const NAMA_BULAN_PANJANG = BULAN;

/** Halaman daftar kegiatan (tabel) setelah poster. */
const drawDaftar = (doc, items, judul) => {
  const left = doc.page.margins.left;
  const width = doc.page.width - left - doc.page.margins.right;
  doc.font('Helvetica-Bold').fontSize(13).fillColor(NAVY).text('DAFTAR KEGIATAN', left, doc.page.margins.top, { width, align: 'center' });
  doc.font('Helvetica').fontSize(9.5).fillColor('#333333').text(judul, { width, align: 'center' });
  doc.moveDown(0.8);
  const cols = [
    { label: 'No', w: 26, align: 'center' },
    { label: 'Kegiatan', w: 160 },
    { label: 'Kategori', w: 105 },
    { label: 'Tanggal', w: 120 },
    { label: 'Hari', w: 32, align: 'center' },
    { label: 'Keterangan', w: width - 26 - 160 - 105 - 120 - 32 },
  ];
  const bottom = doc.page.height - doc.page.margins.bottom;
  const drawHead = () => {
    let x = left;
    const y = doc.y;
    cols.forEach((c) => {
      doc.rect(x, y, c.w, 18).fillAndStroke(NAVY, NAVY);
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#FFFFFF').text(c.label, x + 2, y + 5, { width: c.w - 4, align: 'center' });
      x += c.w;
    });
    doc.y = y + 18;
  };
  drawHead();
  if (!items.length) {
    doc.rect(left, doc.y, width, 20).lineWidth(0.5).stroke('#999999');
    doc.font('Helvetica-Oblique').fontSize(8.5).fillColor('#333333').text('Belum ada kegiatan.', left, doc.y + 6, { width, align: 'center' });
  }
  items.forEach((k, i) => {
    const kat = KATEGORI_BY[k.kategori] ?? { label: k.kategori, color: '#FFFFFF' };
    const row = [String(i + 1), k.namaKegiatan, kat.label, rentang(k), String(durasiHari(k)), k.keterangan ?? ''];
    doc.font('Helvetica').fontSize(8.5);
    const h = Math.max(17, ...cols.map((c, ci) => doc.heightOfString(row[ci], { width: c.w - (ci === 2 ? 18 : 6) }) + 7));
    if (doc.y + h > bottom - 6) {
      doc.addPage();
      drawHead();
    }
    let x = left;
    const y = doc.y;
    cols.forEach((c, ci) => {
      doc.rect(x, y, c.w, h).lineWidth(0.5).stroke('#999999');
      if (ci === 2) {
        doc.rect(x + 4, y + 4.5, 8, 8).fillAndStroke(kat.color, '#666666');
        doc.fillColor('#222222').text(row[ci], x + 16, y + 4, { width: c.w - 18 });
      } else {
        doc.fillColor('#222222').text(row[ci], x + 3, y + 4, { width: c.w - 6, align: c.align ?? 'left' });
      }
      x += c.w;
    });
    doc.y = y + h;
  });
};

/**
 * PDF A4 portrait. Halaman 1 = poster satu tahun akademik penuh (September–Agustus, gabungan
 * semester Ganjil & Genap dengan nama tahun yang sama): logo, judul, 12 kalender bulanan bertanggal
 * berwarna + daftar kegiatan per bulan, keterangan warna, catatan & kontak kampus. Halaman
 * berikutnya = tabel Daftar Kegiatan lengkap. Filter kategori ikut diterapkan.
 */
const buildPdf = async (query, kampus) => {
  const terpilih = query.tahunAjaranId ? await TahunAjaran.findByPk(query.tahunAjaranId) : await TahunAjaran.findOne({ where: { isActive: true }, order: [['id', 'DESC']] });
  const tahunMulai = terpilih?.tahunMulai ?? new Date().getFullYear();
  const namaTahun = terpilih?.nama ?? tahunMulai + '/' + (tahunMulai + 1);
  const taIds = terpilih ? (await TahunAjaran.findAll({ where: { nama: terpilih.nama }, attributes: ['id'] })).map((t) => t.id) : [];
  const where = taIds.length ? { tahunAjaranId: { [Op.in]: taIds } } : {};
  if (KATEGORI_KODE.includes(query.kategori)) where.kategori = query.kategori;
  const items = (await KalenderAkademik.findAll({ where, order: [['tanggalMulai', 'ASC'], ['tanggalSelesai', 'ASC'], ['id', 'ASC']] })).map(toJson);

  const doc = new PDFDocument({ size: 'A4', margins: { top: 22, bottom: 22, left: 22, right: 22 }, bufferPages: true, info: { Title: 'Kalender Akademik ' + namaTahun } });
  const left = doc.page.margins.left;
  const width = doc.page.width - left - doc.page.margins.right;
  const pageH = doc.page.height;

  // Header: logo, judul, nama kampus.
  const tinggiLogo = drawLogoTengah(doc, kampus, doc.page.width / 2, 20, 40, 230);
  let y = 20 + (tinggiLogo ? tinggiLogo + 6 : 0);
  doc.font('Helvetica-Bold').fontSize(22).fillColor(NAVY).text('KALENDER AKADEMIK ' + namaTahun, left, y, { width, align: 'center' });
  y = doc.y + 1;
  doc.font('Helvetica-Bold').fontSize(12).fillColor(AKSEN).text((kampus?.namaKampus ?? '').toUpperCase(), left, y, { width, align: 'center' });
  y = doc.y + 2;
  if (query.kategori && KATEGORI_BY[query.kategori]) {
    doc.font('Helvetica').fontSize(8).fillColor('#444444').text('Kategori: ' + KATEGORI_BY[query.kategori].label, left, y, { width, align: 'center' });
    y = doc.y + 2;
  }
  y += 6;

  // Footer (digambar dulu supaya area kalender tahu batasnya).
  const footerH = 58;
  const footerY = pageH - doc.page.margins.bottom - footerH;

  // 12 bulan: September tahunMulai s.d. Agustus tahun berikutnya, 4 kolom × 3 baris.
  const kolom = 4;
  const gap = 10;
  const blokW = (width - gap * (kolom - 1)) / kolom;
  const blokH = (footerY - 6 - y) / 3;
  let terlewat = 0;
  for (let i = 0; i < 12; i += 1) {
    const bulan = (8 + i) % 12;
    const tahun = tahunMulai + (8 + i >= 12 ? 1 : 0);
    terlewat += drawBulan(doc, {
      x: left + (i % kolom) * (blokW + gap),
      y: y + Math.floor(i / kolom) * blokH,
      w: blokW,
      h: blokH - 6,
      tahun,
      bulan,
      items,
    });
  }

  // Keterangan warna + catatan + kontak kampus.
  let fy = footerY;
  doc.moveTo(left, fy).lineTo(left + width, fy).lineWidth(0.6).stroke('#BBBBBB');
  fy += 4;
  const legendW = width / 6;
  KATEGORI.forEach((k, i) => {
    const lx = left + (i % 6) * legendW;
    const ly = fy + Math.floor(i / 6) * 9;
    doc.rect(lx, ly + 0.5, 6, 6).fillAndStroke(k.color, '#888888');
    doc.font('Helvetica').fontSize(6).fillColor('#222222').text(k.label, lx + 9, ly, { width: legendW - 10, lineBreak: false });
  });
  fy += Math.ceil(KATEGORI.length / 6) * 9 + 3;
  doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#222222').text('CATATAN: ', left, fy, { continued: true });
  doc.font('Helvetica').text('Jika ada perubahan, akan diterbitkan Surat Edaran/Pengumuman.' + (terlewat ? ' Kegiatan yang tidak muat tercantum di halaman Daftar Kegiatan.' : ''));
  const kontak = [kampus?.alamat, kampus?.telepon ? 'Telp ' + kampus.telepon : null, kampus?.email].filter(Boolean).join('  ·  ');
  const bandY = pageH - doc.page.margins.bottom - 13;
  doc.rect(left, bandY, width, 13).fill(NAVY);
  doc.font('Helvetica').fontSize(6.3).fillColor('#FFFFFF').text(kontak || kampus?.namaKampus || '', left + 6, bandY + 3.6, { width: width - 12, align: 'center', lineBreak: false, ellipsis: true });

  // Halaman daftar kegiatan.
  doc.addPage({ size: 'A4', margins: { top: 36, bottom: 36, left: 36, right: 36 } });
  drawDaftar(doc, items, 'Kalender Akademik ' + namaTahun + ' — ' + (kampus?.namaKampus ?? ''));

  const range = doc.bufferedPageRange();
  for (let i = range.start + 1; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    const mb = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.font('Helvetica-Oblique').fontSize(7.5).fillColor('#444444').text('Kalender Akademik ' + namaTahun + ' · Halaman ' + (i + 1) + ' dari ' + range.count, doc.page.margins.left, doc.page.height - 24, {
      width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
      align: 'right',
      lineBreak: false,
    });
    doc.page.margins.bottom = mb;
  }
  doc.end();
  return { doc, filename: 'kalender-akademik-' + namaTahun.replace(/[^A-Za-z0-9]+/g, '-') + '.pdf' };
};

/** Portal mahasiswa: kegiatan satu tahun akademik (default aktif) + pilihan tahun akademik yang berisi kegiatan. */
const untukMahasiswa = async ({ tahunAjaranId } = {}) => {
  const aktif = await TahunAjaran.findOne({ where: { isActive: true }, order: [['id', 'DESC']] });
  const terisi = (await KalenderAkademik.findAll({ attributes: ['tahunAjaranId'], group: ['tahunAjaranId'], raw: true })).map((r) => r.tahunAjaranId);
  const ids = [...new Set([...(aktif ? [aktif.id] : []), ...terisi])];
  const daftar = ids.length ? await TahunAjaran.findAll({ where: { id: { [Op.in]: ids } } }) : [];
  daftar.sort((a, b) => b.tahunMulai - a.tahunMulai || String(b.jenisSemester).localeCompare(String(a.jenisSemester)));
  const pilih = ids.includes(Number(tahunAjaranId)) ? Number(tahunAjaranId) : aktif?.id ?? daftar[0]?.id ?? null;
  return {
    tahunAjaranId: pilih,
    tahunAjaranOptions: daftar.map((t) => ({ value: t.id, label: `${formatTahunAjaran(t)}${t.isActive ? ' (aktif)' : ''}` })),
    items: pilih ? await list({ tahunAjaranId: pilih }) : [],
  };
};

module.exports = { KATEGORI_KODE, list, exportExcel, buildPdf, untukMahasiswa, toJson };
