const ExcelJS = require('exceljs');
const { Mahasiswa, NilaiMahasiswa, Kurikulum, MataKuliah, JadwalKuliah, Jurusan } = require('../models');
const ApiError = require('../utils/ApiError');
const { buildWorkbook } = require('../utils/excel');
const { GRADE_BOBOT, gradeFor } = require('../utils/gradeScale');

/**
 * Import nilai mahasiswa dari format "Nilai" PDDikti Feeder:
 *   NIM | Nama Mahasiswa | Kode MK | Mata Kuliah | Semester | Kelas | Nilai Huruf | Nilai Indeks |
 *   Nilai Angka | Kode Prodi Mahasiswa | Kode Prodi Kelas
 *
 * - "Semester" = periode Feeder: tahun + 1 (Ganjil) / 2 (Genap), mis. 20251 = 2025/2026 Ganjil.
 *   Diubah ke semester ke-N mahasiswa dari angkatannya: (tahun - tahunMasuk) x 2 + (1|2).
 * - Huruf dari kolom "Nilai Huruf"; kalau kosong / tidak ada di skala nilai, dihitung dari Nilai Angka.
 * - File tidak memuat SKS: diambil dari kurikulum prodi mahasiswa (kode MK), lalu master Mata Kuliah,
 *   lalu jadwal kuliah. Tidak ketemu = SKS 0 + peringatan (tidak ikut dihitung di IPK).
 * - Upsert per (mahasiswa, kode MK, semester): import ulang memperbarui nilai yang sama.
 */
const COLUMNS = [
  { header: 'NIM', key: 'nim' },
  { header: 'Nama Mahasiswa', key: 'namaMahasiswa' },
  { header: 'Kode MK', key: 'kodeMk' },
  { header: 'Mata Kuliah', key: 'mataKuliah' },
  { header: 'Semester', key: 'semester' },
  { header: 'Kelas', key: 'kelas' },
  { header: 'Nilai Huruf', key: 'nilaiHuruf' },
  { header: 'Nilai Indeks', key: 'nilaiIndeks' },
  { header: 'Nilai Angka', key: 'nilaiAngka' },
  { header: 'Kode Prodi Mahasiswa', key: 'kodeProdiMahasiswa' },
  { header: 'Kode Prodi Kelas', key: 'kodeProdiKelas' },
];

const cellValue = (value) => {
  if (value && typeof value === 'object') {
    if ('result' in value) return value.result;
    if ('text' in value) return value.text;
    if (Array.isArray(value.richText)) return value.richText.map((t) => t.text).join('');
  }
  return value;
};
const str = (value) => {
  const v = cellValue(value);
  return v === null || v === undefined ? '' : String(v).trim();
};
const normHeader = (h) => str(h).replace(/\s+/g, ' ').toLowerCase();

/** Baca sheet yang punya kolom "Nilai Huruf" (workbook Feeder punya banyak sheet). */
const readRows = async (fileBase64) => {
  const base64Data = fileBase64.includes(',') ? fileBase64.split(',')[1] : fileBase64;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.from(base64Data, 'base64'));
  const sheet =
    workbook.worksheets.find((ws) => (ws.getRow(1).values ?? []).some((v) => normHeader(v) === 'nilai huruf')) ??
    workbook.worksheets[0];
  if (!sheet) return [];

  const headers = [];
  sheet.getRow(1).eachCell({ includeEmpty: true }, (cell, col) => {
    headers[col] = normHeader(cell.value);
  });
  const rows = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const data = {};
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      if (headers[col]) data[headers[col]] = cell.value;
    });
    if (Object.values(data).some((v) => str(v) !== '')) rows.push({ rowNumber, data });
  });
  return rows;
};

const parsePeriode = (value) => {
  const match = str(value).match(/^(\d{4})([12])$/);
  return match ? { tahun: Number(match[1]), jenis: Number(match[2]) } : null;
};

const createSksResolver = () => {
  const cache = new Map();
  return async (kode, kodeProdi) => {
    const key = `${kode}|${kodeProdi ?? ''}`;
    if (cache.has(key)) return cache.get(key);
    let sks = null;
    // SKS dari mata kuliah ber-kode sama; utamakan yang kurikulumnya milik prodi tsb.
    const mkList = await MataKuliah.findAll({
      where: { kode },
      include: [
        {
          model: Kurikulum,
          as: 'kurikulum',
          attributes: ['id', 'jurusanId'],
          required: false,
          include: [{ model: Jurusan, as: 'jurusan', attributes: ['kodeProdi'], required: false }],
        },
      ],
    });
    const mk = mkList.find((row) => row.kurikulum?.jurusan?.kodeProdi === kodeProdi) ?? mkList[0];
    if (mk) sks = mk.sksTotal;
    if (sks === null) sks = (await JadwalKuliah.findOne({ where: { kodeMataKuliah: kode }, order: [['id', 'DESC']] }))?.sks ?? null;
    cache.set(key, sks);
    return sks;
  };
};

