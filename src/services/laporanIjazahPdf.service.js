const PDFDocument = require('pdfkit');

const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const ROMAN_MONTHS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

const longDate = (value) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return `${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`;
};

const todayParts = () => {
  const now = new Date();
  return { long: longDate(now), roman: ROMAN_MONTHS[now.getMonth()], year: now.getFullYear() };
};

const DOC_TITLE = {
  ijazah: 'IJAZAH',
  'ijazah-duplikat': 'IJAZAH (DUPLIKAT)',
  transkrip: 'TRANSKRIP NILAI AKADEMIK',
  'surat-keterangan-lulus': 'SURAT KETERANGAN LULUS',
  skpi: 'SURAT KETERANGAN PENDAMPING IJAZAH (SKPI)',
};

const CONTENT_WIDTH = 595.28 - 56 * 2; // A4 width minus left/right margins

const drawHeader = (doc, kampusName, jenis) => {
  doc.font('Times-Bold').fontSize(15).text((kampusName || 'Perguruan Tinggi').toUpperCase(), { align: 'center' });
  doc.moveDown(0.15);
  doc.fontSize(13).text(DOC_TITLE[jenis], { align: 'center' });
  doc.moveDown(1);
  doc.font('Times-Roman').fontSize(11);
};

const kv = (doc, label, value, { labelWidth = 190, x, columnWidth = CONTENT_WIDTH } = {}) => {
  const left = x ?? doc.page.margins.left;
  const y = doc.y;
  const valueX = left + labelWidth + 14;
  const valueWidth = left + columnWidth - valueX;
  doc.text(label, left, y, { width: labelWidth, lineBreak: false });
  doc.text(':', left + labelWidth, y, { width: 10, lineBreak: false });
  doc.text(String(value ?? '-'), valueX, y, { width: valueWidth });
  doc.x = doc.page.margins.left;
  doc.moveDown(0.3);
};

const ensureSpace = (doc, needed) => {
  const bottom = doc.page.height - doc.page.margins.bottom;
  if (doc.y + needed > bottom) {
    doc.addPage();
    return true;
  }
  return false;
};

const drawSignatures = (doc, labels) => {
  doc.moveDown(2.5);
  const y = doc.y;
  const colWidth = CONTENT_WIDTH / labels.length;
  labels.forEach((label, i) => {
    const x = doc.page.margins.left + i * colWidth;
    doc.text(label, x, y, { width: colWidth, align: 'center' });
  });
  doc.moveDown(3.5);
  const y2 = doc.y;
  labels.forEach((_, i) => {
    const x = doc.page.margins.left + i * colWidth;
    doc.text('(....................................)', x, y2, { width: colWidth, align: 'center' });
  });
};

const drawIjazahBody = (doc, data, jenis) => {
  const { mahasiswa, jurusan, yudisium } = data;

  doc.text('Dengan ini memberikan Ijazah kepada :', { align: 'center' });
  doc.moveDown(0.8);

  kv(doc, 'Nama', mahasiswa.namaLengkap);
  kv(doc, 'Tempat/Tanggal Lahir', `${mahasiswa.tempatLahir ?? '-'}, ${longDate(mahasiswa.tanggalLahir)}`);
  kv(doc, 'NIM', mahasiswa.nim);
  kv(doc, 'NIK', mahasiswa.noKtp ?? '-');
  kv(doc, 'PIN', yudisium.pin ?? '-');
  kv(doc, 'Program Studi', jurusan?.namaJurusan ?? '-');

  doc.moveDown(0.8);
  doc.text(
    `Ijazah ini sebagai bukti bahwa yang bersangkutan telah menyelesaikan dengan baik dan memenuhi persyaratan Pendidikan ${jurusan?.jenjangPendidikan ?? '-'} pada ${jurusan?.namaFakultas ?? '-'} dan kepadanya diberikan gelar :`,
    { align: 'left' }
  );
  doc.moveDown(0.6);
  doc.font('Times-Bold').fontSize(14).text(
    `${jurusan?.gelarLengkap ?? '-'} (${jurusan?.gelarSingkat ?? '-'})`,
    { align: 'center' }
  );
  doc.font('Times-Roman').fontSize(11);
  doc.moveDown(0.6);
  doc.text('Dengan segala hak, wewenang, dan kewajiban yang melekat pada gelar akademik tersebut.', { align: 'center' });
  doc.text(`Diberikan pada Tanggal ${longDate(yudisium.tanggalYudisium)}`, { align: 'center' });

  if (jenis === 'ijazah-duplikat') {
    doc.moveDown(1);
    doc.fontSize(9).font('Times-Italic').text(
      `Diterbitkan sebagai Ijazah Duplikat pada tanggal ${todayParts().long}, menggantikan ijazah asli yang hilang/rusak, dengan data yang sama sebagaimana tercatat pada penerbitan ijazah asli.`,
      { align: 'left' }
    );
    doc.font('Times-Roman').fontSize(11);
  }

  drawSignatures(doc, ['Direktur,', 'Ketua Program Studi,']);
};

