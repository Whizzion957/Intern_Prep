/**
 * Approval panel (Saviour)
 *
 * Its own page, not a tab of the admin panel, because the people using it are
 * students - one per branch per graduating batch - not platform admins.
 *
 * Each submission is previewed inline. That preview is also the sharing check:
 * Drive only renders it for files shared "anyone with the link", so if the
 * custodian sees nothing, neither will anybody else and it goes back.
 *
 * Two ways to accept:
 *   Approve       the student's link stands as it is
 *   Move to Drive download it, upload into the batch's saviour folder, paste
 *                 that link. The record then points at a copy that outlives the
 *                 student who submitted it.
 */

import { useCallback, useEffect, useState } from 'react';
import DriveViewer from '../components/DriveViewer';
import CourseRequestQueue from '../components/CourseRequestQueue';
import { approvalAPI, custodianAPI, courseAPI, kindLabel, examLabel } from '../api';
import '../saviour.css';

const ApprovalPanel = () => {
  const [materials, setMaterials] = useState([]);
  const [courseRequests, setCourseRequests] = useState([]);
  const [scope, setScope] = useState({ custodianships: [], isSuperadmin: false, isAdmin: false });
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);
  const [relinking, setRelinking] = useState(null);
  const [relinkUrl, setRelinkUrl] = useState('');
  const [viewing, setViewing] = useState(null);

  const load = useCallback(async () => {
    try {
      const [queue, mine] = await Promise.all([approvalAPI.queue(), custodianAPI.mine()]);
      setMaterials(queue.data.materials);
      setNotice(queue.data.message || '');
      setScope(mine.data);

      // The catalog is admin-owned, so course requests are an admin queue
      // rather than a custodian one - a custodian who isn't an admin gets 403
      // here, which is expected and not an error worth showing.
      if (mine.data.isAdmin) {
        const requests = await courseAPI.listRequests('pending').catch(() => null);
        setCourseRequests(requests?.data?.requests || []);
      } else {
        setCourseRequests([]);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load the approval panel');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const drop = (id) => setMaterials((prev) => prev.filter((item) => item._id !== id));

  const decide = async (material, decision) => {
    const note =
      decision === 'rejected'
        ? window.prompt('Why? The submitter sees this.') || 'Rejected'
        : undefined;

    setBusy(material._id);
    try {
      await approvalAPI.decide(material._id, decision, note);
      drop(material._id);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not record the decision');
    } finally {
      setBusy(null);
    }
  };

  const relink = async (material) => {
    if (!relinkUrl.trim()) return;
    setBusy(material._id);
    try {
      await approvalAPI.relink(material._id, relinkUrl.trim(), true);
      drop(material._id);
      setRelinking(null);
      setRelinkUrl('');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not relink');
    } finally {
      setBusy(null);
    }
  };

  // Where this custodian should be re-uploading, if a folder was recorded
  const folderFor = (material) =>
    scope.custodianships.find(
      (entry) =>
        entry.department === material.department &&
        entry.graduatingBatch === material.graduatingBatch
    )?.driveFolderUrl;

  return (
    <div className="sv-page">
      <header className="sv-header">
        <h1>Approvals</h1>
        <p className="sv-muted">
          {scope.isSuperadmin
            ? 'You are a superadmin — this is every pending submission.'
            : scope.custodianships.length > 0
              ? `You look after ${scope.custodianships
                  .map((entry) => `${entry.department.toUpperCase()} ’${String(entry.graduatingBatch).slice(2)}`)
                  .join(', ')}.`
              : 'You are not a custodian for any branch or batch.'}
        </p>
      </header>

      {error && <div className="sv-error">{error}</div>}

      {/* Course requests first: a pending one often blocks somebody from
          submitting material at all. */}
      <CourseRequestQueue requests={courseRequests} onChange={load} />

      {materials.length > 0 && <h2 className="sv-section-title">Material submissions</h2>}
      {notice && materials.length === 0 && <div className="sv-notice">{notice}</div>}
      {!notice && materials.length === 0 && courseRequests.length === 0 && (
        <div className="sv-empty">Nothing waiting.</div>
      )}

      {materials.map((material) => (
        <article className="sv-approval" key={material._id}>
          <div className="sv-approval-preview">
            {/* Renders only if the file really is public - that is the check */}
            <iframe src={material.urls.preview} title={material.title} loading="lazy" />
          </div>

          <div className="sv-approval-body">
            <h3>
              <span className="sv-code">{material.codeAtTime}</span> {material.title}
            </h3>

            <div className="sv-queue-meta">
              <span>{material.course?.name}</span>
              <span>
                {kindLabel(material.kind)}
                {material.exam ? ` · ${examLabel(material.exam)}` : ''}
              </span>
              <span>{material.year}</span>
              <span>
                {material.department.toUpperCase()} · batch of {material.graduatingBatch}
              </span>
              {material.professors?.length > 0 && (
                <span>
                  {material.professors.map((prof) => prof.name).join(', ')}
                  {material.professors.some((prof) => !prof.verified) && ' (unverified name)'}
                </span>
              )}
              <span>by {material.submittedBy?.fullName}</span>
              <span className="sv-badge sv-badge-drive">student Drive</span>
            </div>

            {material.note && <p className="sv-muted">{material.note}</p>}

            <div className="sv-actions">
              <button className="sv-btn sv-btn-ghost" onClick={() => setViewing({
                ...material,
                preview: material.urls.preview,
                view: material.urls.view,
                download: material.urls.download,
              })}>
                Full screen
              </button>
              <a className="sv-btn sv-btn-ghost" href={material.urls.download} target="_blank" rel="noopener noreferrer">
                Download
              </a>
              <button className="sv-btn" disabled={busy === material._id} onClick={() => decide(material, 'approved')}>
                Approve as-is
              </button>
              <button
                className="sv-btn sv-btn-ghost"
                onClick={() => {
                  setRelinking(relinking === material._id ? null : material._id);
                  setRelinkUrl('');
                }}
              >
                Move to saviour Drive
              </button>
              <button className="sv-btn sv-btn-ghost" disabled={busy === material._id} onClick={() => decide(material, 'rejected')}>
                Reject
              </button>
            </div>

            {relinking === material._id && (
              <div className="sv-relink">
                <p className="sv-muted">
                  Download it, upload it into the batch folder
                  {folderFor(material) && (
                    <>
                      {' '}(<a href={folderFor(material)} target="_blank" rel="noopener noreferrer">open folder</a>)
                    </>
                  )}
                  , then paste the new file’s link. Approving happens in the same step.
                </p>
                <div className="sv-relink-row">
                  <input
                    className="sv-input"
                    value={relinkUrl}
                    placeholder="https://drive.google.com/file/d/…"
                    onChange={(event) => setRelinkUrl(event.target.value)}
                  />
                  <button className="sv-btn" disabled={busy === material._id || !relinkUrl.trim()} onClick={() => relink(material)}>
                    Save &amp; approve
                  </button>
                </div>
              </div>
            )}
          </div>
        </article>
      ))}

      {viewing && <DriveViewer material={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
};

export default ApprovalPanel;