const importNilaiMahasiswa = async (fileBase64) => {
  const rows = await readRows(fileBase64);
  if (!rows.length) throw new ApiError(400, 'File tidak berisi data nilai');

  const errors = [];
  const warnings = [];
  let created = 0;
  let updated = 0;
  const mahasiswaCache = new Map();
  const resolveSks = createSksResolver();
  const sksKosong = new Set();

  for (const { rowNumber, data } of rows) {
    const nim = str(data['nim']);
    const kode = str(data['kode mk']);
    const namaMk = str(data['mata kuliah']);
    const periode = parsePeriode(data['semester']);
    if (!nim || !kode || !periode) {
      errors.push({ row: rowNumber, message: 'NIM, Kode MK, dan Semester (format 20251/20252) wajib diisi' });
      continue;
    }

    if (!mahasiswaCache.has(nim)) {
      mahasiswaCache.set(
        nim,
        await Mahasiswa.findOne({ where: { nim }, include: [{ model: Jurusan, as: 'jurusan', attributes: ['kodeProdi'], required: false }] })
      );
    }
    const mahasiswa = mahasiswaCache.get(nim);
    if (!mahasiswa) {
      errors.push({ row: rowNumber, message: `NIM ${nim} tidak ditemukan` });
      continue;
    }
    if (!mahasiswa.tahunMasuk) {
      errors.push({ row: rowNumber, message: `Angkatan (tahun masuk) mahasiswa ${nim} kosong` });
      continue;
    }
    const semester = (periode.tahun - mahasiswa.tahunMasuk) * 2 + periode.jenis;
    if (semester < 1 || semester > 14) {
      errors.push({ row: rowNumber, message: `Semester ${str(data['semester'])} tidak sesuai angkatan ${mahasiswa.tahunMasuk} (${nim})` });
      continue;
    }

    const angkaRaw = str(data['nilai angka']).replace(',', '.');
    const nilai = angkaRaw === '' ? null : Number(angkaRaw);
    if (nilai !== null && (!Number.isFinite(nilai) || nilai < 0 || nilai > 100)) {
      errors.push({ row: rowNumber, message: `Nilai Angka "${angkaRaw}" tidak valid` });
      continue;
    }
    const hurufFile = str(data['nilai huruf']).toUpperCase();
    let grade = hurufFile in GRADE_BOBOT ? hurufFile : null;
    if (!grade) {
      if (nilai === null) {
        errors.push({ row: rowNumber, message: `Nilai Huruf "${hurufFile}" tidak dikenal dan Nilai Angka kosong` });
        continue;
      }
      grade = gradeFor(nilai);
      if (hurufFile) warnings.push({ row: rowNumber, message: `Huruf "${hurufFile}" (${nim} ${kode}) tidak ada di skala nilai, dipakai ${grade} dari nilai ${nilai}` });
    }

    const sks = await resolveSks(kode, mahasiswa.jurusan?.kodeProdi ?? str(data['kode prodi mahasiswa']));
    if (sks === null) sksKosong.add(kode);

    const payload = {
      mahasiswaId: mahasiswa.id,
      kodeMataKuliah: kode,
      namaMataKuliah: namaMk || kode,
      sks: sks ?? 0,
      semester,
      nilai: nilai ?? 0,
      grade,
    };
    const existing = await NilaiMahasiswa.findOne({ where: { mahasiswaId: mahasiswa.id, kodeMataKuliah: kode, semester } });
    if (existing) {
      await existing.update(payload);
      updated += 1;
    } else {
      await NilaiMahasiswa.create(payload);
      created += 1;
    }
  }

  if (sksKosong.size) {
    warnings.push({ row: null, message: `SKS tidak ditemukan (disimpan 0, tidak dihitung di IPK): ${[...sksKosong].join(', ')}` });
  }
  return { successCount: created + updated, created, updated, errorCount: errors.length, errors, warnings };
};

const exportTemplateNilai = () =>
  buildWorkbook('Nilai', COLUMNS, [
    {
      nim: '134612510001',
      namaMahasiswa: 'Contoh Nama (informasi saja)',
      kodeMk: 'MKU01',
      mataKuliah: 'Pendidikan Agama',
      semester: 20251,
      kelas: 'A25',
      nilaiHuruf: 'A-',
      nilaiIndeks: 3.7,
      nilaiAngka: 80.6,
      kodeProdiMahasiswa: '13461',
      kodeProdiKelas: '13461',
    },
  ]);

module.exports = { importNilaiMahasiswa, exportTemplateNilai };
