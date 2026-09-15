/**
 * Corrections (Saviour)
 *
 * Two audiences, one page, split by what they are allowed to break:
 *
 *   Admins      own the catalog. A course is shared by every branch that takes
 *               it, so renaming one or moving its semester is an institute-wide
 *               edit and stays with admins. Professors sit here too: students
 *               create them unverified while submitting, and somebody has to
 *               tidy and merge the duplicates.
 *
 *   Custodians  own their cohort's material. They can fix what a submission
 *               says about itself - title, kind, year, professor - without
 *               being able to touch the catalog underneath it.
 */

import { useCallback, useEffect, useState } from 'react';
import CourseTypeahead from '../components/CourseTypeahead';
import ProfessorPicker from '../components/ProfessorPicker';
import {
  courseAPI, materialAPI, professorAPI, custodianAPI,
  KINDS, EXAMS, EXAM_KINDS, kindLabel,
} from '../api';
import { DEPARTMENTS, BATCH_MIN, BATCH_MAX, isValidBatch } from '../../constants/departments';
import '../saviour.css';

const thisYear = new Date().getFullYear();

const emptyCourseDraft = {
  name: '', credits: '', allDepartments: false,
  offeredTo: [], codes: [], aliases: [], aliasDraft: '',
};

const CourseAdmin = () => {
  const [scope, setScope] = useState({ isAdmin: false, isSuperadmin: false, custodianships: [] });
  const [tab, setTab] = useState('materials');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // --- catalog ------------------------------------------------------------
  const [course, setCourse] = useState(null);
  const [draft, setDraft] = useState(emptyCourseDraft);

  // --- professors ---------------------------------------------------------
  const [professors, setProfessors] = useState([]);
  const [profQuery, setProfQuery] = useState('');
  const [mergeFrom, setMergeFrom] = useState(null);
  const [editingProf, setEditingProf] = useState(null);
  const [profDraft, setProfDraft] = useState(null);

  // --- materials ----------------------------------------------------------
  const [materialCourse, setMaterialCourse] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [editing, setEditing] = useState(null);
  const [materialDraft, setMaterialDraft] = useState(null);

  useEffect(() => {
    custodianAPI.mine()
      .then(({ data }) => {
        setScope(data);
        if (data.isAdmin || data.isSuperadmin) setTab('catalog');
      })
      .catch(() => {});
  }, []);

  const isAdmin = scope.isAdmin || scope.isSuperadmin;
  const isCustodian = scope.isSuperadmin || (scope.custodianships || []).length > 0;

  // ---------- catalog ------------------------------------------------------
  const pickCourse = async (picked) => {
    setError('');
    setNotice('');
    try {
      const { data } = await courseAPI.get(picked.code);
      setCourse(data.course);
      setDraft({
        name: data.course.name || '',
        credits: data.course.credits ? String(data.course.credits) : '',
        allDepartments: Boolean(data.course.allDepartments),
        offeredTo: (data.course.offeredTo || []).map((entry) => ({
          department: entry.department,
          semester: entry.semester ? String(entry.semester) : '',
        })),
        codes: (data.course.codes || []).map((entry) => ({
          code: entry.code,
          from: entry.from ? String(entry.from) : '',
          until: entry.until ? String(entry.until) : '',
          current: Boolean(entry.current),
        })),
        aliases: data.course.aliases || [],
        aliasDraft: '',
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load that course');
    }
  };

  const saveCourse = async () => {
    setError('');
    if (!draft.codes.some((entry) => entry.current && entry.code.trim())) {
      return setError('One code has to be marked as the current one');
    }
    try {
      await courseAPI.update(course._id, {
        name: draft.name.trim(),
        credits: draft.credits ? Number(draft.credits) : null,
        allDepartments: draft.allDepartments,
        offeredTo: draft.allDepartments ? [] : draft.offeredTo
          .filter((row) => row.department)
          .map((row) => ({
            department: row.department,
            semester: row.semester ? Number(row.semester) : null,
          })),
        codes: draft.codes
          .filter((entry) => entry.code.trim())
          .map((entry) => ({
            code: entry.code.trim().toUpperCase(),
            from: entry.from ? Number(entry.from) : null,
            until: entry.until ? Number(entry.until) : null,
            current: entry.current,
          })),
        aliases: [...draft.aliases, draft.aliasDraft].map((a) => a.trim()).filter(Boolean),
      });
      setNotice(`${draft.name} saved.`);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save the course');
    }
  };

  // ---------- professors ---------------------------------------------------
  const loadProfessors = useCallback(async (q) => {
    try {
      const { data } = await professorAPI.search({ q, limit: 50 });
      setProfessors(data.professors || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load professors');
    }
  }, []);

  useEffect(() => {
    if (tab !== 'professors') return;
    const timer = setTimeout(() => loadProfessors(profQuery), 250);
    return () => clearTimeout(timer);
  }, [tab, profQuery, loadProfessors]);

  const startEditProf = (professor) => {
    setEditingProf(professor._id);
    setProfDraft({
      name: professor.name,
      department: professor.department || '',
      verified: Boolean(professor.verified),
      aliases: professor.aliases || [],
      aliasDraft: '',
    });
  };

  const saveProfDraft = async (professor) => {
    if (!profDraft.name.trim()) return setError('A professor needs a name');
    try {
      await professorAPI.update(professor._id, {
        name: profDraft.name.trim(),
        department: profDraft.department || null,
        verified: profDraft.verified,
        aliases: [...profDraft.aliases, profDraft.aliasDraft].map((a) => a.trim()).filter(Boolean),
      });
      setEditingProf(null);
      setNotice(`${profDraft.name.trim()} saved.`);
      loadProfessors(profQuery);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save the professor');
    }
  };

  const merge = async (into) => {
    if (!mergeFrom) return;
    if (!window.confirm(`Merge ${mergeFrom.name} into ${into.name}? Every material moves across.`)) return;
    try {
      await professorAPI.merge(mergeFrom._id, into._id);
      setNotice(`${mergeFrom.name} merged into ${into.name}.`);
      setMergeFrom(null);
      loadProfessors(profQuery);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not merge');
    }
  };

  // ---------- materials ----------------------------------------------------
  const loadMaterials = async (picked) => {
    setError('');
    setMaterialCourse(picked);
    try {
      const { data } = await courseAPI.materials(picked.code);
      const flat = [
        ...data.papers.rows.flatMap((row) =>
          Object.values(row.cells).flatMap((cell) => cell.materials)),
        ...data.teaching.flatMap((group) => group.materials),
      ];
      setMaterials(flat);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load that course');
    }
  };

  const startEdit = (material) => {
    setEditing(material._id);
    setMaterialDraft({
      title: material.title,
      kind: material.kind,
      exam: material.exam || 'end',
      year: String(material.year),
      department: material.department,
      graduatingBatch: String(material.graduatingBatch),
      professors: (material.professors || []).map((prof) => ({ id: prof._id, name: prof.name })),
    });
  };

  const saveMaterial = async (material) => {
    setError('');
    if (!isValidBatch(materialDraft.graduatingBatch)) {
      return setError(`Graduating batch must be a four digit year between ${BATCH_MIN} and ${BATCH_MAX}`);
    }
    try {
      await materialAPI.update(material._id, {
        title: materialDraft.title.trim(),
        kind: materialDraft.kind,
        exam: EXAM_KINDS.includes(materialDraft.kind) ? materialDraft.exam : null,
        year: Number(materialDraft.year),
        department: materialDraft.department,
        graduatingBatch: Number(materialDraft.graduatingBatch),
        professors: materialDraft.professors.map((prof) => prof.id || prof.name),
      });
      setEditing(null);
      setNotice(`"${materialDraft.title}" updated.`);
      loadMaterials(materialCourse);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save the change');
    }
  };

  if (!isAdmin && !isCustodian) {
    return (
      <div className="sv-page">
        <div className="sv-empty">
          Corrections are for custodians and admins. If you spotted something wrong,
          report it from the material itself.
        </div>
      </div>
    );
  }

  return (
    <div className="sv-page">
      <header className="sv-header">
        <h1>Corrections</h1>
        <p className="sv-muted">
          {isAdmin
            ? 'The catalog and the professor list are institute-wide, so they live here.'
            : `Fixing material for ${(scope.custodianships || [])
                .map((entry) => `${entry.department.toUpperCase()} ’${String(entry.graduatingBatch).slice(2)}`)
                .join(', ')}.`}
        </p>
      </header>

      {error && <div className="sv-error">{error}</div>}
      {notice && <div className="sv-success">{notice}</div>}

      <div className="sv-tabs">
        {isAdmin && (
          <>
            <button className={`sv-tab ${tab === 'catalog' ? 'is-active' : ''}`} onClick={() => setTab('catalog')}>
              Courses
            </button>
            <button className={`sv-tab ${tab === 'professors' ? 'is-active' : ''}`} onClick={() => setTab('professors')}>
              Professors
            </button>
          </>
        )}
        <button className={`sv-tab ${tab === 'materials' ? 'is-active' : ''}`} onClick={() => setTab('materials')}>
          Material
        </button>
      </div>

      {/* ---------------- catalog ---------------- */}
      {tab === 'catalog' && isAdmin && (
        <section className="sv-section">
          <div className="sv-field">
            <label>Course to correct</label>
            <CourseTypeahead value={course && { code: draft.codes.find((c) => c.current)?.code, name: draft.name }} onSelect={pickCourse} />
          </div>

          {course && (
            <div className="sv-form" style={{ marginTop: '1rem' }}>
              <div className="sv-row">
                <div className="sv-field">
                  <label>Name</label>
                  <input className="sv-input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                </div>
                <div className="sv-field">
                  <label>Credits</label>
                  <input className="sv-input" type="number" value={draft.credits} onChange={(e) => setDraft({ ...draft, credits: e.target.value })} />
                </div>
              </div>

              <div className="sv-field">
                <label>Codes, oldest first</label>
                <p className="sv-muted" style={{ margin: '0 0 0.5rem' }}>
                  A rename is recorded here, so papers from both eras stay on one page.
                  Mark the one in use today as current.
                </p>
                {draft.codes.map((entry, index) => (
                  <div className="sv-offer-row" key={index}>
                    <input
                      className="sv-input"
                      value={entry.code}
                      placeholder="CSC-201"
                      onChange={(e) => setDraft({
                        ...draft,
                        codes: draft.codes.map((c, i) => (i === index ? { ...c, code: e.target.value } : c)),
                      })}
                    />
                    <input
                      className="sv-input"
                      type="number"
                      placeholder="from"
                      value={entry.from}
                      onChange={(e) => setDraft({
                        ...draft,
                        codes: draft.codes.map((c, i) => (i === index ? { ...c, from: e.target.value } : c)),
                      })}
                    />
                    <input
                      className="sv-input"
                      type="number"
                      placeholder="until"
                      value={entry.until}
                      onChange={(e) => setDraft({
                        ...draft,
                        codes: draft.codes.map((c, i) => (i === index ? { ...c, until: e.target.value } : c)),
                      })}
                    />
                    <label className="sv-inline-check">
                      <input
                        type="radio"
                        name="current-code"
                        checked={entry.current}
                        onChange={() => setDraft({
                          ...draft,
                          codes: draft.codes.map((c, i) => ({ ...c, current: i === index })),
                        })}
                      />
                      current
                    </label>
                    <button
                      type="button"
                      className="sv-btn sv-btn-ghost sv-btn-sm"
                      onClick={() => setDraft({ ...draft, codes: draft.codes.filter((_, i) => i !== index) })}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="sv-btn sv-btn-ghost sv-btn-sm"
                  onClick={() => setDraft({ ...draft, codes: [...draft.codes, { code: '', from: '', until: '', current: false }] })}
                >
                  + Another code
                </button>
              </div>

              <label className="sv-storage-option" data-selected={draft.allDepartments}>
                <input
                  type="checkbox"
                  checked={draft.allDepartments}
                  onChange={(e) => setDraft({ ...draft, allDepartments: e.target.checked })}
                />
                <div>
                  <strong>Every branch takes this</strong>
                  <span>First-year maths, humanities electives and the like.</span>
                </div>
              </label>

              {!draft.allDepartments && (
                <div className="sv-field" style={{ marginTop: '0.75rem' }}>
                  <label>Branches that take it, and the semester for each</label>
                  {draft.offeredTo.map((row, index) => (
                    <div className="sv-offer-row" key={index}>
                      <select
                        value={row.department}
                        onChange={(e) => setDraft({
                          ...draft,
                          offeredTo: draft.offeredTo.map((entry, i) => (i === index ? { ...entry, department: e.target.value } : entry)),
                        })}
                      >
                        <option value="">Branch…</option>
                        {DEPARTMENTS.map((dept) => (
                          <option key={dept.code} value={dept.code}>{dept.code.toUpperCase()} · {dept.name}</option>
                        ))}
                      </select>
                      <select
                        value={row.semester}
                        onChange={(e) => setDraft({
                          ...draft,
                          offeredTo: draft.offeredTo.map((entry, i) => (i === index ? { ...entry, semester: e.target.value } : entry)),
                        })}
                      >
                        <option value="">Semester…</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((sem) => (
                          <option key={sem} value={sem}>Semester {sem}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="sv-btn sv-btn-ghost sv-btn-sm"
                        onClick={() => setDraft({ ...draft, offeredTo: draft.offeredTo.filter((_, i) => i !== index) })}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="sv-btn sv-btn-ghost sv-btn-sm"
                    onClick={() => setDraft({ ...draft, offeredTo: [...draft.offeredTo, { department: '', semester: '' }] })}
                  >
                    + Another branch
                  </button>
                </div>
              )}

              <div className="sv-field" style={{ marginTop: '0.75rem' }}>
                <label>Aliases students might type</label>
                <div className="sv-chips">
                  {draft.aliases.map((alias) => (
                    <span className="sv-chip" key={alias}>
                      {alias}
                      <button type="button" onClick={() => setDraft({ ...draft, aliases: draft.aliases.filter((a) => a !== alias) })}>✕</button>
                    </span>
                  ))}
                </div>
                <input
                  className="sv-input"
                  value={draft.aliasDraft}
                  placeholder="Type DSA and press Enter"
                  onChange={(e) => setDraft({ ...draft, aliasDraft: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter' && e.key !== ',') return;
                    e.preventDefault();
                    const alias = draft.aliasDraft.trim();
                    if (!alias || draft.aliases.includes(alias)) return;
                    setDraft({ ...draft, aliases: [...draft.aliases, alias], aliasDraft: '' });
                  }}
                />
              </div>

              <div className="sv-actions">
                <button type="button" className="sv-btn" onClick={saveCourse}>Save course</button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ---------------- professors ---------------- */}
      {tab === 'professors' && isAdmin && (
        <section className="sv-section">
          <div className="sv-field">
            <label>Find a professor</label>
            <input
              className="sv-input"
              value={profQuery}
              onChange={(e) => setProfQuery(e.target.value)}
              placeholder="Name, or leave blank for all"
            />
            <p className="sv-muted" style={{ marginTop: '0.3rem' }}>
              Unverified entries were typed by students while submitting. Edit any
              field, verify the real ones, or merge duplicates: merging moves every
              material across.
            </p>
          </div>

          {mergeFrom && (
            <div className="sv-notice">
              Merging <strong>{mergeFrom.name}</strong> into… pick the entry to keep.
              {' '}
              <button className="sv-btn sv-btn-ghost sv-btn-sm" onClick={() => setMergeFrom(null)}>Cancel</button>
            </div>
          )}

          <ul className="sv-history">
            {professors.map((professor) => (
              <li className="sv-history-item" key={professor._id}>
                {editingProf === professor._id ? (
                  <div className="sv-history-main" style={{ gridColumn: '1 / -1' }}>
                    <div className="sv-row">
                      <div className="sv-field">
                        <label>Name</label>
                        <input
                          className="sv-input"
                          value={profDraft.name}
                          onChange={(e) => setProfDraft({ ...profDraft, name: e.target.value })}
                        />
                      </div>
                      <div className="sv-field">
                        <label>Branch</label>
                        <select
                          value={profDraft.department}
                          onChange={(e) => setProfDraft({ ...profDraft, department: e.target.value })}
                        >
                          <option value="">No branch</option>
                          {DEPARTMENTS.map((dept) => (
                            <option key={dept.code} value={dept.code}>{dept.code.toUpperCase()} · {dept.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="sv-field">
                      <label>Other spellings students type</label>
                      <div className="sv-chips">
                        {profDraft.aliases.map((alias) => (
                          <span className="sv-chip" key={alias}>
                            {alias}
                            <button
                              type="button"
                              onClick={() => setProfDraft({ ...profDraft, aliases: profDraft.aliases.filter((a) => a !== alias) })}
                            >✕</button>
                          </span>
                        ))}
                      </div>
                      <input
                        className="sv-input"
                        value={profDraft.aliasDraft}
                        placeholder="Type a spelling and press Enter"
                        onChange={(e) => setProfDraft({ ...profDraft, aliasDraft: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key !== 'Enter' && e.key !== ',') return;
                          e.preventDefault();
                          const alias = profDraft.aliasDraft.trim();
                          if (!alias || profDraft.aliases.includes(alias)) return;
                          setProfDraft({ ...profDraft, aliases: [...profDraft.aliases, alias], aliasDraft: '' });
                        }}
                      />
                    </div>

                    <label className="sv-inline-check" style={{ marginTop: '0.25rem' }}>
                      <input
                        type="checkbox"
                        checked={profDraft.verified}
                        onChange={(e) => setProfDraft({ ...profDraft, verified: e.target.checked })}
                      />
                      Verified — a real person, named correctly
                    </label>

                    <div className="sv-actions">
                      <button className="sv-btn" onClick={() => saveProfDraft(professor)}>Save</button>
                      <button className="sv-btn sv-btn-ghost" onClick={() => setEditingProf(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="sv-history-main">
                      <strong>{professor.name}</strong>
                      <span className="sv-muted">
                        {professor.department ? professor.department.toUpperCase() : 'No branch'}
                        {professor.verified ? ' · verified' : ' · unverified'}
                        {(professor.aliases || []).length > 0 ? ` · also ${professor.aliases.join(', ')}` : ''}
                      </span>
                    </div>
                    <div className="sv-history-side">
                      {mergeFrom ? (
                        mergeFrom._id !== professor._id && (
                          <button className="sv-btn sv-btn-sm" onClick={() => merge(professor)}>
                            Merge into this
                          </button>
                        )
                      ) : (
                        <>
                          <button className="sv-btn sv-btn-ghost sv-btn-sm" onClick={() => startEditProf(professor)}>
                            Edit
                          </button>
                          <button className="sv-btn sv-btn-ghost sv-btn-sm" onClick={() => setMergeFrom(professor)}>
                            Merge…
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
          {professors.length === 0 && <div className="sv-empty">No professors match.</div>}
        </section>
      )}

      {/* ---------------- material ---------------- */}
      {tab === 'materials' && (
        <section className="sv-section">
          <div className="sv-field">
            <label>Course whose material needs fixing</label>
            <CourseTypeahead value={materialCourse} onSelect={loadMaterials} />
          </div>

          {materialCourse && materials.length === 0 && (
            <div className="sv-empty">Nothing approved on this course yet.</div>
          )}

          <ul className="sv-history" style={{ marginTop: '1rem' }}>
            {materials.map((material) => (
              <li className="sv-history-item" key={material._id}>
                {editing === material._id ? (
                  <div className="sv-history-main" style={{ gridColumn: '1 / -1' }}>
                    <div className="sv-row">
                      <div className="sv-field">
                        <label>Title</label>
                        <input
                          className="sv-input"
                          value={materialDraft.title}
                          onChange={(e) => setMaterialDraft({ ...materialDraft, title: e.target.value })}
                        />
                      </div>
                      <div className="sv-field">
                        <label>What is it</label>
                        <select
                          value={materialDraft.kind}
                          onChange={(e) => setMaterialDraft({ ...materialDraft, kind: e.target.value })}
                        >
                          {KINDS.map((kind) => (
                            <option key={kind.value} value={kind.value}>{kind.label}</option>
                          ))}
                        </select>
                      </div>
                      {EXAM_KINDS.includes(materialDraft.kind) && (
                        <div className="sv-field">
                          <label>Which sitting</label>
                          <select
                            value={materialDraft.exam}
                            onChange={(e) => setMaterialDraft({ ...materialDraft, exam: e.target.value })}
                          >
                            {EXAMS.map((exam) => (
                              <option key={exam.value} value={exam.value}>{exam.label}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="sv-row">
                      <div className="sv-field">
                        <label>Year</label>
                        <input
                          className="sv-input"
                          type="number"
                          min="1990"
                          max={thisYear + 1}
                          value={materialDraft.year}
                          onChange={(e) => setMaterialDraft({ ...materialDraft, year: e.target.value })}
                        />
                      </div>
                      <div className="sv-field">
                        <label>Branch</label>
                        <select
                          value={materialDraft.department}
                          onChange={(e) => setMaterialDraft({ ...materialDraft, department: e.target.value })}
                        >
                          {DEPARTMENTS.map((dept) => (
                            <option key={dept.code} value={dept.code}>{dept.code.toUpperCase()}</option>
                          ))}
                        </select>
                      </div>
                      <div className="sv-field">
                        <label>Graduating batch</label>
                        <input
                          className="sv-input"
                          type="number"
                          min={BATCH_MIN}
                          max={BATCH_MAX}
                          value={materialDraft.graduatingBatch}
                          onChange={(e) => setMaterialDraft({ ...materialDraft, graduatingBatch: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="sv-field">
                      <label>Professor</label>
                      <ProfessorPicker
                        selected={materialDraft.professors}
                        onChange={(next) => setMaterialDraft({ ...materialDraft, professors: next })}
                        department={materialDraft.department}
                      />
                    </div>

                    <div className="sv-actions">
                      <button className="sv-btn" onClick={() => saveMaterial(material)}>Save</button>
                      <button className="sv-btn sv-btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="sv-history-main">
                      <strong>{material.title}</strong>
                      <span className="sv-muted">
                        {kindLabel(material.kind)} · {material.year} · {material.department.toUpperCase()}
                        {' · batch of '}{material.graduatingBatch}
                        {(material.professors || []).length > 0
                          ? ` · ${material.professors.map((prof) => prof.name).join(', ')}`
                          : ''}
                      </span>
                    </div>
                    <div className="sv-history-side">
                      <button className="sv-btn sv-btn-ghost sv-btn-sm" onClick={() => startEdit(material)}>
                        Fix
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

export default CourseAdmin;
