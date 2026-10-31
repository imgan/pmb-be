const PDFDocument = require('pdfkit');
const { buildRealisasiMengajarPdf: buildRealisasiDosenMengajarPdf } = require('./dosenKelasPdf.service');
const { formatTahunAjaran } = require('../utils/tahunAjaran');

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

const todayLong = () => longDate(new Date());

const ensureSpace = (doc, needed) => {
  const bottom = doc.page.height - doc.page.margins.bottom;
  if (doc.y + needed > bottom) {
    doc.addPage();
    return true;
  }
  return false;
};

/**
 * Tanda tangan Kaprodi: nama prodi & nama Kaprodi otomatis dari prodi jadwal (lihat utils/kaprodi.js);
 * bila belum ada akun Kaprodi, nama dikosongkan (titik-titik) untuk diisi manual.
 */
const drawSignature = (doc, ttd = {}) => {
  const { namaProdi, kaprodi } = ttd;
  const head = [todayLong(), namaProdi ? `Ketua Program Studi ${namaProdi},` : 'Ketua Program Studi,'];
  const nama = kaprodi?.nama ?? '(....................................)';
  const foot = kaprodi?.nuptk ? [nama, `NUPTK : ${kaprodi.nuptk}`] : [nama];
  // Blok rata kanan tabel, tiap baris di-center di dalam blok (lebar = baris terpanjang).
  const width = Math.ceil(Math.max(...[...head, ...foot].map((t) => doc.widthOfString(t)))) + 2;
  const x = doc.page.width - doc.page.margins.right - width;
  const line = (text, options = {}) => doc.text(text, x, doc.y, { width, align: 'center', ...options });
  ensureSpace(doc, doc.currentLineHeight(true) * 9);
  doc.moveDown(2.5);
  head.forEach((t) => line(t));
  doc.moveDown(3);
  line(foot[0], { underline: !!kaprodi });
  if (foot[1]) line(foot[1]);
  doc.x = doc.page.margins.left;
};

// ---------- Daftar Hadir Mahasiswa (Template Kehadiran) ----------
const KOLOM_PERTEMUAN = 14;
const BARIS_SHIFT_KOSONG = 5;

/**
 * Tabel grid daftar hadir: header boleh 2 baris (tanggal "2024-03-\n07"), baris data setinggi `rowH`.
 * Header diulang di halaman baru.
 */
const drawGrid = (doc, cols, rows, { rowH = 15, headerH = 26, fontSize = 8.5, headerFontSize = 7.5 } = {}) => {
  const x0 = doc.page.margins.left;
  const bottom = () => doc.page.height - doc.page.margins.bottom;
  const line = (cells, h, bold) => {
    let x = x0;
    const y = doc.y;
    doc.font(bold ? 'Times-Bold' : 'Times-Roman').fontSize(bold ? headerFontSize : fontSize);
    cols.forEach((c, i) => {
      doc.rect(x, y, c.width, h).stroke();
      const text = String(cells[i] ?? '');
      const align = bold ? 'center' : c.align ?? 'left';
      const th = doc.heightOfString(text, { width: c.width - 4, align });
      doc.text(text, x + 2, y + (h - th) / 2, { width: c.width - 4, align, lineGap: -1 });
      x += c.width;
    });
    doc.y = y + h;
  };
  if (doc.y + headerH + rowH > bottom()) doc.addPage();
  line(cols.map((c) => c.label), headerH, true);
  rows.forEach((cells) => {
    if (doc.y + rowH > bottom()) {
      doc.addPage();
      line(cols.map((c) => c.label), headerH, true);
    }
    line(cells, rowH, false);
  });
  doc.x = x0;
};

/**
 * Daftar Hadir Mahasiswa per kelas (landscape). Kolom pertemuan = tanggal realisasi (minimal 14
 * kolom; yang belum terlaksana kosong). Sel "H" = hadir, kosong = belum/tidak hadir.
 * Ket: S = Shift (non-Reguler), N = Reguler. Ditutup tabel kosong "Mahasiswa Shift" untuk diisi manual.
 */
