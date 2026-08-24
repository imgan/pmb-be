const PDFDocument = require('pdfkit');

const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const ROMAN_MONTHS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const SEMESTER_WORDS = [
  '', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh',
  'sebelas', 'dua belas', 'tiga belas', 'empat belas',
];

const RECTOR_NAME = 'Dr. Ns. Desrinah Harahap, M.Kep., Sp.Kep.Mat';
const DEKAN_NAME = 'Rahmadi, S.Kom., M.Kom.';
const WAREK_1_NAME = 'Muhamad Samsul Khaeri, M.Pd.';
const WAREK_1_NIP = '209-181182-001';
const WAREK_1_EMAIL = 'samsul_khaeri@ubs.ac.id';
const WAREK_1_TELP = '087878254664';
const CITY_NAME = 'Bekasi';

const longDate = (value) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return `${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`;
};

const semesterLabel = (semester) => {
  if (!semester) return '-';
  const word = SEMESTER_WORDS[semester] ?? '';
  return word ? `${semester} (${word})` : String(semester);
};

const tahunAkademik = (value) => {
  const d = value ? new Date(value) : new Date();
  const year = d.getFullYear();
  return d.getMonth() >= 6 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
};

const semesterGanjilGenap = (value) => {
  const d = value ? new Date(value) : new Date();
  return d.getMonth() >= 6 || d.getMonth() === 0 ? 'Ganjil' : 'Genap';
};

const nomorSuratLabel = (nomorSurat, tanggalInput) => {
  if (nomorSurat) return nomorSurat;
  const d = tanggalInput ? new Date(tanggalInput) : new Date();
  return `/AK/BAAK-UBS/${ROMAN_MONTHS[d.getMonth()]}/${d.getFullYear()}`;
};

const CONTENT_WIDTH = 595.28 - 56 * 2;

const kv = (doc, label, value, { labelWidth = 150 } = {}) => {
  const left = doc.page.margins.left;
  const y = doc.y;
  const valueX = left + labelWidth + 14;
  const valueWidth = left + CONTENT_WIDTH - valueX;
  const text = value ?? '-';
  // heightOfString on a blank value would report 0 and leave doc.y unmoved after
  // drawing, causing the next kv() row to overlap this one — fall back to a single
  // space just for the height calculation so a blank value still reserves one line.
  // Long labels (e.g. "Jumlah SKS yang sudah ditempuh dan lulus") wrap within
  // labelWidth too, so the row height must account for whichever side is taller.
  const labelHeight = doc.heightOfString(label, { width: labelWidth });
  const valueHeight = doc.heightOfString(text || ' ', { width: valueWidth });
  const rowHeight = Math.max(labelHeight, valueHeight, doc.currentLineHeight());
  doc.text(label, left, y, { width: labelWidth });
  doc.text(':', left + labelWidth, y, { width: 10, lineBreak: false });
  doc.text(String(text), valueX, y, { width: valueWidth });
  doc.y = y + rowHeight;
  doc.x = left;
  doc.moveDown(0.3);
};

const signatureBlock = (doc, { date, jabatan, name }) => {
  doc.moveDown(2);
  doc.text(`${CITY_NAME}, ${date}`, { align: 'right' });
  doc.text(jabatan, { align: 'right' });
  doc.moveDown(3);
  doc.font('Times-Bold').text(name, { align: 'right', underline: true });
  doc.font('Times-Roman');
};

