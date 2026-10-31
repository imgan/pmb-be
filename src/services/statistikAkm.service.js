const { Op } = require('sequelize');
const { Mahasiswa, Jurusan, FeederAkm, TahunAjaran, Krs, TagihanKuliah } = require('../models');
const ApiError = require('../utils/ApiError');
const { buildWorkbook } = require('../utils/excel');
const { periodeFromTahunAjaran } = require('./feeder/helpers');
const { formatTahunAjaran } = require('../utils/tahunAjaran');

/**
 * Statistik AKM (Aktivitas Kuliah Mahasiswa) satu periode, per angkatan & per prodi.
 * Status diambil dari AKM Feeder periode tsb (A/C/G/M/N). Mahasiswa tanpa baris AKM, berdasarkan
 * data SIAKAD tahun ajaran tsb:
 * - KRS disetujui (DPA/BAAK) -> Aktif;
 * - status keluar CUTI -> Cuti;
 * - sudah diberi tagihan kuliah tetapi KRS belum disetujui, atau data mahasiswa tidak aktif -> Non Aktif;
 * - selain itu -> "Tidak Memiliki AKM".
 * `jurusanId` (dari prodiScope, modul Prodi) membatasi ke prodi tsb.
 * "AKM Tidak Sesuai" = punya AKM berstatus aktif (A/G/M) padahal mahasiswa sudah keluar/non aktif.
 * Mahasiswa yang sudah keluar (lulus/DO/mengundurkan diri, dst) tanpa AKM tidak dihitung.
 */
const KATEGORI = [
  { key: 'aktif', label: 'Aktif' },
  { key: 'cuti', label: 'Cuti' },
  { key: 'doubleDegree', label: 'Sedang Double Degree' },
  { key: 'kampusMerdeka', label: 'Kampus Merdeka' },
  { key: 'nonAktif', label: 'Non Aktif' },
  { key: 'tanpaAkm', label: 'Tidak Memiliki AKM' },
];
const DARI_AKM = { A: 'aktif', C: 'cuti', G: 'doubleDegree', M: 'kampusMerdeka', N: 'nonAktif' };

const kosong = () => ({ ...Object.fromEntries(KATEGORI.map((k) => [k.key, 0])), akmTidakSesuai: 0, total: 0 });

const getStatistikAkm = async ({ tahunAjaranId, jurusanId } = {}) => {
  const tahunAjaran = tahunAjaranId
    ? await TahunAjaran.findByPk(tahunAjaranId)
    : await TahunAjaran.findOne({ where: { isActive: true } });
  if (!tahunAjaran) throw new ApiError(404, 'Tahun ajaran tidak ditemukan');
  const periode = periodeFromTahunAjaran(tahunAjaran);

  const whereMahasiswa = { tahunMasuk: { [Op.lte]: tahunAjaran.tahunMulai } };
  if (jurusanId) whereMahasiswa.jurusanId = [].concat(jurusanId).map(Number);
  const [mahasiswaList, akmList, krsList, tagihanList] = await Promise.all([
    Mahasiswa.findAll({
      where: whereMahasiswa,
      attributes: ['id', 'tahunMasuk', 'isActive', 'statusKeluar', 'jurusanId'],
      include: [{ model: Jurusan, as: 'jurusan', attributes: ['id', 'namaJurusan', 'kodeProdi'], required: false }],
    }),
    FeederAkm.findAll({ where: { periode }, attributes: ['mahasiswaId', 'statusMahasiswa'], raw: true }),
    Krs.findAll({ where: { tahunAjaranId: tahunAjaran.id, status: 'DISETUJUI' }, attributes: ['mahasiswaId'], raw: true }),
    TagihanKuliah.findAll({ where: { tahunAjaranId: tahunAjaran.id }, attributes: ['mahasiswaId'], raw: true }),
  ]);
  const idSet = new Set(mahasiswaList.map((m) => m.id));
  const akmBy = new Map(akmList.filter((a) => idSet.has(a.mahasiswaId)).map((a) => [a.mahasiswaId, a.statusMahasiswa]));
  const krsDisetujui = new Set(krsList.map((k) => k.mahasiswaId));
  const bertagihan = new Set(tagihanList.map((t) => t.mahasiswaId));

  const perAngkatan = new Map();
  const perProdi = new Map();
  const tambah = (map, key, label, kategori, tidakSesuai) => {
    if (!map.has(key)) map.set(key, { label, ...kosong() });
    const e = map.get(key);
    e[kategori] += 1;
    e.total += 1;
    if (tidakSesuai) e.akmTidakSesuai += 1;
  };

  mahasiswaList.forEach((m) => {
    const akm = akmBy.get(m.id);
    const keluar = m.statusKeluar && m.statusKeluar !== 'CUTI';
    let kategori;
    if (akm && DARI_AKM[akm]) kategori = DARI_AKM[akm];
    else if (keluar) return; // sudah keluar & tidak punya AKM periode ini: bukan mahasiswa periode ini
    else if (krsDisetujui.has(m.id)) kategori = 'aktif';
    else if (m.statusKeluar === 'CUTI') kategori = 'cuti';
    else if (bertagihan.has(m.id) || !m.isActive) kategori = 'nonAktif';
    else kategori = 'tanpaAkm';
    const tidakSesuai = !!akm && ['A', 'G', 'M'].includes(akm) && (keluar || !m.isActive);
    tambah(perAngkatan, String(m.tahunMasuk), String(m.tahunMasuk), kategori, tidakSesuai);
    const prodi = m.jurusan?.kodeProdi ?? '-';
    tambah(perProdi, prodi, m.jurusan?.namaJurusan ?? 'Tanpa Prodi', kategori, tidakSesuai);
  });

  const toRows = (map, sort) => [...map.values()].sort(sort);
  const angkatan = toRows(perAngkatan, (a, b) => Number(b.label) - Number(a.label));
  const prodi = toRows(perProdi, (a, b) => a.label.localeCompare(b.label));
  const total = angkatan.reduce((acc, r) => {
    Object.keys(acc).forEach((k) => {
      acc[k] += r[k];
    });
    return acc;
  }, kosong());

  return {
    periode,
    tahunAjaran: formatTahunAjaran(tahunAjaran),
    kategori: KATEGORI,
    jumlahAkm: akmBy.size,
    angkatan,
    prodi,
    total,
  };
};

const exportStatistikAkm = async (query) => {
  const data = await getStatistikAkm(query);
  const kolom = (judul) => [
    { header: judul, key: 'label', width: 34 },
    ...data.kategori.map((k) => ({ header: k.label, key: k.key, width: 16 })),
    { header: 'AKM Tidak Sesuai', key: 'akmTidakSesuai', width: 18 },
    { header: 'Total', key: 'total', width: 10 },
  ];
  const workbook = buildWorkbook('AKM per Angkatan', kolom('Angkatan'), [...data.angkatan, { ...data.total, label: 'TOTAL' }]);
  const sheetProdi = workbook.addWorksheet('AKM per Prodi');
  sheetProdi.columns = kolom('Program Studi');
  sheetProdi.getRow(1).font = { bold: true };
  [...data.prodi, { ...data.total, label: 'TOTAL' }].forEach((r) => sheetProdi.addRow(r));
  workbook.worksheets.forEach((ws) => {
    ws.getRow(ws.rowCount).font = { bold: true };
  });
  return { workbook, filename: `statistik-akm-${data.periode}.xlsx` };
};

module.exports = { getStatistikAkm, exportStatistikAkm };
