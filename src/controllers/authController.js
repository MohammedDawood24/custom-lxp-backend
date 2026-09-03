import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Op } from 'sequelize';
import { User, RefreshToken, SiteSettings } from '../models/index.js';
import { ApiResponse } from '../utils/apiResponse.js';
import logger from '../utils/logger.js';

const generateAccessToken = (user) =>
  jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m',
  });

const generateRefreshToken = async (user) => {
  const token = jwt.sign({ sub: user.id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d',
  });
  const decoded = jwt.decode(token);
  await RefreshToken.create({
    token,
    user_id: user.id,
    expires_at: new Date(decoded.exp * 1000),
  });
  return token;
};

export const register = async (req, res, next) => {
  try {
    // Check if registration is enabled
    const regSetting = await SiteSettings.findOne({ where: { key: 'registration_enabled' } });
    if (regSetting && regSetting.value === 'false') {
      return ApiResponse.forbidden(res, 'Registration is currently disabled');
    }

    const { first_name, last_name, email, password } = req.body;

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return ApiResponse.badRequest(res, 'Email already registered');
    }

    const user = await User.create({
      first_name,
      last_name,
      email,
      password_hash: password,
      role: 'user',
    });

    const accessToken = generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user);

    logger.info(`User registered: ${email}`);

    return ApiResponse.created(res, {
      user: user.toSafeJSON(),
      accessToken,
      refreshToken,
    }, 'Registration successful');
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user || !(await user.validatePassword(password))) {
      return ApiResponse.unauthorized(res, 'Invalid email or password');
    }

    if (user.status !== 'active') {
      return ApiResponse.forbidden(res, `Account is ${user.status}`);
    }

    user.last_login_at = new Date();
    await user.save({ hooks: false });

    const accessToken = generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user);

    return ApiResponse.success(res, {
      user: user.toSafeJSON(),
      accessToken,
      refreshToken,
    }, 'Login successful');
  } catch (err) {
    next(err);
  }
};

export const refreshAccessToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) return ApiResponse.badRequest(res, 'Refresh token required');

    const stored = await RefreshToken.findOne({ where: { token, revoked: false } });
    if (!stored || new Date() > stored.expires_at) {
      return ApiResponse.unauthorized(res, 'Invalid or expired refresh token');
    }

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findByPk(decoded.sub);
    if (!user || user.status !== 'active') {
      return ApiResponse.unauthorized(res, 'User not found or inactive');
    }

    // Rotate refresh token
    stored.revoked = true;
    await stored.save();

    const accessToken = generateAccessToken(user);
    const newRefreshToken = await generateRefreshToken(user);

    return ApiResponse.success(res, { accessToken, refreshToken: newRefreshToken });
  } catch (err) {
    next(err);
  }
};

export const logout = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;
    if (token) {
      await RefreshToken.update({ revoked: true }, { where: { token } });
    }
    return ApiResponse.success(res, null, 'Logged out');
  } catch (err) {
    next(err);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });

    // Always return success to prevent email enumeration
    if (!user) {
      return ApiResponse.success(res, null, 'If that email exists, a reset link has been sent');
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashed = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.password_reset_token = hashed;
    user.password_reset_expires = new Date(Date.now() + 30 * 60 * 1000); // 30 min
    await user.save({ hooks: false });

    // TODO: Send email with resetToken link
    logger.info(`Password reset requested for ${email}. Token: ${resetToken}`);

    return ApiResponse.success(res, null, 'If that email exists, a reset link has been sent');
  } catch (err) {
    next(err);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    const hashed = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      where: {
        password_reset_token: hashed,
        password_reset_expires: { [Op.gt]: new Date() },
      },
    });

    if (!user) {
      return ApiResponse.badRequest(res, 'Invalid or expired reset token');
    }

    user.password_hash = password;
    user.password_reset_token = null;
    user.password_reset_expires = null;
    await user.save();

    // Revoke all refresh tokens
    await RefreshToken.update({ revoked: true }, { where: { user_id: user.id } });

    return ApiResponse.success(res, null, 'Password reset successful');
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req, res) => {
  return ApiResponse.success(res, req.user.toSafeJSON());
};

export const changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    const user = req.user;

    if (!(await user.validatePassword(current_password))) {
      return ApiResponse.badRequest(res, 'Current password is incorrect');
    }

    user.password_hash = new_password;
    await user.save();

    // Revoke all refresh tokens to force re-login
    await RefreshToken.update({ revoked: true }, { where: { user_id: user.id } });

    const accessToken = generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user);

    return ApiResponse.success(res, { accessToken, refreshToken }, 'Password changed');
  } catch (err) {
    next(err);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { first_name, last_name, avatar_url } = req.body;
    const user = req.user;

    if (first_name) user.first_name = first_name;
    if (last_name) user.last_name = last_name;
    if (avatar_url !== undefined) user.avatar_url = avatar_url;

    await user.save({ hooks: false });
    return ApiResponse.success(res, user.toSafeJSON(), 'Profile updated');
  } catch (err) {
    next(err);
  }
};
