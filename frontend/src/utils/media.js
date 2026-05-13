/**
 * Construct full media URL from a relative or absolute path.
 * @param {string} mediaUrl - Relative path like "/uploads/posts/..."
 * @returns {string} - Full absolute URL
 */
export const getMediaUrl = (mediaUrl) => {
  if (!mediaUrl) return '';

  if (
    mediaUrl.startsWith('http://') ||
    mediaUrl.startsWith('https://') ||
    mediaUrl.startsWith('data:') ||
    mediaUrl.startsWith('blob:')
  ) {
    return mediaUrl;
  }

  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const baseUrl = apiBase.replace('/api', '');

  return `${baseUrl}${mediaUrl.startsWith('/') ? mediaUrl : `/${mediaUrl}`}`;
};

export const getAvatarUrl = (avatarUrl) => getMediaUrl(avatarUrl);

/**
 * Validate if media URL is valid and not empty
 * @param {string} mediaUrl - URL to validate
 * @returns {boolean}
 */
export const isValidMediaUrl = (mediaUrl) => {
  return Boolean(mediaUrl && mediaUrl.trim().length > 0);
};