const buildTemplateKehadiranPdf = (jadwal, daftarHadir, kampusName, ttd) => {
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 36, bufferPages: true });
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const x0 = doc.page.margins.left;
  const { tanggal = [], mahasiswa = [] } = daftarHadir ?? {};

  const ta = jadwal.tahunAjaran;
  const dosen = [jadwal.dosenKordinator, ...(jadwal.dosenPengampu ?? [])].filter(Boolean);
  const seen = new Set();
  const dosenLine = dosen
    .filter((d) => !seen.has(d.id) && seen.add(d.id))
    .map((d) => [d.namaLengkap, d.gelar].filter(Boolean).join(', '))
    .join(' / ');

  doc.font('Times-Bold').fontSize(11);
  doc.text('DAFTAR HADIR MAHASISWA', x0, doc.y);
  doc.text(ta ? `SEMESTER ${ta.jenisSemester ?? ''} ${ta.nama}`.replace(/\s+/g, ' ') : 'SEMESTER -');
  doc.text(`Kelas ${jadwal.kelas}`);
  doc.moveDown(0.8);
  const labelValue = (label, value) => {
    doc.font('Times-Bold').fontSize(10).text(`${label}: `, x0, doc.y, { continued: true });
    doc.font('Times-Roman').text(value || '-');
  };
  labelValue('Nama Dosen', dosenLine);
  labelValue('Kode / Mata Kuliah (SKS)', `${jadwal.kodeMataKuliah} / ${jadwal.namaMataKuliah} ( ${jadwal.sks ?? jadwal.sksTeori + jadwal.sksPraktik + jadwal.sksLab} )`);
  doc.moveDown(0.4);

  const jumlahKolom = Math.max(KOLOM_PERTEMUAN, tanggal.length);
  const wNo = 24;
  const wNim = 88;
  const wNama = 175;
  const wKet = 26;
  const wTgl = (width - wNo - wNim - wNama - wKet) / jumlahKolom;
  const headerTanggal = (t) => {
    const m = String(t ?? '').match(/^(\d{4}-\d{2}-)(\d{2})/);
    return m ? `${m[1]}\n${m[2]}` : '';
  };
  const cols = [
    { label: 'No', width: wNo, align: 'center' },
    { label: 'NIM', width: wNim },
    { label: 'Nama', width: wNama },
    ...Array.from({ length: jumlahKolom }, (_, i) => ({ label: headerTanggal(tanggal[i]), width: wTgl, align: 'center' })),
    { label: 'Ket', width: wKet, align: 'center' },
  ];
  const rows = mahasiswa.map((m, i) => [
    String(i + 1),
    m.nim,
    m.namaLengkap,
    ...Array.from({ length: jumlahKolom }, (_, k) => (m.hadir[k] ? 'H' : '')),
    m.ket,
  ]);
  if (!rows.length) rows.push(['', '', 'Belum ada mahasiswa dengan KRS disetujui', ...Array(jumlahKolom).fill(''), '']);
  drawGrid(doc, cols, rows);

  // Mahasiswa Shift: baris kosong untuk peserta yang belum tercantum (diisi manual).
  doc.moveDown(1);
  if (doc.y + 24 + 30 * 2 > doc.page.height - doc.page.margins.bottom) doc.addPage();
  doc.font('Times-Roman').fontSize(10).text('Mahasiswa Shift', x0, doc.y);
  const colsShift = [
    { label: 'No', width: wNo, align: 'center' },
    { label: 'NIM', width: wNim },
    { label: 'Nama', width: wNama },
    ...Array.from({ length: jumlahKolom }, (_, i) => ({ label: String(i + 1), width: wTgl, align: 'center' })),
    { label: 'Ket', width: wKet, align: 'center' },
  ];
  drawGrid(
    doc,
    colsShift,
    Array.from({ length: BARIS_SHIFT_KOSONG }, (_, i) => [String(i + 1), '', '', ...Array(jumlahKolom).fill(''), 'S']),
    { rowH: 26, headerH: 16 }
  );

  doc.font('Times-Roman').fontSize(11);
  drawSignature(doc, ttd);
  doc.end();
  return doc;
};

