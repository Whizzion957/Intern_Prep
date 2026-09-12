/**
 * Course page (Saviour)
 *
 * The page answers two different questions, so it is laid out in two different
 * shapes rather than one long list.
 *
 *   Exam papers  -> a year x exam grid. Everyone who sat a given exam wrote the
 *                   same paper, so the paper belongs to the sitting, not to a
 *                   lecturer. An empty cell is as informative as a full one, so
 *                   gaps are rendered and clickable.
 *
 *   Everything else -> grouped by (year, branch, professor), newest first.
 *                   Notes and slides are worthless detached from whoever gave
 *                   them; one course has several professors in a year, one per
 *                   branch cohort, and different ones across years.
 *
 * Filters narrow both at once, because "show me what is relevant to me" is a
 * cohort question, not a section question.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import DriveViewer from '../components/DriveViewer';
import { courseAPI, materialAPI, kindLabel, examLabel } from '../api';
import '../saviour.css';

const CourseDetail = () => {
  const { code } = useParams();

  const [meta, setMeta] = useState(null);
  const [view, setView] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({ batch: '', department: '', professor: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [courseRes, materialsRes] = await Promise.all([
        courseAPI.get(code),
        courseAPI.materials(code),
      ]);
      setMeta(courseRes.data);
      setView(materialsRes.data);
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

  const matches = useCallback(
    (material) =>
      (!filters.batch || String(material.graduatingBatch) === filters.batch) &&
      (!filters.department || material.department === filters.department) &&
      (!filters.professor ||
        (material.professors || []).some((prof) => String(prof._id) === filters.professor)),
    [filters]
  );

  const teaching = useMemo(
    () =>
      (view?.teaching || [])
        .map((group) => ({ ...group, materials: group.materials.filter(matches) }))
        .filter((group) => group.materials.length > 0),
    [view, matches]
  );

  const request = async (year, exam) => {
    await materialAPI.request({ course: view.course._id, kind: 'past_paper', exam, year });
    load();
  };

  if (loading) return <div className="sv-page sv-empty">Loading…</div>;
  if (error) return <div className="sv-page"><div className="sv-error">{error}</div></div>;

  const { course, papers, filters: options, counts } = view;

  return (
    <div className="sv-page">
      <header className="sv-header">
        <h1>
          <span className="sv-code sv-code-lg">{view.canonicalCode}</span> {course.name}
        </h1>
        <p className="sv-muted">
          {/* Who takes this, and in which semester - it differs per branch */}
          {course.allDepartments
            ? `All branches${course.defaultSemester ? ` · semester ${course.defaultSemester}` : ''}`
            : course.offeredTo
                .map((entry) => `${entry.department.toUpperCase()} sem ${entry.semester ?? '—'}`)
                .join(' · ')}
          {course.credits ? ` · ${course.credits} credits` : ''}
          {` · ${counts.total} item${counts.total === 1 ? '' : 's'}`}
        </p>
      </header>

      {meta.viaLegacyCode && (
        <div className="sv-notice">
          <strong>{code.toUpperCase()}</strong> is now <strong>{view.canonicalCode}</strong>.
          Everything filed under both codes is on this page.
        </div>
      )}

      {/* One filter bar for the whole page: batch and branch are cohort
          questions, professor is a "whose notes" question. */}
      {(options.batches.length > 1 || options.departments.length > 1 || options.professors.length > 0) && (
        <div className="sv-filters">
          {options.batches.length > 1 && (
            <select
              value={filters.batch}
              onChange={(event) => setFilters((prev) => ({ ...prev, batch: event.target.value }))}
            >
              <option value="">Any batch</option>
              {options.batches.map((batch) => (
                <option key={batch} value={batch}>Batch of {batch}</option>
              ))}
            </select>
          )}

          {options.departments.length > 1 && (
            <select
              value={filters.department}
              onChange={(event) => setFilters((prev) => ({ ...prev, department: event.target.value }))}
            >
              <option value="">Any branch</option>
              {options.departments.map((department) => (
                <option key={department} value={department}>{department.toUpperCase()}</option>
              ))}
            </select>
          )}

          {options.professors.length > 0 && (
            <select
              value={filters.professor}
              onChange={(event) => setFilters((prev) => ({ ...prev, professor: event.target.value }))}
            >
              <option value="">Any professor</option>
              {options.professors.map((professor) => (
                <option key={professor._id} value={professor._id}>
                  {professor.name} ({professor.years.join(', ')})
                </option>
              ))}
            </select>
          )}

          {(filters.batch || filters.department || filters.professor) && (
            <button
              type="button"
              className="sv-btn sv-btn-ghost sv-btn-sm"
              onClick={() => setFilters({ batch: '', department: '', professor: '' })}
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* --- exam papers: pinned to a sitting, so a year x exam grid -------- */}
      <section className="sv-section">
        <h2>Past papers</h2>
        <div className="sv-scroll">
          <table className="sv-grid">
            <thead>
              <tr>
                <th>Year</th>
                <th>Code then</th>
                {papers.exams.map((exam) => (
                  <th key={exam}>{examLabel(exam)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {papers.rows.map((row) => (
                <tr key={row.year}>
                  <td>{row.year}</td>
                  <td><span className="sv-code">{row.codeAtTime}</span></td>

                  {papers.exams.map((exam) => {
                    const cell = row.cells[exam];
                    const visible = cell.materials.filter(matches);

                    return (
                      <td key={exam}>
                        {visible.length > 0 ? (
                          // Several entries in one cell is normal: separate
                          // branch cohorts sit separate papers for one course.
                          <div className="sv-cell">
                            {visible.map((material) => (
                              <button
                                type="button"
                                key={material._id}
                                className="sv-paper"
                                onClick={() => setViewing(material)}
                              >
                                {material.department.toUpperCase()}
                                {material.origin === 'saviour_drive' && (
                                  <span className="sv-dot" title="In the saviour Drive" />
                                )}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="sv-slot-empty"
                            onClick={() => request(row.year, exam)}
                          >
                            missing{cell.requests ? ` · ${cell.requests} asked` : ' · request'}
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* --- everything else: grouped by who taught it --------------------- */}
      <section className="sv-section">
        <h2>Notes, slides and references</h2>

        {teaching.length === 0 && (
          <div className="sv-empty">
            Nothing here yet{filters.batch || filters.department || filters.professor ? ' for this filter' : ''}.
          </div>
        )}

        {teaching.map((group) => (
          <article className="sv-group" key={group.key}>
            <header className="sv-group-head">
              <div>
                <strong>
                  {group.professors.length > 0
                    ? group.professors.map((prof) => prof.name).join(', ')
                    : 'Not attributed to a professor'}
                </strong>
                <span className="sv-muted">
                  {' '}· {group.year} · {group.department.toUpperCase()} · batch of {group.graduatingBatch}
                </span>
              </div>
              <span className="sv-muted">{group.materials.length}</span>
            </header>

            <ul className="sv-items">
              {group.materials.map((material) => (
                <li key={material._id}>
                  <button type="button" className="sv-item" onClick={() => setViewing(material)}>
                    <span className="sv-item-kind">{kindLabel(material.kind)}</span>
                    <span className="sv-item-title">{material.title}</span>
                  </button>
                  <span className="sv-item-meta sv-muted">
                    {material.origin === 'saviour_drive' ? 'saviour Drive' : 'student Drive'}
                    {material.upvotes > 0 ? ` · ${material.upvotes}▲` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <div className="sv-actions" style={{ marginTop: '2rem' }}>
        <Link className="sv-btn" to={`/saviour/add?course=${course._id}`}>
          Add material for this course
        </Link>
        <Link className="sv-btn sv-btn-ghost" to="/saviour">Search another course</Link>
      </div>

      {viewing && <DriveViewer material={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
};

export default CourseDetail;
