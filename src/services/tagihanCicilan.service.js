const { Op } = require('sequelize');
const { sequelize, TagihanKuliah, TagihanCicilan, PembayaranKuliah, Mahasiswa, Jurusan, TahunAjaran } = require('../models');
const ApiError = require('../utils/ApiError');
const { hitungSaldoTagihan } = require('../utils/tagihanSaldo');
const { alokasiCicilan, bagiRata, tambahBulan, jatuhTempoBulan } = require('../utils/tagihanCicilan');
const { formatTahunAjaran } = require('../utils/tahunAjaran');

/**
 * Cicilan bulanan tagihan kuliah (modul Keuangan). Jumlah nominal cicilan harus sama dengan total
 * tagihan; status tiap cicilan dihitung dari total dibayar (utils/tagihanCicilan.js).
 */

const loadTagihan = async (id) => {
  const tagihan = await TagihanKuliah.findByPk(id, {
    include: [
      { model: Mahasiswa, as: 'mahasiswa', attributes: ['id', 'nim', 'namaLengkap'] },
      { model: TahunAjaran, as: 'tahunAjaran' },
      { model: PembayaranKuliah, as: 'pembayaranList' },
      { model: TagihanCicilan, as: 'cicilanList' },
    ],
  });
  if (!tagihan) throw new ApiError(404, 'Tagihan kuliah tidak ditemukan');
  return tagihan;
};

const getCicilanTagihan = async (id) => {
  const tagihan = await loadTagihan(id);
  const saldo = hitungSaldoTagihan(tagihan);
  return {
    tagihan: {
      id: tagihan.id,
      semester: tagihan.semester,
      tahunAjaran: formatTahunAjaran(tagihan.tahunAjaran),
      mahasiswa: tagihan.mahasiswa,
      noVirtualAccount: tagihan.noVirtualAccount,
      tanggalJatuhTempo: tagihan.tanggalJatuhTempo,
      totalTagihan: saldo.totalTagihan,
      totalDibayar: saldo.totalDibayar,
      sisaTagihan: saldo.sisaSemester,
    },
    cicilan: alokasiCicilan(tagihan.cicilanList, saldo.totalDibayar),
  };
};

/**
 * Simpan (ganti seluruh) cicilan satu tagihan. `items` kosong = hapus cicilan (tagihan dibayar
 * sekaligus seperti biasa). Urutan cicilan mengikuti bulan periode.
 */
const saveCicilanTagihan = async (id, items, actorId) => {
  const tagihan = await loadTagihan(id);
  const rows = [...items].sort((a, b) => String(a.periode).localeCompare(String(b.periode)));
  const periodeSet = new Set(rows.map((r) => String(r.periode).slice(0, 7)));
  if (periodeSet.size !== rows.length) throw new ApiError(400, 'Bulan cicilan tidak boleh ada yang sama');
  if (rows.length) {
    const jumlah = rows.reduce((sum, r) => sum + Number(r.nominal), 0);
    const total = Math.max(Number(tagihan.totalTagihan) || 0, 0);
    if (Math.round(jumlah) !== Math.round(total)) {
      throw new ApiError(400, `Jumlah nominal cicilan (${jumlah.toLocaleString('id-ID')}) harus sama dengan total tagihan (${total.toLocaleString('id-ID')})`);
    }
  }
  await sequelize.transaction(async (transaction) => {
    await TagihanCicilan.destroy({ where: { tagihanKuliahId: tagihan.id }, transaction });
    if (rows.length) {
      await TagihanCicilan.bulkCreate(
        rows.map((r, i) => ({
          tagihanKuliahId: tagihan.id,
          cicilanKe: i + 1,
          periode: `${String(r.periode).slice(0, 7)}-01`,
          nominal: r.nominal,
          tanggalJatuhTempo: r.tanggalJatuhTempo || null,
          noVirtualAccount: r.noVirtualAccount || null,
          keterangan: r.keterangan || null,
          createdBy: actorId,
          updatedBy: actorId,
        })),
        { transaction }
      );
    }
  });
  return getCicilanTagihan(id);
};

/**
 * Buat cicilan sekaligus untuk semua tagihan satu tahun akademik (opsional satu prodi): total
 * tagihan dibagi rata `jumlahBulan` mulai `bulanMulai` (YYYY-MM), jatuh tempo tiap tanggal
 * `hariJatuhTempo`. No VA cicilan diisi dari No VA tagihan. Tagihan yang sudah punya cicilan
 * dilewati kecuali `timpa`; tagihan bernilai 0 selalu dilewati.
 */
const generateCicilanMassal = async ({ tahunAjaranId, jurusanId, jumlahBulan, bulanMulai, hariJatuhTempo, timpa }, actorId) => {
  const tagihanList = await TagihanKuliah.findAll({
    where: { tahunAjaranId, totalTagihan: { [Op.gt]: 0 } },
    include: [
      {
        model: Mahasiswa,
        as: 'mahasiswa',
        attributes: ['id', 'jurusanId'],
        required: true,
        where: jurusanId ? { jurusanId } : undefined,
        include: [{ model: Jurusan, as: 'jurusan', attributes: ['id'] }],
      },
      { model: TagihanCicilan, as: 'cicilanList', attributes: ['id'] },
    ],
  });
  let dibuat = 0;
  let dilewati = 0;
  await sequelize.transaction(async (transaction) => {
    for (const t of tagihanList) {
      if (t.cicilanList.length && !timpa) {
        dilewati += 1;
        continue;
      }
      if (t.cicilanList.length) await TagihanCicilan.destroy({ where: { tagihanKuliahId: t.id }, transaction });
      const nominal = bagiRata(t.totalTagihan, jumlahBulan);
      await TagihanCicilan.bulkCreate(
        nominal.map((n, i) => {
          const periode = tambahBulan(bulanMulai, i);
          return {
            tagihanKuliahId: t.id,
            cicilanKe: i + 1,
            periode,
            nominal: n,
            tanggalJatuhTempo: jatuhTempoBulan(periode, hariJatuhTempo),
            noVirtualAccount: t.noVirtualAccount || null,
            createdBy: actorId,
            updatedBy: actorId,
          };
        }),
        { transaction }
      );
      dibuat += 1;
    }
  });
  return { totalTagihan: tagihanList.length, dibuat, dilewati };
};

module.exports = { getCicilanTagihan, saveCicilanTagihan, generateCicilanMassal };
