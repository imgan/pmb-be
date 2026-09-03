const models = require('../models');
const { AuditLog } = models;

const LOGGED_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const SNAPSHOT_METHODS = new Set(['PUT', 'PATCH', 'DELETE']);

const MODULE_LABELS = [
  [/^\/api\/auth\/login/, 'Autentikasi'],
  [/^\/api\/auth/, 'Autentikasi'],
  [/^\/api\/users/, 'User Management'],
  [/^\/api\/roles/, 'Role Management'],
  [/^\/api\/menus/, 'Menu Management'],
  [/^\/api\/golongan-kelas/, 'Golongan Kelas'],
  [/^\/api\/jurusan/, 'Jurusan'],
  [/^\/api\/sumber-informasi/, 'Sumber Informasi'],
  [/^\/api\/ukuran-almamater/, 'Ukuran Almamater'],
  [/^\/api\/pembayaran/, 'Biaya Kuliah (Master)'],
  [/^\/api\/dokumen-pendaftaran/, 'Dokumen Pendaftaran'],
  [/^\/api\/dokumen-kelengkapan/, 'Dokumen Kelengkapan'],
  [/^\/api\/gelombang/, 'Gelombang'],
  [/^\/api\/peserta\/register/, 'Pendaftaran Peserta'],
  [/^\/api\/peserta\/login/, 'Autentikasi Peserta'],
  [/^\/api\/peserta\/forgot-password/, 'Autentikasi Peserta'],
  [/^\/api\/peserta\/reset-password/, 'Autentikasi Peserta'],
  [/^\/api\/peserta\/me\/dokumen/, 'Dokumen Peserta'],
  [/^\/api\/peserta\/me\/biodata/, 'Biodata Peserta'],
  [/^\/api\/peserta\/me/, 'Profil Peserta'],
  [/^\/api\/peserta/, 'Peserta'],
  [/^\/api\/kampus/, 'Profil Kampus'],
  [/^\/api\/beasiswa/, 'Beasiswa'],
  [/^\/api\/biaya-kuliah/, 'Biaya Kuliah'],
  [/^\/api\/calon-mahasiswa/, 'Calon Mahasiswa'],
  [/^\/api\/home-images/, 'Gambar Beranda'],
  [/^\/api\/keuangan\//, 'Keuangan'],
];

// Generic "resource by numeric id" routes — used to snapshot the row before it's changed.
const RESOURCE_REGISTRY = [
  { pattern: /^\/api\/users\/(\d+)$/, model: 'User' },
  { pattern: /^\/api\/roles\/(\d+)$/, model: 'Role' },
  { pattern: /^\/api\/golongan-kelas\/(\d+)$/, model: 'GolonganKelas' },
  { pattern: /^\/api\/jurusan\/(\d+)$/, model: 'Jurusan' },
  { pattern: /^\/api\/sumber-informasi\/(\d+)$/, model: 'SumberInformasi' },
  { pattern: /^\/api\/ukuran-almamater\/(\d+)$/, model: 'UkuranAlmamater' },
  { pattern: /^\/api\/pembayaran\/(\d+)$/, model: 'Pembayaran' },
  { pattern: /^\/api\/dokumen-pendaftaran\/(\d+)$/, model: 'DokumenPendaftaran' },
  { pattern: /^\/api\/dokumen-kelengkapan\/(\d+)$/, model: 'DokumenKelengkapan' },
  { pattern: /^\/api\/gelombang\/(\d+)$/, model: 'Gelombang' },
  { pattern: /^\/api\/peserta\/(\d+)$/, model: 'Peserta' },
  { pattern: /^\/api\/beasiswa\/(\d+)$/, model: 'Beasiswa' },
  { pattern: /^\/api\/biaya-kuliah\/(\d+)$/, model: 'BiayaKuliah' },
  { pattern: /^\/api\/calon-mahasiswa\/(\d+)$/, model: 'CalonMahasiswa' },
  { pattern: /^\/api\/kampus$/, model: 'Kampus', singleton: true },
  { pattern: /^\/api\/home-images$/, model: 'HomeImage', singleton: true },
];

const resolveModule = (path) => {
  const match = MODULE_LABELS.find(([pattern]) => pattern.test(path));
  return match ? match[1] : 'Lainnya';
};

const resolveAction = (method, path) => {
  if (path.includes('/login')) return 'login';
  if (path.includes('/register')) return 'register';
  if (path.includes('/forgot-password')) return 'forgot_password';
  if (path.includes('/reset-password')) return 'reset_password';
  if (method === 'POST') return 'create';
  if (method === 'PUT' || method === 'PATCH') return 'update';
  if (method === 'DELETE') return 'delete';
  return 'other';
};

const ACTION_VERB = {
  create: 'membuat data baru pada',
  update: 'memperbarui data pada',
  delete: 'menghapus data pada',
  login: 'login ke',
  register: 'mendaftar melalui',
  forgot_password: 'meminta reset password untuk',
  reset_password: 'mereset password untuk',
  other: 'melakukan aksi pada',
};

const resolveActor = (req) => {
  if (req.user) {
    return { type: 'staff', id: req.user.id, name: req.user.name, username: req.user.username, email: req.user.email };
  }
  if (req.peserta) {
    return { type: 'peserta', id: req.peserta.id, name: req.peserta.namaLengkap, username: null, email: req.peserta.email };
  }
  return { type: 'public', id: null, name: null, username: null, email: null };
};

const SENSITIVE_KEYS = new Set([
  'password',
  'resetpasswordtoken',
  'resetpasswordexpires',
  'token',
  'accesstoken',
  'refreshtoken',
]);
const MAX_FIELD_LEN = 300;

/** Reduces a model instance/plain object to a flat, diff-friendly snapshot: no nested associations, no secrets, no huge base64 blobs. */
const sanitizeSnapshot = (value) => {
  if (!value) return null;
  const plain = typeof value.toJSON === 'function' ? value.toJSON() : value;
  if (typeof plain !== 'object' || Array.isArray(plain)) return null;

  const out = {};
  for (const [key, val] of Object.entries(plain)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) continue;
    if (val instanceof Date) {
      out[key] = val.toISOString();
      continue;
    }
    if (val && typeof val === 'object') continue; // skip nested associations/arrays — keep the diff to this entity's own fields
    if (typeof val === 'string' && val.length > MAX_FIELD_LEN) {
      out[key] = `[data besar disembunyikan, ${val.length} karakter]`;
      continue;
    }
    out[key] = val;
  }
  return out;
};