// ---------- Realisasi Pembahasan Selama Perkuliahan ----------
const JUMLAH_PERTEMUAN = 16;
const pad2 = (n) => String(n).padStart(2, '0');
const namaGelar = (d) => (d ? [d.namaLengkap, d.gelar].filter(Boolean).join(', ') : null);
/** Tabel dengan tinggi baris mengikuti isi; header diulang di halaman baru. */
const drawFlexTable = (doc, cols, rows, { headerFont = 'Times-Bold', bodyFont = 'Times-Bold', fontSize = 9, pad = 4, rowMinH = 0 } = {}) => {
  const x0 = doc.page.margins.left;
  const bottom = () => doc.page.height - doc.page.margins.bottom;
  const tinggi = (cells, font) => {
    doc.font(font).fontSize(fontSize);
    return Math.max(...cols.map((c, i) => doc.heightOfString(String(cells[i] ?? ''), { width: c.width - pad * 2, align: c.align ?? 'left' }))) + pad * 2;
  };
  const row = (cells, font, minH = 0, isHeader = false) => {
    const h = Math.max(tinggi(cells, font), minH);
    let x = x0;
    const y = doc.y;
    doc.font(font).fontSize(fontSize);
    cols.forEach((c, i) => {
      doc.rect(x, y, c.width, h).stroke();
      const text = String(cells[i] ?? '');
      const align = isHeader ? 'center' : c.align ?? 'left';
      const th = doc.heightOfString(text, { width: c.width - pad * 2, align });
      const ty = c.valign === 'top' ? y + pad : y + (h - th) / 2;
      doc.text(text, x + pad, ty, { width: c.width - pad * 2, align });
      x += c.width;
    });
    doc.y = y + h;
  };
  const header = () => row(cols.map((c) => c.label), headerFont, 34, true);
  if (doc.y + 34 + 20 > bottom()) doc.addPage();
  header();
  // rowMinH: angka (semua baris) atau fungsi (indeks baris) -> tinggi minimum baris tsb.
  const minH = (i) => (typeof rowMinH === 'function' ? rowMinH(i) : rowMinH);
  rows.forEach((cells, i) => {
    if (doc.y + Math.max(tinggi(cells, bodyFont), minH(i)) > bottom()) {
      doc.addPage();
      header();
    }
    row(cells, bodyFont, minH(i));
  });
  doc.x = x0;
};

