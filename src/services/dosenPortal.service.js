const { Op } = require('sequelize');
const {
  JadwalKuliah,
  KehadiranDosen,
  KehadiranMahasiswa,
  MataKuliah,
  KrsDetail,
  Krs,
  Mahasiswa,
  Dosen,
  Kurikulum,
  Jurusan,
  TahunAjaran,
  GolonganKelas,
} = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');
const { formatTahunAjaran } = require('../utils/tahunAjaran');

// Semua query di service ini WAJIB discope ke dosenId milik dosen yang sedang login
// (req.dosen.id, diisi oleh dosenAuth.middleware.js) — dosen tidak boleh melihat/mengubah
// data dosen lain, dan itu tidak boleh cuma mengandalkan parameter dari client.

/**
 * JadwalKuliah yang diampu dosen: sebagai dosenKordinator ATAU sebagai salah satu dosenPengampu.
 */
const findJadwalKuliahIdsForDosen = async (dosenId, tahunAjaranId = null) => {
  const rows = await JadwalKuliah.findAll({
    attributes: ['id'],
    where: {
      [Op.or]: [{ dosenKordinatorId: dosenId }, { '$dosenPengampu.id$': dosenId }],
      // tahunAjaranId = pilihan Setting Tahun Akademik dosen; cek kepemilikan selalu tanpa filter ini.
      ...(tahunAjaranId ? { tahunAjaranId } : {}),
    },
    include: [{ model: Dosen, as: 'dosenPengampu', attributes: [], through: { attributes: [] }, required: false }],
    subQuery: false,
  });
  return [...new Set(rows.map((r) => r.id))];
};

const listJadwalKuliahForDosen = async (dosenId, tahunAjaranId = null) => {
  const ids = await findJadwalKuliahIdsForDosen(dosenId, tahunAjaranId);
  if (!ids.length) return [];
  return JadwalKuliah.findAll({
    where: { id: ids },
    include: [{ model: MataKuliah, as: 'mataKuliah' }],
    order: [['namaMataKuliah', 'ASC']],
  });
};

const ensureJadwalOwnedByDosen = async (jadwalKuliahId, dosenId) => {
  const ids = await findJadwalKuliahIdsForDosen(dosenId);
  if (!ids.includes(Number(jadwalKuliahId))) {
    throw new ApiError(403, 'Anda tidak mengampu jadwal kuliah ini');
  }
};

const SORTABLE_COLUMNS = {
  tanggalRealisasi: ['tanggalRealisasi'],
  status: ['status'],
};

const listRealisasiMengajar = async (dosenId, query, tahunAjaranId = null) => {
  const { page, limit, offset } = getPagination(query);
  const jadwalIds = await findJadwalKuliahIdsForDosen(dosenId, tahunAjaranId);

  const where = { dosenId };
  if (query.jadwalKuliahId) {
    await ensureJadwalOwnedByDosen(query.jadwalKuliahId, dosenId);
    where.jadwalKuliahId = query.jadwalKuliahId;
  } else {
    where.jadwalKuliahId = jadwalIds.length ? jadwalIds : [0];
  }

  const { rows, count } = await KehadiranDosen.findAndCountAll({
    where,
    include: [
      { model: JadwalKuliah, as: 'jadwalKuliah', include: [{ model: MataKuliah, as: 'mataKuliah' }] },
      { model: Dosen, as: 'dosen', attributes: ['id', 'namaLengkap', 'gelar'], required: false },
    ],
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS, [['tanggalRealisasi', 'DESC'], ['id', 'DESC']]),
    subQuery: false,
    distinct: true,
  });

  // Jumlah mahasiswa hadir per pertemuan (presensi HADIR yang diisi dosen / presensi mandiri).
  const hadirRows = rows.length
    ? await KehadiranMahasiswa.findAll({
        attributes: ['kehadiranDosenId', [KehadiranMahasiswa.sequelize.fn('COUNT', KehadiranMahasiswa.sequelize.col('id')), 'total']],
        where: { kehadiranDosenId: rows.map((r) => r.id), status: 'HADIR' },
        group: ['kehadiranDosenId'],
        raw: true,
      })
    : [];
  const hadirMap = new Map(hadirRows.map((r) => [r.kehadiranDosenId, Number(r.total)]));
  const data = rows.map((r) => ({ ...r.toJSON(), jumlahHadir: hadirMap.get(r.id) ?? 0 }));

  return { data, meta: getPagingMeta(count, page, limit) };
};