const captureBefore = async (path, req) => {
  for (const entry of RESOURCE_REGISTRY) {
    const match = path.match(entry.pattern);
    if (!match) continue;
    const Model = models[entry.model];
    if (!Model) return null;
    const record = entry.singleton ? await Model.findOne() : await Model.findByPk(match[1]);
    return sanitizeSnapshot(record);
  }

  if (path === '/api/peserta/me' && req.peserta) return sanitizeSnapshot(req.peserta);
  if (path === '/api/peserta/me/biodata' && req.peserta) {
    const biodata = await models.PesertaBiodata.findOne({ where: { pesertaId: req.peserta.id } });
    return sanitizeSnapshot(biodata);
  }

  return null;
};

const auditLogMiddleware = async (req, res, next) => {
  const path = req.originalUrl.split('?')[0];
  if (!LOGGED_METHODS.has(req.method)) return next();
  if (path.startsWith('/api/audit-logs')) return next();

  let before = null;
  if (SNAPSHOT_METHODS.has(req.method)) {
    before = await captureBefore(path, req).catch(() => null);
  }

  let after = null;
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    after = sanitizeSnapshot(body && body.data);
    return originalJson(body);
  };

  res.on('finish', () => {
    const actor = resolveActor(req);
    const module = resolveModule(path);
    const action = resolveAction(req.method, path);
    const ok = res.statusCode >= 200 && res.statusCode < 300;
    const actorLabel = actor.name || (actor.type === 'public' ? 'Pengunjung' : 'Tidak dikenal');
    const verb = ACTION_VERB[action] || ACTION_VERB.other;
    const description = `${actorLabel} ${verb} ${module}${ok ? '' : ' (gagal)'}`;
    const actorName = actor.username ? `${actor.name} (@${actor.username})` : actor.name;
    const changes = ok && (before || after) ? JSON.stringify({ before, after }) : null;

    AuditLog.create({
      actorType: actor.type,
      actorId: actor.id,
      actorName,
      actorEmail: actor.email,
      method: req.method,
      module,
      action,
      path: req.originalUrl,
      description,
      statusCode: res.statusCode,
      ipAddress: req.ip,
      changes,
    }).catch(() => {
      // never let audit logging break the app
    });
  });

  next();
};

module.exports = auditLogMiddleware;
