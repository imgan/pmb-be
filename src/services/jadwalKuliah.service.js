const { Op } = require('sequelize');
const { JadwalKuliah, JadwalKuliahDosenPengampu, Dosen, TahunAjaran, MataKuliah, Kurikulum, Jurusan, KrsDetail, sequelize } = require('../models');
const matakuliahAktifService = require('./matakuliahAktif.service');
const { jadwalIdsForProdi, kodeProdiMahasiswa } = require('../utils/prodiJadwal');
const ApiError = require('../utils/ApiError');
const { formatTahunAjaran } = require('../utils/tahunAjaran');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');
const { buildWorkbook, parseWorkbookFromBase64, cellString, cellBoolean } = require('../utils/excel');

const HARI_OPTIONS = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];

/**
 * `required: false` di-set eksplisit pada tiap include — beberapa belongsTo sekaligus tanpa
 * itu terbukti bisa membuat Sequelize men-default salah satunya jadi INNER JOIN, sehingga baris
 * dengan FK nullable yang kosong (mis. mataKuliahId belum diisi) hilang dari hasil query.
 */
const includeRelations = [
  { model: Dosen, as: 'dosenKordinator', required: false },
  { model: Dosen, as: 'dosenPengampu', through: { attributes: ['sks'] }, required: false },
  { model: TahunAjaran, as: 'tahunAjaran', required: false },
  {
    model: MataKuliah,
    as: 'mataKuliah',
    required: false,
    include: [
      {
        model: Kurikulum,
        as: 'kurikulum',
        attributes: ['id', 'nama', 'jurusanId', 'tahunKurikulum'],
        required: false,
        include: [{ model: Jurusan, as: 'jurusan', attributes: ['id', 'namaJurusan', 'kodeProdi'], required: false }],
      },
    ],
  },
];

/**
 * Jadwal kuliah menunjuk satu mata kuliah (mataKuliahId, milik satu kurikulum). Kolom kode/nama/SKS
 * di jadwal_kuliah tetap disimpan (laporan/ekspor lama) dan selalu disalin dari mata kuliahnya.
 * Saat jadwal dibuat atau mata kuliahnya diganti, mata kuliah wajib aktif (menu Matakuliah Aktif) pada
 * tahun akademik + semester jadwal ("Aktif Semester").
 */
const syncMataKuliah = async (payload, current = null) => {
  const ganti = payload.mataKuliahId !== undefined && payload.mataKuliahId !== (current?.mataKuliahId ?? null);
  if (!payload.mataKuliahId || (!ganti && current)) return payload;

  const tahunAjaranId = payload.tahunAjaranId !== undefined ? payload.tahunAjaranId : current?.tahunAjaranId;
  const semester = payload.semester !== undefined ? payload.semester : current?.semester;
  const mk = await matakuliahAktifService.assertAktif(payload.mataKuliahId, tahunAjaranId, semester ?? null);
  if (!mk) throw new ApiError(400, 'Mata kuliah tidak ditemukan');
  return {
    ...payload,
    mataKuliahId: mk.id,
    kodeMataKuliah: mk.kode,
    namaMataKuliah: mk.mataKuliah,
    sks: mk.sksTotal,
    sksTeori: mk.sksTeori,
    sksPraktik: mk.sksPraktek,
    sksLab: mk.sksLab,
    semester: semester ?? null,
  };
};

const SORTABLE_COLUMNS = {
  kelas: ['kelas'],
  kodeMataKuliah: ['kodeMataKuliah'],
  namaMataKuliah: ['namaMataKuliah'],
  jam: ['jam'],
  ruangan: ['ruangan'],
  dosenKordinator: [{ model: Dosen, as: 'dosenKordinator' }, 'namaLengkap'],
  status: ['isActive'],
};