const RENCANA_TATAP_MUKA = 16;

/**
 * Ringkasan kelas untuk kepala halaman Realisasi Mengajar (seperti "List Pertemuan" sistem lama):
 * prodi, periode, mata kuliah + SKS, kelas, rencana tatap muka, jumlah mahasiswa (KRS disetujui),
 * tanggal efektif kurikulum, dan jumlah pertemuan yang sudah direalisasikan.
 */
const getRingkasanKelas = async (dosenId, jadwalKuliahId) => {
  await ensureJadwalOwnedByDosen(jadwalKuliahId, dosenId);
  const jadwal = await JadwalKuliah.findByPk(jadwalKuliahId, {
    include: [
      { model: TahunAjaran, as: 'tahunAjaran', required: false },
      {
        model: MataKuliah,
        as: 'mataKuliah',
        required: false,
        include: [
          {
            model: Kurikulum,
            as: 'kurikulum',
            required: false,
            include: [{ model: Jurusan, as: 'jurusan', attributes: ['id', 'namaJurusan'], required: false }],
          },
        ],
      },
      { model: Dosen, as: 'dosenKordinator', attributes: ['id', 'namaLengkap', 'gelar'], required: false },
    ],
  });
  const [jumlahMahasiswa, jumlahPertemuan] = await Promise.all([
    KrsDetail.count({
      where: { jadwalKuliahId },
      include: [{ model: Krs, as: 'krs', required: true, where: { status: 'DISETUJUI' } }],
    }),
    KehadiranDosen.count({ where: { jadwalKuliahId, isDelete: false } }),
  ]);
  const ta = jadwal.tahunAjaran;
  const mk = jadwal.mataKuliah;
  const k = mk?.kurikulum;
  return {
    jadwalKuliahId: jadwal.id,
    programStudi: k?.jurusan?.namaJurusan ?? null,
    periode: formatTahunAjaran(ta),
    kodeMataKuliah: jadwal.kodeMataKuliah,
    namaMataKuliah: jadwal.namaMataKuliah,
    sks: jadwal.sks,
    kelas: jadwal.kelas,
    semester: jadwal.semester,
    rencanaTatapMuka: RENCANA_TATAP_MUKA,
    jumlahPertemuan,
    jumlahMahasiswa,
    tanggalMulaiEfektif: k?.tanggalMulaiEfektif ?? null,
    tanggalAkhirEfektif: k?.tanggalAkhirEfektif ?? null,
    metodePembelajaran: mk?.metodePembelajaran ?? null,
    ruangan: jadwal.ruangan,
    dosenKordinator: jadwal.dosenKordinator ? [jadwal.dosenKordinator.namaLengkap, jadwal.dosenKordinator.gelar].filter(Boolean).join(', ') : null,
  };
};

const createRealisasiMengajar = async (dosenId, payload) => {
  await ensureJadwalOwnedByDosen(payload.jadwalKuliahId, dosenId);

  const item = await KehadiranDosen.create({
    jadwalKuliahId: payload.jadwalKuliahId,
    dosenId,
    tanggalRealisasi: payload.tanggalRealisasi,
    jamMasuk: payload.jamMasuk,
    jamKeluar: payload.jamKeluar,
    pertemuanKe: payload.pertemuanKe,
    status: payload.status,
    keterangan: payload.keterangan || null,
    uraian: payload.uraian || null,
    createdBy: null,
    updatedBy: null,
  });

  return findRealisasiWithJadwal(item.id);
};

