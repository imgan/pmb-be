const { Op } = require('sequelize');
const { sequelize, Krs, KrsDetail, Mahasiswa, TahunAjaran, JadwalKuliah, Dosen, MataKuliah, Jurusan } = require('../models');
const ApiError = require('../utils/ApiError');
const { padananTahunAjaran } = require('./tahunModul.service');
const { assertJadwalSesuaiProdi } = require('../utils/prodiJadwal');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { assertSksQuota, getIpSemesterSebelumnya, maxSksForSemester } = require('../utils/sksQuota');
const { assertNoConflict } = require('../utils/krsConflict');

const detailInclude = {
  model: KrsDetail,
  as: 'detailList',
  include: [
    {
      model: JadwalKuliah,
      as: 'kelasKuliah',
      include: [
        { model: Dosen, as: 'dosenKordinator' },
        { model: MataKuliah, as: 'mataKuliah' },
      ],
    },
  ],
};

const includeRelations = [
  { model: Mahasiswa, as: 'mahasiswa', include: [{ model: Jurusan, as: 'jurusan' }] },
  { model: TahunAjaran, as: 'tahunAjaran' },
  detailInclude,
];

const withTotalSks = (krs) => {
  const json = krs.toJSON ? krs.toJSON() : krs;
  const totalSks = (json.detailList ?? []).reduce((sum, d) => sum + (d.kelasKuliah?.sks ?? 0), 0);
  return { ...json, totalSks };
};

/**
 * Filter "Belum Isi KRS": mahasiswa yang pada periode tsb (default periode Tahun FRS aktif) tidak punya KRS atau hanya punya
 * Draft tanpa mata kuliah. Sama dengan dasar grafik AKM dashboard: yang sudah keluar & angkatan setelah periode tsb
 * tidak dihitung. Baris tanpa KRS memakai id negatif (-mahasiswaId) sebagai kunci tabel & status BELUM_ISI.
 */
const tahunAjaranBelumIsi = (query) => (query.tahunAjaranId ? TahunAjaran.findByPk(query.tahunAjaranId) : padananTahunAjaran('frs'));

const listBelumIsiKrs = async (query, mahasiswaWhere, gabungan = null) => {
  const pagination = getPagination(query);
  const { page, limit, offset } = gabungan ?? pagination;
  const tahunAjaran = await tahunAjaranBelumIsi(query);
  if (!tahunAjaran) throw new ApiError(404, 'Tahun ajaran tidak ditemukan');
  // Gabungan dengan daftar KRS: Draft kosong sudah tampil sebagai baris KRS, jadi hanya yang benar-benar tanpa KRS.
  const belumIsi = sequelize.literal(
    'NOT EXISTS (SELECT 1 FROM krs k WHERE k.mahasiswa_id = Mahasiswa.id AND k.tahun_ajaran_id = ' +
      Number(tahunAjaran.id) +
      (gabungan ? ')' : " AND (k.status <> 'DRAFT' OR EXISTS (SELECT 1 FROM krs_detail d WHERE d.krs_id = k.id)))")
  );
  const kata = query.search || query.namaMahasiswa || query.nim;
  const { rows, count } = await Mahasiswa.findAndCountAll({
    where: {
      ...mahasiswaWhere,
      ...(query.tahunMasuk ? {} : { tahunMasuk: { [Op.lte]: tahunAjaran.tahunMulai } }),
      ...(query.statusData ? {} : { statusKeluar: null }),
      ...(kata ? { [Op.or]: [{ nim: { [Op.like]: `%${kata}%` } }, { namaLengkap: { [Op.like]: `%${kata}%` } }] } : {}),
      [Op.and]: [...(mahasiswaWhere[Op.and] ?? []), belumIsi],
    },
    attributes: ['id', 'nim', 'namaLengkap'],
    limit,
    offset,
    order: [['nim', 'ASC']],
  });
  const draft = await Krs.findAll({ where: { tahunAjaranId: tahunAjaran.id, mahasiswaId: rows.map((m) => m.id), status: 'DRAFT' }, attributes: ['id', 'mahasiswaId', 'semester'], raw: true });
  const draftBy = new Map(draft.map((d) => [d.mahasiswaId, d]));
  const data = rows.map((m) => {
    const d = draftBy.get(m.id);
    return {
      id: d?.id ?? -m.id,
      mahasiswaId: m.id,
      mahasiswa: m.toJSON(),
      semester: d?.semester ?? null,
      tahunAjaranId: tahunAjaran.id,
      tahunAjaran: tahunAjaran.toJSON(),
      totalSks: 0,
      detailList: [],
      status: d ? 'DRAFT' : 'BELUM_ISI',
    };
  });
  return { data, count, meta: getPagingMeta(count, page ?? pagination.page, limit) };
};