const listJadwalKuliah = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.search) {
    where[Op.or] = [
      { kelas: { [Op.like]: `%${query.search}%` } },
      { kodeMataKuliah: { [Op.like]: `%${query.search}%` } },
      { namaMataKuliah: { [Op.like]: `%${query.search}%` } },
    ];
  }
  if (query.isActive !== undefined) {
    where.isActive = query.isActive === 'true' || query.isActive === true;
  }
  if (query.kelas) {
    where.kelas = query.kelas;
  }
  if (query.tahunAjaranId) {
    where.tahunAjaranId = query.tahunAjaranId;
  }
  // Pilihan kelas untuk KRS seorang mahasiswa: hanya kelas dari prodinya.
  if (query.mahasiswaId) {
    const ids = await jadwalIdsForProdi(await kodeProdiMahasiswa(Number(query.mahasiswaId)));
    where.id = ids.length ? ids : [0];
  }
  // Filter prodi (Master Monitoring BAAK); digabung (irisan) dengan filter mahasiswaId bila ada.
  if (query.kodeProdi) {
    const ids = await jadwalIdsForProdi(query.kodeProdi);
    const irisan = Array.isArray(where.id) ? where.id.filter((id) => ids.includes(id)) : ids;
    where.id = irisan.length ? irisan : [0];
  }
  if (query.semester) {
    // Banyak jadwal kuliah lama belum ditandai semester-nya (kolom nullable, sering kosong
    // di data existing) — kalau di-strict-match, mahasiswa/BAAK jadi tidak bisa memilih kelas
    // yang sebenarnya valid hanya karena belum ditag. Jadi ikutkan juga yang belum ditag.
    where.semester = { [Op.or]: [{ [Op.eq]: query.semester }, { [Op.is]: null }] };
  }

  const { rows, count } = await JadwalKuliah.findAndCountAll({
    where,
    include: includeRelations,
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS, [['kelas', 'ASC']]),
    subQuery: false,
    distinct: true,
  });
  // withJumlahMahasiswa=true (Master Monitoring BAAK): jumlah mahasiswa yang mengambil kelas di KRS.
  if (query.withJumlahMahasiswa === 'true' && rows.length) {
    const counts = await KrsDetail.findAll({
      attributes: ['jadwalKuliahId', [sequelize.fn('COUNT', sequelize.col('id')), 'jumlah']],
      where: { jadwalKuliahId: rows.map((r) => r.id) },
      group: ['jadwalKuliahId'],
      raw: true,
    });
    const jumlahBy = new Map(counts.map((c) => [c.jadwalKuliahId, Number(c.jumlah)]));
    return {
      data: rows.map((r) => ({ ...r.toJSON(), jumlahMahasiswa: jumlahBy.get(r.id) ?? 0 })),
      meta: getPagingMeta(count, page, limit),
    };
  }
  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

const getKelasOptions = async () => {
  const rows = await JadwalKuliah.findAll({
    attributes: ['kelas'],
    group: ['kelas'],
    order: [['kelas', 'ASC']],
    raw: true,
  });
  return rows.map((row) => row.kelas);
};

const getJadwalKuliahById = async (id) => {
  const jadwal = await JadwalKuliah.findByPk(id, { include: includeRelations });
  if (!jadwal) throw new ApiError(404, 'Jadwal kuliah not found');
  return jadwal;
};

