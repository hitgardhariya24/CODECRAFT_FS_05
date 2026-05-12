const jwt = require('jsonwebtoken');
const User = require('../models/User');

const getTokenFromRequest = (req) => {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    return header.split(' ')[1];
  }
  return req.cookies?.token;
};

const protect = async (req, res, next) => {
  const token = getTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({ message: 'Not authorized, token missing' });
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.id).select('-password');
  if (!user) {
    return res.status(401).json({ message: 'Not authorized, user not found' });
  }

  req.user = user;
  next();
};

const optionalAuth = async (req, _res, next) => {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return next();
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (user) req.user = user;
  } catch (_error) {
    // ignore invalid optional auth
  }
  next();
};

module.exports = { protect, optionalAuth };