const includeJadwalMataKuliah = [{ model: JadwalKuliah, as: 'jadwalKuliah', include: [{ model: MataKuliah, as: 'mataKuliah' }] }];
const findRealisasiWithJadwal = (id) => KehadiranDosen.findByPk(id, { include: includeJadwalMataKuliah });

const updateRealisasiMengajar = async (dosenId, id, payload) => {
  const item = await ensureRealisasiOwnedByDosen(id, dosenId);
  if (payload.jadwalKuliahId) await ensureJadwalOwnedByDosen(payload.jadwalKuliahId, dosenId);

  const fields = ['jadwalKuliahId', 'tanggalRealisasi', 'jamMasuk', 'jamKeluar', 'pertemuanKe', 'status', 'keterangan', 'uraian'];
  const values = {};
  fields.forEach((f) => {
    if (payload[f] !== undefined) values[f] = payload[f] === '' ? null : payload[f];
  });
  await item.update(values);
  return findRealisasiWithJadwal(id);
};

// ---- Start / stop kelas ----
// Waktu diambil dari jam server (bukan dari client) supaya jam masuk/keluar tidak bisa diatur
// mundur/maju oleh dosen.
const pad2 = (n) => String(n).padStart(2, '0');
const nowParts = () => {
  const d = new Date();
  return {
    tanggal: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
    jam: `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`,
  };
};

/** Kelas yang sedang berjalan: sudah di-start (jamMasuk ada) tapi belum di-stop (jamKeluar kosong). */
const getKelasAktif = async (dosenId) =>
  KehadiranDosen.findOne({
    where: { dosenId, jamMasuk: { [Op.ne]: null }, jamKeluar: null },
    include: includeJadwalMataKuliah,
    order: [['id', 'DESC']],
  });

const MAX_PERTEMUAN = 16;

const startKelas = async (dosenId, payload) => {
  await ensureJadwalOwnedByDosen(payload.jadwalKuliahId, dosenId);
  const aktif = await getKelasAktif(dosenId);
  if (aktif) {
    throw new ApiError(
      400,
      `Masih ada kelas yang berjalan (${aktif.jadwalKuliah?.namaMataKuliah ?? '-'}). Selesaikan kelas tersebut terlebih dahulu.`
    );
  }

  // Pertemuan otomatis = pertemuan terakhir pada jadwal ini + 1, kecuali dosen memilih sendiri.
  let { pertemuanKe } = payload;
  if (!pertemuanKe) {
    const last = await KehadiranDosen.max('pertemuanKe', { where: { jadwalKuliahId: payload.jadwalKuliahId, dosenId } });
    pertemuanKe = Math.min((last || 0) + 1, MAX_PERTEMUAN);
  }

  const { tanggal, jam } = nowParts();
  const item = await KehadiranDosen.create({
    jadwalKuliahId: payload.jadwalKuliahId,
    dosenId,
    tanggalRealisasi: tanggal,
    jamMasuk: jam,
    jamKeluar: null,
    pertemuanKe,
    status: 'HADIR',
    uraian: payload.uraian || null,
    // Rincian materi -> kolom "Rincian" di cetak Realisasi Dosen Mengajar.
    keterangan: payload.keterangan || null,
    createdBy: null,
    updatedBy: null,
  });
  return findRealisasiWithJadwal(item.id);
};

const stopKelas = async (dosenId, id, payload = {}) => {
  const item = await ensureRealisasiOwnedByDosen(id, dosenId);
  if (!item.jamMasuk) throw new ApiError(400, 'Kelas ini belum dimulai');
  if (item.jamKeluar) throw new ApiError(400, 'Kelas ini sudah diselesaikan');

  const values = { jamKeluar: nowParts().jam };
  if (payload.uraian !== undefined) values.uraian = payload.uraian || null;
  // Rincian pembahasan (kolom Rincian di cetak Realisasi Dosen Mengajar).
  if (payload.keterangan !== undefined) values.keterangan = payload.keterangan || null;
  await item.update(values);
  await tandaiAlpaBelumPresensi(item);
  return findRealisasiWithJadwal(id);
};