const listKrs = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.mahasiswaId) where.mahasiswaId = query.mahasiswaId;
  if (query.tahunAjaranId) where.tahunAjaranId = query.tahunAjaranId;
  if (query.semester) where.semester = query.semester;
  // BELUM_DISETUJUI = semua status selain Disetujui (Draft/Diajukan/Ditolak).
  if (query.status === 'BELUM_DISETUJUI') where.status = { [Op.ne]: 'DISETUJUI' };
  else if (query.status && query.status !== 'BELUM_ISI') where.status = query.status;

  // Filter data mahasiswa (panel filter KRS BAAK/Prodi). jurusanId diisi prodiScope untuk /prodi/krs;
  // kodeProdi (Unit Kerja) mencakup semua golongan kelas prodi tsb.
  const mahasiswaWhere = {};
  if (query.jurusanId) mahasiswaWhere.jurusanId = query.jurusanId;
  if (query.kodeProdi) {
    const ids = (await Jurusan.findAll({ where: { kodeProdi: query.kodeProdi }, attributes: ['id'] })).map((j) => j.id);
    mahasiswaWhere.jurusanId = query.jurusanId ? { [Op.and]: [{ [Op.in]: [].concat(query.jurusanId) }, { [Op.in]: ids }] } : ids;
  }
  if (query.statusPa === 'ADA') mahasiswaWhere.pembimbingAkademikId = { [Op.ne]: null };
  if (query.statusPa === 'BELUM') mahasiswaWhere.pembimbingAkademikId = null;
  if (query.tahunMasuk) mahasiswaWhere.tahunMasuk = query.tahunMasuk;
  if (query.golonganKelasId) mahasiswaWhere.golonganKelasId = query.golonganKelasId;
  if (query.statusData === 'AKTIF') Object.assign(mahasiswaWhere, { isActive: true, statusKeluar: null });
  if (query.statusData === 'CUTI') mahasiswaWhere.statusKeluar = 'CUTI';
  if (query.statusData === 'TIDAK_AKTIF') {
    // Op.and (bukan Op.or langsung) supaya tidak bertabrakan dengan Op.or pencarian di bawah.
    mahasiswaWhere[Op.and] = [{ [Op.or]: [{ isActive: false }, { statusKeluar: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: 'CUTI' }] } }] }];
  }

  if (query.status === 'BELUM_ISI') {
    const { data, meta } = await listBelumIsiKrs(query, mahasiswaWhere);
    return { data, meta };
  }

  // Pencarian NIM/nama mahasiswa (dipakai halaman Monitoring FRS & filter tabel KRS) butuh
  // JOIN wajib (required: true) ke Mahasiswa supaya where-clause di include benar-benar
  // memfilter, beda dari includeRelations default yang LEFT JOIN.
  const filterMahasiswa = Object.keys(mahasiswaWhere).length || Object.getOwnPropertySymbols(mahasiswaWhere).length;
  const include = query.nim || query.namaMahasiswa || query.search || filterMahasiswa
    ? includeRelations.map((rel) =>
        rel.as === 'mahasiswa'
          ? {
              ...rel,
              required: true,
              where: {
                ...mahasiswaWhere,
                ...(query.nim ? { nim: { [Op.like]: `%${query.nim}%` } } : {}),
                ...(query.namaMahasiswa ? { namaLengkap: { [Op.like]: `%${query.namaMahasiswa}%` } } : {}),
                ...(query.search
                  ? {
                      [Op.or]: [
                        { nim: { [Op.like]: `%${query.search}%` } },
                        { namaLengkap: { [Op.like]: `%${query.search}%` } },
                      ],
                    }
                  : {}),
              },
            }
          : rel
      )
    : includeRelations;

  const { rows, count } = await Krs.findAndCountAll({
    where,
    include,
    limit,
    offset,
    order: [['id', 'DESC']],
    distinct: true,
  });

  const data = rows.map(withTotalSks);

  // Panel filter KRS, Semua Status: mahasiswa tanpa KRS pada periode terpilih (default periode Tahun FRS aktif) ikut tampil setelah
  // baris KRS. Filter semester dilewati karena mahasiswa tanpa KRS belum punya semester.
  const sertakanBelumIsi = query.sertakanBelumIsi === 'true' && !query.status && !query.semester && !query.mahasiswaId;
  if (sertakanBelumIsi && (await tahunAjaranBelumIsi(query))) {
    const sisa = limit - data.length;
    const belumIsi = await listBelumIsiKrs(query, mahasiswaWhere, { page, limit: sisa, offset: Math.max(0, offset - count) });
    return { data: [...data, ...belumIsi.data], meta: getPagingMeta(count + belumIsi.count, page, limit) };
  }

  return { data, meta: getPagingMeta(count, page, limit) };
};

const getKuotaSks = async (mahasiswaId, semester) => {
  const ip = await getIpSemesterSebelumnya(mahasiswaId, semester);
  return { ipSemesterSebelumnya: ip, maxSks: maxSksForSemester(semester) };
};

