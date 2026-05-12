const crypto = require('crypto');
const User = require('../models/User');
const { createJwtToken } = require('../utils/tokens');
const sendEmail = require('../utils/email');
const { toPublicUrl } = require('../utils/media');

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
};

const sendAuthResponse = (res, user) => {
  const token = createJwtToken(user._id);
  res.cookie('token', token, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });
  return res.json({
    token,
    user: user.getPublicProfile(),
  });
};

const register = async (req, res) => {
  const { name, username, email, password } = req.body;
  const normalizedUsername = username?.toLowerCase().trim();
  const normalizedEmail = email?.toLowerCase().trim();

  if (!name || !normalizedUsername || !normalizedEmail || !password) {
    return res.status(400).json({ message: 'All required fields must be provided' });
  }

  const existing = await User.findOne({ $or: [{ username: normalizedUsername }, { email: normalizedEmail }] });
  if (existing) {
    return res.status(409).json({ message: 'Username or email already in use' });
  }

  const user = await User.create({
    name,
    username: normalizedUsername,
    email: normalizedEmail,
    password,
    avatar: req.file ? toPublicUrl(req.file.path) : '',
  });

  return sendAuthResponse(res.status(201), user);
};

const login = async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    return res.status(400).json({ message: 'Identifier and password are required' });
  }

  const normalizedIdentifier = identifier.toLowerCase().trim();

  const user = await User.findOne({
    $or: [{ email: normalizedIdentifier }, { username: normalizedIdentifier }],
  }).select('+password');

  if (!user) {
    return res.status(401).json({ message: 'Invalid login credentials' });
  }

  const matches = await user.comparePassword(password);
  if (!matches) {
    return res.status(401).json({ message: 'Invalid login credentials' });
  }

  const publicUser = await User.findById(user._id);
  return sendAuthResponse(res, publicUser);
};

const logout = async (_req, res) => {
  res.clearCookie('token', cookieOptions);
  res.json({ message: 'Logged out successfully' });
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return res.status(200).json({ message: 'If the account exists, a reset email was sent' });
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.resetPasswordExpires = Date.now() + 1000 * 60 * 30;
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
  await sendEmail({
    to: user.email,
    subject: 'Reset your SOCIAL MEDIA PLATEFORM password',
    html: `<p>Click to reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
  });

  res.json({ message: 'If the account exists, a reset email was sent' });
};

const resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ message: 'Password is required' });
  }

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() },
  }).select('+password');

  if (!user) {
    return res.status(400).json({ message: 'Reset token is invalid or expired' });
  }

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  const publicUser = await User.findById(user._id);
  return sendAuthResponse(res, publicUser);
};

const getMe = async (req, res) => {
  res.json({ user: req.user.getPublicProfile() });
};

module.exports = { register, login, logout, forgotPassword, resetPassword, getMe };