const drawTranskripBody = (doc, data) => {
  const { mahasiswa, jurusan, yudisium, nilai, totalSks, totalBobot, ipk } = data;
  const half = CONTENT_WIDTH / 2 - 10;

  const startY = doc.y;
  kv(doc, 'Nama', mahasiswa.namaLengkap, { labelWidth: 110, columnWidth: half });
  kv(doc, 'NIM', mahasiswa.nim, { labelWidth: 110, columnWidth: half });
  kv(doc, 'Tempat/Tgl. Lahir', `${mahasiswa.tempatLahir ?? '-'}, ${longDate(mahasiswa.tanggalLahir)}`, { labelWidth: 110, columnWidth: half });
  kv(doc, 'Tanggal Lulus', longDate(yudisium.tanggalYudisium), { labelWidth: 110, columnWidth: half });
  const leftColY = doc.y;

  doc.y = startY;
  const rightX = doc.page.margins.left + CONTENT_WIDTH / 2 + 10;
  kv(doc, 'Program Studi', jurusan?.namaJurusan ?? '-', { labelWidth: 110, x: rightX, columnWidth: half });
  kv(doc, 'Jenjang Pendidikan', jurusan?.jenjangPendidikan ?? '-', { labelWidth: 110, x: rightX, columnWidth: half });
  kv(doc, 'Fakultas', jurusan?.namaFakultas ?? '-', { labelWidth: 110, x: rightX, columnWidth: half });
  kv(doc, 'PIN', yudisium.pin ?? '-', { labelWidth: 110, x: rightX, columnWidth: half });

  doc.y = Math.max(leftColY, doc.y);
  doc.x = doc.page.margins.left;
  doc.moveDown(0.8);

  const cols = [
    { key: 'no', label: 'No', width: 28, align: 'center' },
    { key: 'kode', label: 'Kode MK', width: 70 },
    { key: 'mk', label: 'Mata Kuliah', width: half * 2 - 28 - 70 - 40 - 55 },
    { key: 'sks', label: 'SKS', width: 40, align: 'center' },
    { key: 'mutu', label: 'Mutu', width: 55, align: 'center' },
    { key: 'grade', label: 'Grade', width: 55, align: 'center' },
  ];
  const tableX = doc.page.margins.left;
  const rowH = 18;

  const drawTableHeader = () => {
    let x = tableX;
    const y = doc.y;
    doc.font('Times-Bold').fontSize(9.5);
    cols.forEach((c) => {
      doc.rect(x, y, c.width, rowH).stroke();
      doc.text(c.label, x + 2, y + 5, { width: c.width - 4, align: c.align ?? 'left' });
      x += c.width;
    });
    doc.font('Times-Roman').fontSize(9.5);
    doc.y = y + rowH;
  };

  ensureSpace(doc, rowH * 2);
  drawTableHeader();

  nilai.forEach((n, i) => {
    if (ensureSpace(doc, rowH)) drawTableHeader();
    let x = tableX;
    const y = doc.y;
    const values = [String(i + 1), n.kodeMataKuliah, n.namaMataKuliah, String(n.sks), n.mutu.toFixed(2), n.grade];
    cols.forEach((c, idx) => {
      doc.rect(x, y, c.width, rowH).stroke();
      doc.text(values[idx], x + 2, y + 5, { width: c.width - 4, align: c.align ?? 'left' });
      x += c.width;
    });
    doc.y = y + rowH;
  });

  ensureSpace(doc, rowH);
  {
    let x = tableX;
    const y = doc.y;
    const totalsWidth = cols[0].width + cols[1].width + cols[2].width;
    doc.font('Times-Bold');
    doc.rect(x, y, totalsWidth, rowH).stroke();
    doc.text('INDEKS PRESTASI KUMULATIF', x + 2, y + 5, { width: totalsWidth - 4 });
    x += totalsWidth;
    const totalsValues = [String(totalSks), totalBobot.toFixed(2), ipk.toFixed(2)];
    [cols[3], cols[4], cols[5]].forEach((c, idx) => {
      doc.rect(x, y, c.width, rowH).stroke();
      doc.text(totalsValues[idx], x + 2, y + 5, { width: c.width - 4, align: 'center' });
      x += c.width;
    });
    doc.font('Times-Roman');
    doc.y = y + rowH;
  }

  doc.x = doc.page.margins.left;
  doc.moveDown(1);
  ensureSpace(doc, 40);
  doc.font('Times-Bold').text('Judul Tugas Akhir/Skripsi:', doc.page.margins.left, doc.y, { width: CONTENT_WIDTH });
  doc.font('Times-Roman').text(yudisium.judul ?? '-', doc.page.margins.left, doc.y, { width: CONTENT_WIDTH });

  drawSignatures(doc, ['Direktur,', 'Ketua Program Studi,']);
};

