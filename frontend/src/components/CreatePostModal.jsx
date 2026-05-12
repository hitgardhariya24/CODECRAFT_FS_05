import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';

export default function CreatePostModal({ open, onClose, onSubmit, form, setForm, mediaPreview, setMediaFiles, setMediaPreview, variant = 'modal' }) {
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleDrop = (event) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files || []);
    setMediaFiles(files);
    setMediaPreview(files.map((file) => URL.createObjectURL(file)));
  };

  const body = (
    <>
      <div className="modal-head">
        <div>
          <p className="eyebrow">Create post</p>
          <h3>Share something new</h3>
        </div>
        <button className="ghost-btn" type="button" onClick={onClose}>Close</button>
      </div>

      <form className="composer-form create-post-form" onSubmit={onSubmit}>
        <div className="drop-zone" onDrop={handleDrop} onDragOver={(event) => event.preventDefault()}>
          <strong>Drag and drop photos or videos here</strong>
          <p>Or choose files from your device</p>
          <input type="file" multiple accept="image/*,video/*" onChange={(event) => {
            const files = Array.from(event.target.files || []);
            setMediaFiles(files);
            setMediaPreview(files.map((file) => URL.createObjectURL(file)));
          }} />
        </div>

        {mediaPreview?.length ? (
          <div className="preview-grid">
            {mediaPreview.map((preview) => <img key={preview} src={preview} alt="preview" className="preview-thumb" />)}
          </div>
        ) : null}

        <textarea rows={4} value={form.text} onChange={(event) => setForm((current) => ({ ...current, text: event.target.value }))} placeholder="Write a caption..." />
        <div className="grid-2">
          <input value={form.hashtags} onChange={(event) => setForm((current) => ({ ...current, hashtags: event.target.value }))} placeholder="Add hashtags" />
          <input value={form.taggedUsers} onChange={(event) => setForm((current) => ({ ...current, taggedUsers: event.target.value }))} placeholder="Tag users" />
        </div>
        <input value={form.location || ''} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} placeholder="Add location" />
        <button className="primary-btn auth-submit" type="submit">Share post</button>
      </form>
    </>
  );

  return (
    <AnimatePresence>
      {open ? (
        variant === 'drawer' ? (
          <motion.div className="create-post-drawer-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
            <motion.aside
              className="create-post-drawer glass-card"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 280, damping: 34 }}
              onClick={(event) => event.stopPropagation()}
            >
              {body}
            </motion.aside>
          </motion.div>
        ) : (
          <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
            <motion.div
              className="modal-card"
              initial={{ opacity: 0, y: 28, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              transition={{ duration: 0.22 }}
              onClick={(event) => event.stopPropagation()}
            >
              {body}
            </motion.div>
          </motion.div>
        )
      ) : null}
    </AnimatePresence>
  );
}
