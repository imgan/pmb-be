const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { User, Role, Menu, RoleMenuPermission } = require('../models');
const ApiError = require('../utils/ApiError');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { generateResetToken, hashToken } = require('../utils/resetToken');
const { sendMail } = require('../utils/mailer');

const buildTokenPayload = (user) => ({ sub: user.id, roleId: user.roleId, roleCode: user.role?.code });

const login = async (username, password) => {
  const user = await User.scope(['withPassword', 'withPhoto']).findOne({
    where: { username },
    include: [{ model: Role, as: 'role' }],
  });
  if (!user) throw new ApiError(401, 'Username atau password salah');
  if (!user.isActive) throw new ApiError(403, 'Akun tidak aktif');

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new ApiError(401, 'Username atau password salah');

  user.lastLoginAt = new Date();
  await user.save();

  const payload = buildTokenPayload(user);
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken({ sub: user.id });

  const safeUser = user.toJSON();
  delete safeUser.password;
  delete safeUser.resetPasswordToken;
  delete safeUser.resetPasswordExpires;

  return { user: safeUser, accessToken, refreshToken };
};

const refresh = async (token) => {
  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch (err) {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  const user = await User.findByPk(payload.sub, { include: [{ model: Role, as: 'role' }] });
  if (!user || !user.isActive) throw new ApiError(401, 'User is not authorized');

  const accessToken = generateAccessToken(buildTokenPayload(user));
  return { accessToken };
};

const getMe = async (userId) => {
  const user = await User.scope('withPhoto').findByPk(userId, { include: [{ model: Role, as: 'role' }] });
  if (!user) throw new ApiError(404, 'User not found');

  const permissions = await RoleMenuPermission.findAll({
    where: { roleId: user.roleId },
    include: [{ model: Menu, as: 'menu' }],
  });

  return { user, permissions };
};

const forgotPassword = async (email) => {
  const user = await User.findOne({ where: { email } });
  if (!user || !user.isActive) return;

  const { rawToken, hashedToken, expiresAt } = generateResetToken();
  await user.update({ resetPasswordToken: hashedToken, resetPasswordExpires: expiresAt });

  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin/reset-password?token=${rawToken}`;
  try {
    await sendMail({
      to: user.email,
      subject: 'Reset Password Admin Console',
      html: `
        <p>Halo ${user.name},</p>
        <p>Kami menerima permintaan reset password untuk akun Anda. Klik link berikut untuk membuat password baru (berlaku 1 jam):</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>Jika Anda tidak meminta reset password, abaikan email ini.</p>
      `,
    });
  } catch {
    // Diamkan kegagalan kirim email supaya respons ke client tetap generik (tidak bocorkan status akun)
  }
};

const resetPassword = async (token, newPassword) => {
  const hashedToken = hashToken(token);
  const user = await User.scope('withResetToken').findOne({
    where: { resetPasswordToken: hashedToken, resetPasswordExpires: { [Op.gt]: new Date() } },
  });
  if (!user) throw new ApiError(400, 'Token reset password tidak valid atau sudah kedaluwarsa');

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await user.update({ password: hashedPassword, resetPasswordToken: null, resetPasswordExpires: null });
};

const changePassword = async (userId, oldPassword, newPassword) => {
  const user = await User.scope('withPassword').findByPk(userId);
  if (!user) throw new ApiError(404, 'User not found');

  const isMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isMatch) throw new ApiError(400, 'Password lama salah');

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await user.update({ password: hashedPassword });
};

const updateProfile = async (userId, payload) => {
  const user = await User.findByPk(userId);
  if (!user) throw new ApiError(404, 'User not found');

  await user.update(payload);
  return User.scope('withPhoto').findByPk(userId, { include: [{ model: Role, as: 'role' }] });
};

module.exports = { login, refresh, getMe, forgotPassword, resetPassword, changePassword, updateProfile };
