const { TesUjian, TesUjianPeserta, TesUjianJawaban, BankUjian, BankUjianSoal, Gelombang } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * Pengerjaan tes PMB oleh peserta (portal /pendaftaran/tes-ujian): soal dari bank ujian LMS. PG dinilai otomatis saat
 * jawaban dikirim; essay dinilai admin (popup Koreksi di menu Tes Ujian). Nilai = total skor / total bobot × 100.
 */

// Toleransi simpan / kirim setelah waktu habis (jeda jaringan, auto-kirim dari browser).
const TOLERANSI_MS = 60 * 1000;

const hariIniWib = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());

const batasAt = (tup, bank) => (tup.mulaiAt && bank?.durasiMenit ? new Date(new Date(tup.mulaiAt).getTime() + bank.durasiMenit * 60000) : null);

const INCLUDE_TES = {
  model: TesUjian,
  as: 'tesUjian',
  required: true,
  include: [
    { model: Gelombang, as: 'gelombang', attributes: ['id', 'namaGelombang'] },
    { model: BankUjian, as: 'bankUjian', attributes: ['id', 'judul', 'durasiMenit', 'acakSoal'] },
  ],
};

/** Status pengerjaan online: TANPA_SOAL | BELUM_MULAI | MENGERJAKAN | SELESAI. */
const statusPengerjaan = (tup) => {
  if (!tup.tesUjian.bankUjianId) return 'TANPA_SOAL';
  if (tup.selesaiAt) return 'SELESAI';
  return tup.mulaiAt ? 'MENGERJAKAN' : 'BELUM_MULAI';
};

/** Jadwal tes milik peserta yang login (halaman Tes Ujian portal peserta), terdekat dulu. */
const listTesUjianPeserta = async (pesertaId) => {
  const rows = await TesUjianPeserta.findAll({
    where: { pesertaId },
    include: [INCLUDE_TES],
    order: [[{ model: TesUjian, as: 'tesUjian' }, 'tanggal', 'ASC']],
  });
  const hariIni = hariIniWib();
  const jumlahSoal = new Map();
  const bankIds = [...new Set(rows.map((r) => r.tesUjian.bankUjianId).filter(Boolean))];
  if (bankIds.length) {
    const soal = await BankUjianSoal.findAll({ where: { bankUjianId: bankIds }, attributes: ['bankUjianId', 'tipe'] });
    soal.forEach((s) => {
      const j = jumlahSoal.get(s.bankUjianId) ?? { pg: 0, essay: 0 };
      j[s.tipe === 'PG' ? 'pg' : 'essay'] += 1;
      jumlahSoal.set(s.bankUjianId, j);
    });
  }
  return rows.map((r) => {
    const t = r.tesUjian;
    const pengerjaan = statusPengerjaan(r);
    return {
      id: r.id,
      tesUjianId: r.tesUjianId,
      namaUjian: t.namaUjian,
      gelombang: t.gelombang?.namaGelombang ?? null,
      prodi: t.prodi,
      tanggal: t.tanggal,
      waktu: t.waktu,
      lokasi: t.lokasi,
      nilai: r.nilai === null ? null : Number(r.nilai),
      status: r.status,
      ujianOnline: t.bankUjian ? { durasiMenit: t.bankUjian.durasiMenit, ...(jumlahSoal.get(t.bankUjian.id) ?? { pg: 0, essay: 0 }) } : null,
      pengerjaan,
      mulaiAt: r.mulaiAt,
      selesaiAt: r.selesaiAt,
      // Ujian online hanya bisa dimulai pada tanggal tes (WIB); yang sedang dikerjakan bisa dilanjutkan.
      bisaDikerjakan: (pengerjaan === 'BELUM_MULAI' && t.tanggal === hariIni) || pengerjaan === 'MENGERJAKAN',
    };
  });
};

const getMilikPeserta = async (pesertaId, id) => {
  const tup = await TesUjianPeserta.findOne({ where: { id, pesertaId }, include: [INCLUDE_TES] });
  if (!tup) throw new ApiError(404, 'Tes ujian not found');
  if (!tup.tesUjian.bankUjianId) throw new ApiError(400, 'Tes ini tidak memiliki soal online');
  return tup;
};

/** Urutan soal acak tapi tetap sama untuk peserta yang sama (seed = id peserta ujian). */
const acak = (arr, seed) => {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i -= 1) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const sudahHabis = (tup) => {
  const batas = batasAt(tup, tup.tesUjian.bankUjian);
  return !!batas && Date.now() > batas.getTime() + TOLERANSI_MS;
};

