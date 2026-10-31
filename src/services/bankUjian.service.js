const { Op } = require('sequelize');
const { sequelize, BankUjian, BankUjianSoal, TesUjian, TesUjianPeserta, TesUjianJawaban } = require('../models');
const ApiError = require('../utils/ApiError');
const { hitungNilai } = require('./ujianPeserta.service');

/**
 * LMS → Kuis & Ujian → Bank Ujian: paket soal PG + essay buatan admin. Dipakai tes seleksi PMB (menu Tes Ujian) dan
 * nantinya bisa ditugaskan ke kelas kuliah.
 */

const ringkasSoal = (soal) => ({
  jumlahSoal: soal.length,
  jumlahPg: soal.filter((s) => s.tipe === 'PG').length,
  jumlahEssay: soal.filter((s) => s.tipe === 'ESSAY').length,
  totalBobot: soal.reduce((t, s) => t + Number(s.bobot), 0),
});

/** Peserta tes PMB yang sudah mulai mengerjakan paket ini (perubahan soal memengaruhi skor mereka). */
const pesertaMengerjakan = (bankUjianId) =>
  TesUjianPeserta.findAll({
    where: { mulaiAt: { [Op.ne]: null } },
    include: [{ model: TesUjian, as: 'tesUjian', where: { bankUjianId }, attributes: ['id', 'bankUjianId'] }],
  });

/**
 * Setelah soal diubah: skor PG peserta yang sudah mengirim dihitung ulang dari kunci terbaru, skor essay dibatasi bobot
 * baru (soal yang berubah dari PG jadi essay → perlu dikoreksi ulang), lalu nilai dihitung ulang kecuali hasilnya sudah
 * ditetapkan admin. Jawaban soal yang dihapus ikut terhapus (FK cascade).
 */
const hitungUlangSkor = async (bankUjianId) => {
  const soal = new Map((await BankUjianSoal.findAll({ where: { bankUjianId } })).map((x) => [x.id, x]));
  for (const tup of await pesertaMengerjakan(bankUjianId)) {
    if (!tup.selesaiAt) continue;
    for (const j of await TesUjianJawaban.findAll({ where: { tesUjianPesertaId: tup.id } })) {
      const x = soal.get(j.soalId);
      if (!x) continue;
      let skor = j.skor;
      if (x.tipe === 'PG') skor = j.jawabanPilihan === x.jawabanBenar ? x.bobot : 0;
      else if (j.jawabanPilihan !== null) skor = null;
      else if (skor !== null) skor = Math.min(skor, x.bobot);
      if (skor !== j.skor) await j.update({ skor });
    }
    // Hasil yang sudah ditetapkan admin (Set Nilai: lulus / tidak lulus) tidak ditimpa.
    if (tup.status === 'belum_ujian') await hitungNilai(tup);
  }
};

const listBankUjian = async (query = {}) => {
  const where = query.search ? { judul: { [Op.like]: `%${query.search}%` } } : {};
  const rows = await BankUjian.findAll({
    where,
    include: [
      { model: BankUjianSoal, as: 'soal', attributes: ['id', 'tipe', 'bobot'] },
      { model: TesUjian, as: 'tesUjian', attributes: ['id', 'namaUjian', 'tanggal'] },
    ],
    order: [['updatedAt', 'DESC']],
  });
  return rows.map((b) => ({
    id: b.id,
    judul: b.judul,
    deskripsi: b.deskripsi,
    durasiMenit: b.durasiMenit,
    acakSoal: b.acakSoal,
    updatedAt: b.updatedAt,
    ...ringkasSoal(b.soal),
    dipakaiTes: b.tesUjian.map((t) => ({ id: t.id, namaUjian: t.namaUjian, tanggal: t.tanggal })),
  }));
};

const getBankUjianRaw = async (id) => {
  const bank = await BankUjian.findByPk(id, {
    include: [{ model: BankUjianSoal, as: 'soal' }],
    order: [[{ model: BankUjianSoal, as: 'soal' }, 'urutan', 'ASC']],
  });
  if (!bank) throw new ApiError(404, 'Bank ujian not found');
  return bank;
};

