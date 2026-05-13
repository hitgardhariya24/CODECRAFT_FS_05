import { useEffect, useState } from 'react';
import { getAvatarUrl } from '../utils/media';

export default function AvatarImage({ src, alt = '', className = '', fallback = '/avatar-placeholder.svg', ...rest }) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const resolvedSrc = hasError ? fallback : getAvatarUrl(src) || fallback;

  return (
    <img
      {...rest}
      src={resolvedSrc}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
      draggable={false}
    />
  );
}