// ---- SURAT KETERANGAN (Aktif Kuliah / Lulus Menunggu Ijazah / Ujian UAS) ----
const buildSuratKeteranganPdf = (data) => {
  const { surat, mahasiswa, jurusan } = data;
  const doc = new PDFDocument({ size: 'A4', margin: 56, bufferPages: true });

  doc.font('Times-Bold').fontSize(14).text('SURAT KETERANGAN', { align: 'center', underline: true });
  doc.moveDown(0.15);
  const nomorText =
    surat.jenisSurat === 'UJIAN_UAS' ? surat.nomorSurat ?? '' : nomorSuratLabel(surat.nomorSurat, surat.tanggalInput);
  doc.font('Times-Roman').fontSize(10).text(`Nomor : ${nomorText}`, { align: 'center' });
  doc.fontSize(11);
  doc.moveDown(1);

  if (surat.jenisSurat === 'UJIAN_UAS') {
    doc.text('Bissmillahirrohmanirrohim');
    doc.text(
      `Yang bertanda tangan dibawah ini Dekan ${jurusan?.namaFakultas ?? '-'} dengan ini menerangkan bahwa :`
    );
  } else {
    doc.text('Yang bertanda tangan dibawah ini Rektor Universitas Bani Saleh dengan ini menerangkan bahwa :');
  }
  doc.moveDown(0.6);

  kv(doc, 'Nama', mahasiswa.namaLengkap);
  kv(doc, 'NIM', mahasiswa.nim);
  kv(doc, 'NIK', mahasiswa.noKtp ?? '-');
  kv(doc, 'Program Studi', jurusan?.namaJurusan ?? '-');
  if (surat.jenisSurat !== 'UJIAN_UAS') kv(doc, 'Semester', semesterLabel(surat.semester));
  kv(doc, 'Tempat dan Tanggal Lahir', `${mahasiswa.tempatLahir ?? '-'}, ${longDate(mahasiswa.tanggalLahir)}`);
  kv(doc, 'Alamat', mahasiswa.alamat ?? '-');

  doc.moveDown(0.8);

  const akademikYear = tahunAkademik(surat.tanggalInput);

  if (surat.jenisSurat === 'LULUS_MENUNGGU_IJAZAH') {
    doc.text(
      `Adalah benar mahasiswa aktif semester ${surat.semester ?? '-'} Program ${jurusan?.jenjangPendidikan ?? '-'} Program Studi ${jurusan?.namaJurusan ?? '-'} di Universitas Bani Saleh pada tahun akademik ${akademikYear}, yang sudah dinyatakan lulus dan ijazah beserta transkrip nilai sedang dalam proses.`
    );
  } else if (surat.jenisSurat === 'UJIAN_UAS') {
    doc.text(
      `Adalah benar mahasiswa aktif semester ${surat.semester ?? '-'} Program ${jurusan?.jenjangPendidikan ?? '-'} Program Studi ${jurusan?.namaJurusan ?? '-'} di Universitas Bani Saleh pada tahun akademik ${akademikYear}, yang akan mengikuti Ujian Akhir Semester (UAS) ${semesterGanjilGenap(surat.tanggalUjianMulai)} pada tanggal ${longDate(surat.tanggalUjianMulai)} s/d ${longDate(surat.tanggalUjianSelesai)}.`
    );
  } else {
    doc.text('Adalah benar pada saat ini yang bersangkutan ', { continued: true, underline: false });
    doc.font('Times-Bold').text('aktif', { continued: true, underline: true });
    doc.font('Times-Roman').text(
      ` sebagai mahasiswa di Program Studi ${jurusan?.namaJurusan ?? '-'} ${jurusan?.namaFakultas ?? '-'} Universitas Bani Saleh tahun akademik ${akademikYear}.`,
      { underline: false }
    );
  }

  doc.moveDown(0.8);
  if (surat.alasan) {
    doc.text(`Surat keterangan ini dibuat sebagai ${surat.alasan}.`);
    doc.moveDown(0.6);
  }
  doc.text(
    surat.jenisSurat === 'UJIAN_UAS'
      ? 'Demikian surat keterangan ini kami buat dengan sebenarnya, untuk dipergunakan sebagaimana mestinya.'
      : 'Demikian surat keterangan ini buat dengan sebenar - benarnya untuk dapat dipergunakan sebagaimana mestinya.'
  );

  if (surat.jenisSurat === 'UJIAN_UAS') {
    signatureBlock(doc, {
      date: longDate(surat.tanggalInput),
      jabatan: `Dekan ${jurusan?.namaFakultas ?? ''}`,
      name: DEKAN_NAME,
    });
  } else {
    signatureBlock(doc, { date: longDate(surat.tanggalInput), jabatan: 'Rektor', name: RECTOR_NAME });
    doc.moveDown(2);
    doc.text('Tembusan :');
    doc.text('1. Pertinggal');
  }

  doc.end();
  return doc;
};

