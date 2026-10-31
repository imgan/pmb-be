const PDFDocument = require('pdfkit');
const { Mahasiswa, NilaiMahasiswa, PembimbingAkademik, Dosen, TahunAjaran, Jurusan, GolonganKelas } = require('../models');
const { GRADE_BOBOT } = require('../utils/gradeScale');
const { loadKelompokKode, pilihNilaiEfektif } = require('../utils/ekuivalensiMatkul');
const { maxSksForSemester } = require('../utils/sksQuota');
const { formatTahunAjaran } = require('../utils/tahunAjaran');
const { drawKop } = require('../utils/pdfKop');
const { listKrs } = require('./krs.service');

/**
 * Cetak KRS Mahasiswa (BAAK) sesuai filter halaman: satu baris per KRS beserta beban SKS, capaian studi, dan pembimbing
 * akademik. Total SKS & IPK Lulus hanya menghitung nilai yang diakui (mata kuliah ulang tidak ganda) dan lulus (min. C).
 */
const BOBOT_LULUS_MIN = GRADE_BOBOT.C;
const STATUS_KRS = { DRAFT: 'Draft', DIAJUKAN: 'Diajukan', DISETUJUI: 'Disetujui', DITOLAK: 'Ditolak', BELUM_DISETUJUI: 'Belum Disetujui', BELUM_ISI: 'Belum Isi' };
const STATUS_DATA = { AKTIF: 'Aktif', CUTI: 'Cuti', TIDAK_AKTIF: 'Tidak Aktif' };
const STATUS_PA = { ADA: 'Sudah Ada PA', BELUM: 'Belum Ada PA' };
const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

const tanggalPendek = (v) => {
  if (!v) return '';
  const [y, m, d] = String(v).slice(0, 10).split('-');
  return `${Number(d)} ${BULAN[Number(m) - 1]} ${y}`;
};

const ipDari = (list) => {
  const sks = list.reduce((t, n) => t + n.sks, 0);
  return sks ? list.reduce((t, n) => t + (GRADE_BOBOT[n.grade] ?? 0) * n.sks, 0) / sks : 0;
};

/** Semua baris sesuai filter (tanpa paging; listKrs dibatasi 1000 baris per halaman). */
const semuaBaris = async (query) => {
  const rows = [];
  for (let page = 1; ; page += 1) {
    const { data, meta } = await listKrs({ ...query, page, limit: 1000 });
    rows.push(...data);
    if (page >= meta.totalPages) return rows;
  }
};

const labelFilter = async (q) => {
  const [tahun, prodi, golongan] = await Promise.all([
    q.tahunAjaranId ? TahunAjaran.findByPk(q.tahunAjaranId) : null,
    q.kodeProdi ? Jurusan.findOne({ where: { kodeProdi: q.kodeProdi } }) : null,
    q.golonganKelasId ? GolonganKelas.findByPk(q.golonganKelasId) : null,
  ]);
  return [
    ['Periode', formatTahunAjaran(tahun) ?? 'Semua'],
    ['Unit Kerja', prodi?.namaJurusan ?? 'Semua'],
    ['Status KRS', STATUS_KRS[q.status] ?? 'Semua'],
    q.statusPa && ['Status Pembimbing', STATUS_PA[q.statusPa]],
    q.tahunMasuk && ['Periode Masuk', q.tahunMasuk],
    golongan && ['Sistem Kuliah', golongan.nama ?? golongan.namaGolongan],
    q.semester && ['Semester', q.semester],
    q.statusData && ['Status Data', STATUS_DATA[q.statusData]],
    q.search && ['Pencarian', q.search],
  ]
    .filter(Boolean)
    .map(([k, v]) => `${k}: ${v}`)
    .join('   |   ');
};

const getCetakData = async (query) => {
  const krs = await semuaBaris(query);
  const ids = [...new Set(krs.map((k) => k.mahasiswaId))];
  const [mahasiswa, nilaiSemua, kelompokOf, filter] = await Promise.all([
    Mahasiswa.findAll({
      where: { id: ids },
      attributes: ['id', 'nim', 'namaLengkap', 'tahunMasuk', 'statusKeluar'],
      include: [{ model: PembimbingAkademik, as: 'pembimbingAkademik', required: false, include: [{ model: Dosen, as: 'dosen', required: false }] }],
    }),
    NilaiMahasiswa.findAll({ where: { mahasiswaId: ids }, attributes: ['mahasiswaId', 'kodeMataKuliah', 'semester', 'sks', 'grade'], raw: true }),
    loadKelompokKode(),
    labelFilter(query),
  ]);
  const mhsBy = new Map(mahasiswa.map((m) => [m.id, m]));
  const efektif = pilihNilaiEfektif(nilaiSemua, kelompokOf);

  const rows = krs
    .map((k) => {
      const m = mhsBy.get(k.mahasiswaId);
      const lulus = efektif.filter((n) => n.mahasiswaId === k.mahasiswaId && (GRADE_BOBOT[n.grade] ?? -1) >= BOBOT_LULUS_MIN);
      const smt = nilaiSemua.filter((n) => n.mahasiswaId === k.mahasiswaId && n.semester === k.semester);
      const pa = m?.pembimbingAkademik;
      return {
        nim: m?.nim ?? '',
        nama: `${m?.nim ?? ''} - ${m?.namaLengkap ?? ''}`,
        angkatan: m?.tahunMasuk ?? '',
        // A = KRS disetujui, C = cuti, N = belum aktif pada periode ini.
        statusSmt: m?.statusKeluar === 'CUTI' ? 'C' : k.status === 'DISETUJUI' ? 'A' : 'N',
        smt: k.semester ?? '-',
        sks: k.totalSks ?? 0,
        batasSks: k.semester ? maxSksForSemester(k.semester) : '-',
        totalSks: lulus.reduce((t, n) => t + n.sks, 0),
        ips: ipDari(smt).toFixed(2),
        ipk: ipDari(lulus).toFixed(2),
        pembimbing: pa?.dosen ? `${pa.dosen.nidn ?? '-'} - ${pa.dosen.namaLengkap ?? pa.dosen.nama ?? ''}` : '',
        noSk: pa?.noSk ?? '',
        tglSk: tanggalPendek(pa?.tanggalSk),
      };
    })
    .sort((a, b) => a.nim.localeCompare(b.nim));
  return { filter, rows };
};

