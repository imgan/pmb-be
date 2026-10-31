const { Op } = require('sequelize');
const {
  Mahasiswa,
  MahasiswaBiodata,
  Jurusan,
  GolonganKelas,
  TahunAjaran,
  JadwalKuliah,
  Krs,
  KrsDetail,
  TagihanKuliah,
  FeederAkm,
  sequelize,
} = require('../models');
const ApiError = require('../utils/ApiError');
const { formatTahunAjaran } = require('../utils/tahunAjaran');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { periodeFromTahunAjaran } = require('./feeder/helpers');
const tagihanKuliahService = require('./tagihanKuliah.service');

/**
 * BAAK > Generate NIM: lanjutan setelah mahasiswa baru digenerate dari peserta PMB.
 * 1. Pilih kelas per mahasiswa → disimpan di biodata: `kelas` (1 huruf, mis. A) & `waktuKuliah`
 *    (Pagi/Malam).
 * 2. Nama kelas disusun otomatis: [singkatan prodi][semester][huruf kelas][P/M], mis. TI1AP.
 *    Nama ini harus sama dengan kolom `kelas` di Jadwal Kuliah supaya KRS bisa digenerate.
 * 3. Per nama kelas: generate KRS semester 1 (status DISETUJUI, berisi seluruh jadwal kelas tsb),
 *    generate tagihan semester 1, dan generate status aktif (AKM Feeder status A) semester 1.
 *
 * Hanya mahasiswa BARU (bukan transfer) yang masuk pada tahun ajaran terpilih — mahasiswa
 * transfer tidak mulai dari semester 1.
 */

const SEMESTER = 1;
const WAKTU_KODE = { Pagi: 'P', Malam: 'M' };
const KODE_WAKTU = { P: 'Pagi', M: 'Malam' };

const namaKelasOf = (mahasiswa) => {
  const singkatan = mahasiswa.jurusan?.singkatan?.trim();
  const kelas = mahasiswa.biodata?.kelas?.trim();
  const waktu = WAKTU_KODE[mahasiswa.biodata?.waktuKuliah];
  if (!singkatan || !kelas || !waktu) return null;
  return `${singkatan}${SEMESTER}${kelas}${waktu}`.toUpperCase();
};

const resolveTahunAjaran = async (tahunAjaranId) => {
  const tahunAjaran = tahunAjaranId
    ? await TahunAjaran.findByPk(tahunAjaranId)
    : await TahunAjaran.findOne({ where: { isActive: true } });
  if (!tahunAjaran) throw new ApiError(404, tahunAjaranId ? 'Tahun ajaran tidak ditemukan' : 'Belum ada tahun ajaran aktif');
  return tahunAjaran;
};

// Mahasiswa hasil import Excel tidak punya tahunAjaranId — dicocokkan lewat tahun masuk, hanya
// untuk tahun ajaran GANJIL (penerimaan mahasiswa baru selalu di semester ganjil).
const angkatanWhere = (tahunAjaran) =>
  tahunAjaran.jenisSemester === 'GANJIL'
    ? { [Op.or]: [{ tahunAjaranId: tahunAjaran.id }, { tahunAjaranId: null, tahunMasuk: tahunAjaran.tahunMulai }] }
    : { tahunAjaranId: tahunAjaran.id };

