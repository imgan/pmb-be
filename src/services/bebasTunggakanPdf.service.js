const PDFDocument = require('pdfkit');
const { Mahasiswa, Jurusan, TagihanKuliah, PembayaranKuliah, TahunAjaran } = require('../models');
const ApiError = require('../utils/ApiError');
const { drawKop } = require('../utils/pdfKop');
const { hitungSaldoTagihan, urutanPeriode } = require('../utils/tagihanSaldo');
const { formatTahunAjaran } = require('../utils/tahunAjaran');
const { getRingkasanTunggakanMahasiswa } = require('./laporanKeuangan.service');
const { getRingkasanTaSkripsiByMahasiswaId } = require('./pembayaranTaSkripsi.service');
const { longDate } = require('./formulirSidangTaPdf.service');

/**
 * Bukti Bebas Tunggakan Biaya Kuliah — dicetak bagian keuangan sebagai lampiran pendaftaran sidang.
 * Isi: identitas mahasiswa, biaya bimbingan (TA/Skripsi), total biaya kuliah, tunggakan, dan rekap
 * pembayaran kuliah per semester (tagihan, bayar, sisa).
 */
const KOTA = 'Bekasi';
const angka = (n) => Math.round(Number(n) || 0).toLocaleString('id-ID');

const getBebasTunggakanData = async (mahasiswaId) => {
  const mahasiswa = await Mahasiswa.findByPk(mahasiswaId, {
    attributes: ['id', 'nim', 'namaLengkap'],
    include: [{ model: Jurusan, as: 'jurusan', attributes: ['namaJurusan'], required: false }],
  });
  if (!mahasiswa) throw new ApiError(404, 'Mahasiswa tidak ditemukan');

  const [tagihanList, ringkasan, taSkripsi] = await Promise.all([
    TagihanKuliah.findAll({
      where: { mahasiswaId },
      include: [
        { model: PembayaranKuliah, as: 'pembayaranList', required: false },
        { model: TahunAjaran, as: 'tahunAjaran', attributes: ['id', 'nama', 'tahunMulai', 'jenisSemester'], required: false },
      ],
    }),
    getRingkasanTunggakanMahasiswa(mahasiswaId),
    getRingkasanTaSkripsiByMahasiswaId(mahasiswaId),
  ]);

  const rekap = [...tagihanList]
    .sort((a, b) => urutanPeriode(a) - urutanPeriode(b))
    .map((t) => {
      const saldo = hitungSaldoTagihan(t);
      return {
        semester: t.semester,
        tahunAjaran: formatTahunAjaran(t.tahunAjaran),
        tagihan: saldo.totalTagihan,
        bayar: Math.min(saldo.totalDibayar, saldo.totalTagihan),
        sisa: saldo.sisaSemester,
      };
    });

  const biayaBimbingan = taSkripsi.reduce((sum, p) => sum + p.pendaftaran.tarif + (p.perpanjangan?.tarif ?? 0), 0);
  return {
    mahasiswa: { nim: mahasiswa.nim, namaLengkap: mahasiswa.namaLengkap, prodi: mahasiswa.jurusan?.namaJurusan ?? '-' },
    biayaBimbingan,
    biayaKuliah: rekap.reduce((sum, r) => sum + r.tagihan, 0),
    tunggakan: ringkasan.totalTunggakan,
    rekap,
  };
};

