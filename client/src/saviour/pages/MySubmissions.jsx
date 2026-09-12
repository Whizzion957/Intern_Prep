/**
 * My submissions (Saviour)
 *
 * Where a decision reaches the person who made the submission. A custodian's
 * rejection note is written here and nowhere else, so without this page a
 * student only ever sees their material silently fail to appear.
 *
 * Rejected and withdrawn records are deleted by the database 30 days after the
 * decision, so this list thins itself out and the free tier stays light.
 * Approved material stays: it is the content.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DriveViewer from '../components/DriveViewer';
import { materialAPI, courseAPI, kindLabel, examLabel } from '../api';
import '../saviour.css';

const STATUS_LABEL = {
  pending: 'Waiting on a custodian',
  approved: 'Approved',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

const REQUEST_STATUS_LABEL = {
  pending: 'Waiting on an admin',
  accepted: 'Added to the catalog',
  rejected: 'Rejected',
};

const codeOf = (course) =>
  (course?.codes || []).find((entry) => entry.current)?.code || course?.codes?.[0]?.code || '';

const MySubmissions = () => {
  const [materials, setMaterials] = useState([]);
  const [requests, setRequests] = useState([]);
  const [viewing, setViewing] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [mine, courseRequests] = await Promise.all([
        materialAPI.mine(),
        courseAPI.myRequests().catch(() => ({ data: { requests: [] } })),
      ]);
      setMaterials(mine.data.materials || []);
      setRequests(courseRequests.data.requests || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load your submissions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const withdraw = async (material) => {
    if (!window.confirm(`Withdraw "${material.title}"?`)) return;
    try {
      await materialAPI.withdraw(material._id);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not withdraw it');
    }
  };

  if (loading) return <div className="sv-page sv-empty">Loading…</div>;

  const nothing = materials.length === 0 && requests.length === 0;

  return (
    <div className="sv-page">
      <header className="sv-header">
        <h1>My submissions</h1>
        <p className="sv-muted">
          What you have sent in, and what your custodian decided. Rejected items are
          removed a month after the decision.
        </p>
      </header>

      {error && <div className="sv-error">{error}</div>}

      {nothing && (
        <div className="sv-empty">
          You have not submitted anything yet.{' '}
          <Link to="/saviour/add">Add material</Link>.
        </div>
      )}

      {materials.length > 0 && (
        <section className="sv-section">
          <h2>Material</h2>
          <ul className="sv-history">
            {materials.map((material) => (
              <li key={material._id} className="sv-history-item" data-status={material.status}>
                <div className="sv-history-main">
                  <button type="button" className="sv-item-title-btn" onClick={() => setViewing({
                    ...material,
                    view: material.urls?.view,
                    preview: material.urls?.preview,
                  })}>
                    {material.title}
                  </button>
                  <span className="sv-muted">
                    <span className="sv-code">{codeOf(material.course)}</span>
                    {' '}{kindLabel(material.kind)}
                    {material.exam ? ` · ${examLabel(material.exam)}` : ''}
                    {' '}· {material.year} · {material.department?.toUpperCase()} · batch of {material.graduatingBatch}
                  </span>
                </div>

                <div className="sv-history-side">
                  <span className={`sv-status sv-status-${material.status}`}>
                    {STATUS_LABEL[material.status] || material.status}
                  </span>
                  {material.status === 'pending' && (
                    <button
                      type="button"
                      className="sv-btn sv-btn-ghost sv-btn-sm"
                      onClick={() => withdraw(material)}
                    >
                      Withdraw
                    </button>
                  )}
                </div>

                {material.status === 'rejected' && material.decisionNote && (
                  <p className="sv-history-note">
                    <strong>Why:</strong> {material.decisionNote}
                  </p>
                )}
                {material.status === 'pending' && material.routedTo && (
                  <p className="sv-history-note sv-muted">With {material.routedTo}.</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {requests.length > 0 && (
        <section className="sv-section">
          <h2>Course requests</h2>
          <ul className="sv-history">
            {requests.map((request) => (
              <li key={request._id} className="sv-history-item" data-status={request.status}>
                <div className="sv-history-main">
                  <strong>
                    <span className="sv-code">{request.code}</span> {request.name}
                  </strong>
                  <span className="sv-muted">
                    asked {new Date(request.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="sv-history-side">
                  <span className={`sv-status sv-status-${request.status}`}>
                    {REQUEST_STATUS_LABEL[request.status] || request.status}
                  </span>
                  {request.status === 'accepted' && request.resultingCourse && (
                    <Link
                      className="sv-btn sv-btn-ghost sv-btn-sm"
                      to={`/saviour/course/${codeOf(request.resultingCourse) || request.code}`}
                    >
                      Open
                    </Link>
                  )}
                </div>

                {request.status === 'rejected' && request.reviewNote && (
                  <p className="sv-history-note">
                    <strong>Why:</strong> {request.reviewNote}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {viewing && <DriveViewer material={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
};

export default MySubmissions;
