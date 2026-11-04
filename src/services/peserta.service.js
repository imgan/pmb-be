const bcrypt = require('bcryptjs');
const { Op, literal } = require('sequelize');
const { CalonMahasiswa, Peserta, GolonganKelas, Jurusan, PesertaBiodata, PesertaDokumen, DokumenKelengkapan, Mahasiswa, SumberInformasi, Beasiswa } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { normalisasiHp, sqlHpBersih, variasiHp } = require('../utils/nomorHp');
const { sendMail } = require('../utils/mailer');
const { generateAccessToken } = require('../utils/jwt');
const { generateResetToken, hashToken } = require('../utils/resetToken');
const { resolveOrder } = require('../utils/sorting');
const { syncFlagDokumen } = require('../utils/statusDokumen');
const tahunModulService = require('./tahunModul.service');
const { pastikanBarisPeserta, selaraskanDariAkun } = require('./calonMahasiswa.service');

const includeRelations = [
  { model: GolonganKelas, as: 'golonganKelas' },
  { model: Jurusan, as: 'jurusan' },
  { model: SumberInformasi, as: 'sumberInformasi', attributes: ['id', 'namaInformasi'] },
  { model: Beasiswa, as: 'beasiswa', attributes: ['id', 'namaBeasiswa'] },
];

const SORTABLE_COLUMNS = {
  namaLengkap: ['namaLengkap'],
  email: ['email'],
  golonganKelas: [{ model: GolonganKelas, as: 'golonganKelas' }, 'namaKelas'],
  jurusan: [{ model: Jurusan, as: 'jurusan' }, 'namaJurusan'],
  createdAt: ['createdAt'],
  status: ['isActive'],
  statusKelulusan: ['statusKelulusan'],
};

const includeRelationsWithBiodata = [...includeRelations, { model: PesertaBiodata, as: 'biodata' }];

const ensureKelasJurusanValid = async (golonganKelasId, jurusanId) => {
  const golonganKelas = await GolonganKelas.findByPk(golonganKelasId);
  if (!golonganKelas) throw new ApiError(400, 'Golongan kelas not found');

  const jurusan = await Jurusan.findByPk(jurusanId);
  if (!jurusan) throw new ApiError(400, 'Jurusan not found');

  if (jurusan.golonganKelasId !== golonganKelas.id) {
    throw new ApiError(400, 'Jurusan does not belong to the selected golongan kelas');
  }
};

const sendPesertaCredentialsEmail = async (peserta, plainPassword) => {
  try {
    await sendMail({
      to: peserta.email,
      subject: 'Akun PMB Anda',
      html: `
        <p>Halo ${peserta.namaLengkap},</p>
        <p>Terima kasih telah melakukan pendaftaran PMB. Berikut adalah akun Anda untuk login:</p>
        <p>Username: <b>${peserta.noTelepon}</b> (nomor HP) atau ${peserta.email}<br/>Password awal: <b>${plainPassword}</b> (nomor HP Anda)</p>
        <p>Anda akan diminta mengganti password saat login pertama demi keamanan akun.</p>
      `,
    });
    return true;
  } catch (err) {
    return false;
  }
};

const listPeserta = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.search) {
    where[Op.or] = [
      { namaLengkap: { [Op.like]: `%${query.search}%` } },
      { email: { [Op.like]: `%${query.search}%` } },
      { noTelepon: { [Op.like]: `%${query.search}%` } },
    ];
  }
  if (query.golonganKelasId) {
    where.golonganKelasId = query.golonganKelasId;
  }
  if (query.jurusanId) {
    where.jurusanId = query.jurusanId;
  }
  if (query.dateFrom || query.dateTo) {
    where.createdAt = {};
    if (query.dateFrom) where.createdAt[Op.gte] = new Date(`${query.dateFrom}T00:00:00`);
    if (query.dateTo) where.createdAt[Op.lte] = new Date(`${query.dateTo}T23:59:59`);
  }

  const { rows, count } = await Peserta.findAndCountAll({
    where,
    include: includeRelations,
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS),
    subQuery: false,
    distinct: true,
  });

  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

