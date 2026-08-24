const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { Peserta, GolonganKelas, Jurusan, PesertaBiodata, PesertaDokumen, DokumenKelengkapan } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const generateRandomPassword = require('../utils/generatePassword');
const { sendMail } = require('../utils/mailer');
const { generateAccessToken } = require('../utils/jwt');
const { generateResetToken, hashToken } = require('../utils/resetToken');
const { resolveOrder } = require('../utils/sorting');

const includeRelations = [
  { model: GolonganKelas, as: 'golonganKelas' },
  { model: Jurusan, as: 'jurusan' },
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
        <p>Email: ${peserta.email}<br/>Password: <b>${plainPassword}</b></p>
        <p>Segera login dan ganti password Anda demi keamanan akun.</p>
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

const createPesertaWithGeneratedPassword = async (payload, actorId) => {
  await ensureKelasJurusanValid(payload.golonganKelasId, payload.jurusanId);

  const existing = await Peserta.findOne({ where: { email: payload.email } });
  if (existing) throw new ApiError(409, 'Email already registered');

  const plainPassword = generateRandomPassword();
  const hashed = await bcrypt.hash(plainPassword, 10);

  const peserta = await Peserta.create({
    ...payload,
    password: hashed,
    createdBy: actorId,
    updatedBy: actorId,
  });

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

  if (payload.email) {
    const existing = await Peserta.findOne({ where: { email: payload.email, id: { [Op.ne]: id } } });
    if (existing) throw new ApiError(409, 'Email already registered');
  }

  await peserta.update({ ...payload, updatedBy: actorId });
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

  if (payload.email) {
    const existing = await Peserta.findOne({ where: { email: payload.email, id: { [Op.ne]: pesertaId } } });
    if (existing) throw new ApiError(409, 'Email already registered');
  }

  await peserta.update(payload);
  return getPesertaById(pesertaId);
};

const deletePeserta = async (id, actorId) => {
  const peserta = await Peserta.findByPk(id);
  if (!peserta) throw new ApiError(404, 'Peserta not found');
  await peserta.update({ updatedBy: actorId });
  await peserta.destroy();
};

const loginPeserta = async (email, password) => {
  const peserta = await Peserta.scope('withPassword').findOne({ where: { email } });
  if (!peserta) throw new ApiError(401, 'Email atau password salah');
  if (!peserta.isActive) throw new ApiError(403, 'Akun peserta tidak aktif');

  const isMatch = await bcrypt.compare(password, peserta.password);
  if (!isMatch) throw new ApiError(401, 'Email atau password salah');

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
  await peserta.update({ password: hashedPassword, resetPasswordToken: null, resetPasswordExpires: null });
};

const getMyProfile = (pesertaId) => getPesertaById(pesertaId);

const saveBiodata = async (pesertaId, payload) => {
  const peserta = await Peserta.findByPk(pesertaId);
  if (!peserta) throw new ApiError(404, 'Peserta not found');

  const existingByNik = await PesertaBiodata.findOne({ where: { nik: payload.nik, pesertaId: { [Op.ne]: pesertaId } } });
  if (existingByNik) throw new ApiError(409, 'NIK already registered');

  const biodata = await PesertaBiodata.findOne({ where: { pesertaId } });
  if (biodata) {
    await biodata.update(payload);
  } else {
    await PesertaBiodata.create({ ...payload, pesertaId });
  }

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
  if (existing) {
    await existing.update({ fileName: payload.fileName, file: payload.file });
    return existing;
  }
  return PesertaDokumen.create({ pesertaId, dokumenKelengkapanId, ...payload });
};

const removeMyDokumen = async (pesertaId, dokumenKelengkapanId) => {
  const existing = await PesertaDokumen.findOne({ where: { pesertaId, dokumenKelengkapanId } });
  if (!existing) throw new ApiError(404, 'Dokumen not found');
  await existing.destroy();
};

module.exports = {
  listPeserta,
  getPesertaById,
  registerPeserta,
  createPeserta,
  updatePeserta,
  deletePeserta,
  loginPeserta,
  forgotPasswordPeserta,
  resetPasswordPeserta,
  getMyProfile,
  updateMyProfile,
  saveBiodata,
  listMyDokumen,
  uploadMyDokumen,
  removeMyDokumen,
};
