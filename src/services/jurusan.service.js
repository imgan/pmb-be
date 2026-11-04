const { Op } = require('sequelize');
const { sequelize, Jurusan, GolonganKelas } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');
const { buildWorkbook, parseWorkbookFromBase64, cellString } = require('../utils/excel');

const EXPORT_COLUMNS = [
  { header: 'Nama Jurusan', key: 'namaJurusan', width: 30 },
  { header: 'Kode Prodi', key: 'kodeProdi', width: 15 },
  { header: 'Golongan Kelas', key: 'golonganKelas', width: 20 },
  { header: 'Jenjang Pendidikan', key: 'jenjangPendidikan', width: 20 },
  { header: 'Fakultas', key: 'namaFakultas', width: 30 },
  { header: 'Gelar Singkat', key: 'gelarSingkat', width: 15 },
  { header: 'Gelar Lengkap', key: 'gelarLengkap', width: 30 },
  { header: 'Prospek Karir', key: 'prospekKarir', width: 40 },
];

const SORTABLE_COLUMNS = {
  namaJurusan: ['namaJurusan'],
  golonganKelas: [{ model: GolonganKelas, as: 'golonganKelas' }, 'namaKelas'],
};

const ensureGolonganKelasExists = async (golonganKelasId) => {
  const golonganKelas = await GolonganKelas.findByPk(golonganKelasId);
  if (!golonganKelas) throw new ApiError(400, 'Golongan kelas not found');
};

const listJurusan = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.search) {
    where.namaJurusan = { [Op.like]: `%${query.search}%` };
  }
  if (query.golonganKelasId) {
    where.golonganKelasId = query.golonganKelasId;
  }

  const { rows, count } = await Jurusan.findAndCountAll({
    where,
    include: [{ model: GolonganKelas, as: 'golonganKelas' }],
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS),
    subQuery: false,
    distinct: true,
  });

  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

const getJurusanById = async (id) => {
  const jurusan = await Jurusan.findByPk(id, { include: [{ model: GolonganKelas, as: 'golonganKelas' }] });
  if (!jurusan) throw new ApiError(404, 'Jurusan not found');
  return jurusan;
};

const createJurusan = async (payload, actorId) => {
  await ensureGolonganKelasExists(payload.golonganKelasId);
  const jurusan = await Jurusan.create({ ...payload, createdBy: actorId, updatedBy: actorId });
  return getJurusanById(jurusan.id);
};

const updateJurusan = async (id, payload, actorId) => {
  const jurusan = await Jurusan.findByPk(id);
  if (!jurusan) throw new ApiError(404, 'Jurusan not found');

  if (payload.golonganKelasId) {
    await ensureGolonganKelasExists(payload.golonganKelasId);
  }

  await jurusan.update({ ...payload, updatedBy: actorId });
  return getJurusanById(id);
};

/** Jumlah data per id jurusan di semua tabel yang punya kolom jurusan_id / jurusan1_id dst. (Map jurusanId -> jumlah). */
const hitungPemakaian = async (ids) => {
  const hasil = new Map();
  if (!ids.length) return hasil;
  const kolom = await sequelize.query(
    "SELECT TABLE_NAME AS t, COLUMN_NAME AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND COLUMN_NAME REGEXP '^jurusan[0-9]*_id$' AND TABLE_NAME NOT LIKE 'bak\\_%'",
    { type: sequelize.QueryTypes.SELECT }
  );
  for (const { t, c } of kolom) {
    const rows = await sequelize.query(`SELECT \`${c}\` AS id, COUNT(*) AS n FROM \`${t}\` WHERE \`${c}\` IN (:ids) GROUP BY \`${c}\``, { replacements: { ids }, type: sequelize.QueryTypes.SELECT });
    rows.forEach((r) => hasil.set(r.id, (hasil.get(r.id) ?? 0) + Number(r.n)));
  }
  return hasil;
};

const deleteJurusan = async (id, actorId) => {
  const jurusan = await Jurusan.findByPk(id);
  if (!jurusan) throw new ApiError(404, 'Jurusan not found');
  const dipakai = (await hitungPemakaian([jurusan.id])).get(jurusan.id);
  if (dipakai) throw new ApiError(400, `Jurusan masih dipakai ${dipakai} data`);
  await jurusan.update({ isDelete: true, updatedBy: actorId });
};

// ---- Master Jurusan / Prodi: 1 prodi -> banyak golongan kelas ----
// Tabel jurusan tetap menyimpan satu baris per golongan kelas (id-nya dipakai banyak modul); menu master mengelolanya per
// prodi (nama jurusan): isian prodi sama untuk semua baris, centang golongan kelas menambah / melepas baris.
const ISIAN_PRODI = ['namaJurusan', 'kodeProdi', 'singkatan', 'foto', 'prospekKarir', 'jenjangPendidikan', 'gelarSingkat', 'gelarLengkap', 'namaFakultas'];

const barisProdi = (namaJurusan) =>
  Jurusan.findAll({ where: { namaJurusan }, include: [{ model: GolonganKelas, as: 'golonganKelas', required: false }], order: [['id', 'ASC']] });

