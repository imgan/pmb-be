const { Op, UniqueConstraintError } = require('sequelize');
const { Mahasiswa, MataKuliah, Kurikulum, Dosen, FeederAktivitas } = require('../../models');
const ApiError = require('../../utils/ApiError');
const { getPagination, getPagingMeta } = require('../../utils/pagination');
const { buildWorkbook } = require('../../utils/excel');
const perkuliahan = require('./perkuliahan');
const aktivitas = require('./aktivitas');

/**
 * Registry menu Feeder PDDIKTI (modul SIM). Setiap entitas mendefinisikan kolom format Neo
 * Feeder + sumber datanya:
 *  - `list`  : data dibaca dari tabel akademik yang sudah ada (read-only + export), atau
 *  - `crud`  : tabel Feeder sendiri, dengan list/CRUD generik di file ini.
 * `actions` opsional berisi aksi massal (mis. generate AKM dari nilai).
 */
const ENTITIES = [...perkuliahan, ...aktivitas];
const REGISTRY = new Map(ENTITIES.map((e) => [e.key, e]));

const getEntity = (key) => {
  const entity = REGISTRY.get(key);
  if (!entity) throw new ApiError(404, `Menu Feeder "${key}" tidak dikenal`);
  return entity;
};

const allMenuCodes = () => ENTITIES.map((e) => e.menuCode);

/** Field form dengan opsi yang diambil dari database (`loadOptions`) sudah di-resolve. */
const resolveFields = async (e) =>
  Promise.all(
    (e.crud?.fields ?? []).map(async ({ loadOptions, ...f }) => (loadOptions ? { ...f, options: await loadOptions() } : f))
  );

const getMeta = async (key) => {
  const e = getEntity(key);
  return {
    key: e.key,
    title: e.title,
    group: e.group,
    source: e.source ?? null,
    columns: e.columns,
    editable: Boolean(e.crud),
    fields: await resolveFields(e),
    actions: (e.actions ?? []).map(({ key: actionKey, label, confirm }) => ({ key: actionKey, label, confirm })),
    filters: await Promise.all((e.filters ?? []).map(async (f) => ({ key: f.key, label: f.label, options: await f.options() }))),
  };
};

/** Nilai filter dari query, hanya untuk filter yang dideklarasikan entitas. */
const pickFilters = (e, query = {}) =>
  Object.fromEntries((e.filters ?? []).filter((f) => query[f.key] !== undefined && query[f.key] !== '').map((f) => [f.key, String(query[f.key])]));

// ---- List (generik untuk entitas CRUD) ----
// Default: baris per mahasiswa (include Mahasiswa, cari NIM/nama). Entitas lain bisa memberi
// `crud.include()` (relasi + batasan kategori) dan `crud.where(search)` sendiri.
const likeAny = (paths, search) => ({ [Op.or]: paths.map((p) => ({ [p]: { [Op.like]: `%${search}%` } })) });

const crudInclude = (e) =>
  e.crud.include
    ? e.crud.include()
    : [{ model: Mahasiswa, as: 'mahasiswa', attributes: ['id', 'nim', 'namaLengkap'] }, ...(e.crud.extraInclude ?? [])];

const crudWhere = (e, search) => {
  if (!search) return undefined;
  if (e.crud.where) return e.crud.where(search);
  return likeAny(['$mahasiswa.nim$', '$mahasiswa.nama_lengkap$'], search);
};

const listCrud = async (e, { search, offset, limit }) => {
  const { rows, count } = await e.crud.model.findAndCountAll({
    where: { ...(e.crud.scope ?? {}), ...(crudWhere(e, search) ?? {}) },
    include: crudInclude(e),
    order: e.crud.order ?? [['id', 'DESC']],
    offset,
    limit,
    distinct: true,
    subQuery: false,
  });
  return { count, rows: rows.map((r) => ({ id: r.id, ...e.crud.toRow(r) })) };
};

