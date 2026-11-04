'use strict';

const { Mahasiswa, TahunAjaran, PembayaranWisuda } = require('../models');
const { resolveSemesterMahasiswa } = require('../utils/hitungSemester');

/**
 * Pembayaran wisuda dengan semester kosong diisi semester mahasiswa pada tahun ajaran aktif. down kosong: yang semula
 * kosong tidak dibedakan dari yang terisi otomatis kemudian.
 */
module.exports = {
  up: async () => {
    const tahunAktif = await TahunAjaran.findOne({ where: { isActive: true } });
    if (!tahunAktif) return;
    const rows = await PembayaranWisuda.findAll({ where: { semester: null } });
    for (const row of rows) {
      const mahasiswa = await Mahasiswa.findByPk(row.mahasiswaId, { include: [{ model: TahunAjaran, as: 'tahunAjaran', attributes: ['jenisSemester'], required: false }] });
      if (mahasiswa) await row.update({ semester: resolveSemesterMahasiswa(mahasiswa, tahunAktif) }, { silent: true });
    }
  },

  down: async () => {},
};
