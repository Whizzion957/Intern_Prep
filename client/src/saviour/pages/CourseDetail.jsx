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
 *   Everything else -> one entry per year that opens to hold that year's notes,
 *                   assignments, quizzes and slides. Year is how people look
 *                   this up; professor is a filter over it, not a heading.
 *
 * The filter bar narrows both halves at once. Picking a professor also narrows
 * the paper grid to the years they taught, because a paper carries no professor
 * of its own but still belongs to a sitting they set.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import DriveViewer from '../components/DriveViewer';
import RequestMaterial from '../components/RequestMaterial';
import { courseAPI, materialAPI, kindLabel, kindLabelPlural, examLabel, NON_EXAM_KINDS } from '../api';
import '../saviour.css';

const CourseDetail = () => {
  const { code } = useParams();

  const [meta, setMeta] = useState(null);
  const [view, setView] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({ batch: '', department: '', professor: '', year: '' });

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

  // The years the chosen professor taught. A paper has no professor attached,
  // so this is what lets a professor filter narrow the paper grid too.
  const professorYears = useMemo(() => {
    if (!filters.professor || !view) return null;
    const professor = view.filters.professors.find((p) => String(p._id) === filters.professor);
    return new Set(professor?.years || []);
  }, [filters.professor, view]);

  const matches = useCallback(
    (material) => {
      if (filters.batch && String(material.graduatingBatch) !== filters.batch) return false;
      if (filters.department && material.department !== filters.department) return false;
      if (filters.year && String(material.year) !== filters.year) return false;
      if (filters.professor) {
        const attributed = (material.professors || []).length > 0;
        return attributed
          ? material.professors.some((prof) => String(prof._id) === filters.professor)
          : professorYears.has(material.year);
      }
      return true;
    },
    [filters, professorYears]
  );

  // Non-exam material, split into one block per kind, each block a set of
  // years. A year is a link to that (kind, year)'s own page.
  const kindBlocks = useMemo(() => {
    const byKind = new Map();
    for (const group of view?.teaching || []) {
      for (const material of group.materials) {
        if (!matches(material)) continue;
        if (!byKind.has(material.kind)) byKind.set(material.kind, new Map());
        const years = byKind.get(material.kind);
        years.set(material.year, (years.get(material.year) || 0) + 1);
      }
    }
    // Fixed order (NON_EXAM_KINDS), then any legacy kind that still has records
    const order = [...NON_EXAM_KINDS, ...[...byKind.keys()].filter((k) => !NON_EXAM_KINDS.includes(k))];
    return order
      .filter((kind) => byKind.has(kind))
      .map((kind) => ({
        kind,
        years: [...byKind.get(kind).entries()]
          .map(([year, count]) => ({ year, count }))
          .sort((a, b) => b.year - a.year),
      }));
  }, [view, matches]);

  const request = async (year, exam) => {
    await materialAPI.request({ course: view.course._id, kind: 'past_paper', exam, year });
    load();
  };

  if (loading) return <div className="sv-page sv-empty">Loading…</div>;
  if (error) return <div className="sv-page"><div className="sv-error">{error}</div></div>;

  const { course, papers, filters: options, counts } = view;
  const filtered = filters.batch || filters.department || filters.professor || filters.year;

  // Rows the current filter can still show: a year filter picks one, a
  // professor filter keeps the years they taught.
  const paperRows = papers.rows.filter((row) => {
    if (filters.year && String(row.year) !== filters.year) return false;
    if (professorYears && !professorYears.has(row.year)) return false;
    return true;
  });

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
        <div className="sv-header-actions">
          <Link className="sv-btn sv-btn-sm" to={`/saviour/add?course=${course._id}`}>
            Add material
          </Link>
          <button className="sv-btn sv-btn-ghost sv-btn-sm" onClick={() => setRequesting(true)}>
            Request something
          </button>
        </div>
      </header>

      {meta.viaLegacyCode && (
        <div className="sv-notice">
          <strong>{code.toUpperCase()}</strong> is now <strong>{view.canonicalCode}</strong>.
          Everything filed under both codes is on this page.
        </div>
      )}

      {/* One filter bar for the whole page: batch and branch are cohort
          questions, professor and year narrow both halves. */}
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
              <option key={professor._id} value={professor._id}>{professor.name}</option>
            ))}
          </select>
        )}

        {options.years.length > 0 && (
          <select
            value={filters.year}
            onChange={(event) => setFilters((prev) => ({ ...prev, year: event.target.value }))}
          >
            <option value="">Any year</option>
            {options.years.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        )}

        {filtered && (
          <button
            type="button"
            className="sv-btn sv-btn-ghost sv-btn-sm"
            onClick={() => setFilters({ batch: '', department: '', professor: '', year: '' })}
          >
            Clear
          </button>
        )}
      </div>

      {/* --- exam papers: pinned to a sitting, so a year x exam grid -------- */}
      <section className="sv-section">
        <h2>Past papers</h2>
        {paperRows.length === 0 ? (
          <div className="sv-empty">No sittings match this filter.</div>
        ) : (
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
                {paperRows.map((row) => (
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
                            // branch cohorts sit separate papers, and a paper
                            // and its solution live in the same sitting.
                            <div className="sv-cell">
                              {visible.map((material) => (
                                <button
                                  type="button"
                                  key={material._id}
                                  className={`sv-paper ${material.kind === 'solution' ? 'sv-paper-solution' : ''}`}
                                  onClick={() => setViewing(material)}
                                  title={`${kindLabel(material.kind)} · ${material.title}`}
                                >
                                  {material.department.toUpperCase()}
                                  <span className="sv-paper-tag">
                                    {material.kind === 'solution' ? 'solution' : 'paper'}
                                  </span>
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
        )}
      </section>

      {/* --- everything else: one block per kind, each a set of year links --- */}
      {kindBlocks.length === 0 ? (
        <section className="sv-section">
          <h2>Notes, assignments and more</h2>
          <div className="sv-empty">
            Nothing here yet{filtered ? ' for this filter' : ''}.
          </div>
        </section>
      ) : (
        <div className="sv-kind-blocks">
          {kindBlocks.map((block) => (
            <section className="sv-kind-block" key={block.kind}>
              <h3>{kindLabelPlural(block.kind)}</h3>
              <div className="sv-year-links">
                {block.years.map(({ year, count }) => (
                  <Link
                    key={year}
                    to={`/saviour/course/${code}/${block.kind}/${year}`}
                    className="sv-year-link"
                  >
                    <span className="sv-year-link-year">{year}</span>
                    <span className="sv-year-link-count">{count}</span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <div className="sv-actions" style={{ marginTop: '2rem' }}>
        <Link className="sv-btn" to={`/saviour/add?course=${course._id}`}>
          Add material for this course
        </Link>
        <button className="sv-btn sv-btn-ghost" onClick={() => setRequesting(true)}>
          Request something
        </button>
        <Link className="sv-btn sv-btn-ghost" to="/saviour">Search another course</Link>
      </div>

      {viewing && <DriveViewer material={viewing} onClose={() => setViewing(null)} />}
      {requesting && (
        <RequestMaterial
          course={course}
          canonicalCode={view.canonicalCode}
          onClose={() => setRequesting(false)}
          onDone={load}
        />
      )}
    </div>
  );
};

export default CourseDetail;