const bentukProdi = (baris, pemakaian) => {
  const aktif = baris.filter((j) => j.golonganKelas);
  const utama = aktif[0] ?? baris[0];
  return {
    id: utama.id,
    ...Object.fromEntries(ISIAN_PRODI.map((k) => [k, utama[k]])),
    golongan: aktif.map((j) => ({ jurusanId: j.id, golonganKelasId: j.golonganKelasId, namaKelas: j.golonganKelas.namaKelas, dipakai: pemakaian.get(j.id) ?? 0 })),
  };
};

const listProdiGrup = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const rows = await Jurusan.findAll({
    where: query.search ? { namaJurusan: { [Op.like]: `%${query.search}%` } } : {},
    include: [{ model: GolonganKelas, as: 'golonganKelas', required: false }],
    order: [['id', 'ASC']],
  });
  const perNama = new Map();
  rows.forEach((j) => perNama.set(j.namaJurusan, [...(perNama.get(j.namaJurusan) ?? []), j]));
  const pemakaian = await hitungPemakaian(rows.map((j) => j.id));
  const arah = query.sortDir === 'desc' ? -1 : 1;
  const semua = [...perNama.values()]
    .map((baris) => bentukProdi(baris, pemakaian))
    .filter((p) => p.golongan.length && (!query.golonganKelasId || p.golongan.some((g) => g.golonganKelasId === Number(query.golonganKelasId))))
    .sort((a, b) => arah * a.namaJurusan.localeCompare(b.namaJurusan));
  return { data: semua.slice(offset, offset + limit), meta: getPagingMeta(semua.length, page, limit) };
};

const cekGolongan = async (ids) => {
  const ada = await GolonganKelas.count({ where: { id: ids } });
  if (ada !== new Set(ids).size) throw new ApiError(400, 'Golongan kelas not found');
};

/** Baris untuk golongan kelas yang belum ada: memulihkan baris lama yang pernah dilepas, selain itu membuat baru. */
const tambahGolongan = async (ids, isian, actorId, transaction) => {
  for (const golonganKelasId of ids) {
    const lama = await Jurusan.scope('withDeleted').findOne({ where: { namaJurusan: isian.namaJurusan, golonganKelasId, isDelete: true }, transaction });
    if (lama) await lama.update({ ...isian, isDelete: false, updatedBy: actorId }, { transaction });
    else await Jurusan.create({ ...isian, golonganKelasId, createdBy: actorId, updatedBy: actorId }, { transaction });
  }
};

const createProdiGrup = async ({ golonganKelasIds, ...isian }, actorId) => {
  await cekGolongan(golonganKelasIds);
  if (await Jurusan.findOne({ where: { namaJurusan: isian.namaJurusan } })) throw new ApiError(409, `Prodi ${isian.namaJurusan} sudah ada`);
  await sequelize.transaction((transaction) => tambahGolongan(golonganKelasIds, isian, actorId, transaction));
  return bentukProdi(await barisProdi(isian.namaJurusan), new Map());
};

const updateProdiGrup = async (id, { golonganKelasIds, ...isian }, actorId) => {
  const rujukan = await Jurusan.findByPk(id);
  if (!rujukan) throw new ApiError(404, 'Jurusan not found');
  await cekGolongan(golonganKelasIds);
  const namaLama = rujukan.namaJurusan;
  if (isian.namaJurusan !== namaLama && (await Jurusan.findOne({ where: { namaJurusan: isian.namaJurusan } }))) {
    throw new ApiError(409, `Prodi ${isian.namaJurusan} sudah ada`);
  }
  const baris = await barisProdi(namaLama);
  // Baris dengan golongan kelas yang sudah dihapus tidak disentuh keanggotaannya.
  const dilepas = baris.filter((j) => j.golonganKelas && !golonganKelasIds.includes(j.golonganKelasId));
  const pemakaian = await hitungPemakaian(dilepas.map((j) => j.id));
  const terpakai = dilepas.filter((j) => pemakaian.get(j.id));
  if (terpakai.length) {
    throw new ApiError(400, `Golongan kelas tidak bisa dilepas karena masih dipakai: ${terpakai.map((j) => `${j.golonganKelas.namaKelas} (${pemakaian.get(j.id)} data)`).join(', ')}`);
  }
  const sudahAda = new Set(baris.map((j) => j.golonganKelasId));
  await sequelize.transaction(async (transaction) => {
    await Jurusan.update({ ...isian, updatedBy: actorId }, { where: { namaJurusan: namaLama }, transaction });
    if (dilepas.length) await Jurusan.update({ isDelete: true, updatedBy: actorId }, { where: { id: dilepas.map((j) => j.id) }, transaction });
    await tambahGolongan(golonganKelasIds.filter((g) => !sudahAda.has(g)), isian, actorId, transaction);
    // Modul yang menyimpan prodi sebagai nama ikut berganti.
    if (isian.namaJurusan !== namaLama) {
      await sequelize.query('UPDATE calon_mahasiswa SET prodi = :baru WHERE prodi = :lama', { replacements: { baru: isian.namaJurusan, lama: namaLama }, transaction });
      await sequelize.query('UPDATE tes_ujian SET prodi = :baru WHERE prodi = :lama', { replacements: { baru: isian.namaJurusan, lama: namaLama }, transaction });
    }
  });
  return bentukProdi(await barisProdi(isian.namaJurusan), new Map());
};