const HARI_LABEL = { SENIN: 'Senin', SELASA: 'Selasa', RABU: 'Rabu', KAMIS: 'Kamis', JUMAT: 'Jumat', SABTU: 'Sabtu' };
const normalizeRuangan = (ruangan) => (ruangan ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
// '&' dianggap 'dan' (mis. "Pancasila & Kewarganegaraan" = "Pancasila dan Kewarganegaraan").
const normalizeNama = (nama) => (nama ?? '').replace(/&/g, ' dan ').trim().replace(/\s+/g, ' ').toLowerCase();
// Ruang "virtual" (online / project) bukan ruangan fisik — tidak dicek bentrok ruangan.
const isRuangVirtual = (key) => !key || /^(online|project|daring)\b/.test(key);

/**
 * Tolak jadwal yang bentrok dengan jadwal aktif lain di tahun ajaran yang sama: dianggap
 * bentrok bila ada hari yang sama DAN jam ke- yang sama, lalu memakai ruangan yang sama atau
 * dosen yang sama (dosen kordinator maupun pengampu, di kedua sisi). Jadwal nonaktif / tanpa
 * hari / tanpa jam tidak dicek karena belum menempati slot waktu.
 *
 * Kelas gabungan: jadwal lain di slot yang sama dengan NAMA mata kuliah yang sama (kode boleh beda
 * antar prodi, mis. "Pendidikan Agama" MKDU01 & MK101) dianggap satu kelas gabungan — dosen &
 * ruangannya boleh sama. Ruang Online/Project tidak dicek bentrok ruangan.
 */
const assertTidakBentrok = async ({ id, tahunAjaranId, hari, jam, ruangan, isActive, dosenIds, namaMataKuliah }) => {
  if (isActive === false || !hari?.length || jam === null || jam === undefined) return;

  const others = await JadwalKuliah.findAll({
    where: {
      isActive: true,
      jam,
      tahunAjaranId: tahunAjaranId ?? null,
      ...(id ? { id: { [Op.ne]: id } } : {}),
    },
    // Pengampu lewat unscoped Dosen: dosen yang sudah di-soft-delete tetap ikut dicek (masih terpasang di jadwal).
    include: [{ model: Dosen.unscoped(), as: 'dosenPengampu', attributes: ['id'], through: { attributes: [] }, required: false }],
  });

  const ruanganKey = normalizeRuangan(ruangan);
  const namaKey = normalizeNama(namaMataKuliah);
  const dosenSet = new Set(dosenIds.filter(Boolean).map(Number));
  const conflicts = [];

  others.forEach((other) => {
    const hariSama = (other.hari ?? []).filter((h) => hari.includes(h));
    if (!hariSama.length) return;
    if (namaKey && normalizeNama(other.namaMataKuliah) === namaKey) return; // kelas gabungan
    const slot = `${hariSama.map((h) => HARI_LABEL[h] ?? h).join(', ')} jam ke-${jam}`;
    const kelas = `kelas ${other.kelas} (${other.kodeMataKuliah} ${other.namaMataKuliah})`;

    if (!isRuangVirtual(ruanganKey) && normalizeRuangan(other.ruangan) === ruanganKey) {
      conflicts.push({ text: `Ruangan ${other.ruangan} sudah dipakai ${kelas} pada ${slot}.` });
    }
    const dosenLain = new Set([other.dosenKordinatorId, ...(other.dosenPengampu ?? []).map((d) => d.id)]);
    [...dosenLain].filter((dosenId) => dosenSet.has(dosenId)).forEach((dosenId) => conflicts.push({ dosenId, kelas, slot }));
  });
  if (!conflicts.length) return;

  const dosenIdsBentrok = [...new Set(conflicts.filter((c) => c.dosenId).map((c) => c.dosenId))];
  const namaDosen = new Map(
    (await Dosen.unscoped().findAll({ where: { id: dosenIdsBentrok }, attributes: ['id', 'namaLengkap'] })).map((d) => [d.id, d.namaLengkap])
  );
  const messages = conflicts.map((c) =>
    c.text ?? `Dosen ${namaDosen.get(c.dosenId) ?? `#${c.dosenId}`} sudah mengajar ${c.kelas} pada ${c.slot}.`
  );

  if (messages.length) throw new ApiError(409, `Jadwal bentrok: ${messages.join(' ')}`);
};

/**
 * Dosen pengampu bisa dikirim sebagai `dosenPengampu` ([{ dosenId, sks }], SKS per dosen) atau
 * `dosenPengampuIds` (format lama, tanpa SKS). Hasilnya undefined kalau keduanya tidak dikirim.
 */
const normalizePengampu = ({ dosenPengampu, dosenPengampuIds, ...rest }) => {
  let pengampu;
  if (dosenPengampu !== undefined) pengampu = dosenPengampu.map((p) => ({ dosenId: p.dosenId, sks: p.sks ?? null }));
  else if (dosenPengampuIds !== undefined) pengampu = dosenPengampuIds.map((dosenId) => ({ dosenId, sks: null }));
  return { pengampu, rest };
};

const savePengampu = async (jadwalKuliahId, pengampu) => {
  await JadwalKuliahDosenPengampu.destroy({ where: { jadwalKuliahId } });
  if (pengampu.length) {
    await JadwalKuliahDosenPengampu.bulkCreate(pengampu.map((p) => ({ jadwalKuliahId, dosenId: p.dosenId, sks: p.sks })));
  }
};

const createJadwalKuliah = async (payload, actorId) => {
  const { pengampu = [], rest } = normalizePengampu(await syncMataKuliah(payload));
  const dosenPengampuIds = pengampu.map((p) => p.dosenId);
  if (rest.sksTeori === undefined) rest.sksTeori = rest.sks ?? 0;
  await assertTidakBentrok({
    tahunAjaranId: rest.tahunAjaranId,
    hari: rest.hari,
    jam: rest.jam,
    ruangan: rest.ruangan,
    isActive: rest.isActive,
    dosenIds: [rest.dosenKordinatorId, ...dosenPengampuIds],
    namaMataKuliah: rest.namaMataKuliah,
  });
  const jadwal = await JadwalKuliah.create({ ...rest, createdBy: actorId, updatedBy: actorId });
  await savePengampu(jadwal.id, pengampu);
  return getJadwalKuliahById(jadwal.id);
};

const updateJadwalKuliah = async (id, payload, actorId) => {
  const jadwal = await getJadwalKuliahById(id);
  const { pengampu, rest } = normalizePengampu(await syncMataKuliah(payload, jadwal));
  const dosenPengampuIds = pengampu?.map((p) => p.dosenId);
  // Field yang tidak dikirim memakai nilai tersimpan, supaya pengecekan bentrok memakai jadwal hasil akhirnya.
  const pick = (key) => (rest[key] !== undefined ? rest[key] : jadwal[key]);
  await assertTidakBentrok({
    id: jadwal.id,
    tahunAjaranId: pick('tahunAjaranId'),
    hari: pick('hari'),
    jam: pick('jam'),
    ruangan: pick('ruangan'),
    isActive: pick('isActive'),
    dosenIds: [pick('dosenKordinatorId'), ...(dosenPengampuIds ?? (jadwal.dosenPengampu ?? []).map((d) => d.id))],
    namaMataKuliah: pick('namaMataKuliah'),
  });
  await jadwal.update({ ...rest, updatedBy: actorId });
  if (pengampu !== undefined) {
    await savePengampu(jadwal.id, pengampu);
  }
  return getJadwalKuliahById(id);
};

const deleteJadwalKuliah = async (id) => {
  const jadwal = await getJadwalKuliahById(id);
  await jadwal.destroy();
};

const EXPORT_COLUMNS = [
  { header: 'Kelas', key: 'kelas' },
  { header: 'Kode Mata Kuliah', key: 'kodeMataKuliah' },
  { header: 'Mata Kuliah', key: 'namaMataKuliah' },
  { header: 'SKS', key: 'sks' },
  { header: 'SKS Teori', key: 'sksTeori' },
  { header: 'SKS Praktik', key: 'sksPraktik' },
  { header: 'SKS Lab', key: 'sksLab' },
  { header: 'Dosen Kordinator (NIDN)', key: 'dosenKordinatorNidn' },
  { header: 'Dosen Pengampu (NIDN)', key: 'dosenPengampuNidn' },
  { header: 'Tahun Ajaran', key: 'tahunAjaran' },
  { header: 'Hari', key: 'hari' },
  { header: 'Jam', key: 'jam' },
  { header: 'Ruangan', key: 'ruangan' },
  { header: 'GCR', key: 'gcr' },
  { header: 'Status Aktif', key: 'statusAktif' },
];

const exportJadwalKuliah = async () => {
  const rows = await JadwalKuliah.findAll({ include: includeRelations, order: [['kelas', 'ASC']] });
  const data = rows.map((j) => ({
    kelas: j.kelas,
    kodeMataKuliah: j.kodeMataKuliah,
    namaMataKuliah: j.namaMataKuliah,
    sks: j.sks,
    sksTeori: j.sksTeori,
    sksPraktik: j.sksPraktik,
    sksLab: j.sksLab,
    dosenKordinatorNidn: j.dosenKordinator?.nidn ?? '',
    dosenPengampuNidn: (j.dosenPengampu ?? []).map((d) => d.nidn).join(', '),
    tahunAjaran: formatTahunAjaran(j.tahunAjaran) ?? '',
    hari: (j.hari ?? []).join(', '),
    jam: j.jam,
    ruangan: j.ruangan,
    gcr: j.gcr,
    statusAktif: j.isActive ? 'Ya' : 'Tidak',
  }));
  return buildWorkbook('Jadwal Kuliah', EXPORT_COLUMNS, data);
};

const exportJadwalKuliahTemplate = () => {
  const sample = {
    kelas: 'TI4AM',
    kodeMataKuliah: 'IF401',
    namaMataKuliah: 'Contoh Mata Kuliah',
    sks: 3,
    sksTeori: 2,
    sksPraktik: 1,
    sksLab: 0,
    dosenKordinatorNidn: 'NIDN dosen (sesuai master data)',
    dosenPengampuNidn: 'NIDN dosen, pisahkan koma (opsional)',
    tahunAjaran: '2026/2027 GANJIL (informasi saja, tidak diproses saat import)',
    hari: 'SENIN, RABU',
    jam: 1,
    ruangan: '4.01 A',
    gcr: '',
    statusAktif: 'Ya',
  };
  return buildWorkbook('Jadwal Kuliah', EXPORT_COLUMNS, [sample]);
};

/**
 * Import upsert berdasarkan kombinasi Kelas + Kode Mata Kuliah (tidak ada kunci bisnis
 * tunggal lain yang lebih natural untuk baris jadwal). Dosen Kordinator & Dosen Pengampu
 * dicocokkan lewat NIDN.
 */
const importJadwalKuliah = async (fileBase64, actorId) => {
  const rows = await parseWorkbookFromBase64(fileBase64);
  const errors = [];
  let successCount = 0;

  for (const { rowNumber, data } of rows) {
    const kelas = cellString(data['Kelas']);
    const kodeMataKuliah = cellString(data['Kode Mata Kuliah']);
    const namaMataKuliah = cellString(data['Mata Kuliah']);
    const dosenKordinatorNidn = cellString(data['Dosen Kordinator (NIDN)']);

    if (!kelas || !kodeMataKuliah || !namaMataKuliah || !dosenKordinatorNidn) {
      errors.push({
        row: rowNumber,
        message: 'Kelas, Kode Mata Kuliah, Mata Kuliah, dan Dosen Kordinator (NIDN) wajib diisi',
      });
      continue;
    }

    const dosenKordinator = await Dosen.findOne({ where: { nidn: dosenKordinatorNidn } });
    if (!dosenKordinator) {
      errors.push({ row: rowNumber, message: `Dosen dengan NIDN "${dosenKordinatorNidn}" tidak ditemukan` });
      continue;
    }

    const pengampuNidns = cellString(data['Dosen Pengampu (NIDN)'])
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const pengampuDosen = pengampuNidns.length
      ? await Dosen.findAll({ where: { nidn: { [Op.in]: pengampuNidns } } })
      : [];

    const hariRaw = cellString(data['Hari'])
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter((h) => HARI_OPTIONS.includes(h));

    const sks = Number(data['SKS']) || null;
    const jamRaw = data['Jam'];
    const jam = jamRaw !== undefined && jamRaw !== null && jamRaw !== '' ? Number(jamRaw) : null;

    const payload = {
      kelas,
      kodeMataKuliah,
      namaMataKuliah,
      sks,
      sksTeori: Number(data['SKS Teori']) || 0,
      sksPraktik: Number(data['SKS Praktik']) || 0,
      sksLab: Number(data['SKS Lab']) || 0,
      dosenKordinatorId: dosenKordinator.id,
      hari: hariRaw.length ? hariRaw : null,
      jam,
      ruangan: cellString(data['Ruangan']) || null,
      gcr: cellString(data['GCR']) || null,
      isActive: cellBoolean(data['Status Aktif'], true),
      updatedBy: actorId,
    };

    try {
      let jadwal = await JadwalKuliah.findOne({ where: { kelas, kodeMataKuliah } });
      await assertTidakBentrok({
        id: jadwal?.id,
        tahunAjaranId: jadwal?.tahunAjaranId ?? null,
        hari: payload.hari,
        jam: payload.jam,
        ruangan: payload.ruangan,
        isActive: payload.isActive,
        dosenIds: [payload.dosenKordinatorId, ...pengampuDosen.map((d) => d.id)],
        namaMataKuliah: payload.namaMataKuliah,
      });
      if (jadwal) {
        await jadwal.update(payload);
      } else {
        jadwal = await JadwalKuliah.create({ ...payload, createdBy: actorId });
      }
      await jadwal.setDosenPengampu(pengampuDosen.map((d) => d.id));
      successCount += 1;
    } catch (err) {
      errors.push({ row: rowNumber, message: err.message });
    }
  }

  return { successCount, errorCount: errors.length, errors };
};

module.exports = {
  listJadwalKuliah,
  getKelasOptions,
  getJadwalKuliahById,
  createJadwalKuliah,
  updateJadwalKuliah,
  deleteJadwalKuliah,
  exportJadwalKuliah,
  exportJadwalKuliahTemplate,
  importJadwalKuliah,
};
