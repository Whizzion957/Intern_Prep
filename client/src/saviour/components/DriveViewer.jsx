/**
 * Drive viewer (Saviour)
 *
 * Previews a Google Drive file in place instead of throwing the reader into a
 * new Drive tab and losing the course page. Drive's /preview endpoint is built
 * to be iframed and renders PDFs, images, docs and slides, so there is no PDF
 * library here and nothing is proxied through our server.
 *
 * It doubles as the sharing check: the iframe only renders for files shared
 * "anyone with the link". If a custodian sees the fallback in the approval
 * panel, the student's file is still private and should be sent back.
 */

import { useEffect, useState } from 'react';

const DriveViewer = ({ material, onClose }) => {
  const [slow, setSlow] = useState(false);

  // Close on Escape, and lock the page behind the overlay
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);

    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // We can't detect a blocked iframe cross-origin, so after a few seconds we
    // just offer the way out rather than leaving people staring at a blank box.
    const timer = setTimeout(() => setSlow(true), 4000);

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
      clearTimeout(timer);
    };
  }, [onClose]);

  if (!material) return null;

  return (
    <div className="sv-viewer" role="dialog" aria-modal="true" aria-label={material.title}>
      <div className="sv-viewer-backdrop" onClick={onClose} />

      <div className="sv-viewer-panel">
        <header className="sv-viewer-bar">
          <div className="sv-viewer-title">
            <strong>{material.title}</strong>
            <span className="sv-muted">
              {material.codeAtTime} · {material.year}
              {material.professors?.length
                ? ` · ${material.professors.map((prof) => prof.name).join(', ')}`
                : ''}
            </span>
          </div>

          <div className="sv-viewer-actions">
            {/* No download button: these are view-only Drive links, so an
                export URL just returns Drive's permission page. Drive's own
                download lives inside the file, when the owner allows it. */}
            <a className="sv-btn sv-btn-ghost" href={material.view} target="_blank" rel="noopener noreferrer">
              Open in Drive
            </a>
            <button className="sv-btn sv-btn-ghost" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>
        </header>

        <div className="sv-viewer-frame">
          <iframe
            src={material.preview}
            title={material.title}
            allow="autoplay"
            loading="lazy"
          />
        </div>

        {slow && (
          <p className="sv-viewer-hint sv-muted">
            Nothing showing? The file is probably not shared with “Anyone with the
            link”. Use “Report” on the course page so a custodian can chase it.
          </p>
        )}
      </div>
    </div>
  );
};

export default DriveViewer;