// Seluruh mahasiswa baru pada tahun ajaran tsb beserta nama kelas & status generate-nya.
const loadMahasiswaBaru = async (tahunAjaran) => {
  const mahasiswaList = await Mahasiswa.findAll({
    where: { ...angkatanWhere(tahunAjaran), statusMasuk: 'BARU' },
    include: [
      { model: Jurusan, as: 'jurusan', attributes: ['id', 'namaJurusan', 'singkatan'], required: false },
      { model: GolonganKelas, as: 'golonganKelas', attributes: ['id', 'namaKelas'], required: false },
      { model: MahasiswaBiodata, as: 'biodata', attributes: ['id', 'kelas', 'waktuKuliah'], required: false },
    ],
    order: [['nim', 'ASC']],
  });
  const ids = mahasiswaList.map((m) => m.id);
  if (!ids.length) return [];

  const periode = periodeFromTahunAjaran(tahunAjaran);
  const [krsList, tagihanList, akmList] = await Promise.all([
    Krs.findAll({
      where: { mahasiswaId: { [Op.in]: ids }, tahunAjaranId: tahunAjaran.id, semester: SEMESTER },
      attributes: ['id', 'mahasiswaId', 'status'],
      include: [{ model: KrsDetail, as: 'detailList', attributes: ['id'] }],
    }),
    TagihanKuliah.findAll({
      where: { mahasiswaId: { [Op.in]: ids }, tahunAjaranId: tahunAjaran.id },
      attributes: ['id', 'mahasiswaId', 'totalTagihan'],
    }),
    FeederAkm.findAll({ where: { mahasiswaId: { [Op.in]: ids }, periode }, attributes: ['id', 'mahasiswaId', 'statusMahasiswa'] }),
  ]);
  const krsBy = new Map(krsList.map((k) => [k.mahasiswaId, k]));
  const tagihanBy = new Map(tagihanList.map((t) => [t.mahasiswaId, t]));
  const akmBy = new Map(akmList.map((a) => [a.mahasiswaId, a]));

  return mahasiswaList.map((m) => {
    const krs = krsBy.get(m.id);
    const tagihan = tagihanBy.get(m.id);
    const akm = akmBy.get(m.id);
    return {
      id: m.id,
      nim: m.nim,
      namaLengkap: m.namaLengkap,
      jurusanId: m.jurusanId,
      jurusan: m.jurusan,
      golonganKelas: m.golonganKelas,
      isActive: m.isActive,
      kelas: m.biodata?.kelas ?? null,
      waktuKuliah: m.biodata?.waktuKuliah ?? null,
      namaKelas: namaKelasOf(m),
      krs: krs ? { status: krs.status, jumlahMataKuliah: krs.detailList?.length ?? 0 } : null,
      tagihan: tagihan ? { totalTagihan: tagihan.totalTagihan } : null,
      statusAktif: akm?.statusMahasiswa ?? null,
    };
  });
};

const listMahasiswaBaru = async (query) => {
  const tahunAjaran = await resolveTahunAjaran(query.tahunAjaranId);
  let rows = await loadMahasiswaBaru(tahunAjaran);

  if (query.jurusanId) rows = rows.filter((r) => r.jurusanId === Number(query.jurusanId));
  if (query.namaKelas === '-') rows = rows.filter((r) => !r.namaKelas);
  else if (query.namaKelas) rows = rows.filter((r) => r.namaKelas === query.namaKelas);
  if (query.search) {
    const term = query.search.toLowerCase();
    rows = rows.filter((r) => r.nim.toLowerCase().includes(term) || r.namaLengkap.toLowerCase().includes(term));
  }

  const { page, limit, offset } = getPagination(query);
  return { data: rows.slice(offset, offset + limit), meta: getPagingMeta(rows.length, page, limit), tahunAjaran };
};