// ---- SURAT OBSERVASI / KULIAH KERJA PRAKTEK (KKP) ----
const buildInstansiSuratPdf = (data, { perihal, bodyText }) => {
  const { surat, mahasiswa, jurusan } = data;
  const doc = new PDFDocument({ size: 'A4', margin: 56, bufferPages: true });

  doc.font('Times-Roman').fontSize(11);
  kv(doc, 'Nomor', surat.nomorSurat ? nomorSuratLabel(surat.nomorSurat, surat.tanggalInput) : '', { labelWidth: 80 });
  kv(doc, 'Lampiran', '-', { labelWidth: 80 });
  kv(doc, 'Perihal', perihal, { labelWidth: 80 });

  doc.moveDown(1);
  doc.text('Kepada Yth,');
  doc.font('Times-Bold').text(`Pimpinan ${surat.namaInstansi ?? '-'}`);
  if (surat.alamatInstansi) doc.text(surat.alamatInstansi);
  doc.font('Times-Roman').text('Di Tempat');

  doc.moveDown(1.2);
  doc.text('Dengan Hormat,');
  doc.text(bodyText);
  doc.text('Adapun mahasiswa kami tersebut adalah :');
  doc.moveDown(0.4);

  kv(doc, 'Nama', mahasiswa.namaLengkap, { labelWidth: 130 });
  kv(doc, 'N.P.M', mahasiswa.nim, { labelWidth: 130 });
  kv(doc, 'Program/Jurusan', `${jurusan?.jenjangPendidikan ?? '-'} / ${jurusan?.namaJurusan ?? '-'}`, { labelWidth: 130 });

  doc.moveDown(1);
  doc.text('Apabila permohonan ini dapat disetujui, mengenai waktunya kami serahkan sepenuhnya kepada Bapak/Ibu.');
  doc.moveDown(0.6);
  doc.text('Demikian, atas kebijaksanaan dan bantuannya kami ucapkan terima kasih.');

  signatureBlock(doc, { date: longDate(surat.tanggalInput), jabatan: 'Dekan Fakultas', name: DEKAN_NAME });

  doc.end();
  return doc;
};

const buildObservasiPdf = (data) =>
  buildInstansiSuratPdf(data, {
    perihal: 'Observasi',
    bodyText:
      'Dalam rangka pembuatan Skripsi mengenai sistem aplikasi komputer, dengan ini kami mohon bantuan Bapak/Ibu, kiranya dapat memberikan kesempatan kepada mahasiswa kami untuk melaksanakan Observasi selama kurang lebih 1 bulan pada Perusahaan yang Bapak/Ibu pimpin, dalam rangka observasi untuk pembuatan Skripsi.',
  });

const buildKkpPdf = (data) =>
  buildInstansiSuratPdf(data, {
    perihal: 'Kuliah Kerja Praktek',
    bodyText:
      'Sehubungan dengan kewajiban mahasiswa untuk melaksanakan KKP, dengan ini kami mohon bantuan Bapak/Ibu, kiranya dapat memberikan kesempatan kepada mahasiswa kami untuk melaksanakan KKP pada Perusahaan yang Bapak/Ibu pimpin.',
  });