const drawSuratKeteranganLulusBody = (doc, data, kampusName) => {
  const { mahasiswa, jurusan, yudisium } = data;
  const today = todayParts();

  doc.font('Times-Bold').fontSize(11).text(`Nomor : -/AK/BAAK/${today.roman}/${today.year}`, { align: 'center' });
  doc.font('Times-Roman');
  doc.moveDown(1);

  doc.text(`Direktur ${kampusName ?? '-'}, menerangkan bahwa :`);
  doc.moveDown(0.8);

  kv(doc, 'Nama', mahasiswa.namaLengkap);
  kv(doc, 'NIM', mahasiswa.nim);
  kv(doc, 'Tempat dan Tanggal Lahir', `${mahasiswa.tempatLahir ?? '-'}, ${longDate(mahasiswa.tanggalLahir)}`);
  kv(doc, 'Program Studi', jurusan?.namaJurusan ?? '-');

  doc.moveDown(0.8);
  doc.text(
    `Adalah Mahasiswa ${jurusan?.namaFakultas ?? '-'} ${kampusName ?? '-'} yang telah menyelesaikan proses Pendidikan dan telah dinyatakan Lulus berdasarkan hasil yudisium pada tanggal, ${longDate(yudisium.tanggalYudisium)}.`
  );
  doc.moveDown(0.6);
  doc.text(
    'Demikian surat keterangan ini dibuat untuk dapat dipergunakan sebagaimana mestinya dan berlaku sampai dengan Ijazah asli dari yang bersangkutan diterbitkan.'
  );

  doc.moveDown(2);
  doc.text(`${today.long}`, { align: 'right' });
  doc.text('Direktur', { align: 'right' });
  doc.moveDown(3);
  doc.text('(....................................)', { align: 'right' });
};