const list = async (key, query) => {
  const e = getEntity(key);
  const { page, limit, offset } = getPagination(query);
  const search = query.search ? String(query.search).trim() : '';
  const filters = pickFilters(e, query);
  const { rows, count } = e.crud ? await listCrud(e, { search, offset, limit }) : await e.list({ search, offset, limit, filters });
  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

// ---- Export Excel format Neo Feeder ----
const EXPORT_LIMIT = 1000000;
const exportWorkbook = async (key, query = {}) => {
  const e = getEntity(key);
  const filters = pickFilters(e, query);
  if (e.exportWorkbook) return e.exportWorkbook(filters);
  const all = e.crud
    ? await listCrud(e, { search: '', offset: 0, limit: EXPORT_LIMIT })
    : await e.list({ search: '', offset: 0, limit: EXPORT_LIMIT, filters });
  const columns = e.columns.map((c) => ({ header: c.header, key: c.key }));
  return buildWorkbook(e.title.slice(0, 31), columns, all.rows);
};

// ---- CRUD ----
const ensureCrud = (key) => {
  const e = getEntity(key);
  if (!e.crud) throw new ApiError(400, `Data ${e.title} dikelola dari menu sumbernya, bukan dari sini`);
  return e;
};

/** Validasi & normalisasi payload terhadap definisi field (tipe, wajib, opsi, pola). */
const sanitize = (fields, payload, { partial = false } = {}) => {
  const values = {};
  const errors = [];
  fields.forEach((f) => {
    if (partial && !(f.key in payload)) return;
    let v = payload[f.key];
    if (v === '' || v === undefined) v = null;
    if (v === null) {
      if (f.required) errors.push(`${f.label} wajib diisi`);
      values[f.key] = null;
      return;
    }
    if (f.type === 'number' || f.type === 'lookup') {
      const n = Number(v);
      if (!Number.isFinite(n)) return errors.push(`${f.label} harus berupa angka`);
      if (f.min !== undefined && n < f.min) return errors.push(`${f.label} minimal ${f.min}`);
      if (f.max !== undefined && n > f.max) return errors.push(`${f.label} maksimal ${f.max}`);
      v = n;
    } else if (f.type === 'date') {
      if (Number.isNaN(new Date(v).getTime())) return errors.push(`${f.label} bukan tanggal yang valid`);
      v = String(v).slice(0, 10);
    } else {
      v = String(v).trim();
      if (f.options) {
        // Opsi bisa bernilai angka (mis. id prodi) — cocokkan sebagai teks, simpan nilai aslinya.
        const option = f.options.find((o) => String(o.value) === v);
        if (!option) return errors.push(`${f.label} tidak valid`);
        v = option.value;
      }
      if (f.pattern && !new RegExp(f.pattern).test(v)) return errors.push(`Format ${f.label} tidak valid`);
    }
    values[f.key] = v;
  });
  if (errors.length) throw new ApiError(400, errors.join('; '));
  return values;
};

const ensureLookups = async (fields, values) => {
  const checks = fields
    .filter((f) => f.type === 'lookup' && values[f.key] !== null && values[f.key] !== undefined)
    .map(async (f) => {
      const l = LOOKUPS[f.lookup];
      const exists = l.exists ? await l.exists(values[f.key]) : await l.model.findByPk(values[f.key], { attributes: ['id'] });
      if (!exists) throw new ApiError(400, `${f.label} tidak ditemukan`);
    });
  await Promise.all(checks);
};

const findRecord = async (e, id) => {
  // `scope` (mis. kategori aktivitas) ikut dicek supaya baris kategori lain tidak bisa diakses lewat menu ini.
  const record = await e.crud.model.findOne({ where: { id, ...(e.crud.scope ?? {}) }, include: crudInclude(e) });
  if (!record) throw new ApiError(404, `Data ${e.title} tidak ditemukan`);
  return record;
};

const getRecord = async (key, id) => {
  const e = ensureCrud(key);
  const record = await findRecord(e, id);
  const values = {};
  e.crud.fields.forEach((f) => {
    values[f.key] = record.get(f.key) ?? null;
  });
  return { id: record.id, values, lookupLabels: e.crud.lookupLabels?.(record) ?? {} };
};

const withUniqueMessage = async (e, fn) => {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof UniqueConstraintError) throw new ApiError(409, e.crud.uniqueMessage ?? 'Data sudah ada');
    throw err;
  }
};

const createRecord = async (key, payload, actorId) => {
  const e = ensureCrud(key);
  const fields = await resolveFields(e);
  let values = sanitize(fields, payload);
  await ensureLookups(fields, values);
  if (e.crud.beforeSave) values = e.crud.beforeSave(values);
  const record = await withUniqueMessage(e, () =>
    e.crud.model.create({ ...values, ...(e.crud.scope ?? {}), createdBy: actorId, updatedBy: actorId })
  );
  return getRecord(key, record.id);
};