/** "2024-03-09" -> "09-03-2024" */
const tanggalDmy = (value) => {
  const m = String(value ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : '-';
};
/** "15:30" / "15:30:00" -> "15:30:00" */
const jamPenuh = (t) => {
  if (!t) return null;
  const v = String(t).slice(0, 8);
  return v.length === 5 ? `${v}:00` : v;
};
const STATUS_DOSEN = { TIDAK_HADIR: 'Tidak Hadir', IZIN: 'Izin', SAKIT: 'Sakit' };

/**
 * Pokok & sub pembahasan dari "Uraian Materi" realisasi: baris pertama = pokok, sisanya = sub.
 * Uraian satu baris: pokok = uraian, sub = keterangan (bila ada).
 */
const pecahUraian = (r) => {
  const lines = String(r.uraian ?? '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length > 1) return { pokok: lines[0], sub: lines.slice(1).join('\n') };
  return { pokok: lines[0] ?? '-', sub: r.keterangan?.trim() || '' };
};

/** Baris tabel pertemuan dari data realisasi (KehadiranDosen + jumlahHadir/jumlahPeserta). */
const barisRealisasi = (realisasiRows) =>
  realisasiRows.map((r, i) => {
    const { pokok, sub } = pecahUraian(r);
    const status = STATUS_DOSEN[r.status] ? `(${STATUS_DOSEN[r.status]})\n` : '';
    const mulai = jamPenuh(r.jamMasuk);
    const selesai = jamPenuh(r.jamKeluar);
    return [
      `${pad2(r.pertemuanKe ?? i + 1)}) ${tanggalDmy(r.tanggalRealisasi)}`,
      pokok,
      `${status}${sub ? `${sub}\n\n` : ''}- ${namaGelar(r.dosen) ?? '-'}`,
      `${r.jumlahHadir ?? 0} of ${r.jumlahPeserta ?? 0}`,
      mulai || selesai ? `${mulai ?? '-'} - ${selesai ?? '-'}` : '-',
    ];
  });

/**
 * Dokumen "Realisasi Pembahasan Selama Perkuliahan". `realisasiRows` null = template kosong 16
 * pertemuan (diisi manual); array = isi dari data realisasi mengajar (Cetak Realisasi).
 */
const buildRealisasiPembahasanPdf = (jadwal, realisasiRows, kampusName, ttd) => {
  const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  if (kampusName) doc.font('Times-Bold').fontSize(12).text(kampusName.toUpperCase(), { align: 'center' }).moveDown(0.3);
  doc.font('Times-Bold').fontSize(13).text('REALISASI PEMBAHASAN SELAMA PERKULIAHAN', { align: 'center' });
  doc.moveDown(1);

  // Blok identitas 4 kolom (label | isi | label | isi), persis format acuan.
  const dosenList = [jadwal.dosenKordinator, ...(jadwal.dosenPengampu ?? [])].filter(Boolean);
  const seen = new Set();
  const dosenUnik = dosenList.filter((d) => !seen.has(d.id) && seen.add(d.id));
  const bobot = `${jadwal.sks ?? jadwal.sksTeori + jadwal.sksPraktik + jadwal.sksLab} SKS [${jadwal.sksTeori}-${jadwal.sksPraktik}-${jadwal.sksLab}]`;
  const w1 = 120;
  const w3 = 80;
  const w4 = 110;
  const infoCols = [
    { label: '', width: w1 },
    { label: '', width: width - w1 - w3 - w4 },
    { label: '', width: w3 },
    { label: '', width: w4 },
  ];
  const infoRows = [
    ['Nama Matakuliah', `[${jadwal.kodeMataKuliah}] ${jadwal.namaMataKuliah}`, 'Kode Kelas', jadwal.kelas],
    ['Nama Dosen', dosenUnik.map(namaGelar).join('\n') || '-', 'Bobot SKS', bobot],
    ['NIDN', dosenUnik.map((d) => d.nidn).filter(Boolean).join('\n') || '-', 'Ruang', jadwal.ruangan || '-'],
  ];
  // Tabel identitas tanpa baris header.
  const x0 = doc.page.margins.left;
  doc.font('Times-Bold').fontSize(9);
  infoRows.forEach((cells) => {
    const h = Math.max(...infoCols.map((c, i) => doc.heightOfString(String(cells[i]), { width: c.width - 8 }))) + 8;
    let x = x0;
    const y = doc.y;
    infoCols.forEach((c, i) => {
      doc.rect(x, y, c.width, h).stroke();
      const th = doc.heightOfString(String(cells[i]), { width: c.width - 8 });
      doc.text(String(cells[i]), x + 4, y + (h - th) / 2, { width: c.width - 8 });
      x += c.width;
    });
    doc.y = y + h;
  });
  doc.x = x0;
  doc.moveDown(1.2);
  doc.font('Times-Bold').fontSize(10).text('POKOK PEMBAHASAN, RINCIAN DAN ALOKASI WAKTU', x0, doc.y);
  doc.moveDown(0.6);

  const cols = [
    { label: 'PERTEMUAN KE', width: 82, align: 'left' },
    { label: 'POKOK PEMBAHASAN', width: 120 },
    { label: 'SUB PEMBAHASAN', width: width - 82 - 120 - 50 - 110 },
    { label: 'HADIR', width: 50, align: 'center' },
    { label: 'REALISASI WAKTU', width: 110, align: 'center' },
  ];
  // Selalu minimal 16 kotak pertemuan: yang sudah ada realisasinya terisi, sisanya kotak kosong
  // bernomor (cukup tinggi untuk tulisan tangan). Tanpa data (template) = 16 kotak kosong.
  const terisi = realisasiRows ? barisRealisasi(realisasiRows) : [];
  const kosong = Array.from({ length: Math.max(JUMLAH_PERTEMUAN - terisi.length, 0) }, (_, i) => [
    `${pad2(terisi.length + i + 1)})`,
    '',
    '',
    '',
    '',
  ]);
  drawFlexTable(doc, cols, [...terisi, ...kosong], { rowMinH: (i) => (i < terisi.length ? 0 : 40) });

  doc.font('Times-Roman').fontSize(11);
  drawSignature(doc, ttd);
  doc.end();
  return doc;
};

/**
 * Template & cetak realisasi BAAK memakai format resmi "REALISASI DOSEN MENGAJAR" yang sama dengan
 * portal dosen (dosenKelasPdf.service). `realisasiRows` null = 16 baris kosong untuk diisi tangan.
 */
const dataRealisasiDosen = (jadwal, realisasiRows) => {
  const dosen = [jadwal.dosenKordinator, ...(jadwal.dosenPengampu ?? [])].filter(Boolean);
  const seen = new Set();
  const nama = dosen.filter((d) => !seen.has(d.id) && seen.add(d.id)).map(namaGelar);
  return {
    kelas: {
      kelas: jadwal.kelas,
      kodeMataKuliah: jadwal.kodeMataKuliah,
      namaMataKuliah: jadwal.namaMataKuliah,
      sks: jadwal.sks,
      semester: jadwal.semester,
      tahunAjaran: formatTahunAjaran(jadwal.tahunAjaran),
      dosenKordinator: nama[0] ?? null,
      dosenPengampu: nama.slice(1),
    },
    pertemuan: (realisasiRows ?? []).map((r) => ({
      ...(r.get ? r.get({ plain: true }) : r),
      jumlahHadir: r.jumlahHadir,
      tanggal: r.tanggalRealisasi,
    })),
  };
};
const buildTemplateRealisasiPdf = (jadwal) => buildRealisasiDosenMengajarPdf(dataRealisasiDosen(jadwal, null));
const buildRealisasiMengajarPdf = (jadwal, realisasiRows) =>
  buildRealisasiDosenMengajarPdf(dataRealisasiDosen(jadwal, realisasiRows));

module.exports = { buildTemplateKehadiranPdf, buildTemplateRealisasiPdf, buildRealisasiMengajarPdf };