const getPesertaById = async (id) => {
  const peserta = await Peserta.findByPk(id, { include: includeRelationsWithBiodata });
  if (!peserta) throw new ApiError(404, 'Peserta not found');
  return peserta;
};

/** Sumber informasi & jalur (beasiswa) opsional; bila diisi harus ada di master. */
const ensureReferensiValid = async ({ sumberInformasiId, beasiswaId }) => {
  if (sumberInformasiId && !(await SumberInformasi.findByPk(sumberInformasiId))) throw new ApiError(400, 'Sumber informasi tidak ditemukan');
  if (beasiswaId && !(await Beasiswa.findByPk(beasiswaId))) throw new ApiError(400, 'Jalur beasiswa tidak ditemukan');
};

/** payload.biodata (opsional, dari form pendaftaran publik) disimpan bersama akun dan langsung terkunci. */
const createPesertaWithGeneratedPassword = async ({ biodata, ...payload }, actorId) => {
  await ensureKelasJurusanValid(payload.golonganKelasId, payload.jurusanId);
  if (biodata && (await PesertaBiodata.findOne({ where: { nik: biodata.nik } }))) throw new ApiError(409, 'NIK sudah terdaftar');
  await ensureReferensiValid(payload);

  const existing = await Peserta.findOne({ where: { email: payload.email } });
  if (existing) throw new ApiError(409, 'Email already registered');

  // Password awal = nomor HP (dinormalisasi), wajib diganti saat login pertama.
  const plainPassword = normalisasiHp(payload.noTelepon);
  if (plainPassword.length < 8) throw new ApiError(400, 'Nomor HP tidak valid (minimal 8 digit)');
  const hashed = await bcrypt.hash(plainPassword, 10);

  const tahunPmbId = (await tahunModulService.aktif('pmb'))?.id ?? null;
  const peserta = await Peserta.sequelize.transaction(async (transaction) => {
    const baru = await Peserta.create(
      { ...payload, password: hashed, wajibGantiPassword: true, tahunPmbId, createdBy: actorId, updatedBy: actorId },
      { transaction }
    );
    if (biodata) await PesertaBiodata.create({ ...biodata, pesertaId: baru.id, isLocked: true }, { transaction });
    return baru;
  });

  // Setiap pendaftar langsung tampil di menu Peserta, sama dengan Dashboard & Reporting.
  await pastikanBarisPeserta(peserta.id);

  const emailSent = await sendPesertaCredentialsEmail(peserta, plainPassword);
  return { peserta: await getPesertaById(peserta.id), emailSent };
};

const registerPeserta = (payload) => createPesertaWithGeneratedPassword(payload, null);

const createPeserta = (payload, actorId) => createPesertaWithGeneratedPassword(payload, actorId);

const updatePeserta = async (id, payload, actorId) => {
  const peserta = await Peserta.findByPk(id);
  if (!peserta) throw new ApiError(404, 'Peserta not found');

  const nextGolonganKelasId = payload.golonganKelasId || peserta.golonganKelasId;
  const nextJurusanId = payload.jurusanId || peserta.jurusanId;
  if (payload.golonganKelasId || payload.jurusanId) {
    await ensureKelasJurusanValid(nextGolonganKelasId, nextJurusanId);
  }
  await ensureReferensiValid(payload);

  if (payload.email) {
    const existing = await Peserta.findOne({ where: { email: payload.email, id: { [Op.ne]: id } } });
    if (existing) throw new ApiError(409, 'Email already registered');
  }

  // Peserta belum mengganti password awal: password ikut No. HP yang baru supaya tetap "password = No. HP".
  const ikutHp =
    payload.noTelepon && peserta.wajibGantiPassword && normalisasiHp(payload.noTelepon) !== normalisasiHp(peserta.noTelepon) && normalisasiHp(payload.noTelepon).length >= 8;
  await peserta.update({ ...payload, ...(ikutHp ? { password: await bcrypt.hash(normalisasiHp(payload.noTelepon), 10) } : {}), updatedBy: actorId });
  await selaraskanDariAkun(id, payload);
  return getPesertaById(id);
};