const deleteProdiGrup = async (id, actorId) => {
  const rujukan = await Jurusan.findByPk(id);
  if (!rujukan) throw new ApiError(404, 'Jurusan not found');
  const baris = await barisProdi(rujukan.namaJurusan);
  const pemakaian = await hitungPemakaian(baris.map((j) => j.id));
  const total = [...pemakaian.values()].reduce((n, x) => n + x, 0);
  if (total) throw new ApiError(400, `Prodi ${rujukan.namaJurusan} masih dipakai ${total} data`);
  await Jurusan.update({ isDelete: true, updatedBy: actorId }, { where: { id: baris.map((j) => j.id) } });
};

const exportJurusan = async () => {
  const rows = await Jurusan.findAll({
    include: [{ model: GolonganKelas, as: 'golonganKelas' }],
    order: [['namaJurusan', 'ASC']],
  });
  const data = rows.map((j) => ({
    namaJurusan: j.namaJurusan,
    kodeProdi: j.kodeProdi ?? '',
    golonganKelas: j.golonganKelas?.namaKelas ?? '',
    jenjangPendidikan: j.jenjangPendidikan ?? '',
    namaFakultas: j.namaFakultas ?? '',
    gelarSingkat: j.gelarSingkat ?? '',
    gelarLengkap: j.gelarLengkap ?? '',
    prospekKarir: j.prospekKarir ?? '',
  }));
  return buildWorkbook('Jurusan', EXPORT_COLUMNS, data);
};

const exportJurusanTemplate = () => {
  const sample = {
    namaJurusan: 'Contoh Nama Jurusan/Prodi',
    kodeProdi: '57201',
    golonganKelas: 'Nama Golongan Kelas (sesuai master data)',
    jenjangPendidikan: 'Diploma Tiga',
    namaFakultas: 'Fakultas Contoh',
    gelarSingkat: 'A.Md.Kom.',
    gelarLengkap: 'Ahli Madya Komputer',
    prospekKarir: 'Satu prospek karir per baris',
  };
  return buildWorkbook('Jurusan', EXPORT_COLUMNS, [sample]);
};

/**
 * Beda dengan import mahasiswa (update-only): import jurusan boleh MEMBUAT baru sekaligus
 * mengubah yang sudah ada (dicocokkan lewat Nama Jurusan) — dipakai untuk migrasi awal daftar
 * prodi dari sistem kampus lama yang belum ada di master data ini sama sekali.
 */
const importJurusan = async (fileBase64, actorId) => {
  const rows = await parseWorkbookFromBase64(fileBase64);
  const errors = [];
  let successCount = 0;

  for (const { rowNumber, data } of rows) {
    const namaJurusan = cellString(data['Nama Jurusan']);
    if (!namaJurusan) {
      errors.push({ row: rowNumber, message: 'Nama Jurusan wajib diisi' });
      continue;
    }

    const golonganNama = cellString(data['Golongan Kelas']);
    if (!golonganNama) {
      errors.push({ row: rowNumber, message: 'Golongan Kelas wajib diisi' });
      continue;
    }
    const golongan = await GolonganKelas.findOne({ where: { namaKelas: golonganNama } });
    if (!golongan) {
      errors.push({ row: rowNumber, message: `Golongan Kelas "${golonganNama}" tidak ditemukan` });
      continue;
    }

    const payload = {
      namaJurusan,
      golonganKelasId: golongan.id,
      kodeProdi: cellString(data['Kode Prodi']) || null,
      jenjangPendidikan: cellString(data['Jenjang Pendidikan']) || null,
      namaFakultas: cellString(data['Fakultas']) || null,
      gelarSingkat: cellString(data['Gelar Singkat']) || null,
      gelarLengkap: cellString(data['Gelar Lengkap']) || null,
      prospekKarir: cellString(data['Prospek Karir']) || null,
      updatedBy: actorId,
    };

    try {
      const existing = await Jurusan.findOne({ where: { namaJurusan, golonganKelasId: golongan.id } });
      if (existing) {
        await existing.update(payload);
      } else {
        await Jurusan.create({ ...payload, createdBy: actorId });
      }
      successCount += 1;
    } catch (err) {
      errors.push({ row: rowNumber, message: err.message });
    }
  }

  return { successCount, errorCount: errors.length, errors };
};

module.exports = {
  listJurusan,
  getJurusanById,
  createJurusan,
  updateJurusan,
  deleteJurusan,
  listProdiGrup,
  createProdiGrup,
  updateProdiGrup,
  deleteProdiGrup,
  exportJurusan,
  exportJurusanTemplate,
  importJurusan,
};
