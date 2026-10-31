const { Op } = require('sequelize');
const { DaftarPotongan, TagihanKuliah } = require('../models');

/**
 * Potongan (Daftar Potongan) langsung mengurangi total tagihan, tanpa masa tenggang — berbeda
 * dengan keringanan yang hanya dihitung sementara s/d tanggal tertentu.
 *
 * Untuk tagihan hasil import: totalTagihan = tagihanAwal (Total Tagihan file keuangan) - potongan
 * semester yang sama. Potongan tanpa semester berlaku di semua semester (sama seperti generate
 * tagihan lama). Dipanggil setiap Daftar Potongan berubah dan setiap tagihan diimport.
 */
const syncPotonganTagihan = async (mahasiswaIds, { transaction } = {}) => {
  const ids = [...new Set(mahasiswaIds)].filter(Boolean);
  if (!ids.length) return 0;
  const [potonganList, tagihanList] = await Promise.all([
    DaftarPotongan.findAll({ where: { mahasiswaId: { [Op.in]: ids } }, transaction }),
    TagihanKuliah.findAll({ where: { mahasiswaId: { [Op.in]: ids }, sumber: 'IMPORT' }, transaction }),
  ]);

  let diubah = 0;
  for (const t of tagihanList) {
    const potongan = potonganList
      .filter((p) => p.mahasiswaId === t.mahasiswaId && (p.semester === null || p.semester === t.semester))
      .reduce((sum, p) => sum + p.biaya, 0);
    const tagihanAwal = t.tagihanAwal ?? t.totalTagihan + t.potongan;
    const totalTagihan = Math.max(tagihanAwal - potongan, 0);
    if (t.potongan !== potongan || t.totalTagihan !== totalTagihan || t.tagihanAwal !== tagihanAwal) {
      await t.update({ potongan, totalTagihan, tagihanAwal }, { transaction });
      diubah += 1;
    }
  }
  return diubah;
};

module.exports = { syncPotonganTagihan };