const updateMyProfile = async (pesertaId, payload) => {
  const peserta = await Peserta.findByPk(pesertaId);
  if (!peserta) throw new ApiError(404, 'Peserta not found');

  const nextGolonganKelasId = payload.golonganKelasId || peserta.golonganKelasId;
  const nextJurusanId = payload.jurusanId || peserta.jurusanId;
  if (payload.golonganKelasId || payload.jurusanId) {
    await ensureKelasJurusanValid(nextGolonganKelasId, nextJurusanId);
  }
  await ensureReferensiValid(payload);

  if (payload.email) {
    const existing = await Peserta.findOne({ where: { email: payload.email, id: { [Op.ne]: pesertaId } } });
    if (existing) throw new ApiError(409, 'Email already registered');
  }

  await peserta.update(payload);
  await selaraskanDariAkun(pesertaId, payload);
  return getPesertaById(pesertaId);
};

const deletePeserta = async (id, actorId) => {
  const peserta = await Peserta.findByPk(id);
  if (!peserta) throw new ApiError(404, 'Peserta not found');
  await peserta.update({ updatedBy: actorId });
  await CalonMahasiswa.destroy({ where: { pesertaId: id } });
  await peserta.destroy();
};

/** Akun peserta dari username login: email (mengandung "@") atau nomor HP (format 08… / 628… / +62…). */
const cariAkunLogin = async (username) => {
  const nilai = String(username ?? '').trim();
  if (nilai.includes('@')) return Peserta.scope('withPassword').findOne({ where: { email: nilai } });
  const variasi = variasiHp(nilai);
  if (!variasi.length) return null;
  const akun = await Peserta.scope('withPassword').findAll({ where: literal(`${sqlHpBersih('no_telepon')} IN (${variasi.map((v) => Peserta.sequelize.escape(v)).join(', ')})`), limit: 2 });
  if (akun.length > 1) throw new ApiError(409, 'Nomor HP ini dipakai lebih dari satu akun. Silakan masuk menggunakan email.');
  return akun[0] ?? null;
};

const loginPeserta = async (username, password) => {
  const peserta = await cariAkunLogin(username);
  if (!peserta) throw new ApiError(401, 'Nomor HP/email atau password salah');
  if (!peserta.isActive) throw new ApiError(403, 'Akun peserta tidak aktif');

  const isMatch = await bcrypt.compare(password, peserta.password);
  if (!isMatch) throw new ApiError(401, 'Nomor HP/email atau password salah');

  const accessToken = generateAccessToken({ sub: peserta.id, type: 'peserta' });
  return { peserta: await getPesertaById(peserta.id), accessToken };
};