/** Ringkasan per nama kelas: jumlah mahasiswa, jadwal kuliah yang cocok, dan progres generate. */
const listKelas = async (query) => {
  const tahunAjaran = await resolveTahunAjaran(query.tahunAjaranId);
  const rows = await loadMahasiswaBaru(tahunAjaran);

  const byKelas = new Map();
  rows
    .filter((r) => r.namaKelas)
    .forEach((r) => {
      const entry = byKelas.get(r.namaKelas) ?? {
        namaKelas: r.namaKelas,
        namaJurusan: r.jurusan?.namaJurusan ?? null,
        waktuKuliah: r.waktuKuliah,
        jumlahMahasiswa: 0,
        jumlahKrs: 0,
        jumlahTagihan: 0,
        jumlahAktif: 0,
      };
      entry.jumlahMahasiswa += 1;
      if (r.krs) entry.jumlahKrs += 1;
      if (r.tagihan) entry.jumlahTagihan += 1;
      if (r.statusAktif === 'A') entry.jumlahAktif += 1;
      byKelas.set(r.namaKelas, entry);
    });

  const namaKelasList = [...byKelas.keys()];
  const jadwalCounts = namaKelasList.length
    ? await JadwalKuliah.findAll({
        attributes: ['kelas', [sequelize.fn('COUNT', sequelize.col('id')), 'total']],
        where: { tahunAjaranId: tahunAjaran.id, isActive: true, kelas: { [Op.in]: namaKelasList } },
        group: ['kelas'],
        raw: true,
      })
    : [];
  const jadwalBy = new Map(jadwalCounts.map((j) => [j.kelas.toUpperCase(), Number(j.total)]));

  return {
    tahunAjaran,
    belumAdaKelas: rows.filter((r) => !r.namaKelas).length,
    kelas: [...byKelas.values()]
      .map((k) => ({ ...k, jumlahJadwal: jadwalBy.get(k.namaKelas) ?? 0 }))
      .sort((a, b) => a.namaKelas.localeCompare(b.namaKelas)),
  };
};

/** Simpan pilihan kelas (huruf) & waktu kuliah (P/M) untuk beberapa mahasiswa sekaligus. */
const setKelas = async ({ mahasiswaIds, kelas, waktu }) => {
  const mahasiswaList = await Mahasiswa.findAll({
    where: { id: { [Op.in]: mahasiswaIds } },
    include: [
      { model: Jurusan, as: 'jurusan', attributes: ['id', 'namaJurusan'], required: false },
      { model: MahasiswaBiodata, as: 'biodata', required: false },
    ],
  });
  if (mahasiswaList.length !== new Set(mahasiswaIds).size) throw new ApiError(404, 'Sebagian mahasiswa tidak ditemukan');

  const values = { kelas: kelas.toUpperCase(), waktuKuliah: KODE_WAKTU[waktu] };
  await sequelize.transaction(async (transaction) => {
    for (const mahasiswa of mahasiswaList) {
      if (mahasiswa.biodata) {
        await mahasiswa.biodata.update(values, { transaction });
      } else {
        await MahasiswaBiodata.create(
          { mahasiswaId: mahasiswa.id, programStudi: mahasiswa.jurusan?.namaJurusan ?? null, ...values },
          { transaction }
        );
      }
    }
  });
  return { updated: mahasiswaList.length };
};

const loadAnggotaKelas = async (tahunAjaranId, namaKelas) => {
  const tahunAjaran = await resolveTahunAjaran(tahunAjaranId);
  const anggota = (await loadMahasiswaBaru(tahunAjaran)).filter((r) => r.namaKelas === namaKelas.toUpperCase());
  if (!anggota.length) throw new ApiError(404, `Belum ada mahasiswa baru di kelas ${namaKelas}`);
  return { tahunAjaran, anggota };
};

/**
 * KRS semester 1 untuk seluruh mahasiswa satu kelas = seluruh jadwal kuliah aktif dengan nama kelas
 * yang sama pada tahun ajaran tsb, langsung DISETUJUI. KRS yang sudah ada ditimpa isinya (supaya
 * jadwal yang ditambahkan belakangan ikut masuk saat generate ulang).
 */
