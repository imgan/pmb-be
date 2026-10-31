const ExcelJS = require('exceljs');
const { Op } = require('sequelize');
const { JadwalKuliah, Dosen, TahunAjaran, Kurikulum, MataKuliah, Jurusan, User, Role } = require('../models');
const ApiError = require('../utils/ApiError');
const { jadwalIdsForProdi } = require('../utils/prodiJadwal');
const { loadKaprodi, namaProdiTtd } = require('../utils/kaprodi');
const { longDate } = require('./formulirSidangTaPdf.service');

/**
 * Export Excel "V2": jadwal kuliah satu prodi + semester dalam format cetak resmi prodi (judul,
 * baris per hari, SKS dipecah baris Teori/Praktik, ruang kuliah, dosen, catatan & tanda tangan
 * Kaprodi). Satu sheet per kelas.
 *
 * Jam asli tidak punya kolom sendiri: diambil dari keterangan "(09.00-12.30)" di kolom ruangan
 * bila ada, selain itu ditampilkan "Jam ke-N". Ruangan berformat "Teori, Praktik" (mis.
 * "Offline/Blended, Lab/Project") dipecah ke baris Teori & Praktik.
 */

const NAMA_INSTITUSI = 'POLITEKNIK BHAKTI KARTINI';
const KOTA = 'Bekasi';
const HARI_ORDER = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU'];
const HARI_LABEL = { SENIN: 'Senin', SELASA: 'Selasa', RABU: 'Rabu', KAMIS: 'Kamis', JUMAT: 'Jumat', SABTU: 'Sabtu', MINGGU: 'Minggu' };
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
const CATATAN = ['*1 SKS Teori = 60 menit di Offline dan Online.', '**1 SKS Praktek = 170 menit di Lab secara Blended.'];

const FONT = 'Times New Roman';
const GRAY_HEADER = 'FFD9D9D9';
const GRAY_CELL = 'FFD0CECE';
const GRAY_SEPARATOR = 'FF808080';
const THIN = { style: 'thin' };
const BORDER = { top: THIN, left: THIN, bottom: THIN, right: THIN };

// Kolom B..J (A dibiarkan sebagai margin, seperti dokumen prodi).
const COL = { no: 2, hari: 3, jam: 4, kode: 5, mk: 6, t: 7, p: 8, ruang: 9, dosen: 10 };
const WIDTHS = { 1: 2, 2: 7, 3: 11, 4: 15, 5: 13, 6: 38, 7: 7, 8: 7, 9: 18, 10: 42 };

/** "D3 Farmasi" -> "D-III FARMASI" (judul). */
const namaProdiCetak = (namaJurusan) => {
  const match = String(namaJurusan ?? '').match(/^D(\d)\s+(.+)$/i);
  if (!match) return String(namaJurusan ?? '').toUpperCase();
  return `D-${ROMAN[Number(match[1])] ?? match[1]} ${match[2]}`.toUpperCase();
};

const TIME_RE = /\(?\s*(\d{1,2})[.:](\d{2})\s*[-–]\s*(\d{1,2})[.:](\d{2})\s*\)?/;

/** Pisahkan "Offline/Blended, Lab/Project (09.00-12.30)" jadi jam & ruang Teori/Praktik. */
const parseRuangan = (ruangan) => {
  const raw = String(ruangan ?? '').trim();
  const time = raw.match(TIME_RE);
  const jam = time ? `${time[1].padStart(2, '0')}.${time[2]} - ${time[3].padStart(2, '0')}.${time[4]}` : null;
  const rest = (time ? raw.replace(time[0], '') : raw).replace(/[,\s]+$/, '').trim();
  const parts = rest.split(',').map((s) => s.trim()).filter(Boolean);
  return { jam, teori: parts[0] ?? '', praktik: parts.length > 1 ? parts.slice(1).join(', ') : null };
};

const namaDosen = (d) => (d ? [d.namaLengkap, d.gelar].filter(Boolean).join(', ') : '');

const dosenPengajar = (j) => {
  const list = [j.dosenKordinator, ...(j.dosenPengampu ?? [])].filter(Boolean);
  const seen = new Set();
  return list
    .filter((d) => !seen.has(d.id) && seen.add(d.id))
    .map(namaDosen)
    .join('\n');
};

const firstHari = (j) => (Array.isArray(j.hari) && j.hari.length ? j.hari[0] : null);
const hariIndex = (j) => {
  const idx = HARI_ORDER.indexOf(firstHari(j));
  return idx === -1 ? 99 : idx;
};

const styleCell = (cell, { bold = false, align = 'left', fill = null, border = true, size = 11 } = {}) => {
  cell.font = { name: FONT, size, bold };
  cell.alignment = { vertical: 'middle', horizontal: align, wrapText: true };
  if (fill) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
  if (border) cell.border = BORDER;
};