const forgotPasswordPeserta = async (email) => {
  const peserta = await Peserta.findOne({ where: { email } });
  if (!peserta || !peserta.isActive) return;

  const { rawToken, hashedToken, expiresAt } = generateResetToken();
  await peserta.update({ resetPasswordToken: hashedToken, resetPasswordExpires: expiresAt });

  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/pendaftaran/reset-password?token=${rawToken}`;
  try {
    await sendMail({
      to: peserta.email,
      subject: 'Reset Password Akun PMB',
      html: `
        <p>Halo ${peserta.namaLengkap},</p>
        <p>Kami menerima permintaan reset password untuk akun Anda. Klik link berikut untuk membuat password baru (berlaku 1 jam):</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>Jika Anda tidak meminta reset password, abaikan email ini.</p>
      `,
    });
  } catch {
    // Diamkan kegagalan kirim email supaya respons ke client tetap generik (tidak bocorkan status akun)
  }
};

const resetPasswordPeserta = async (token, newPassword) => {
  const hashedTokenValue = hashToken(token);
  const peserta = await Peserta.scope('withResetToken').findOne({
    where: { resetPasswordToken: hashedTokenValue, resetPasswordExpires: { [Op.gt]: new Date() } },
  });
  if (!peserta) throw new ApiError(400, 'Token reset password tidak valid atau sudah kedaluwarsa');

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await peserta.update({ password: hashedPassword, wajibGantiPassword: false, resetPasswordToken: null, resetPasswordExpires: null });
};

/** Peserta mengganti password sendiri (wajib saat masih memakai password awal = nomor HP). */
const gantiPasswordSaya = async (pesertaId, { passwordLama, passwordBaru }) => {
  const peserta = await Peserta.scope('withPassword').findByPk(pesertaId);
  if (!peserta) throw new ApiError(404, 'Peserta not found');
  if (!(await bcrypt.compare(passwordLama, peserta.password))) throw new ApiError(400, 'Password lama salah');
  if (passwordBaru === passwordLama) throw new ApiError(400, 'Password baru harus berbeda dari password lama');
  if (variasiHp(passwordBaru).includes(normalisasiHp(peserta.noTelepon))) throw new ApiError(400, 'Password baru tidak boleh sama dengan nomor HP');
  await peserta.update({ password: await bcrypt.hash(passwordBaru, 10), wajibGantiPassword: false });
  return getPesertaById(pesertaId);
};

/** Admin mereset password peserta ke default (nomor HP); peserta wajib menggantinya saat login berikutnya. */
const resetPasswordDefault = async (pesertaId, actorId) => {
  const peserta = await Peserta.findByPk(pesertaId);
  if (!peserta) throw new ApiError(404, 'Peserta not found');
  const plain = normalisasiHp(peserta.noTelepon);
  if (plain.length < 8) throw new ApiError(400, 'Nomor HP peserta tidak valid; perbaiki nomor HP terlebih dahulu');
  await peserta.update({ password: await bcrypt.hash(plain, 10), wajibGantiPassword: true, updatedBy: actorId });
  return { username: plain, email: peserta.email };
};

const getMyProfile = (pesertaId) => getPesertaById(pesertaId);

/**
 * Simpan biodata. Peserta (oleh = 'peserta'): ditolak bila biodata sudah terkunci, dan terkunci lagi setelah disimpan.
 * Admin (oleh = 'admin'): selalu boleh; status kunci tidak diubah (biodata baru langsung terkunci).
 */
const saveBiodata = async (pesertaId, payload, oleh = 'peserta') => {
  const peserta = await Peserta.findByPk(pesertaId);
  if (!peserta) throw new ApiError(404, 'Peserta not found');

  const existingByNik = await PesertaBiodata.findOne({ where: { nik: payload.nik, pesertaId: { [Op.ne]: pesertaId } } });
  if (existingByNik) throw new ApiError(409, 'NIK already registered');

  const biodata = await PesertaBiodata.findOne({ where: { pesertaId } });
  if (biodata?.isLocked && oleh === 'peserta') {
    throw new ApiError(403, 'Biodata sudah dikunci. Hubungi admin PMB untuk membuka kunci bila ada data yang perlu diperbaiki.');
  }
  if (biodata) {
    await biodata.update(oleh === 'peserta' ? { ...payload, isLocked: true } : payload);
  } else {
    await PesertaBiodata.create({ isAgree: true, ...payload, pesertaId, isLocked: true });
  }

  return getPesertaById(pesertaId);
};

/** Admin: buka (false) / kunci (true) biodata peserta. */
const setBiodataLock = async (pesertaId, isLocked) => {
  const biodata = await PesertaBiodata.findOne({ where: { pesertaId } });
  if (!biodata) throw new ApiError(404, 'Peserta belum mengisi biodata');
  await biodata.update({ isLocked });
  return getPesertaById(pesertaId);
};

/** Admin: hapus biodata peserta (peserta dapat mengisinya ulang). */
const removeBiodata = async (pesertaId) => {
  const biodata = await PesertaBiodata.findOne({ where: { pesertaId } });
  if (!biodata) throw new ApiError(404, 'Peserta belum mengisi biodata');
  await biodata.destroy();
  return getPesertaById(pesertaId);
};

const listMyDokumen = async (pesertaId) => {
  const [kelengkapanList, uploaded] = await Promise.all([
    DokumenKelengkapan.findAll({ order: [['id', 'ASC']] }),
    PesertaDokumen.findAll({ where: { pesertaId } }),
  ]);

  const uploadedByKelengkapanId = new Map(uploaded.map((u) => [u.dokumenKelengkapanId, u]));

  return kelengkapanList.map((k) => {
    const upload = uploadedByKelengkapanId.get(k.id);
    return {
      dokumenKelengkapanId: k.id,
      namaKelengkapan: k.namaKelengkapan,
      isWajib: k.isWajib,
      isBeasiswa: k.isBeasiswa,
      upload: upload
        ? { id: upload.id, fileName: upload.fileName, file: upload.file, updatedAt: upload.updatedAt }
        : null,
    };
  });
};

const uploadMyDokumen = async (pesertaId, dokumenKelengkapanId, payload) => {
  const kelengkapan = await DokumenKelengkapan.findByPk(dokumenKelengkapanId);
  if (!kelengkapan) throw new ApiError(404, 'Jenis dokumen kelengkapan not found');

  const existing = await PesertaDokumen.findOne({ where: { pesertaId, dokumenKelengkapanId } });
  let dokumen;
  if (existing) {
    await existing.update({ fileName: payload.fileName, file: payload.file });
    dokumen = existing;
  } else {
    dokumen = await PesertaDokumen.create({ pesertaId, dokumenKelengkapanId, ...payload });
  }
  await syncFlagDokumen(pesertaId);
  return dokumen;
};

const removeMyDokumen = async (pesertaId, dokumenKelengkapanId) => {
  const existing = await PesertaDokumen.findOne({ where: { pesertaId, dokumenKelengkapanId } });
  if (!existing) throw new ApiError(404, 'Dokumen not found');
  await existing.destroy();
  await syncFlagDokumen(pesertaId);
};

/**
 * Rekap PMB per tahun (berdasarkan tanggal akun peserta dibuat) dalam rentang tanggal:
 *  - Tamu        : semua akun peserta yang terdaftar di portal PMB
 *  - Mendaftar   : peserta yang sudah mengisi biodata/formulir pendaftaran
 *  - Daftar Ulang: peserta yang sudah dijadikan Mahasiswa (sudah punya NIM)
 */
const getGrafikTahunan = async ({ dariTanggal, sampaiTanggal } = {}) => {
  const where = {};
  if (dariTanggal || sampaiTanggal) {
    where.createdAt = {};
    if (dariTanggal) where.createdAt[Op.gte] = new Date(`${dariTanggal}T00:00:00`);
    if (sampaiTanggal) where.createdAt[Op.lte] = new Date(`${sampaiTanggal}T23:59:59`);
  }

  const rows = await Peserta.findAll({
    where,
    attributes: ['id', 'createdAt'],
    include: [
      { model: PesertaBiodata, as: 'biodata', attributes: ['id', 'nik'], required: false },
      { model: Mahasiswa, as: 'mahasiswa', attributes: ['id'], required: false },
    ],
  });

  const byTahun = new Map();
  rows.forEach((p) => {
    const tahun = new Date(p.createdAt).getFullYear();
    if (!byTahun.has(tahun)) byTahun.set(tahun, { tahun, tamu: 0, mendaftar: 0, daftarUlang: 0 });
    const entry = byTahun.get(tahun);
    entry.tamu += 1;
    // Biodata bisa berisi data pendidikan saja; dianggap mendaftar bila biodata pribadi (NIK) sudah diisi.
    if (p.biodata?.nik) entry.mendaftar += 1;
    if (p.mahasiswa) entry.daftarUlang += 1;
  });

  return [...byTahun.values()].sort((a, b) => a.tahun - b.tahun);
};

module.exports = {
  getGrafikTahunan,
  listPeserta,
  getPesertaById,
  registerPeserta,
  createPeserta,
  updatePeserta,
  deletePeserta,
  loginPeserta,
  gantiPasswordSaya,
  resetPasswordDefault,
  forgotPasswordPeserta,
  resetPasswordPeserta,
  getMyProfile,
  updateMyProfile,
  saveBiodata,
  setBiodataLock,
  removeBiodata,
  listMyDokumen,
  uploadMyDokumen,
  removeMyDokumen,
};
