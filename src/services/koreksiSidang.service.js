const { KoreksiSidang, PendaftarSidang, Mahasiswa, Jurusan, Dosen, JadwalSidang, TahunAjaran } = require('../models');
const ApiError = require('../utils/ApiError');
const { formatTahunAjaran } = require('../utils/tahunAjaran');
const { dosenIdByPeran, includeJadwal } = require('./nilaiSidang.service');

// Semua akses discope ke dosen yang login: dosen hanya bisa mengelola butir koreksi untuk
// peran yang memang miliknya pada pendaftar sidang tsb (dicek dari data sidang, bukan client).

const ensurePeranMilikDosen = async (dosenId, pendaftarSidangId, peran) => {
  const pendaftar = await PendaftarSidang.findByPk(pendaftarSidangId, { include: [includeJadwal] });
  if (!pendaftar) throw new ApiError(404, 'Pendaftar sidang tidak ditemukan');
  if (dosenIdByPeran(pendaftar)[peran] !== dosenId) {
    throw new ApiError(403, 'Anda tidak terdaftar sebagai dosen dengan peran ini pada sidang tersebut');
  }
  return pendaftar;
};

const ensureItemMilikDosen = async (dosenId, id) => {
  const item = await KoreksiSidang.findByPk(id);
  if (!item) throw new ApiError(404, 'Butir koreksi tidak ditemukan');
  // Cek ulang peran (bukan cuma dosenId pembuat) — kalau pembimbing/penguji diganti, dosen lama
  // tidak lagi boleh mengubah koreksi peran tsb.
  await ensurePeranMilikDosen(dosenId, item.pendaftarSidangId, item.peran);
  return item;
};

const listItems = async (dosenId, pendaftarSidangId, peran) => {
  await ensurePeranMilikDosen(dosenId, pendaftarSidangId, peran);
  return KoreksiSidang.findAll({ where: { pendaftarSidangId, peran }, order: [['id', 'ASC']] });
};

const createItem = async (dosenId, pendaftarSidangId, payload) => {
  await ensurePeranMilikDosen(dosenId, pendaftarSidangId, payload.peran);
  return KoreksiSidang.create({
    pendaftarSidangId,
    peran: payload.peran,
    dosenId,
    babHalaman: payload.babHalaman || null,
    uraian: payload.uraian,
    isSelesai: payload.isSelesai ?? false,
  });
};

const updateItem = async (dosenId, id, payload) => {
  const item = await ensureItemMilikDosen(dosenId, id);
  const values = {};
  if (payload.babHalaman !== undefined) values.babHalaman = payload.babHalaman || null;
  if (payload.uraian !== undefined) values.uraian = payload.uraian;
  if (payload.isSelesai !== undefined) values.isSelesai = payload.isSelesai;
  await item.update(values);
  return item;
};

const deleteItem = async (dosenId, id) => {
  const item = await ensureItemMilikDosen(dosenId, id);
  await item.destroy();
};

/** Data cetak Lembar Koreksi untuk satu (pendaftar, peran) milik dosen yang login. */
const getCetakData = async (dosenId, pendaftarSidangId, peran) => {
  await ensurePeranMilikDosen(dosenId, pendaftarSidangId, peran);
  const pendaftar = await PendaftarSidang.findByPk(pendaftarSidangId, {
    include: [
      { model: Mahasiswa, as: 'mahasiswa', include: [{ model: Jurusan, as: 'jurusan' }] },
      {
        model: JadwalSidang,
        as: 'jadwalSidang',
        include: [{ model: TahunAjaran, as: 'tahunAjaran', attributes: ['nama', 'jenisSemester'] }],
      },
    ],
  });
  const [dosen, items] = await Promise.all([
    Dosen.findByPk(dosenId, { attributes: ['id', 'namaLengkap'] }),
    KoreksiSidang.findAll({ where: { pendaftarSidangId, peran }, order: [['id', 'ASC']] }),
  ]);
  const { mahasiswa } = pendaftar;

  return {
    peran,
    dosen: { namaLengkap: dosen.namaLengkap },
    mahasiswa: { nim: mahasiswa.nim, namaLengkap: mahasiswa.namaLengkap },
    jurusan: mahasiswa.jurusan
      ? { namaJurusan: mahasiswa.jurusan.namaJurusan, jenjangPendidikan: mahasiswa.jurusan.jenjangPendidikan }
      : null,
    sidang: {
      judul: pendaftar.judul,
      tanggal: pendaftar.jadwalSidang?.tanggal ?? null,
      tahunAjaran: formatTahunAjaran(pendaftar.jadwalSidang?.tahunAjaran, pendaftar.jadwalSidang?.semester),
    },
    items: items.map((i) => ({ babHalaman: i.babHalaman, uraian: i.uraian, isSelesai: i.isSelesai })),
  };
};

module.exports = { listItems, createItem, updateItem, deleteItem, getCetakData };