const mergeStyled = (sheet, r1, c1, r2, c2, value, style) => {
  if (r1 !== r2 || c1 !== c2) sheet.mergeCells(r1, c1, r2, c2);
  const cell = sheet.getCell(r1, c1);
  cell.value = value;
  styleCell(cell, style);
  for (let r = r1; r <= r2; r += 1) for (let c = c1; c <= c2; c += 1) sheet.getCell(r, c).border = BORDER;
};

const buildSheet = (workbook, { kelas, jadwalList, prodiCetak, namaJurusan, semester, tahunAjaranLabel, kurikulumLabel, kaprodi }) => {
  const sheet = workbook.addWorksheet(kelas.slice(0, 31), {
    pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  Object.entries(WIDTHS).forEach(([col, width]) => {
    sheet.getColumn(Number(col)).width = width;
  });

  const titles = [
    `JADWAL KULIAH PROGRAM STUDI ${prodiCetak}`,
    NAMA_INSTITUSI,
    `TINGKAT ${ROMAN[Math.ceil(semester / 2)] ?? ''} (SEMESTER ${semester}) KELAS ${kelas}`,
    `TAHUN AKADEMIK ${tahunAjaranLabel}`,
  ];
  titles.forEach((text, i) => {
    sheet.mergeCells(i + 1, COL.no, i + 1, COL.dosen);
    const cell = sheet.getCell(i + 1, COL.no);
    cell.value = text;
    styleCell(cell, { bold: true, align: 'center', border: false, size: 12 });
  });

  // Header 2 baris (JUMLAH SKS dipecah T / P).
  const h1 = 6;
  const h2 = 7;
  const headerStyle = { bold: true, align: 'center', fill: GRAY_HEADER };
  [
    [COL.no, 'NO'],
    [COL.hari, 'HARI'],
    [COL.jam, 'JAM'],
    [COL.kode, 'KODE MATA KULIAH'],
    [COL.mk, 'MATA KULIAH'],
    [COL.ruang, 'RUANG KULIAH'],
    [COL.dosen, 'DOSEN PENGAJAR'],
  ].forEach(([col, text]) => mergeStyled(sheet, h1, col, h2, col, text, headerStyle));
  mergeStyled(sheet, h1, COL.t, h1, COL.p, 'JUMLAH SKS', headerStyle);
  mergeStyled(sheet, h2, COL.t, h2, COL.t, 'T', headerStyle);
  mergeStyled(sheet, h2, COL.p, h2, COL.p, 'P', headerStyle);
  sheet.getRow(h1).height = 20;
  sheet.getRow(h2).height = 20;

  const separator = (row) => {
    for (let c = COL.no; c <= COL.dosen; c += 1) {
      const cell = sheet.getCell(row, c);
      styleCell(cell, { fill: GRAY_SEPARATOR });
    }
    sheet.getRow(row).height = 12;
  };

  let row = h2 + 1;
  separator(row);
  row += 1;

  // Kelompok per hari (jadwal tanpa hari dikumpulkan di akhir).
  const groups = [];
  jadwalList.forEach((j) => {
    const key = firstHari(j) ?? '-';
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(j);
    else groups.push({ key, items: [j] });
  });

  groups.forEach((group, gi) => {
    const startRow = row;
    const mkRows = group.items.map((j) => {
      const r = row;
      row += 2;
      return { j, r };
    });
    const endRow = row - 1;
    mergeStyled(sheet, startRow, COL.no, endRow, COL.no, gi + 1, { align: 'center' });
    mergeStyled(sheet, startRow, COL.hari, endRow, COL.hari, HARI_LABEL[group.key] ?? '-', { align: 'center' });

    mkRows.forEach(({ j, r }) => {
      const ruang = parseRuangan(j.ruangan);
      const jamText = ruang.jam ?? (j.jam ? `Jam ke-${j.jam}` : '-');
      mergeStyled(sheet, r, COL.jam, r + 1, COL.jam, jamText, { align: 'center' });
      mergeStyled(sheet, r, COL.kode, r + 1, COL.kode, j.kodeMataKuliah, { align: 'center' });
      mergeStyled(sheet, r, COL.mk, r + 1, COL.mk, j.namaMataKuliah, {});

      const teori = j.sksTeori ?? 0;
      const praktik = (j.sksPraktik ?? 0) + (j.sksLab ?? 0);
      mergeStyled(sheet, r, COL.t, r, COL.t, teori || null, { align: 'center' });
      mergeStyled(sheet, r, COL.p, r, COL.p, null, { fill: GRAY_CELL });
      mergeStyled(sheet, r + 1, COL.t, r + 1, COL.t, null, { fill: GRAY_CELL });
      mergeStyled(sheet, r + 1, COL.p, r + 1, COL.p, praktik || null, { align: 'center' });

      if (ruang.praktik !== null) {
        mergeStyled(sheet, r, COL.ruang, r, COL.ruang, ruang.teori, { align: 'center' });
        mergeStyled(sheet, r + 1, COL.ruang, r + 1, COL.ruang, ruang.praktik, { align: 'center' });
      } else {
        mergeStyled(sheet, r, COL.ruang, r + 1, COL.ruang, ruang.teori, { align: 'center' });
      }
      sheet.getRow(r).height = 18;
      sheet.getRow(r + 1).height = 18;
    });

    // Dosen yang sama berturut-turut di satu hari digabung jadi satu sel.
    for (let i = 0; i < mkRows.length; ) {
      const nama = dosenPengajar(mkRows[i].j);
      let k = i;
      while (k + 1 < mkRows.length && dosenPengajar(mkRows[k + 1].j) === nama) k += 1;
      mergeStyled(sheet, mkRows[i].r, COL.dosen, mkRows[k].r + 1, COL.dosen, nama, {});
      i = k + 1;
    }

    separator(row);
    row += 1;
  });

  if (!jadwalList.length) {
    mergeStyled(sheet, row, COL.no, row, COL.dosen, 'Belum ada jadwal kuliah.', { align: 'center' });
    row += 1;
  }

  // Catatan.
  row += 1;
  [...CATATAN, kurikulumLabel ? `Berdasarkan kurikulum ${kurikulumLabel}` : null].filter(Boolean).forEach((text) => {
    const cell = sheet.getCell(row, COL.no);
    cell.value = text;
    cell.font = { name: FONT, size: 9 };
    row += 1;
  });

  // Tanda tangan Kaprodi.
  row += 1;
  const sign = (text, font = {}) => {
    const cell = sheet.getCell(row, COL.ruang);
    cell.value = text;
    cell.font = { name: FONT, size: 11, ...font };
    row += 1;
  };
  sign(`${KOTA}, ${longDate(new Date())}`);
  sign(`Ketua Program Studi ${namaJurusan}`);
  row += 3;
  sign(kaprodi?.nama ?? '(.................................)', { bold: true, underline: true });
  if (kaprodi?.nuptk) sign(`NUPTK : ${kaprodi.nuptk}`, { bold: true });
};

const exportJadwalKuliahV2 = async ({ kodeProdi, semester, tahunAjaranId }) => {
  const sem = Number(semester);
  if (!kodeProdi) throw new ApiError(400, 'Prodi wajib dipilih');
  if (!sem) throw new ApiError(400, 'Semester wajib dipilih');

  const jurusan = await Jurusan.findOne({ where: { kodeProdi }, order: [['id', 'ASC']] });
  if (!jurusan) throw new ApiError(404, 'Prodi tidak ditemukan');
  const tahunAjaran = tahunAjaranId
    ? await TahunAjaran.findByPk(tahunAjaranId)
    : await TahunAjaran.findOne({ where: { isActive: true } });
  if (!tahunAjaran) throw new ApiError(404, 'Tahun ajaran tidak ditemukan');

  const ids = await jadwalIdsForProdi(kodeProdi);
  const rows = ids.length
    ? await JadwalKuliah.findAll({
        where: { id: ids, tahunAjaranId: tahunAjaran.id, semester: sem, isActive: true },
        include: [
          { model: Dosen.unscoped(), as: 'dosenKordinator', required: false },
          { model: Dosen.unscoped(), as: 'dosenPengampu', through: { attributes: [] }, required: false },
          {
            model: MataKuliah,
            as: 'mataKuliah',
            attributes: ['id', 'kurikulumId'],
            required: false,
            include: [{ model: Kurikulum, as: 'kurikulum', attributes: ['id', 'tahunKurikulum'], required: false }],
          },
        ],
      })
    : [];
  rows.sort(
    (a, b) =>
      a.kelas.localeCompare(b.kelas) || hariIndex(a) - hariIndex(b) || (a.jam ?? 99) - (b.jam ?? 99) || a.kodeMataKuliah.localeCompare(b.kodeMataKuliah)
  );

  const byKelas = new Map();
  rows.forEach((j) => byKelas.set(j.kelas, [...(byKelas.get(j.kelas) ?? []), j]));

  const prodiCetak = namaProdiCetak(jurusan.namaJurusan);
  const tahunKurikulum = [...new Set(rows.map((j) => j.mataKuliah?.kurikulum?.tahunKurikulum).filter(Boolean))];
  const context = {
    prodiCetak,
    namaJurusan: namaProdiTtd(jurusan.namaJurusan),
    semester: sem,
    tahunAjaranLabel: tahunAjaran.nama,
    kurikulumLabel: tahunKurikulum.length === 1 ? `${tahunKurikulum[0]}/${tahunKurikulum[0] + 1}` : null,
    kaprodi: await loadKaprodi(kodeProdi),
  };

  const workbook = new ExcelJS.Workbook();
  if (!byKelas.size) buildSheet(workbook, { ...context, kelas: `Semester ${sem}`, jadwalList: [] });
  byKelas.forEach((jadwalList, kelas) => buildSheet(workbook, { ...context, kelas, jadwalList }));

  const singkatan = jurusan.namaJurusan.replace(/\s+/g, '-').toLowerCase();
  return { workbook, filename: `jadwal-${singkatan}-semester-${sem}-${tahunAjaran.nama.replace('/', '-')}.xlsx` };
};

module.exports = { exportJadwalKuliahV2, parseRuangan, namaProdiCetak };
