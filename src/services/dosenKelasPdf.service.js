const PDFDocument = require('pdfkit');
const { drawKop } = require('../utils/pdfKop');
const { longDate } = require('./formulirSidangTaPdf.service');

/**
 * Cetakan per kelas untuk portal dosen (A4 landscape, kop kampus):
 * realisasi mengajar, rekap kehadiran mahasiswa per pertemuan, dan daftar nilai.
 */
const KOTA = 'Bekasi';
const STATUS_DOSEN = { HADIR: 'Hadir', TIDAK_HADIR: 'Tidak Hadir', IZIN: 'Izin', SAKIT: 'Sakit' };
const KODE_PRESENSI = { HADIR: 'H', IZIN: 'I', SAKIT: 'S', ALPA: 'A' };

const tglPendek = (v) => {
  if (!v) return '-';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '-' : `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};
const jam = (v) => (v ? String(v).slice(0, 5) : '');
const angka = (v) => (v === null || v === undefined ? '-' : Number(v).toLocaleString('id-ID', { maximumFractionDigits: 2 }));

const newDoc = (title) => {
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margins: { top: 30, bottom: 30, left: 36, right: 36 }, bufferPages: true, info: { Title: title } });
  return { doc, left: doc.page.margins.left, width: doc.page.width - doc.page.margins.left - doc.page.margins.right };
};

const header = (doc, kampus, judul, kelas, left, width) => {
  drawKop(doc, kampus);
  doc.font('Times-Bold').fontSize(13).text(judul, left, doc.y - 6, { width, align: 'center' });
  doc.moveDown(0.5);
  const y = doc.y;
  const kiri = [
    ['Mata Kuliah', `${kelas.kodeMataKuliah} - ${kelas.namaMataKuliah} (${kelas.sks ?? 0} SKS)`],
    ['Kelas / Semester', `${kelas.kelas} / ${kelas.semester ?? '-'}`],
  ];
  const kanan = [
    ['Tahun Akademik', kelas.tahunAjaran ?? '-'],
    ['Dosen', [kelas.dosenKordinator, ...kelas.dosenPengampu].filter((d) => d && d !== '-').join('; ') || '-'],
  ];
  doc.font('Times-Roman').fontSize(10);
  kiri.forEach(([l, v], i) => {
    doc.text(l, left, y + i * 14, { width: 95 });
    doc.text(`: ${v}`, left + 95, y + i * 14, { width: width / 2 - 100 });
  });
  kanan.forEach(([l, v], i) => {
    doc.text(l, left + width / 2, y + i * 14, { width: 90 });
    doc.text(`: ${v}`, left + width / 2 + 90, y + i * 14, { width: width / 2 - 90 });
  });
  doc.y = y + kiri.length * 14 + 8;
};

/** Tabel dengan pindah halaman otomatis (header kolom diulang). */
const table = (doc, cols, rows, { left, fontSize = 9, headFill = '#E8E8E8', minRowH = 16, middle = false } = {}) => {
  const bottom = doc.page.height - doc.page.margins.bottom;
  const drawHead = () => {
    let x = left;
    const y = doc.y;
    doc.font('Times-Bold').fontSize(fontSize);
    const h = Math.max(20, ...cols.map((c) => doc.heightOfString(c.label, { width: c.w - 4 }) + 8));
    cols.forEach((c) => {
      doc.rect(x, y, c.w, h).fillAndStroke(headFill, '#000');
      const th = doc.heightOfString(c.label, { width: c.w - 4 });
      doc.fillColor('#000').font('Times-Bold').fontSize(fontSize).text(c.label, x + 2, middle ? y + (h - th) / 2 : y + 4, { width: c.w - 4, align: 'center' });
      x += c.w;
    });
    doc.y = y + h;
  };
  drawHead();
  rows.forEach((row) => {
    doc.font('Times-Roman').fontSize(fontSize);
    const h = Math.max(minRowH, ...cols.map((c, i) => doc.heightOfString(String(row[i] ?? ''), { width: c.w - 6 }) + 6));
    if (doc.y + h > bottom - 70) {
      doc.addPage();
      drawHead();
    }
    let x = left;
    const y = doc.y;
    cols.forEach((c, i) => {
      doc.rect(x, y, c.w, h).stroke();
      const teks = String(row[i] ?? '');
      doc.font(c.bold ? 'Times-Bold' : 'Times-Roman');
      const th = doc.heightOfString(teks, { width: c.w - 6 });
      doc.text(teks, x + 3, middle ? y + (h - th) / 2 : y + 4, { width: c.w - 6, align: c.align ?? 'left' });
      x += c.w;
    });
    doc.y = y + h;
  });
};

const tandaTangan = (doc, kelas, left, width) => {
  const bottom = doc.page.height - doc.page.margins.bottom;
  if (doc.y + 90 > bottom) doc.addPage();
  const x = left + width - 230;
  doc.font('Times-Roman').fontSize(10).text(`${KOTA}, ${longDate(new Date())}`, x, doc.y + 14, { width: 230, align: 'center' });
  doc.text('Dosen Pengampu,', x, doc.y, { width: 230, align: 'center' });
  doc.font('Times-Bold').text(kelas.dosenKordinator ?? '(.................................)', x, doc.y + 45, { width: 230, align: 'center', underline: true });
};

const nomorHalaman = (doc) => {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    // Tulis di area margin bawah tanpa memicu halaman baru.
    const bottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.font('Times-Italic').fontSize(8).text(`Halaman ${i + 1} dari ${range.count}`, doc.page.margins.left, doc.page.height - 22, {
      width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
      align: 'right',
      lineBreak: false,
    });
    doc.page.margins.bottom = bottom;
  }
};

// Format resmi "REALISASI DOSEN MENGAJAR": minimal 16 baris pertemuan (yang sudah terlaksana terisi,
// sisanya kosong untuk diisi tangan), kolom paraf dosen/koordinator/monitoring prodi per pertemuan.
const JUMLAH_PERTEMUAN = 16;

const buildRealisasiMengajarPdf = (data) => {
  const { doc, left, width } = newDoc(`Realisasi Dosen Mengajar ${data.kelas.kelas}`);
  const k = data.kelas;
  doc.font('Times-Bold').fontSize(11);
  doc.text('REALISASI DOSEN MENGAJAR', left, doc.y);
  doc.text(`SEMESTER ${[k.semester, k.tahunAjaran].filter(Boolean).join(' - ')}`);
  doc.text(`Kelas ${k.kelas}`);
  doc.moveDown(0.8);
  const label = (l, v) => {
    doc.font('Times-Bold').fontSize(10).text(`${l}: `, left, doc.y, { continued: true });
    doc.font('Times-Roman').text(v, { width });
  };
  label('Nama Dosen', [k.dosenKordinator, ...k.dosenPengampu].filter((d) => d && d !== '-').join(' / ') || '-');
  label('Kode / Mata Kuliah (SKS)', `${k.kodeMataKuliah} / ${k.namaMataKuliah} ( ${k.sks ?? 0} )`);
  doc.moveDown(0.2);

  // Proporsi lebar kolom mengikuti template (total disesuaikan ke lebar halaman).
  const proporsi = [
    ['Ke', 30, 'center'],
    ['Tanggal', 108, 'center'],
    ['Jam Masuk', 60, 'center'],
    ['Jam Keluar', 60, 'center'],
    ['Pokok Bahasan', 215, 'left'],
    ['Rincian', 215, 'left'],
    ['Jml Hadir', 60, 'center'],
    ['Paraf Dosen', 60, 'center'],
    ['Paraf Koordinator', 84, 'center'],
    ['Monitoring Prodi', 80, 'center'],
  ];
  const total = proporsi.reduce((s, [, w]) => s + w, 0);
  const cols = proporsi.map(([label, w, align], i) => ({ label, w: (w / total) * width, align, bold: i === 0 }));

  const terisi = data.pertemuan.map((p, i) => [
    p.pertemuanKe ?? i + 1,
    longDate(p.tanggal),
    jam(p.jamMasuk),
    jam(p.jamKeluar),
    p.uraian || '',
    p.keterangan || (p.status && p.status !== 'HADIR' ? STATUS_DOSEN[p.status] ?? p.status : ''),
    p.jumlahHadir,
    '',
    '',
    '',
  ]);
  const kosong = Array.from({ length: Math.max(JUMLAH_PERTEMUAN - terisi.length, 0) }, (_, i) => [
    terisi.length + i + 1,
    '', '', '', '', '', '', '', '', '',
  ]);
  table(doc, cols, [...terisi, ...kosong], { left, fontSize: 10, headFill: '#FFFFFF', minRowH: 62, middle: true });
  nomorHalaman(doc);
  doc.end();
  return doc;
};

const buildRekapKehadiranPdf = (data, kampus) => {
  const { doc, left, width } = newDoc(`Rekap Kehadiran ${data.kelas.kelas}`);
  header(doc, kampus, 'REKAP KEHADIRAN MAHASISWA', data.kelas, left, width);
  const n = data.pertemuan.length;
  const tetap = 24 + 80 + 150 + 4 * 24 + 40;
  const wPert = n ? Math.max(Math.min((width - tetap) / n, 30), 16) : 30;
  // Kolom nama menyerap sisa lebar supaya tabel selalu penuh sampai margin kanan.
  const wNama = Math.max(width - (tetap - 150) - n * wPert, 150);
  const cols = [
    { label: 'No', w: 24, align: 'center' },
    { label: 'NIM', w: 80 },
    { label: 'Nama Mahasiswa', w: wNama },
    ...data.pertemuan.map((p) => ({ label: String(p.pertemuanKe), w: wPert, align: 'center' })),
    { label: 'H', w: 24, align: 'center' },
    { label: 'I', w: 24, align: 'center' },
    { label: 'S', w: 24, align: 'center' },
    { label: 'A', w: 24, align: 'center' },
    { label: '%', w: 40, align: 'center' },
  ];
  const rows = data.mahasiswa.map((m) => [
    m.no,
    m.nim,
    m.namaLengkap,
    ...m.status.map((s) => (s ? KODE_PRESENSI[s] : '-')),
    m.hadir,
    m.izin,
    m.sakit,
    m.alpa,
    `${m.persen}%`,
  ]);
  if (!rows.length) rows.push(['', '', 'Belum ada mahasiswa (KRS disetujui)', ...data.pertemuan.map(() => ''), '', '', '', '', '']);
  table(doc, cols, rows, { left, fontSize: 8 });
  doc.font('Times-Italic').fontSize(8).text(
    `Keterangan: H = Hadir, I = Izin, S = Sakit, A = Alpa, - = belum diisi. Kolom angka = pertemuan ke-. ` +
      (n ? `Tanggal: ${data.pertemuan.map((p) => `${p.pertemuanKe}) ${tglPendek(p.tanggal)}`).join(', ')}.` : ''),
    left,
    doc.y + 6,
    { width }
  );
  tandaTangan(doc, data.kelas, left, width);
  nomorHalaman(doc);
  doc.end();
  return doc;
};

const buildDaftarNilaiPdf = (data, kampus) => {
  const { doc, left, width } = newDoc(`Daftar Nilai ${data.kelas.kelas}`);
  header(doc, kampus, 'DAFTAR NILAI MAHASISWA', data.kelas, left, width);
  const cols = [
    { label: 'No', w: 28, align: 'center' },
    { label: 'NIM', w: 95 },
    { label: 'Nama Mahasiswa', w: width - 28 - 95 - 8 * 58 },
    { label: 'Partisipasi', w: 58, align: 'center' },
    { label: 'Tugas', w: 58, align: 'center' },
    { label: 'Quiz', w: 58, align: 'center' },
    { label: 'Proyek', w: 58, align: 'center' },
    { label: 'UTS', w: 58, align: 'center' },
    { label: 'UAS', w: 58, align: 'center' },
    { label: 'Nilai Akhir', w: 58, align: 'center' },
    { label: 'Huruf', w: 58, align: 'center' },
  ];
  const rows = data.mahasiswa.map((m) => [
    m.no,
    m.nim,
    m.namaLengkap,
    angka(m.partisipatif),
    angka(m.tugas),
    angka(m.quiz),
    angka(m.proyek),
    angka(m.uts),
    angka(m.uas),
    angka(m.nilai),
    m.grade ?? '-',
  ]);
  if (!rows.length) rows.push(['', '', 'Belum ada mahasiswa (KRS disetujui)', '', '', '', '', '', '', '', '']);
  table(doc, cols, rows, { left, minRowH: 18 });
  tandaTangan(doc, data.kelas, left, width);
  nomorHalaman(doc);
  doc.end();
  return doc;
};

// table & nomorHalaman dipakai juga oleh laporanObePdf.service.js.
module.exports = { buildRealisasiMengajarPdf, buildRekapKehadiranPdf, buildDaftarNilaiPdf, table, nomorHalaman };