/**
 * Saat kelas diselesaikan, presensi mandiri ditutup: mahasiswa terdaftar (KRS DISETUJUI) yang
 * belum punya presensi pada pertemuan ini dicatat ALPA. Dosen masih bisa mengubahnya (mis. jadi
 * Izin/Sakit) lewat isian presensi.
 */
const tandaiAlpaBelumPresensi = async (realisasi) => {
  const [roster, existing] = await Promise.all([
    KrsDetail.findAll({
      where: { jadwalKuliahId: realisasi.jadwalKuliahId },
      include: [{ model: Krs, as: 'krs', required: true, where: { status: 'DISETUJUI' } }],
    }),
    KehadiranMahasiswa.findAll({ where: { kehadiranDosenId: realisasi.id }, attributes: ['mahasiswaId'] }),
  ]);
  const sudah = new Set(existing.map((e) => e.mahasiswaId));
  const alpa = [...new Set(roster.map((r) => r.krs.mahasiswaId))].filter((id) => !sudah.has(id));
  if (alpa.length) {
    await KehadiranMahasiswa.bulkCreate(
      alpa.map((mahasiswaId) => ({
        kehadiranDosenId: realisasi.id,
        mahasiswaId,
        status: 'ALPA',
        keterangan: 'Tidak presensi sampai kelas selesai',
        createdBy: null,
        updatedBy: null,
      }))
    );
  }
  return alpa.length;
};

const deleteRealisasiMengajar = async (dosenId, id) => {
  const item = await KehadiranDosen.findOne({ where: { id, dosenId } });
  if (!item) throw new ApiError(404, 'Realisasi mengajar not found');
  await item.update({ isDelete: true });
};

const ensureRealisasiOwnedByDosen = async (id, dosenId) => {
  const realisasi = await KehadiranDosen.findOne({ where: { id, dosenId } });
  if (!realisasi) throw new ApiError(404, 'Realisasi mengajar not found');
  return realisasi;
};

/**
 * Roster mahasiswa (KRS DISETUJUI) untuk jadwalKuliah dari satu realisasi mengajar,
 * digabung dengan presensi yang sudah pernah diisi dosen untuk realisasi tersebut (kalau ada).
 */
const getPresensiMahasiswa = async (dosenId, kehadiranDosenId) => {
  const realisasi = await ensureRealisasiOwnedByDosen(kehadiranDosenId, dosenId);

  const [roster, existing] = await Promise.all([
    KrsDetail.findAll({
      where: { jadwalKuliahId: realisasi.jadwalKuliahId },
      include: [
        {
          model: Krs,
          as: 'krs',
          required: true,
          where: { status: 'DISETUJUI' },
          include: [
            {
              model: Mahasiswa,
              as: 'mahasiswa',
              required: true,
              include: [{ model: GolonganKelas.unscoped(), as: 'golonganKelas', attributes: ['namaKelas'], required: false }],
            },
          ],
        },
      ],
      order: [[{ model: Krs, as: 'krs' }, { model: Mahasiswa, as: 'mahasiswa' }, 'namaLengkap', 'ASC']],
    }),
    KehadiranMahasiswa.findAll({ where: { kehadiranDosenId } }),
  ]);

  const existingByMahasiswaId = new Map(existing.map((e) => [e.mahasiswaId, e]));

  return roster.map((r) => {
    const mahasiswa = r.krs.mahasiswa;
    const presensi = existingByMahasiswaId.get(mahasiswa.id);
    return {
      mahasiswaId: mahasiswa.id,
      nim: mahasiswa.nim,
      namaLengkap: mahasiswa.namaLengkap,
      // Status kelas mahasiswa (Golongan Kelas): Reguler / Karyawan.
      sistemKuliah: mahasiswa.golonganKelas?.namaKelas ?? null,
      status: presensi?.status ?? null,
      keterangan: presensi?.keterangan ?? null,
    };
  });
};

/**
 * Simpan (upsert) presensi mahasiswa untuk satu realisasi mengajar. Hanya mahasiswa yang
 * benar-benar terdaftar (KRS DISETUJUI) pada jadwalKuliah realisasi ini yang boleh diisi —
 * dicek terhadap roster, tidak boleh cuma mengandalkan mahasiswaId dari client.
 */
