const path = require('path');

const toPublicUrl = (filePath) => {
  if (!filePath) return '';

  const uploadsRoot = path.join(__dirname, '..', '..', '..');
  const relative = path.relative(uploadsRoot, filePath).split(path.sep).join('/');
  return `/${relative}`;
};

module.exports = { toPublicUrl };