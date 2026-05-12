const extractHashtags = (text = '', extraHashtags = []) => {
  const tags = [...extraHashtags];
  const regex = /#([\w-]+)/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    tags.push(match[1].toLowerCase());
  }
  return [...new Set(tags.map((tag) => tag.replace(/^#/, '').toLowerCase()))];
};

const buildMediaPayload = (files = []) =>
  files.map((file) => ({
    url: file.url,
    type: file.mimetype.startsWith('video/') ? 'video' : 'image',
    originalName: file.originalname,
  }));

module.exports = { extractHashtags, buildMediaPayload };