const drawSkpiBody = (doc, data, kampusName) => {
  const { mahasiswa, jurusan, yudisium } = data;
  const today = todayParts();
  const tahunLulus = yudisium.tanggalYudisium ? new Date(yudisium.tanggalYudisium).getFullYear() : '-';

  doc.font('Times-Bold').fontSize(11).text(`No : -/SKPI/BAAK/${today.roman}/${today.year}`, { align: 'center' });
  doc.font('Times-Roman');
  doc.moveDown(1);

  doc.text(
    'Surat Keterangan Pendamping Ijazah (SKPI) ini mengacu pada Kerangka Kualifikasi Nasional Indonesia (KKNI) dan Konvensi UNESCO tentang pengakuan studi, ijazah dan gelar pendidikan tinggi. Tujuan penerbitan SKPI ini adalah menjadi dokumen yang menyatakan kemampuan kerja, penguasaan pengetahuan, dan sikap/moral pemegangnya.'
  );
  doc.moveDown(0.8);

  doc.font('Times-Bold').text('1. Identitas Diri Pemegang SKPI');
  doc.font('Times-Roman').moveDown(0.3);
  kv(doc, 'Nama Lengkap', mahasiswa.namaLengkap);
  kv(doc, 'Tempat, Tanggal Lahir', `${mahasiswa.tempatLahir ?? '-'}, ${longDate(mahasiswa.tanggalLahir)}`);
  kv(doc, 'Nomor Induk Mahasiswa', mahasiswa.nim);
  kv(doc, 'Tahun Lulus', String(tahunLulus));
  kv(doc, 'PIN / Nomor Ijazah', yudisium.pin ?? '-');
  kv(doc, 'Gelar', `${jurusan?.gelarLengkap ?? '-'} (${jurusan?.gelarSingkat ?? '-'})`);

  doc.moveDown(0.6);
  ensureSpace(doc, 100);
  doc.font('Times-Bold').text('2. Identitas Perguruan Tinggi');
  doc.font('Times-Roman').moveDown(0.3);
  kv(doc, 'Nama Perguruan Tinggi', kampusName ?? '-');
  kv(doc, 'Program Studi', jurusan?.namaJurusan ?? '-');
  kv(doc, 'Fakultas', jurusan?.namaFakultas ?? '-');
  kv(doc, 'Jenjang Pendidikan', jurusan?.jenjangPendidikan ?? '-');
  kv(doc, 'Sistem Penilaian', 'Skala 1-4 (A=4, B=3, C=2, D=1, E=0)');
  kv(doc, 'Bahasa Pengantar Kuliah', 'Bahasa Indonesia');
  kv(doc, 'Status Profesi', `${jurusan?.gelarLengkap ?? '-'} (${jurusan?.gelarSingkat ?? '-'})`);

  doc.moveDown(0.6);
  ensureSpace(doc, 100);
  doc.font('Times-Bold').text('3. Informasi Kualifikasi dan Hasil yang Dicapai');
  doc.font('Times-Roman').moveDown(0.3);
  doc.text(
    'Menunjukkan sikap bertanggung jawab, integritas profesional, dan berkomitmen terhadap nilai-nilai etika atas pekerjaan di bidang keahliannya secara mandiri; memiliki kemampuan berpikir kritis, mengidentifikasi akar masalah dan pemecahannya secara komprehensif, serta mengambil keputusan yang tepat berdasarkan analisis informasi dan data sesuai bidang keilmuan program studi yang ditempuh.'
  );

  doc.moveDown(0.6);
  ensureSpace(doc, 100);
  doc.font('Times-Bold').text('4. Data Pendukung');
  doc.font('Times-Roman').moveDown(0.3);
  kv(doc, 'Sertifikasi Kompetensi', '-');
  kv(doc, 'Prestasi dan Penghargaan', '-');
  kv(doc, 'Pengalaman Organisasi', '-');
  kv(doc, 'Melaksanakan Penelitian', yudisium.judul ?? '-');

  doc.moveDown(0.8);
  doc.text(`Surat Keterangan Pendamping Ijazah (SKPI) ini dikeluarkan pada ${today.long}.`);

  drawSignatures(doc, ['Ketua Program Studi,']);
};

const buildLaporanIjazahPdf = (jenis, data, kampusName) => {
  const doc = new PDFDocument({ size: 'A4', margin: 56, bufferPages: true });
  drawHeader(doc, kampusName, jenis);

  if (jenis === 'ijazah' || jenis === 'ijazah-duplikat') {
    drawIjazahBody(doc, data, jenis);
  } else if (jenis === 'transkrip') {
    drawTranskripBody(doc, data);
  } else if (jenis === 'surat-keterangan-lulus') {
    drawSuratKeteranganLulusBody(doc, data, kampusName);
  } else if (jenis === 'skpi') {
    drawSkpiBody(doc, data, kampusName);
  }

  doc.end();
  return doc;
};

module.exports = { buildLaporanIjazahPdf, VALID_JENIS: Object.keys(DOC_TITLE) };