const getBankUjian = async (id) => {
  const b = await getBankUjianRaw(id);
  return {
    id: b.id,
    judul: b.judul,
    deskripsi: b.deskripsi,
    durasiMenit: b.durasiMenit,
    acakSoal: b.acakSoal,
    ...ringkasSoal(b.soal),
    jumlahMengerjakan: (await pesertaMengerjakan(b.id)).length,
    soal: b.soal.map((s) => ({ id: s.id, tipe: s.tipe, pertanyaan: s.pertanyaan, pilihan: s.pilihan, jawabanBenar: s.jawabanBenar, bobot: s.bobot })),
  };
};

const normalSoal = (s, i) => ({
  urutan: i + 1,
  tipe: s.tipe,
  pertanyaan: s.pertanyaan,
  pilihan: s.tipe === 'PG' ? s.pilihan : null,
  jawabanBenar: s.tipe === 'PG' ? s.jawabanBenar : null,
  bobot: s.bobot ?? 1,
});

const cekSoal = (soal = []) => {
  soal.forEach((s, i) => {
    if (s.tipe === 'PG' && (s.jawabanBenar === null || s.jawabanBenar === undefined || s.jawabanBenar >= (s.pilihan ?? []).length)) {
      throw new ApiError(400, `Soal no. ${i + 1}: pilih jawaban benar`);
    }
  });
};

const createBankUjian = async ({ soal = [], ...payload }, actorId) => {
  cekSoal(soal);
  const id = await sequelize.transaction(async (t) => {
    const bank = await BankUjian.create({ ...payload, createdBy: actorId, updatedBy: actorId }, { transaction: t });
    await BankUjianSoal.bulkCreate(
      soal.map((s, i) => ({ ...normalSoal(s, i), bankUjianId: bank.id })),
      { transaction: t }
    );
    return bank.id;
  });
  return getBankUjian(id);
};

/** soal dikirim → daftar soal diganti (soal dengan id lama diperbarui, sisanya dibuat / dihapus); ditolak bila sudah dijawab. */
const updateBankUjian = async (id, { soal, ...payload }, actorId) => {
  const bank = await getBankUjianRaw(id);
  if (soal) cekSoal(soal);
  await sequelize.transaction(async (t) => {
    await bank.update({ ...payload, updatedBy: actorId }, { transaction: t });
    if (!soal) return;
    const lama = new Map(bank.soal.map((s) => [s.id, s]));
    const dipakai = new Set();
    for (const [i, s] of soal.entries()) {
      const data = normalSoal(s, i);
      const ada = s.id && lama.get(s.id);
      if (ada) {
        dipakai.add(ada.id);
        await ada.update(data, { transaction: t });
      } else {
        await BankUjianSoal.create({ ...data, bankUjianId: bank.id }, { transaction: t });
      }
    }
    const hapus = [...lama.keys()].filter((k) => !dipakai.has(k));
    if (hapus.length) await BankUjianSoal.destroy({ where: { id: hapus }, transaction: t });
  });
  if (soal) await hitungUlangSkor(bank.id);
  return getBankUjian(id);
};

const deleteBankUjian = async (id) => {
  const bank = await getBankUjianRaw(id);
  const dipakai = await TesUjian.count({ where: { bankUjianId: bank.id } });
  if (dipakai) throw new ApiError(400, `Bank ujian masih dipakai ${dipakai} tes ujian PMB`);
  await bank.destroy();
};

/** Pilihan paket soal untuk form Tes Ujian PMB. */
const opsiBankUjian = async () => {
  const rows = await listBankUjian();
  return rows.map((b) => ({ id: b.id, judul: b.judul, jumlahPg: b.jumlahPg, jumlahEssay: b.jumlahEssay, durasiMenit: b.durasiMenit }));
};

module.exports = { listBankUjian, getBankUjian, createBankUjian, updateBankUjian, deleteBankUjian, opsiBankUjian };