/** Lembar ujian (tanpa kunci jawaban) + jawaban tersimpan; memulai pengerjaan bila belum dimulai. */
const mulaiUjian = async (pesertaId, id) => {
  const tup = await getMilikPeserta(pesertaId, id);
  if (tup.selesaiAt) throw new ApiError(400, 'Ujian sudah dikirim');
  if (!tup.mulaiAt) {
    if (tup.tesUjian.tanggal !== hariIniWib()) throw new ApiError(400, 'Ujian hanya bisa dikerjakan pada tanggal tes');
    await tup.update({ mulaiAt: new Date() });
  }
  const bank = tup.tesUjian.bankUjian;
  const soal = await BankUjianSoal.findAll({ where: { bankUjianId: bank.id }, order: [['urutan', 'ASC']] });
  const jawaban = await TesUjianJawaban.findAll({ where: { tesUjianPesertaId: tup.id } });
  const batas = batasAt(tup, bank);
  return {
    id: tup.id,
    namaUjian: tup.tesUjian.namaUjian,
    judul: bank.judul,
    durasiMenit: bank.durasiMenit,
    mulaiAt: tup.mulaiAt,
    batasAt: batas,
    sekarang: new Date(),
    soal: (bank.acakSoal ? acak(soal, tup.id) : soal).map((s) => ({ id: s.id, tipe: s.tipe, pertanyaan: s.pertanyaan, pilihan: s.tipe === 'PG' ? s.pilihan : [], bobot: s.bobot })),
    jawaban: Object.fromEntries(jawaban.map((j) => [j.soalId, { pilihan: j.jawabanPilihan, teks: j.jawabanTeks }])),
  };
};

/** Simpan jawaban sementara (dipanggil tiap peserta memilih / mengetik). */
const simpanJawaban = async (pesertaId, id, { soalId, pilihan, teks }) => {
  const tup = await getMilikPeserta(pesertaId, id);
  if (!tup.mulaiAt) throw new ApiError(400, 'Ujian belum dimulai');
  if (tup.selesaiAt) throw new ApiError(400, 'Ujian sudah dikirim');
  if (sudahHabis(tup)) throw new ApiError(400, 'Waktu ujian sudah habis');
  const soal = await BankUjianSoal.findOne({ where: { id: soalId, bankUjianId: tup.tesUjian.bankUjianId } });
  if (!soal) throw new ApiError(404, 'Soal not found');
  const data = soal.tipe === 'PG' ? { jawabanPilihan: pilihan ?? null, jawabanTeks: null } : { jawabanPilihan: null, jawabanTeks: teks ?? null };
  const [row, baru] = await TesUjianJawaban.findOrCreate({ where: { tesUjianPesertaId: tup.id, soalId }, defaults: data });
  if (!baru) await row.update(data);
  return { disimpan: new Date() };
};

/** Nilai = total skor / total bobot × 100 (essay belum dinilai dihitung 0). Disimpan ke tes_ujian_peserta.nilai. */
const hitungNilai = async (tup) => {
  const soal = await BankUjianSoal.findAll({ where: { bankUjianId: tup.tesUjian.bankUjianId }, attributes: ['id', 'bobot'] });
  const totalBobot = soal.reduce((t, s) => t + s.bobot, 0);
  const jawaban = await TesUjianJawaban.findAll({ where: { tesUjianPesertaId: tup.id }, attributes: ['skor'] });
  const total = jawaban.reduce((t, j) => t + (j.skor ?? 0), 0);
  const nilai = totalBobot ? Math.round((total / totalBobot) * 10000) / 100 : 0;
  await TesUjianPeserta.update({ nilai }, { where: { id: tup.id } });
  return nilai;
};

/** Kirim jawaban: PG dinilai otomatis, essay menunggu koreksi admin. */
const kirimUjian = async (pesertaId, id) => {
  const tup = await getMilikPeserta(pesertaId, id);
  if (!tup.mulaiAt) throw new ApiError(400, 'Ujian belum dimulai');
  if (tup.selesaiAt) throw new ApiError(400, 'Ujian sudah dikirim');
  const soalPg = await BankUjianSoal.findAll({ where: { bankUjianId: tup.tesUjian.bankUjianId, tipe: 'PG' } });
  const jawaban = new Map((await TesUjianJawaban.findAll({ where: { tesUjianPesertaId: tup.id } })).map((j) => [j.soalId, j]));
  for (const s of soalPg) {
    const j = jawaban.get(s.id);
    if (j) await j.update({ skor: j.jawabanPilihan === s.jawabanBenar ? s.bobot : 0 });
  }
  await tup.update({ selesaiAt: new Date() });
  await hitungNilai(tup);
  return { selesaiAt: tup.selesaiAt };
};

module.exports = { listTesUjianPeserta, mulaiUjian, simpanJawaban, kirimUjian, hitungNilai, statusPengerjaan, INCLUDE_TES };
