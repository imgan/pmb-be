const { Op } = require('sequelize');
const {
  BimbinganTa,
  PengajuanTa,
  PeriodePengajuanTa,
  PembayaranTaSkripsi,
  PendaftarSidang,
  JadwalSidang,
  NilaiSidang,
  Mahasiswa,
  Jurusan,
  Dosen,
} = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * Kartu bimbingan TA/Skripsi. Mahasiswa bimbingan = pengajuan TA berstatus DISETUJUI dengan dosen
 * sebagai pembimbing utama atau pendamping. Dosen hanya bisa mengubah/menghapus catatan miliknya.
 */

const namaDosen = (d) => (d ? [d.namaLengkap, d.gelar].filter(Boolean).join(', ') : null);
const dosenAttrs = ['id', 'namaLengkap', 'gelar'];
const includeMahasiswa = {
  model: Mahasiswa,
  as: 'mahasiswa',
  attributes: ['id', 'nim', 'namaLengkap'],
  include: [{ model: Jurusan, as: 'jurusan', attributes: ['namaJurusan', 'jenjangPendidikan'], required: false }],
};

const listCatatan = (pengajuanTaId) =>
  BimbinganTa.findAll({
    where: { pengajuanTaId },
    include: [{ model: Dosen.unscoped(), as: 'dosen', attributes: dosenAttrs, required: false }],
    order: [['tanggal', 'ASC'], ['id', 'ASC']],
  });

const formatKartu = async (pengajuan) => {
  const catatan = await listCatatan(pengajuan.id);
  const tanggal = catatan.map((c) => c.tanggal).sort();
  return {
    pengajuanId: pengajuan.id,
    mahasiswa: {
      nim: pengajuan.mahasiswa?.nim,
      namaLengkap: pengajuan.mahasiswa?.namaLengkap,
      prodi: pengajuan.mahasiswa?.jurusan?.namaJurusan ?? null,
      jenjang: pengajuan.mahasiswa?.jurusan?.jenjangPendidikan ?? null,
    },
    judul: pengajuan.judul,
    pembimbingUtama: namaDosen(pengajuan.pembimbingUtama),
    pembimbingPendamping: namaDosen(pengajuan.pembimbingPendamping),
    tanggalAwal: tanggal[0] ?? null,
    tanggalAkhir: tanggal[tanggal.length - 1] ?? null,
    catatan: catatan.map((c) => ({
      id: c.id,
      tanggal: c.tanggal,
      pokokPembahasan: c.pokokPembahasan,
      keterangan: c.keterangan,
      tanggalInput: c.createdAt,
      dosenId: c.dosenId,
      pembimbing: namaDosen(c.dosen),
    })),
  };
};

const includePengajuan = [
  includeMahasiswa,
  { model: Dosen.unscoped(), as: 'pembimbingUtama', attributes: dosenAttrs, required: false },
  { model: Dosen.unscoped(), as: 'pembimbingPendamping', attributes: dosenAttrs, required: false },
];

// ---- Portal mahasiswa ----

/** Kartu bimbingan mahasiswa dari pengajuan TA yang disetujui (null bila belum ada). */
const getKartuMahasiswa = async (mahasiswaId) => {
  const pengajuan = await PengajuanTa.findOne({
    where: { mahasiswaId, status: 'DISETUJUI' },
    include: includePengajuan,
    order: [['id', 'DESC']],
  });
  return pengajuan ? formatKartu(pengajuan) : null;
};

// ---- Portal dosen ----

/** Periode pengajuan TA yang punya pengajuan dengan dosen ini sebagai pembimbing (filter "Pilih Periode"). */
const listPeriodeDosen = async (dosenId) => {
  const rows = await PengajuanTa.findAll({
    where: { [Op.or]: [{ pembimbingUtamaId: dosenId }, { pembimbingPendampingId: dosenId }] },
    attributes: ['periodePengajuanTaId'],
    group: ['periodePengajuanTaId'],
    raw: true,
  });
  if (!rows.length) return [];
  return PeriodePengajuanTa.unscoped().findAll({
    where: { id: rows.map((r) => r.periodePengajuanTaId) },
    attributes: ['id', 'tanggalMulai', 'tanggalSelesai'],
    order: [['tanggalMulai', 'DESC']],
  });
};

const STATUS_BIMBINGAN = { DIAJUKAN: 'Menunggu persetujuan prodi', DISETUJUI: 'Disetujui', DITOLAK: 'Ditolak' };

/**
 * Form Pembimbing TA/Skripsi (portal dosen): semua mahasiswa yang mengusulkan dosen ini sebagai
 * pembimbing utama/pendamping — sejak diajukan — beserta kontak, status bimbingan, status bayar
 * TA/Skripsi (pembayaran_ta_skripsi), status sidang (Pendaftar Sidang & nilai), dan jumlah bimbingan.
 */