// ---- SURAT REKOMENDASI KAMPUS MERDEKA ----
const buildRekomendasiKampusMerdekaPdf = (data) => {
  const { surat, mahasiswa, jurusan } = data;
  const doc = new PDFDocument({ size: 'A4', margin: 56, bufferPages: true });
  const year = surat.tanggalInput ? new Date(surat.tanggalInput).getFullYear() : new Date().getFullYear();

  doc.font('Times-Bold').fontSize(13).text(
    'SURAT REKOMENDASI MAHASISWA PROGRAM MAGANG DAN STUDI\nINDEPENDEN BERSERTIFIKAT KAMPUS MERDEKA',
    { align: 'center' }
  );
  doc.fontSize(11).text(nomorSuratLabel(surat.nomorSurat, surat.tanggalInput), { align: 'center' });
  doc.font('Times-Roman').fontSize(11);
  doc.moveDown(1.2);

  doc.text('Yang bertanda tangan di bawah ini :');
  doc.moveDown(0.4);
  kv(doc, 'Nama', WAREK_1_NAME);
  kv(doc, 'Jabatan', 'Wakil Rektor I');
  kv(doc, 'N.I.P', WAREK_1_NIP);
  kv(doc, 'Email', WAREK_1_EMAIL);
  kv(doc, 'No Telp', WAREK_1_TELP);

  doc.moveDown(0.8);
  doc.text('Yang bertanda tangan di bawah ini :');
  doc.moveDown(0.4);
  kv(doc, 'Nama', mahasiswa.namaLengkap);
  kv(doc, 'NIM', mahasiswa.nim);
  kv(doc, 'Fakultas', jurusan?.namaFakultas ?? '-');
  kv(doc, 'Program Studi / Jurusan', jurusan?.namaJurusan ?? '-');
  kv(doc, 'Semester', semesterLabel(surat.semester));
  kv(doc, 'IPK', surat.ipk != null ? Number(surat.ipk).toFixed(2) : '0.00');
  kv(doc, 'Jumlah SKS yang sudah ditempuh dan lulus', surat.jumlahSks ?? '-');
  kv(doc, 'Nama Koordinator PT MSIB 3', surat.namaKoordinator ?? '-');
  kv(doc, 'Nomor Hp Koordinator PT', surat.noHpKoordinator ?? '-');

  doc.moveDown(0.8);
  doc.text(`Untuk menjadi peserta program Magang dan Studi Independen Bersertifikat Tahun ${year} dengan ketentuan :`);
  doc.moveDown(0.3);
  doc.list(
    [
      `Mahasiswa akan mengikuti Program Magang dan Studi Independen Bersertifikat Tahun ${year} secara penuh dan bertanggung jawab.`,
      'Mahasiswa sanggup ditempatkan di mitra - mitra program Magang dan Studi Independen Bersertifikat di seluruh wilayah Indonesia sesuai dengan hasil seleksi dan proses konsolidasi antara prodi asal mahasiswa terpilih dengan Mitra Industri yang telah ditetapkan.',
      'Mahasiswa sanggup melakukan perjalanan lintas kabupaten/kota/provinsi/negara jika diperlukan sesuai penempatan yang ditetapkan oleh mitra program Magang dan Studi Independen Bersertifikat dengan memperhatikan secara ketat protokol kesehatan.',
    ],
    { listType: 'numbered' }
  );

  doc.moveDown(0.8);
  doc.text('Selain hal tersebut di atas, sebagai bentuk dukungan dan fasilitasi bagi mahasiswa, kami menyatakan kesediaan untuk :');
  doc.moveDown(0.3);
  doc.list(
    [
      `Memberikan dukungan sepenuhnya serta bertanggung jawab atas mahasiswa selama mengikuti program Magang dan Studi Independen Bersertifikat Tahun ${year} sejak awal sampai akhir program.`,
      'Mendukung proses belajar mahasiswa melalui pengalaman Magang dan Studi Independen Bersertifikat Tahun ' + year + '.',
      `Memberikan pengakuan dan konversi sks atau hal-hal yang sudah menjadi kesepakatan antara prodi asal mahasiswa dengan mitra industri bagi mahasiswa setelah penyelesaian program Magang dan Studi Independen Bersertifikat Tahun ${year}.`,
    ],
    { listType: 'numbered' }
  );

  doc.moveDown(0.8);
  doc.text('Demikian surat rekomendasi ini kami sampaikan untuk dipergunakan sebagaimana mestinya.');

  signatureBlock(doc, { date: longDate(surat.tanggalInput), jabatan: 'Wakil Rektor I', name: WAREK_1_NAME });

  doc.end();
  return doc;
};

const buildSuratPdf = (data) => {
  switch (data.surat.jenisSurat) {
    case 'OBSERVASI':
      return buildObservasiPdf(data);
    case 'KKP':
      return buildKkpPdf(data);
    case 'REKOMENDASI_KAMPUS_MERDEKA':
      return buildRekomendasiKampusMerdekaPdf(data);
    default:
      return buildSuratKeteranganPdf(data);
  }
};

module.exports = { buildSuratKeteranganPdf, buildObservasiPdf, buildKkpPdf, buildRekomendasiKampusMerdekaPdf, buildSuratPdf };
