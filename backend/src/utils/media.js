const path = require('path');

const toPublicUrl = (filePath) => {
  if (!filePath) return '';
  const relative = path.relative(path.join(__dirname, '..', '..'), filePath).split(path.sep).join('/');
  return `/${relative}`;
};

module.exports = { toPublicUrl };