const generateKrs = async ({ tahunAjaranId, namaKelas }, actorId) => {
  const { tahunAjaran, anggota } = await loadAnggotaKelas(tahunAjaranId, namaKelas);
  const jadwalList = await JadwalKuliah.findAll({
    where: { tahunAjaranId: tahunAjaran.id, isActive: true, kelas: namaKelas },
    attributes: ['id'],
  });
  if (!jadwalList.length) {
    throw new ApiError(400, `Belum ada jadwal kuliah aktif untuk kelas ${namaKelas} pada tahun ajaran ${formatTahunAjaran(tahunAjaran)}`);
  }
  const jadwalIds = jadwalList.map((j) => j.id);

  let created = 0;
  let updated = 0;
  await sequelize.transaction(async (transaction) => {
    for (const mhs of anggota) {
      const where = { mahasiswaId: mhs.id, tahunAjaranId: tahunAjaran.id, semester: SEMESTER };
      let krs = await Krs.findOne({ where, transaction });
      if (krs) {
        await krs.update({ status: 'DISETUJUI', updatedBy: actorId }, { transaction });
        await KrsDetail.destroy({ where: { krsId: krs.id }, transaction });
        updated += 1;
      } else {
        krs = await Krs.create({ ...where, status: 'DISETUJUI', createdBy: actorId, updatedBy: actorId }, { transaction });
        created += 1;
      }
      await KrsDetail.bulkCreate(
        jadwalIds.map((jadwalKuliahId) => ({ krsId: krs.id, jadwalKuliahId })),
        { transaction }
      );
    }
  });
  return { created, updated, jumlahMataKuliah: jadwalIds.length };
};

const generateTagihan = async ({ tahunAjaranId, namaKelas }, actorId) => {
  const { tahunAjaran, anggota } = await loadAnggotaKelas(tahunAjaranId, namaKelas);
  return tagihanKuliahService.generateTagihan(tahunAjaran.id, actorId, { mahasiswaIds: anggota.map((m) => m.id) });
};

/**
 * Status aktif semester 1 = baris AKM (Aktivitas Kuliah Mahasiswa, Feeder PDDIKTI) periode tahun
 * ajaran tsb dengan status "A", SKS semester dari KRS & biaya kuliah dari tagihan bila sudah ada.
 * Mahasiswa juga ditandai aktif (isActive).
 */
const generateStatusAktif = async ({ tahunAjaranId, namaKelas }, actorId) => {
  const { tahunAjaran, anggota } = await loadAnggotaKelas(tahunAjaranId, namaKelas);
  const periode = periodeFromTahunAjaran(tahunAjaran);
  const ids = anggota.map((m) => m.id);

  const krsList = await Krs.findAll({
    where: { mahasiswaId: { [Op.in]: ids }, tahunAjaranId: tahunAjaran.id, semester: SEMESTER },
    include: [
      {
        model: KrsDetail,
        as: 'detailList',
        include: [{ model: JadwalKuliah, as: 'kelasKuliah', attributes: ['id', 'sks'] }],
      },
    ],
  });
  const sksBy = new Map(
    krsList.map((k) => [k.mahasiswaId, (k.detailList ?? []).reduce((sum, d) => sum + (d.kelasKuliah?.sks ?? 0), 0)])
  );

  let created = 0;
  let updated = 0;
  await sequelize.transaction(async (transaction) => {
    for (const mhs of anggota) {
      const sks = sksBy.get(mhs.id) ?? 0;
      const values = {
        statusMahasiswa: 'A',
        sksSemester: sks,
        sksTotal: sks,
        biayaKuliah: mhs.tagihan?.totalTagihan ?? null,
        updatedBy: actorId,
      };
      const existing = await FeederAkm.findOne({ where: { mahasiswaId: mhs.id, periode }, transaction });
      if (existing) {
        await existing.update(values, { transaction });
        updated += 1;
      } else {
        // Semester 1 belum ada nilai → IPS/IPK 0 (dihitung ulang lewat Feeder > AKM > Generate dari Nilai).
        await FeederAkm.create({ mahasiswaId: mhs.id, periode, ips: 0, ipk: 0, ...values, createdBy: actorId }, { transaction });
        created += 1;
      }
    }
    await Mahasiswa.update({ isActive: true, updatedBy: actorId }, { where: { id: { [Op.in]: ids } }, transaction });
  });
  return { created, updated, periode };
};

module.exports = { listMahasiswaBaru, listKelas, setKelas, generateKrs, generateTagihan, generateStatusAktif };