const KOLOM = [
  { key: 'nama', label: 'Nama', width: 174, align: 'left' },
  { key: 'angkatan', label: 'Angkatan', width: 48 },
  { key: 'statusSmt', label: 'Status Smt.', width: 34 },
  { key: 'smt', label: 'Smt.', width: 26 },
  { key: 'sks', label: 'SKS', width: 26 },
  { key: 'batasSks', label: 'Batas SKS', width: 30 },
  { key: 'totalSks', label: 'Total SKS', width: 30 },
  { key: 'ips', label: 'IPS', width: 30 },
  { key: 'ipk', label: 'IPK Lulus', width: 32 },
  { key: 'pembimbing', label: 'Pembimbing Akademik', width: 190, align: 'left' },
  { key: 'noSk', label: 'No. SK', width: 92, align: 'left' },
  { key: 'tglSk', label: 'Tgl. SK', width: 50 },
];
const PAD = 3;

const buildKrsCetakPdf = ({ filter, rows }, kampus) => {
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margins: { top: 30, bottom: 0, left: 40, right: 40 }, bufferPages: true });
  // Margin bawah PDF 0 agar pdfkit tidak pernah membuat halaman otomatis saat menulis teks; pindah halaman hanya lewat BATAS_BAWAH.
  const BATAS_BAWAH = doc.page.height - 30;
  const left = doc.page.margins.left;
  const width = KOLOM.reduce((t, k) => t + k.width, 0);
  const area = { width: doc.page.width - left * 2, align: 'center' };

  // heightOfString bisa memicu halaman baru bila doc.y dekat tepi bawah, jadi ukur dari atas halaman.
  const ukurTinggi = (teks, lebar) => {
    doc.y = doc.page.margins.top;
    return doc.heightOfString(teks, { width: lebar });
  };
  const tinggiBaris = (font, ambil) => {
    doc.font(font).fontSize(8);
    return Math.max(...KOLOM.map((k) => ukurTinggi(String(ambil(k)), k.width - PAD * 2))) + PAD * 2;
  };
  const gambarBaris = (y, h, font, warna, ambil, latar) => {
    if (latar) doc.rect(left, y, width, h).fill(latar);
    let x = left;
    KOLOM.forEach((k) => {
      doc.rect(x, y, k.width, h).lineWidth(0.5).stroke('#999999');
      const teks = String(ambil(k));
      doc.font(font).fontSize(8);
      const th = ukurTinggi(teks, k.width - PAD * 2);
      doc.fillColor(warna).text(teks, x + PAD, y + (h - th) / 2, { width: k.width - PAD * 2, align: k.align ?? 'center' });
      x += k.width;
    });
    doc.fillColor('#000000');
  };

  drawKop(doc, kampus);
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#000000').text('KARTU RENCANA STUDI MAHASISWA', left, doc.y, area);
  doc.font('Helvetica').fontSize(8).text(filter, left, doc.y + 3, area);
  doc.text(`Jumlah: ${rows.length} data   |   Status Smt.: A = Aktif (KRS disetujui), C = Cuti, N = Belum aktif`, left, doc.y + 2, area);
  doc.moveDown(0.6);

  let y = doc.y;
  const tulisHeader = () => {
    const h = tinggiBaris('Helvetica-Bold', (k) => k.label);
    gambarBaris(y, h, 'Helvetica-Bold', '#ffffff', (k) => k.label, '#00447c');
    y += h;
  };
  tulisHeader();
  rows.forEach((r, i) => {
    const h = tinggiBaris('Helvetica', (k) => r[k.key]);
    if (y + h > BATAS_BAWAH) {
      doc.addPage();
      y = doc.page.margins.top;
      tulisHeader();
    }
    gambarBaris(y, h, 'Helvetica', '#000000', (k) => r[k.key], i % 2 ? '#f3f4f6' : null);
    y += h;
  });
  if (!rows.length) doc.font('Helvetica').fontSize(9).text('Tidak ada data sesuai filter.', left, y + 8, area);

  const halaman = doc.bufferedPageRange();
  for (let i = 0; i < halaman.count; i += 1) {
    doc.switchToPage(i);
    doc.font('Helvetica').fontSize(7).fillColor('#555555').text(`Halaman ${i + 1} dari ${halaman.count}`, left, doc.page.height - 20, { width, align: 'right', lineBreak: false });
  }
  doc.end();
  return doc;
};

module.exports = { getCetakData, buildKrsCetakPdf };