const listMahasiswaBimbingan = async (dosenId, { periodeId } = {}) => {
  const list = await PengajuanTa.findAll({
    where: {
      [Op.or]: [{ pembimbingUtamaId: dosenId }, { pembimbingPendampingId: dosenId }],
      ...(periodeId ? { periodePengajuanTaId: periodeId } : {}),
    },
    include: includePengajuan,
    order: [['id', 'DESC']],
  });
  if (!list.length) return [];
  const pengajuanIds = list.map((p) => p.id);
  const mahasiswaIds = [...new Set(list.map((p) => p.mahasiswaId))];
  const [jumlah, bayar, sidang] = await Promise.all([
    BimbinganTa.count({ where: { pengajuanTaId: pengajuanIds }, group: ['pengajuanTaId'] }),
    PembayaranTaSkripsi.findAll({ where: { mahasiswaId: mahasiswaIds }, attributes: ['mahasiswaId', 'nominal'], raw: true }),
    PendaftarSidang.findAll({
      where: { mahasiswaId: mahasiswaIds },
      include: [
        { model: JadwalSidang, as: 'jadwalSidang', attributes: ['tanggal'], required: false },
        { model: NilaiSidang, as: 'nilaiSidangList', attributes: ['nilai'], required: false },
      ],
    }),
  ]);
  const jumlahBy = new Map(jumlah.map((j) => [j.pengajuanTaId, Number(j.count)]));
  const bayarBy = new Map();
  bayar.forEach((b) => bayarBy.set(b.mahasiswaId, (bayarBy.get(b.mahasiswaId) ?? 0) + Number(b.nominal)));
  const sidangBy = new Map(sidang.map((p) => [p.mahasiswaId, p]));

  const statusSidang = (mahasiswaId) => {
    const p = sidangBy.get(mahasiswaId);
    if (!p) return { label: 'Belum daftar', tanggal: null };
    const nilai = (p.nilaiSidangList ?? []).map((n) => Number(n.nilai)).filter((v) => !Number.isNaN(v));
    if (nilai.length) return { label: `Sudah sidang (rata-rata ${Math.round((nilai.reduce((a, v) => a + v, 0) / nilai.length) * 100) / 100})`, tanggal: p.jadwalSidang?.tanggal ?? null };
    return { label: p.jadwalSidang ? 'Terjadwal' : 'Terdaftar', tanggal: p.jadwalSidang?.tanggal ?? null };
  };

  return list.map((p) => {
    const dibayar = bayarBy.get(p.mahasiswaId) ?? 0;
    return {
      pengajuanId: p.id,
      periodeId: p.periodePengajuanTaId,
      nim: p.mahasiswa?.nim,
      namaLengkap: p.mahasiswa?.namaLengkap,
      prodi: p.mahasiswa?.jurusan?.namaJurusan ?? null,
      judul: p.judul,
      noTelepon: p.noTelepon,
      email: p.email,
      peran: p.pembimbingUtamaId === dosenId ? 'UTAMA' : 'PENDAMPING',
      status: p.status,
      statusLabel: STATUS_BIMBINGAN[p.status] ?? p.status,
      catatanProdi: p.catatanProdi,
      statusBayar: { lunas: dibayar > 0, dibayar },
      statusSidang: statusSidang(p.mahasiswaId),
      jumlahBimbingan: jumlahBy.get(p.id) ?? 0,
    };
  });
};

const assertPembimbing = async (dosenId, pengajuanId) => {
  const pengajuan = await PengajuanTa.findOne({
    where: { id: pengajuanId, status: 'DISETUJUI', [Op.or]: [{ pembimbingUtamaId: dosenId }, { pembimbingPendampingId: dosenId }] },
    include: includePengajuan,
  });
  if (!pengajuan) throw new ApiError(404, 'Mahasiswa ini bukan bimbingan TA/Skripsi Anda');
  return pengajuan;
};

const getKartuDosen = async (dosenId, pengajuanId) => formatKartu(await assertPembimbing(dosenId, pengajuanId));

const tambahCatatan = async (dosenId, pengajuanId, payload) => {
  const pengajuan = await assertPembimbing(dosenId, pengajuanId);
  await BimbinganTa.create({
    pengajuanTaId: pengajuan.id,
    mahasiswaId: pengajuan.mahasiswaId,
    dosenId,
    tanggal: payload.tanggal,
    pokokPembahasan: payload.pokokPembahasan,
    keterangan: payload.keterangan || null,
  });
  return formatKartu(pengajuan);
};

const findCatatanMilik = async (dosenId, id) => {
  const catatan = await BimbinganTa.findByPk(id);
  if (!catatan) throw new ApiError(404, 'Catatan bimbingan tidak ditemukan');
  if (catatan.dosenId !== dosenId) throw new ApiError(403, 'Hanya dosen yang menginput yang bisa mengubah catatan ini');
  return catatan;
};

const ubahCatatan = async (dosenId, id, payload) => {
  const catatan = await findCatatanMilik(dosenId, id);
  await catatan.update({ tanggal: payload.tanggal, pokokPembahasan: payload.pokokPembahasan, keterangan: payload.keterangan || null });
  return getKartuDosen(dosenId, catatan.pengajuanTaId);
};

const hapusCatatan = async (dosenId, id) => {
  const catatan = await findCatatanMilik(dosenId, id);
  const { pengajuanTaId } = catatan;
  await catatan.destroy();
  return getKartuDosen(dosenId, pengajuanTaId);
};

module.exports = { getKartuMahasiswa, listPeriodeDosen, listMahasiswaBimbingan, getKartuDosen, tambahCatatan, ubahCatatan, hapusCatatan };
