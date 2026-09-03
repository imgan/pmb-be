const { KehadiranDosen, Dosen, JadwalKuliah, MataKuliah, TahunAjaran } = require('../models');

const listKehadiranMengajar = async ({ tahunAjaranId, dosenId } = {}) => {
  const jadwalWhere = {};
  if (tahunAjaranId) jadwalWhere.tahunAjaranId = tahunAjaranId;
  const where = {};
  if (dosenId) where.dosenId = dosenId;

  const rows = await KehadiranDosen.findAll({
    where,
    include: [
      { model: Dosen, as: 'dosen', attributes: ['id', 'nidn', 'namaLengkap'] },
      {
        model: JadwalKuliah,
        as: 'jadwalKuliah',
        attributes: ['id', 'kelas', 'kodeMataKuliah', 'namaMataKuliah'],
        where: Object.keys(jadwalWhere).length ? jadwalWhere : undefined,
        required: !!tahunAjaranId,
        include: [
          { model: MataKuliah, as: 'mataKuliah', attributes: ['id', 'kodeMk', 'namaMk'] },
          { model: TahunAjaran, as: 'tahunAjaran', attributes: ['id', 'nama'] },
        ],
      },
    ],
    order: [['tanggalRealisasi', 'DESC']],
  });

  return rows;
};

module.exports = { listKehadiranMengajar };