const buildBebasTunggakanPdf = (data, kampus, { petugas } = {}) => {
  const doc = new PDFDocument({ size: 'A4', margins: { top: 36, bottom: 36, left: 50, right: 50 } });
  const left = doc.page.margins.left;
  const width = doc.page.width - left - doc.page.margins.right;

  drawKop(doc, kampus);

  doc.font('Times-Bold').fontSize(13).text('BUKTI TELAH BEBAS TUNGGAKAN BIAYA KULIAH', left, doc.y - 4, { width, align: 'center' });
  doc.moveDown(0.8);

  // Identitas (kiri) & ringkasan biaya (kanan), dua kolom.
  const startY = doc.y;
  const kiriW = width * 0.62;
  const kananX = left + kiriW + 10;
  const kananW = width - kiriW - 10;
  const kv = (x, y, label, value, labelWidth, colWidth) => {
    doc.font('Times-Roman').fontSize(11).text(label, x, y, { width: labelWidth });
    doc.text(`: ${value}`, x + labelWidth, y, { width: colWidth - labelWidth });
    return doc.y;
  };
  const kiri = [
    ['Nama Mahasiswa', data.mahasiswa.namaLengkap],
    ['NIM', data.mahasiswa.nim],
    ['Program Studi', data.mahasiswa.prodi],
  ];
  const kanan = [
    ['Biaya Bimbingan', angka(data.biayaBimbingan)],
    ['Biaya Kuliah', angka(data.biayaKuliah)],
    ['Tunggakan', angka(data.tunggakan)],
  ];
  // Baris dibuat setinggi teks terpanjang (nama / prodi panjang tidak menimpa baris berikutnya).
  let y0 = startY;
  for (let i = 0; i < 3; i += 1) {
    const yKiri = kv(left, y0, kiri[i][0], kiri[i][1], 105, kiriW);
    const yKanan = kv(kananX, y0, kanan[i][0], kanan[i][1], 95, kananW);
    y0 = Math.max(yKiri, yKanan, y0 + 14) + 4;
  }
  doc.y = y0 + 2;
  doc.lineWidth(1.5).moveTo(left, doc.y).lineTo(left + width, doc.y).stroke();
  doc.moveDown(0.8);

  // Tabel rekap pembayaran kuliah.
  const cols = [
    { label: 'Semester', w: 70 },
    { label: 'Tahun Akademik', w: 120 },
    { label: 'Tagihan', w: (width - 190) / 3 },
    { label: 'Bayar', w: (width - 190) / 3 },
    { label: 'Sisa', w: (width - 190) / 3 },
  ];
  const rowH = 20;
  let y = doc.y;
  doc.lineWidth(1).rect(left, y, width, rowH).stroke();
  doc.font('Times-Bold').fontSize(11).text('REKAP PEMBAYARAN KULIAH', left, y + 5, { width, align: 'center' });
  y += rowH;
  const drawRow = (values, bold) => {
    let x = left;
    cols.forEach((c, i) => {
      doc.rect(x, y, c.w, rowH).stroke();
      doc.font(bold ? 'Times-Bold' : 'Times-Roman').fontSize(10.5).text(String(values[i]), x + 3, y + 5, { width: c.w - 6, align: 'center' });
      x += c.w;
    });
    y += rowH;
  };
  drawRow(cols.map((c) => c.label), true);
  if (!data.rekap.length) {
    doc.rect(left, y, width, rowH).stroke();
    doc.font('Times-Italic').fontSize(10.5).text('Belum ada data tagihan kuliah', left, y + 5, { width, align: 'center' });
    y += rowH;
  }
  data.rekap.forEach((r) => drawRow([r.semester, r.tahunAjaran ?? '-', angka(r.tagihan), angka(r.bayar), angka(r.sisa)], false));
  drawRow(['Total', '', angka(data.rekap.reduce((s, r) => s + r.tagihan, 0)), angka(data.rekap.reduce((s, r) => s + r.bayar, 0)), angka(data.rekap.reduce((s, r) => s + r.sisa, 0))], true);

  // Pernyataan & tanda tangan.
  y += 14;
  doc.font('Times-Roman').fontSize(11).text(
    'Dengan ini menerangkan bahwa mahasiswa tersebut di atas telah menyelesaikan seluruh kewajiban biaya kuliah dan tidak memiliki tunggakan, sehingga dapat mengikuti sidang.',
    left,
    y,
    { width, align: 'justify' }
  );
  const signX = left + width - 200;
  y = doc.y + 18;
  doc.text(`${KOTA}, ${longDate(new Date())}`, signX, y, { width: 200, align: 'center' });
  doc.text('Kasir,', signX, doc.y, { width: 200, align: 'center' });
  doc.font('Times-Bold').text(petugas ?? '(.................................)', signX, doc.y + 50, { width: 200, align: 'center', underline: !!petugas });

  doc.end();
  return doc;
};

module.exports = { getBebasTunggakanData, buildBebasTunggakanPdf };
