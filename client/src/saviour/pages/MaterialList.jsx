/**
 * Material list for one (course, kind, year) (Saviour)
 *
 * Reached from the course page: each non-exam kind shows year links, and a
 * year opens this. The point is a page you can land on and navigate from -
 * breadcrumb back to the course, and the other years of the same kind one
 * click away, so browsing "assignments across the years" never means bouncing
 * back to the course in between.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import DriveViewer from '../components/DriveViewer';
import { courseAPI, kindLabel, kindLabelPlural } from '../api';
import '../saviour.css';

const MaterialList = () => {
  const { code, kind, year } = useParams();
  const navigate = useNavigate();
  const numericYear = Number(year);

  const [view, setView] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await courseAPI.materials(code);
      setView(data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load this course');
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    load();
  }, [load]);

  // Every material on the course, flattened out of the two shapes the course
  // view returns, so this page works for any kind.
  const allOfKind = useMemo(() => {
    if (!view) return [];
    const fromPapers = (view.papers?.rows || []).flatMap((row) =>
      Object.values(row.cells).flatMap((cell) => cell.materials)
    );
    const fromTeaching = (view.teaching || []).flatMap((group) =>
      group.materials.map((material) => ({ ...material, department: material.department || group.department }))
    );
    return [...fromPapers, ...fromTeaching].filter((material) => material.kind === kind);
  }, [view, kind]);

  // Years this kind exists for, newest first - the year navigation
  const years = useMemo(
    () => [...new Set(allOfKind.map((material) => material.year))].sort((a, b) => b - a),
    [allOfKind]
  );

  const items = useMemo(
    () =>
      allOfKind
        .filter((material) => material.year === numericYear)
        .sort((a, b) => a.title.localeCompare(b.title)),
    [allOfKind, numericYear]
  );

  if (loading) return <div className="sv-page sv-empty">Loading…</div>;
  if (error) return <div className="sv-page"><div className="sv-error">{error}</div></div>;

  const canonical = view.canonicalCode;

  return (
    <div className="sv-page">
      {/* Breadcrumb: where you are and the way back */}
      <nav className="sv-crumbs" aria-label="Breadcrumb">
        <Link to="/saviour">Courses</Link>
        <span aria-hidden="true">/</span>
        <Link to={`/saviour/course/${code}`}>{canonical}</Link>
        <span aria-hidden="true">/</span>
        <span>{kindLabelPlural(kind)}</span>
        <span aria-hidden="true">/</span>
        <span className="sv-crumb-current">{numericYear}</span>
      </nav>

      <header className="sv-header">
        <h1>
          {kindLabelPlural(kind)} · {numericYear}
        </h1>
        <p className="sv-muted">
          <span className="sv-code sv-code-lg">{canonical}</span> {view.course.name}
        </p>
      </header>

      {/* Other years of the same kind, one click away */}
      {years.length > 1 && (
        <div className="sv-year-nav">
          <span className="sv-muted">Other years:</span>
          {years.map((otherYear) => (
            <Link
              key={otherYear}
              to={`/saviour/course/${code}/${kind}/${otherYear}`}
              className={`sv-year-pill ${otherYear === numericYear ? 'is-current' : ''}`}
            >
              {otherYear}
            </Link>
          ))}
        </div>
      )}

      {items.length === 0 ? (
        <div className="sv-empty">
          No {kindLabelPlural(kind).toLowerCase()} filed for {numericYear}.
        </div>
      ) : (
        <ul className="sv-items sv-items-standalone">
          {items.map((material) => (
            <li key={material._id}>
              <button type="button" className="sv-item" onClick={() => setViewing(material)}>
                <span className="sv-item-kind">{kindLabel(material.kind)}</span>
                <span className="sv-item-title">{material.title}</span>
              </button>
              <span className="sv-item-meta sv-muted">
                {(material.professors || []).map((prof) => prof.name).join(', ') || '—'}
                {' · '}{material.department.toUpperCase()}
                {' · batch of '}{material.graduatingBatch}
                {material.origin === 'saviour_drive' ? ' · saviour Drive' : ''}
                {material.upvotes > 0 ? ` · ${material.upvotes}▲` : ''}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="sv-actions" style={{ marginTop: '2rem' }}>
        <button className="sv-btn" onClick={() => navigate(`/saviour/course/${code}`)}>
          ← Back to {canonical}
        </button>
        <Link className="sv-btn sv-btn-ghost" to={`/saviour/add?course=${view.course._id}`}>
          Add {kindLabel(kind).toLowerCase()}
        </Link>
      </div>

      {viewing && <DriveViewer material={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
};

export default MaterialList;