const updateRecord = async (key, id, payload, actorId) => {
  const e = ensureCrud(key);
  const record = await findRecord(e, id);
  const fields = await resolveFields(e);
  let values = sanitize(fields, payload, { partial: true });
  await ensureLookups(fields, values);
  if (e.crud.beforeSave) values = e.crud.beforeSave({ ...record.get(), ...values });
  await withUniqueMessage(e, () => record.update({ ...values, updatedBy: actorId }));
  return getRecord(key, id);
};

const deleteRecord = async (key, id) => {
  const e = ensureCrud(key);
  const record = await findRecord(e, id);
  await record.destroy();
};

const runAction = async (key, actionKey, actorId) => {
  const e = getEntity(key);
  const action = (e.actions ?? []).find((a) => a.key === actionKey);
  if (!action) throw new ApiError(404, 'Aksi tidak dikenal');
  return action.run(actorId);
};

// ---- Lookup untuk field relasi (mahasiswa, mata kuliah, ...) ----
const LOOKUPS = {
  mahasiswa: {
    model: Mahasiswa,
    search: async (term) => {
      const rows = await Mahasiswa.findAll({
        where: term ? { [Op.or]: [{ nim: { [Op.like]: `%${term}%` } }, { namaLengkap: { [Op.like]: `%${term}%` } }] } : undefined,
        attributes: ['id', 'nim', 'namaLengkap'],
        order: [['nim', 'ASC']],
        limit: 20,
      });
      return rows.map((m) => ({ value: m.id, label: `${m.nim} - ${m.namaLengkap}` }));
    },
  },
  dosen: {
    model: Dosen,
    search: async (term) => {
      const rows = await Dosen.findAll({
        where: term ? { [Op.or]: [{ nidn: { [Op.like]: `%${term}%` } }, { namaLengkap: { [Op.like]: `%${term}%` } }] } : undefined,
        attributes: ['id', 'nidn', 'namaLengkap'],
        order: [['namaLengkap', 'ASC']],
        limit: 20,
      });
      return rows.map((d) => ({ value: d.id, label: `${d.nidn} - ${d.namaLengkap}` }));
    },
  },
  mataKuliah: {
    model: MataKuliah,
    search: async (term) => {
      const rows = await MataKuliah.findAll({
        where: term ? { [Op.or]: [{ kode: { [Op.like]: `%${term}%` } }, { mataKuliah: { [Op.like]: `%${term}%` } }] } : undefined,
        attributes: MataKuliah.ATTRS_RINGKAS,
        include: [{ model: Kurikulum, as: 'kurikulum', attributes: ['id', 'nama'], required: false }],
        order: [['kode', 'ASC']],
        limit: 20,
      });
      return rows.map((m) => ({ value: m.id, label: `${m.kode} - ${m.mataKuliah} (${m.sksTotal} SKS)${m.kurikulum ? ` · ${m.kurikulum.nama}` : ''}` }));
    },
  },
};

// Aktivitas per kategori: "aktivitas:TA" | "aktivitas:KKP" | "aktivitas:PA".
['TA', 'KKP', 'PA'].forEach((kategori) => {
  LOOKUPS[`aktivitas:${kategori}`] = {
    exists: (id) => FeederAktivitas.findOne({ where: { id, kategori }, attributes: ['id'] }),
    search: async (term) => {
      const rows = await FeederAktivitas.findAll({
        where: { kategori, ...(term ? { [Op.or]: [{ judul: { [Op.like]: `%${term}%` } }, { periode: { [Op.like]: `%${term}%` } }] } : {}) },
        attributes: ['id', 'periode', 'judul'],
        order: [['periode', 'DESC'], ['id', 'DESC']],
        limit: 20,
      });
      return rows.map((a) => ({ value: a.id, label: `[${a.periode}] ${a.judul}` }));
    },
  };
});

const lookup = async (type, term) => {
  const l = LOOKUPS[type];
  if (!l) throw new ApiError(404, 'Lookup tidak dikenal');
  return l.search(term ? String(term).trim() : '');
};

module.exports = {
  ENTITIES,
  allMenuCodes,
  getEntity,
  getMeta,
  list,
  exportWorkbook,
  getRecord,
  createRecord,
  updateRecord,
  deleteRecord,
  runAction,
  lookup,
};