const getKrsById = async (id) => {
  const krs = await Krs.findByPk(id, { include: includeRelations });
  if (!krs) throw new ApiError(404, 'KRS not found');
  return withTotalSks(krs);
};

const setDetails = async (krsId, jadwalKuliahIds) => {
  await KrsDetail.destroy({ where: { krsId } });
  if (jadwalKuliahIds.length) {
    await KrsDetail.bulkCreate(jadwalKuliahIds.map((jadwalKuliahId) => ({ krsId, jadwalKuliahId })));
  }
};

const createKrs = async (payload, actorId) => {
  const { jadwalKuliahIds = [], ...rest } = payload;

  // Satu mahasiswa = satu KRS per periode: bila sudah ada (mis. menambah mata kuliah mengulang dari semester lain),
  // kelasnya digabung ke KRS tsb, semester memakai yang terbesar, dan status Disetujui tidak turun.
  const existing = await Krs.findOne({
    where: { mahasiswaId: rest.mahasiswaId, tahunAjaranId: rest.tahunAjaranId },
    include: [{ model: KrsDetail, as: 'detailList', attributes: ['jadwalKuliahId'] }],
  });
  if (existing) {
    const lama = existing.detailList.map((d) => d.jadwalKuliahId);
    const baru = jadwalKuliahIds.map(Number).filter((id) => !lama.includes(id));
    const semester = Math.max(existing.semester, Number(rest.semester));
    await assertNoConflict([...lama, ...baru], rest.mahasiswaId);
    await assertJadwalSesuaiProdi(rest.mahasiswaId, baru);
    await assertSksQuota(rest.mahasiswaId, semester, [...lama, ...baru]);
    await existing.update({ semester, status: existing.status === 'DISETUJUI' ? existing.status : rest.status ?? existing.status, updatedBy: actorId });
    if (baru.length) await KrsDetail.bulkCreate(baru.map((jadwalKuliahId) => ({ krsId: existing.id, jadwalKuliahId })));
    return getKrsById(existing.id);
  }

  await assertNoConflict(jadwalKuliahIds, rest.mahasiswaId);
  await assertJadwalSesuaiProdi(rest.mahasiswaId, jadwalKuliahIds);
  await assertSksQuota(rest.mahasiswaId, rest.semester, jadwalKuliahIds);

  const krs = await Krs.create({ ...rest, createdBy: actorId, updatedBy: actorId });
  if (jadwalKuliahIds.length) {
    await setDetails(krs.id, jadwalKuliahIds);
  }
  return getKrsById(krs.id);
};

const updateKrs = async (id, payload, actorId) => {
  const krs = await Krs.findByPk(id);
  if (!krs) throw new ApiError(404, 'KRS not found');

  const { jadwalKuliahIds, ...rest } = payload;
  if (jadwalKuliahIds !== undefined) {
    await assertNoConflict(jadwalKuliahIds, krs.mahasiswaId);
    await assertJadwalSesuaiProdi(krs.mahasiswaId, jadwalKuliahIds);
    await assertSksQuota(krs.mahasiswaId, rest.semester ?? krs.semester, jadwalKuliahIds);
  }
  await krs.update({ ...rest, updatedBy: actorId });
  if (jadwalKuliahIds !== undefined) {
    await setDetails(id, jadwalKuliahIds);
  }
  return getKrsById(id);
};

const deleteKrs = async (id) => {
  const krs = await Krs.findByPk(id);
  if (!krs) throw new ApiError(404, 'KRS not found');
  await krs.destroy();
};

/**
 * Persetujuan massal oleh BAAK (hak prerogatif): KRS berstatus Diajukan, Draft, atau Ditolak
 * langsung disetujui. KRS yang sudah disetujui atau belum berisi mata kuliah dilewati.
 */
const setujuiMassal = async (ids, actorId) => {
  const list = await Krs.findAll({ where: { id: { [Op.in]: ids } }, include: [{ model: KrsDetail, as: 'detailList', attributes: ['id'] }] });
  const byId = new Map(list.map((k) => [k.id, k]));
  const dilewati = [];
  const disetujui = [];
  ids.forEach((id) => {
    const krs = byId.get(id);
    if (!krs) dilewati.push({ id, alasan: 'KRS tidak ditemukan' });
    else if (krs.status === 'DISETUJUI') dilewati.push({ id, alasan: 'Sudah disetujui' });
    else if (!krs.detailList?.length) dilewati.push({ id, alasan: 'KRS belum berisi mata kuliah' });
    else disetujui.push(id);
  });
  if (disetujui.length) await Krs.update({ status: 'DISETUJUI', updatedBy: actorId }, { where: { id: { [Op.in]: disetujui } } });
  return { disetujui: disetujui.length, dilewati };
};

module.exports = { listKrs, getKrsById, getKuotaSks, createKrs, updateKrs, deleteKrs, setujuiMassal };
