const { Op } = require('sequelize');
const { Jurnal, JurnalDetail, Akun, sequelize } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * Posting jurnal double-entry. `lines` minimal 2 baris, total debit HARUS sama dengan total
 * kredit (prinsip dasar akuntansi berpasangan) — dicek di sini, bukan cuma dipercaya dari
 * pemanggil, supaya Buku Besar & Neraca selalu balance.
 */
const postJurnal = async ({ tanggal, noBukti, keterangan, referensiTipe, referensiId, createdBy, lines }) => {
  const totalDebit = lines.reduce((sum, l) => sum + (l.debit || 0), 0);
  const totalKredit = lines.reduce((sum, l) => sum + (l.kredit || 0), 0);
  if (Math.round((totalDebit - totalKredit) * 100) !== 0) {
    throw new ApiError(500, 'Jurnal tidak balance: total debit harus sama dengan total kredit');
  }

  return sequelize.transaction(async (t) => {
    const jurnal = await Jurnal.create(
      { tanggal, noBukti, keterangan, referensiTipe, referensiId, createdBy },
      { transaction: t }
    );
    await JurnalDetail.bulkCreate(
      lines.map((l) => ({ jurnalId: jurnal.id, akunId: l.akunId, debit: l.debit || 0, kredit: l.kredit || 0 })),
      { transaction: t }
    );
    return jurnal;
  });
};

const getAkunByKode = async (kode) => {
  const akun = await Akun.findOne({ where: { kode } });
  if (!akun) throw new ApiError(500, `Akun dengan kode ${kode} tidak ditemukan — pastikan seeder COA sudah dijalankan`);
  return akun;
};

const listBukuBesar = async ({ akunId, startDate, endDate }) => {
  const akun = await Akun.findByPk(akunId);
  if (!akun) throw new ApiError(404, 'Akun tidak ditemukan');

  const jurnalWhere = {};
  if (startDate || endDate) {
    jurnalWhere.tanggal = {};
    if (startDate) jurnalWhere.tanggal[Op.gte] = startDate;
    if (endDate) jurnalWhere.tanggal[Op.lte] = endDate;
  }

  const rows = await JurnalDetail.findAll({
    where: { akunId },
    include: [{ model: Jurnal, as: 'jurnal', where: Object.keys(jurnalWhere).length ? jurnalWhere : undefined, required: true }],
    order: [
      [{ model: Jurnal, as: 'jurnal' }, 'tanggal', 'ASC'],
      [{ model: Jurnal, as: 'jurnal' }, 'id', 'ASC'],
    ],
  });

  let saldo = 0;
  const mutasi = rows.map((row) => {
    const debit = row.debit;
    const kredit = row.kredit;
    saldo += akun.saldoNormal === 'DEBIT' ? debit - kredit : kredit - debit;
    return {
      tanggal: row.jurnal.tanggal,
      noBukti: row.jurnal.noBukti,
      keterangan: row.jurnal.keterangan,
      debit,
      kredit,
      saldo,
    };
  });

  return {
    akun: { id: akun.id, kode: akun.kode, nama: akun.nama, kategori: akun.kategori, saldoNormal: akun.saldoNormal },
    mutasi,
    saldoAkhir: saldo,
  };
};

/** Saldo akun per tanggal (kumulatif dari awal) — dipakai Neraca. */
const getSaldoAkun = async (akun, tanggal) => {
  const where = { akunId: akun.id };
  const jurnalWhere = tanggal ? { tanggal: { [Op.lte]: tanggal } } : {};

  const rows = await JurnalDetail.findAll({
    where,
    include: [{ model: Jurnal, as: 'jurnal', where: Object.keys(jurnalWhere).length ? jurnalWhere : undefined, required: true }],
  });

  const totalDebit = rows.reduce((sum, r) => sum + r.debit, 0);
  const totalKredit = rows.reduce((sum, r) => sum + r.kredit, 0);
  return akun.saldoNormal === 'DEBIT' ? totalDebit - totalKredit : totalKredit - totalDebit;
};

const getNeraca = async ({ tanggal } = {}) => {
  const akunList = await Akun.findAll({ where: { isActive: true }, order: [['kode', 'ASC']] });

  const withSaldo = await Promise.all(
    akunList.map(async (akun) => ({
      id: akun.id,
      kode: akun.kode,
      nama: akun.nama,
      kategori: akun.kategori,
      saldo: await getSaldoAkun(akun, tanggal),
    }))
  );

  const byKategori = (kategori) => withSaldo.filter((a) => a.kategori === kategori);

  const totalAset = byKategori('ASET').reduce((sum, a) => sum + a.saldo, 0);
  const totalKewajiban = byKategori('KEWAJIBAN').reduce((sum, a) => sum + a.saldo, 0);
  const totalEkuitasAwal = byKategori('EKUITAS').reduce((sum, a) => sum + a.saldo, 0);
  const totalPendapatan = byKategori('PENDAPATAN').reduce((sum, a) => sum + a.saldo, 0);
  const totalBeban = byKategori('BEBAN').reduce((sum, a) => sum + a.saldo, 0);

  // Belum ada jurnal penutup formal di sistem ini, jadi laba/rugi berjalan (Pendapatan - Beban
  // akumulasi sampai `tanggal`) ditampilkan sebagai satu baris Ekuitas tambahan ("Laba Ditahan
  // Berjalan") supaya Neraca tetap balance: Aset = Kewajiban + Ekuitas.
  const labaBerjalan = totalPendapatan - totalBeban;

  return {
    aset: byKategori('ASET'),
    totalAset,
    kewajiban: byKategori('KEWAJIBAN'),
    totalKewajiban,
    ekuitas: byKategori('EKUITAS'),
    labaBerjalan,
    totalEkuitas: totalEkuitasAwal + labaBerjalan,
    isBalance: Math.round((totalAset - (totalKewajiban + totalEkuitasAwal + labaBerjalan)) * 100) === 0,
  };
};

module.exports = { postJurnal, getAkunByKode, listBukuBesar, getNeraca };
