const PDFDocument = require('pdfkit');
const { drawKop } = require('../utils/pdfKop');
const { longDate } = require('./formulirSidangTaPdf.service');
const { table, nomorHalaman } = require('./dosenKelasPdf.service');

/**
 * PDF Laporan OBE (Monitoring OBE) — A4 landscape, kop kampus opsional ("Gunakan KOP").
 * Data dari laporanObe.service.generate().
 */
const JUDUL = { 'cpl-prodi': 'LAPORAN CAPAIAN CPL PER PROGRAM STUDI', 'cpl-mahasiswa': 'LAPORAN CAPAIAN CPL PER MAHASISWA', 'cpmk-mk': 'LAPORAN CAPAIAN CPMK PER MATA KULIAH', 'cpmk-mahasiswa': 'LAPORAN CAPAIAN CPMK PER MAHASISWA' };
const METODE = { rerata: 'Rerata', progresif: 'Progresif' };
const angka = (v) => (v === null || v === undefined ? '-' : Number(v).toLocaleString('id-ID', { maximumFractionDigits: 2 }));
const status = (t) => (t === null || t === undefined ? '-' : t ? 'Tercapai' : 'Belum Tercapai');

const BIRU_TUA = '#0b4a8b';
const CAPAIAN = '#2563eb';
const TARGET = '#d97706';
const dua = (v) => (v === null || v === undefined ? '-' : Number(v).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

/** Gambar logo kampus utuh (wordmark) di dalam kotak. */
const logoDalamKotak = (doc, logoUrl, x, y, w, h) => {
  if (!logoUrl) return;
  try {
    const buf = Buffer.from(logoUrl.includes(',') ? logoUrl.split(',')[1] : logoUrl, 'base64');
    doc.image(buf, x + 8, y + 8, { fit: [w - 16, h - 16], align: 'center', valign: 'center' });
  } catch {
    // logo tidak valid — lewati.
  }
};

/** Spiderchart capaian (biru) vs target (oranye putus-putus), skala 0–100. */
const spiderchart = (doc, rows, cx, cy, r) => {
  const n = rows.length;
  const sudut = (i) => -Math.PI / 2 + (2 * Math.PI * i) / n;
  const titik = (i, v, rr = r) => {
    const k = (Math.max(0, Math.min(100, v ?? 0)) / 100) * rr;
    return [cx + k * Math.cos(sudut(i)), cy + k * Math.sin(sudut(i))];
  };
  doc.save().lineWidth(0.6).strokeColor('#c8c8c8');
  [20, 40, 60, 80, 100].forEach((v) => doc.polygon(...rows.map((_, i) => titik(i, v))).stroke());
  rows.forEach((_, i) => doc.moveTo(cx, cy).lineTo(...titik(i, 100)).stroke());
  doc.restore();
  doc.save().lineWidth(1.5).dash(4, { space: 3 }).fillOpacity(0.12).fillColor(TARGET).strokeColor(TARGET);
  doc.polygon(...rows.map((x, i) => titik(i, x.target))).fillAndStroke();
  doc.restore();
  doc.save().lineWidth(1.5).fillOpacity(0.22).fillColor(CAPAIAN).strokeColor(CAPAIAN);
  doc.polygon(...rows.map((x, i) => titik(i, x.rerata))).fillAndStroke();
  doc.restore();
  doc.save().fillColor(CAPAIAN);
  rows.forEach((x, i) => doc.circle(...titik(i, x.rerata), 2.2).fill());
  doc.restore();
  rows.forEach((x, i) => {
    const [lx, ly] = titik(i, 100, r + 16);
    const cos = Math.cos(sudut(i));
    const align = Math.abs(cos) < 0.2 ? 'center' : cos > 0 ? 'left' : 'right';
    const w = 70;
    const tx = align === 'center' ? lx - w / 2 : align === 'left' ? lx : lx - w;
    doc.fillColor('#000').font('Helvetica-Bold').fontSize(8).text(x.kode, tx, ly - 8, { width: w, align });
    doc.fillColor('#555').font('Helvetica').fontSize(8).text(x.rerata === null ? 'belum dinilai' : dua(x.rerata), tx, ly + 1, { width: w, align });
  });
  doc.fillColor('#000');
};

/** Kepala laporan: kotak logo + tabel info berjudul jenis laporan. Kembalikan y di bawah kepala. */
const kepala = (doc, judul, konteks, kampus, left, width, infoKhusus = null) => {
  const y0 = doc.y;
  const logoW = 170;
  const rowH = 17;
  const info = infoKhusus ?? [
    ['Tahun Kurikulum', String(konteks.tahunKurikulum)],
    ['Program Studi', konteks.prodi],
    ['Angkatan', konteks.angkatan ? String(konteks.angkatan) : 'Semua Angkatan'],
    // Semua yang mengambil MK kurikulum; rerata dihitung dari yang sudah dinilai.
    ['Total Mahasiswa', konteks.jumlahDinilai !== undefined ? `${konteks.jumlahMahasiswa} (${konteks.jumlahDinilai} sudah dinilai)` : String(konteks.jumlahMahasiswa)],
    ['Metode Perhitungan', METODE[konteks.metode]],
  ];
  const tinggi = rowH * (info.length + 1);
  doc.lineWidth(0.6).strokeColor('#bbb').rect(left, y0, logoW, tinggi).stroke();
  logoDalamKotak(doc, kampus?.logoUrl, left, y0, logoW, tinggi);
  const tx = left + logoW;
  const tw = width - logoW;
  doc.rect(tx, y0, tw, rowH).fill(BIRU_TUA);
  doc.fillColor('#fff').font('Helvetica-Bold').fontSize(9).text(judul, tx, y0 + 5, { width: tw, align: 'center' });
  info.forEach(([l, v], i) => {
    const y = y0 + rowH * (i + 1);
    doc.strokeColor('#bbb').rect(tx, y, tw / 2, rowH).stroke().rect(tx + tw / 2, y, tw / 2, rowH).stroke();
    doc.fillColor('#000').font('Helvetica-Bold').fontSize(8.5).text(l, tx + 6, y + 5, { width: tw / 2 - 12 });
    doc.font('Helvetica').text(v, tx + tw / 2 + 6, y + 5, { width: tw / 2 - 12 });
  });
  return y0 + tinggi;
};

/** CPL per Mahasiswa: kepala, daftar CPL, tabel nilai CPL per mahasiswa + rerata, keterangan hasil. */
const cplMahasiswa = (doc, data, kampus, left, width, kop) => {
  const { konteks, kolom, rows, rerata } = data;
  if (!kop) {
    doc.fillColor('#000').font('Helvetica').fontSize(9).text(kampus?.namaKampus || 'Politeknik Bhakti Kartini', left, doc.y, { width, align: 'center' });
    doc.moveDown(0.6);
  }
  let y = kepala(doc, 'CPL PER MAHASISWA', konteks, kampus, left, width) + 14;

  // Daftar CPL.
  doc.fillColor('#000').font('Helvetica-Bold').fontSize(10).text(`CPL Program Studi - ${konteks.prodi}`, left + 10, y + 10, { width: width - 20 });
  doc.moveDown(0.5);
  const awalDaftar = y;
  kolom.forEach((k) => {
    if (doc.y + 24 > doc.page.height - doc.page.margins.bottom) doc.addPage();
    const yy = doc.y;
    doc.font('Helvetica-Bold').fontSize(8.5).text(`•  ${k.kode}`, left + 14, yy, { width: 70 });
    doc.font('Helvetica').text(k.deskripsi, left + 90, yy, { width: width - 110 });
    doc.y = Math.max(doc.y, yy + 11) + 4;
  });
  if (!kolom.length) doc.font('Helvetica').fontSize(9).text('Kurikulum ini belum memiliki CPL.', left + 14, doc.y);
  // Bingkai daftar (hanya bila masih di halaman yang sama).
  if (doc.y > awalDaftar) doc.strokeColor('#bbb').lineWidth(0.6).rect(left, awalDaftar, width, doc.y - awalDaftar + 6).stroke();
  y = doc.y + 20;

  // Tabel nilai: kepala grup "Nilai CPL" di atas kolom CPL.
  if (y + 70 > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
    y = doc.page.margins.top;
  }
  const wNo = 30;
  const wNim = 90;
  const wNama = 170;
  // Lebar kolom CPL dibatasi supaya tabel tidak melebar penuh saat CPL sedikit.
  const wCpl = Math.min(80, Math.max(38, Math.floor((width - wNo - wNim - wNama) / Math.max(kolom.length, 1))));
  const xCpl = left + wNo + wNim + wNama;
  doc.rect(left, y, wNo + wNim + wNama, 18).fill(BIRU_TUA);
  doc.rect(xCpl, y, wCpl * Math.max(kolom.length, 1), 18).fill(BIRU_TUA);
  doc.fillColor('#fff').font('Helvetica-Bold').fontSize(9).text('Nilai CPL', xCpl, y + 5, { width: wCpl * Math.max(kolom.length, 1), align: 'center' });
  doc.strokeColor('#fff').lineWidth(0.6).moveTo(xCpl, y).lineTo(xCpl, y + 18).stroke();
  doc.fillColor('#000');
  doc.y = y + 18;
  doc.x = left;
  table(
    doc,
    [
      { label: 'No.', w: wNo, align: 'center' },
      { label: 'NIM', w: wNim },
      { label: 'Nama Mahasiswa', w: wNama },
      ...kolom.map((k) => ({ label: k.kode, w: wCpl, align: 'right' })),
    ],
    [
      ...rows.map((r, i) => [`${i + 1}.`, r.nim, r.nama, ...kolom.map((k) => dua(r.nilai[k.id]))]),
      ['', '', 'Rerata Nilai CPL', ...kolom.map((k) => dua(rerata[k.id]))],
      ['', '', 'Target', ...kolom.map((k) => dua(k.target))],
    ],
    { left, headFill: '#dbe5f1' }
  );

  // Keterangan hasil.
  const dinilai = kolom.filter((k) => rerata[k.id] !== null && rerata[k.id] !== undefined);
  const tinggiK = dinilai.reduce((a, k) => (!a || rerata[k.id] > rerata[a.id] ? k : a), null);
  const rendahK = dinilai.reduce((a, k) => (!a || rerata[k.id] < rerata[a.id] ? k : a), null);
  if (doc.y + 60 > doc.page.height - doc.page.margins.bottom) doc.addPage();
  doc.font('Helvetica-Bold').fontSize(9).text('Keterangan Hasil CPL:', left, doc.y + 10);
  doc.font('Helvetica').fontSize(8.5);
  if (tinggiK && rendahK) {
    const rataAll = dinilai.reduce((s, k) => s + rerata[k.id], 0) / dinilai.length;
    doc.text(
      `Capaian Pembelajaran Lulusan (CPL) mencatat capaian tertinggi sebesar ${dua(rerata[tinggiK.id])} (${tinggiK.kode}), dengan batas terendah pada angka ${dua(rerata[rendahK.id])} (${rendahK.kode}).`,
      left,
      doc.y + 2,
      { width }
    );
    doc.text(`Secara keseluruhan, rata-rata CPL berada pada angka ${dua(rataAll)}.`, left, doc.y, { width });
  } else {
    doc.text('Belum ada nilai CPL yang bisa dihitung.', left, doc.y + 2, { width });
  }
  doc.fillColor('#555').text(
    `Rerata dihitung dari ${konteks.jumlahDinilai ?? konteks.jumlahMahasiswa} mahasiswa yang sudah dinilai; tanda "-" = belum memiliki nilai OBE.`,
    left,
    doc.y + 2,
    { width }
  );
  doc.fillColor('#000');
};

const STATUS_MHS = { SUDAH: 'Sudah Memenuhi', BELUM: 'Belum Memenuhi', BELUM_DINILAI: 'Belum Dinilai', TANPA_TARGET: 'Target Belum Diisi' };

/** CPMK per Mahasiswa (satu mata kuliah): kepala, detail CPMK, tabel nilai CPMK + target + status capaian. */
const cpmkMahasiswa = (doc, data, kampus, left, width, kop) => {
  const { konteks, mataKuliah: mk, kolom, rows } = data;
  if (!kop) {
    doc.fillColor('#000').font('Helvetica').fontSize(9).text(kampus?.namaKampus || 'Politeknik Bhakti Kartini', left, doc.y, { width, align: 'center' });
    doc.moveDown(0.6);
  }
  const namaMk = `${mk.kode} - ${mk.mataKuliah}`;
  let y =
    kepala(doc, 'CPMK PER MAHASISWA', konteks, kampus, left, width, [
      ['Tahun Kurikulum', String(konteks.tahunKurikulum)],
      ['Program Studi', konteks.prodi],
      ['Mata Kuliah', namaMk],
      ['Angkatan', konteks.angkatan ? String(konteks.angkatan) : 'Semua Angkatan'],
    ]) + 14;

  // Detail CPMK.
  doc.fillColor('#000').font('Helvetica-Bold').fontSize(10).text('Detail CPMK Mata Kuliah:', left + 10, y + 10, { width: width - 20 });
  doc.moveDown(0.5);
  kolom.forEach((c) => {
    if (doc.y + 24 > doc.page.height - doc.page.margins.bottom) doc.addPage();
    const yy = doc.y;
    doc.font('Helvetica-Bold').fontSize(8.5).text(`•  ${c.kode}`, left + 14, yy, { width: 70 });
    doc.font('Helvetica').text(c.deskripsi, left + 90, yy, { width: width - 110 });
    doc.y = Math.max(doc.y, yy + 11) + 4;
  });
  if (!kolom.length) doc.font('Helvetica').fontSize(9).text('Mata kuliah ini belum memiliki CPMK.', left + 14, doc.y);
  if (doc.y > y) doc.strokeColor('#bbb').lineWidth(0.6).rect(left, y, width, doc.y - y + 6).stroke();
  y = doc.y + 20;

  if (y + 70 > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
    y = doc.page.margins.top;
  }
  const wNo = 30;
  const wNim = 90;
  const wNama = 170;
  const wStatus = 95;
  const nCol = Math.max(kolom.length, 1);
  const wCpmk = Math.min(80, Math.max(38, Math.floor((width - wNo - wNim - wNama - wStatus) / nCol)));
  const xCpmk = left + wNo + wNim + wNama;
  doc.rect(left, y, wNo + wNim + wNama, 18).fill(BIRU_TUA);
  doc.rect(xCpmk, y, wCpmk * nCol + wStatus, 18).fill(BIRU_TUA);
  doc.fillColor('#fff').font('Helvetica-Bold').fontSize(9).text('Nilai CPMK', xCpmk, y + 5, { width: wCpmk * nCol, align: 'center' });
  doc.strokeColor('#fff').lineWidth(0.6).moveTo(xCpmk, y).lineTo(xCpmk, y + 18).stroke().moveTo(xCpmk + wCpmk * nCol, y).lineTo(xCpmk + wCpmk * nCol, y + 18).stroke();
  doc.fillColor('#000');
  doc.y = y + 18;
  doc.x = left;
  table(
    doc,
    [
      { label: 'No.', w: wNo, align: 'center' },
      { label: 'NIM', w: wNim },
      { label: 'Nama Mahasiswa', w: wNama },
      ...kolom.map((c) => ({ label: c.kode, w: wCpmk, align: 'right' })),
      { label: 'Status Capaian', w: wStatus, align: 'center' },
    ],
    [
      ['', '', 'Target CPMK', ...kolom.map(() => dua(mk.targetCpmk)), ''],
      ...rows.map((r, i) => [`${i + 1}.`, r.nim, r.nama, ...kolom.map((c) => dua(r.nilai[c.id])), STATUS_MHS[r.status] ?? r.status]),
      ['', '', 'Rerata', ...kolom.map((c) => dua(data.rerata[c.id])), ''],
    ],
    { left, headFill: '#dbe5f1' }
  );
  const n = { SUDAH: 0, BELUM: 0, BELUM_DINILAI: 0 };
  rows.forEach((r) => (n[r.status] = (n[r.status] ?? 0) + 1));
  if (doc.y + 40 > doc.page.height - doc.page.margins.bottom) doc.addPage();
  doc.font('Helvetica-Bold').fontSize(9).text('Keterangan:', left, doc.y + 10);
  doc.font('Helvetica').fontSize(8.5).text(
    `${n.SUDAH} mahasiswa sudah memenuhi target CPMK (${dua(mk.targetCpmk)}), ${n.BELUM} belum memenuhi, ${n.BELUM_DINILAI} belum dinilai. Sudah Memenuhi = semua CPMK mencapai target.`,
    left,
    doc.y + 2,
    { width }
  );
};

/** CPL per Program Studi: kepala (logo + info), spiderchart + performa, tabel detail. */
const cplProdi = (doc, data, kampus, left, width) => {
  const { konteks, rows } = data;
  // Spiderchart + performa.
  const y1 = kepala(doc, 'CPL PER PROGRAM STUDI', konteks, kampus, left, width) + 14;
  const tinggiGrafik = 275;
  doc.strokeColor('#bbb').rect(left, y1, width, tinggiGrafik).stroke();
  doc.fillColor('#000').font('Helvetica-Bold').fontSize(10).text('Spiderchart CPL Program Studi', left, y1 + 10, { width: width / 2, align: 'center' });
  if (rows.length >= 3) {
    spiderchart(doc, rows, left + width / 4, y1 + 130, 76);
    const ly = y1 + tinggiGrafik - 18;
    const lx = left + width / 4 - 70;
    doc.save().fillOpacity(0.22).fillColor(CAPAIAN).rect(lx, ly, 16, 9).fill().restore();
    doc.strokeColor(CAPAIAN).lineWidth(1).rect(lx, ly, 16, 9).stroke();
    doc.fillColor('#555').font('Helvetica').fontSize(8).text('Capaian', lx + 20, ly + 1);
    doc.save().fillOpacity(0.12).fillColor(TARGET).rect(lx + 80, ly, 16, 9).fill().restore();
    doc.save().strokeColor(TARGET).dash(2, { space: 2 }).rect(lx + 80, ly, 16, 9).stroke().restore();
    doc.fillColor('#555').text('Target', lx + 100, ly + 1);
  } else {
    doc.fillColor('#555').font('Helvetica').fontSize(9).text(`Spiderchart membutuhkan minimal 3 CPL (saat ini ${rows.length}).`, left + 20, y1 + 110, { width: width / 2 - 40, align: 'center' });
  }
  const dinilai = rows.filter((r) => r.rerata !== null);
  const tinggiR = dinilai.reduce((a, r) => (!a || r.rerata > a.rerata ? r : a), null);
  const rendahR = dinilai.reduce((a, r) => (!a || r.rerata < a.rerata ? r : a), null);
  const px = left + width / 2 + 20;
  const py = y1 + 70;
  doc.fillColor('#000').font('Helvetica-Bold').fontSize(11).text('Performa CPL Program Studi', px, py);
  const kotakY = py + 22;
  doc.rect(px, kotakY, 260, 72).fill('#f1f2f4');
  [
    ['CPL Tertinggi', tinggiR, '#05603a'],
    ['CPL Terendah', rendahR, '#c62828'],
  ].forEach(([judul, r, warna], i) => {
    const x = px + i * 130;
    doc.fillColor('#000').font('Helvetica-Bold').fontSize(8.5).text(judul, x + 12, kotakY + 10, { width: 110 });
    doc.fillColor(warna).font('Helvetica-Bold').fontSize(20).text(dua(r?.rerata), x + 12, kotakY + 24, { width: 110 });
    doc.fillColor('#555').font('Helvetica').fontSize(8).text(r ? `di posisi ${r.kode}` : 'belum ada nilai', x + 12, kotakY + 52, { width: 110 });
  });
  doc.strokeColor('#d0d0d0').moveTo(px + 130, kotakY + 10).lineTo(px + 130, kotakY + 62).stroke();
  if (tinggiR && rendahR) {
    doc.fillColor('#333').font('Helvetica-Oblique').fontSize(8.5).text(
      `CPL mencatat rerata tertinggi sebesar ${dua(tinggiR.rerata)} (${tinggiR.kode}), dengan batas terendah pada angka ${dua(rendahR.rerata)} (${rendahR.kode}).`,
      px,
      kotakY + 82,
      { width: 300 }
    );
  }

  // Tabel detail.
  doc.fillColor('#000');
  doc.y = y1 + tinggiGrafik + 16;
  doc.x = left;
  // Judul + kepala tabel + minimal satu baris harus muat; bila tidak, mulai di halaman baru.
  if (doc.y + 90 > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
    doc.y = doc.page.margins.top;
  }
  doc.font('Helvetica-Bold').fontSize(10).text('Detail Deskripsi dan Hasil Setiap CPL Program Studi', left, doc.y);
  doc.moveDown(0.4);
  const statusTeks = (r) => (r.rerata === null ? 'Belum Dinilai' : r.tercapai === null ? 'Target Belum Diisi' : r.tercapai ? 'Sudah Memenuhi' : 'Belum Memenuhi');
  table(
    doc,
    [
      { label: 'Kode CPL', w: 60, align: 'center', bold: true },
      { label: 'Deskripsi CPL', w: width - 60 - 55 - 55 - 95 - 55 - 55 },
      { label: 'Target', w: 55, align: 'right' },
      { label: 'Rerata', w: 55, align: 'right', bold: true },
      { label: 'Status', w: 95, align: 'center' },
      { label: 'Mhs Belum', w: 55, align: 'right' },
      { label: 'Mhs Sudah', w: 55, align: 'right' },
    ],
    rows.map((r) => [r.kode, r.deskripsi, dua(r.target), dua(r.rerata), statusTeks(r), r.mhsBelum ?? '-', r.mhsSudah ?? '-']),
    { left, headFill: '#dbe5f1' }
  );
};

/** Catatan metode, nomor halaman, tutup dokumen. */
const selesai = (doc, konteks, left, width) => {
  const bottom = doc.page.height - doc.page.margins.bottom;
  if (doc.y + 30 > bottom) doc.addPage();
  doc.font('Times-Italic').fontSize(8).text(
    `Metode ${METODE[konteks.metode]}: ${
      konteks.metode === 'progresif' ? 'mata kuliah yang diulang hanya memakai capaian periode terakhir.' : 'nilai dihitung dari rerata capaian pembelajaran.'
    } Dicetak ${longDate(new Date())}.`,
    left,
    doc.y + 8,
    { width }
  );
  nomorHalaman(doc);
  doc.end();
  return doc;
};

const buildLaporanObePdf = (data, kampus, { kop = true } = {}) => {
  const { konteks } = data;
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margins: { top: 30, bottom: 30, left: 36, right: 36 }, bufferPages: true, info: { Title: JUDUL[konteks.jenis] } });
  const left = doc.page.margins.left;
  const width = doc.page.width - left - doc.page.margins.right;

  if (kop) drawKop(doc, kampus);
  if (konteks.jenis === 'cpl-prodi') {
    cplProdi(doc, data, kampus, left, width);
    return selesai(doc, konteks, left, width);
  }
  if (konteks.jenis === 'cpl-mahasiswa') {
    cplMahasiswa(doc, data, kampus, left, width, kop);
    return selesai(doc, konteks, left, width);
  }
  if (konteks.jenis === 'cpmk-mahasiswa') {
    cpmkMahasiswa(doc, data, kampus, left, width, kop);
    return selesai(doc, konteks, left, width);
  }
  doc.font('Times-Bold').fontSize(13).text(JUDUL[konteks.jenis], left, doc.y - (kop ? 6 : 0), { width, align: 'center' });
  doc.moveDown(0.5);
  const info = [
    ['Program Studi', konteks.prodi],
    ['Tahun Kurikulum', String(konteks.tahunKurikulum)],
    ['Angkatan', konteks.angkatan ? String(konteks.angkatan) : 'Semua Angkatan'],
    ['Metode Perhitungan', `${METODE[konteks.metode]} · ${konteks.jumlahDinilai ?? konteks.jumlahMahasiswa} dari ${konteks.jumlahMahasiswa} mahasiswa sudah dinilai`],
  ];
  const y0 = doc.y;
  doc.font('Times-Roman').fontSize(10);
  info.forEach(([l, v], i) => {
    const x = i < 2 ? left : left + width / 2;
    const y = y0 + (i % 2) * 14;
    doc.text(l, x, y, { width: 110 });
    doc.text(`: ${v}`, x + 110, y, { width: width / 2 - 115 });
  });
  doc.y = y0 + 2 * 14 + 8;
  doc.x = left;

  {
    const cols = [
      { label: 'No', w: 28, align: 'center' },
      { label: 'Mata Kuliah', w: 170 },
      { label: 'CPMK', w: 55 },
      { label: 'Deskripsi CPMK', w: width - 28 - 170 - 55 - 70 - 50 - 55 - 50 - 75 },
      { label: 'CPL', w: 70, align: 'center' },
      { label: 'Jml Mhs', w: 50, align: 'center' },
      { label: 'Rerata', w: 55, align: 'center', bold: true },
      { label: 'Target', w: 50, align: 'center' },
      { label: 'Status', w: 75, align: 'center' },
    ];
    let no = 0;
    const rows = data.rows.flatMap((m) =>
      m.cpmk.map((c, i) => {
        if (i === 0) no += 1;
        return [i === 0 ? no : '', i === 0 ? `${m.kode} - ${m.mataKuliah}` : '', c.kode, c.deskripsi, c.cpl.join(', ') || '-', c.jumlahMahasiswa, angka(c.rerata), angka(c.target), status(c.tercapai)];
      })
    );
    table(doc, cols, rows, { left });
  }

  return selesai(doc, konteks, left, width);
};

module.exports = { buildLaporanObePdf };