const savePresensiMahasiswa = async (dosenId, kehadiranDosenId, items) => {
  const realisasi = await ensureRealisasiOwnedByDosen(kehadiranDosenId, dosenId);

  const rosterRows = await KrsDetail.findAll({
    where: { jadwalKuliahId: realisasi.jadwalKuliahId },
    include: [{ model: Krs, as: 'krs', required: true, where: { status: 'DISETUJUI' } }],
  });
  const rosterMahasiswaIds = new Set(rosterRows.map((r) => r.krs.mahasiswaId));

  const invalid = items.find((item) => !rosterMahasiswaIds.has(item.mahasiswaId));
  if (invalid) {
    throw new ApiError(400, `Mahasiswa id ${invalid.mahasiswaId} tidak terdaftar (KRS disetujui) pada kelas ini`);
  }

  await Promise.all(
    items.map(async (item) => {
      const [row] = await KehadiranMahasiswa.findOrCreate({
        where: { kehadiranDosenId, mahasiswaId: item.mahasiswaId },
        defaults: {
          status: item.status,
          keterangan: item.keterangan || null,
          createdBy: null,
          updatedBy: null,
        },
      });
      await row.update({ status: item.status, keterangan: item.keterangan || null, updatedBy: null });
    })
  );

  return getPresensiMahasiswa(dosenId, kehadiranDosenId);
};

const listRekapMahasiswa = async (dosenId, query) => {
  if (!query.jadwalKuliahId) throw new ApiError(400, 'jadwalKuliahId wajib diisi');
  await ensureJadwalOwnedByDosen(query.jadwalKuliahId, dosenId);

  const { page, limit, offset } = getPagination(query);
  const mahasiswaWhere = {};
  if (query.search) {
    mahasiswaWhere[Op.or] = [
      { nim: { [Op.like]: `%${query.search}%` } },
      { namaLengkap: { [Op.like]: `%${query.search}%` } },
    ];
  }

  const { rows, count } = await KrsDetail.findAndCountAll({
    where: { jadwalKuliahId: query.jadwalKuliahId },
    include: [
      {
        model: Krs,
        as: 'krs',
        required: true,
        include: [{ model: Mahasiswa, as: 'mahasiswa', required: true, where: mahasiswaWhere }],
      },
    ],
    limit,
    offset,
    order: [['id', 'ASC']],
    subQuery: false,
    distinct: true,
  });

  const data = rows.map((r) => ({
    id: r.id,
    nim: r.krs?.mahasiswa?.nim ?? null,
    namaLengkap: r.krs?.mahasiswa?.namaLengkap ?? null,
  }));

  return { data, meta: getPagingMeta(count, page, limit) };
};

const listSilabusMataKuliah = async (dosenId, tahunAjaranId = null) => {
  const jadwalList = await listJadwalKuliahForDosen(dosenId, tahunAjaranId);
  const byMataKuliahId = new Map();
  jadwalList.forEach((j) => {
    const mk = j.mataKuliah;
    const key = mk?.id ?? j.kodeMataKuliah;
    if (!byMataKuliahId.has(key)) {
      byMataKuliahId.set(key, {
        kodeMk: mk?.kodeMk ?? j.kodeMataKuliah,
        namaMk: mk?.namaMk ?? j.namaMataKuliah,
        sks: mk?.sks ?? j.sks ?? null,
        silabus: mk?.silabus ?? null,
      });
    }
  });
  return [...byMataKuliahId.values()];
};

module.exports = {
  listJadwalKuliahForDosen,
  listRealisasiMengajar,
  getRingkasanKelas,
  createRealisasiMengajar,
  deleteRealisasiMengajar,
  getPresensiMahasiswa,
  savePresensiMahasiswa,
  listRekapMahasiswa,
  listSilabusMataKuliah,
  updateRealisasiMengajar,
  getKelasAktif,
  startKelas,
  stopKelas,
};
