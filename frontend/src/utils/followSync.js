const FOLLOW_SYNC_EVENT = 'xverse:follow-sync';

export const emitFollowSync = (payload = {}) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(FOLLOW_SYNC_EVENT, { detail: payload }));
};

export const subscribeFollowSync = (handler) => {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const listener = (event) => {
    handler?.(event.detail || {});
  };

  window.addEventListener(FOLLOW_SYNC_EVENT, listener);
  return () => window.removeEventListener(FOLLOW_SYNC_EVENT, listener);
};
