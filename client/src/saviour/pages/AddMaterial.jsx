/**
 * Add material (Saviour)
 *
 * Deliberate, human submission. Nothing is scraped, and nothing is uploaded to
 * us - the material is a public Google Drive link, which is why this platform
 * can run on a free database tier.
 *
 * The cohort fields (branch + graduating batch) are not bureaucracy: they are
 * what routes the submission to the right custodian and what lets a reader
 * filter down to the version of the course they are actually taking.
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import CourseTypeahead from '../components/CourseTypeahead';
import ProfessorPicker from '../components/ProfessorPicker';
import { courseAPI, materialAPI, KINDS, EXAMS, EXAM_KINDS, PROFESSOR_REQUIRED_KINDS } from '../api';
import { DEPARTMENTS, DEFAULT_DEPARTMENT, BATCH_MIN, BATCH_MAX, isValidBatch } from '../../constants/departments';
import { useAuth } from '../../context';
import '../saviour.css';

const thisYear = new Date().getFullYear();

const AddMaterial = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user } = useAuth();

  const [course, setCourse] = useState(null);
  const [professors, setProfessors] = useState([]);
  const [form, setForm] = useState({
    title: '',
    kind: 'past_paper',
    exam: 'end',
    year: String(thisYear),
    department: '',
    graduatingBatch: '',
    note: '',
    codeAtTime: '',
  });
  const [url, setUrl] = useState('');
  const [publicConfirmed, setPublicConfirmed] = useState(false);
  const [routedTo, setRoutedTo] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Default the cohort to the submitter's own branch and batch - that is what
  // people upload nine times out of ten - but leave both editable, because
  // seniors routinely pass down papers from batches before their own.
  // B.Tech is four years; integrated degrees are not, and the enrollment number
  // doesn't say which, so this is a starting value and never an authority.
  useEffect(() => {
    const joined = /^(\d{2})\d{4,8}$/.exec(user?.enrollmentNumber || '');
    setForm((prev) => ({
      ...prev,
      department: prev.department || user?.department || DEFAULT_DEPARTMENT,
      graduatingBatch:
        prev.graduatingBatch || (joined ? String(2000 + Number(joined[1]) + 4) : ''),
    }));
  }, [user]);

  // Arrived from a course page - preselect that course
  useEffect(() => {
    const preset = params.get('course');
    if (!preset) return;
    courseAPI
      .get(preset)
      .then(({ data }) =>
        setCourse({
          _id: data.course._id,
          name: data.course.name,
          code: data.canonicalCode,
          codes: data.course.codes,
          allDepartments: data.course.allDepartments,
          offeredTo: data.course.offeredTo,
        })
      )
      .catch(() => {});
  }, [params]);

  // The code the course went by in the chosen year: prefilled, still editable,
  // because the header printed on the paper is the real source of truth.
  useEffect(() => {
    if (!course?.codes) return;
    const year = Number(form.year);
    const match = course.codes.find(
      (entry) => year >= (entry.from ?? -Infinity) && year <= (entry.until ?? Infinity)
    );
    setForm((prev) => ({ ...prev, codeAtTime: (match || {}).code || course.code || '' }));
  }, [course, form.year]);

  const set = (field) => (event) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }));

  // Display-only, but a code the course never had is usually a typo
  const codeMismatch =
    course &&
    form.codeAtTime.trim() &&
    (course.codes || []).length > 0 &&
    !(course.codes || []).some(
      (entry) => entry.code.toUpperCase() === form.codeAtTime.trim().toUpperCase()
    );

  // Which branches may be chosen: what the course is actually offered to
  const branchOptions = course
    ? course.allDepartments
      ? null // any branch
      : (course.offeredTo || []).map((entry) => entry.department)
    : null;

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    if (!course) return setError('Pick a course first');
    if (!form.title.trim()) return setError('Give it a title');
    if (!form.department) return setError('Say which branch this is for');
    if (!isValidBatch(form.graduatingBatch)) {
      return setError(`Graduating batch must be a four digit year between ${BATCH_MIN} and ${BATCH_MAX}`);
    }
    if (PROFESSOR_REQUIRED_KINDS.includes(form.kind) && professors.length === 0) {
      return setError('Say who taught this. Notes and the like are grouped by professor, so they are lost without one.');
    }
    if (!url.trim()) return setError('Paste the Google Drive link');
    if (!publicConfirmed) return setError('Confirm the file is shared with anyone who has the link');

    setSubmitting(true);
    try {
      const { data } = await materialAPI.create({
        course: course._id,
        title: form.title.trim(),
        kind: form.kind,
        exam: EXAM_KINDS.includes(form.kind) ? form.exam : null,
        year: Number(form.year),
        department: form.department,
        graduatingBatch: Number(form.graduatingBatch),
        // Existing professors go by id, new ones by name - the server creates
        // those unverified for a custodian to tidy up.
        professors: professors.map((prof) => prof.id || prof.name),
        note: form.note || null,
        codeAtTime: form.codeAtTime,
        url: url.trim(),
        publicConfirmed: true,
      });
      setRoutedTo(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not submit');
    } finally {
      setSubmitting(false);
    }
  };

  if (routedTo) {
    return (
      <div className="sv-page">
        <div className="sv-success">{routedTo.message}</div>
        <p className="sv-muted" style={{ marginTop: '1rem' }}>
          They can approve your link as it is, or move a copy into the batch’s
          saviour Drive folder so it survives after you graduate.
        </p>
        <div className="sv-actions" style={{ marginTop: '1.25rem' }}>
          <button className="sv-btn" onClick={() => navigate(`/saviour/course/${course.code}`)}>
            Back to {course.code}
          </button>
          <button className="sv-btn sv-btn-ghost" onClick={() => window.location.reload()}>
            Add another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sv-page">
      <header className="sv-header">
        <h1>Add material</h1>
        <p>
          Goes to the student who looks after your branch and batch. They approve
          it, or move it into the saviour Drive first.
        </p>
      </header>

      <form className="sv-form" onSubmit={submit}>
        {error && <div className="sv-error">{error}</div>}

        <div className="sv-field">
          <label>Course</label>
          <CourseTypeahead
            value={course}
            onSelect={setCourse}
            onNotFound={() => navigate('/saviour/request-course')}
          />
          {course && (
            <p className="sv-muted" style={{ marginTop: '0.3rem' }}>
              {course.allDepartments
                ? 'Taken by all branches'
                : `Taken by ${(course.offeredTo || [])
                    .map((entry) => entry.department.toUpperCase())
                    .join(', ')}`}
            </p>
          )}
        </div>

        <div className="sv-row">
          <div className="sv-field">
            <label>What is it</label>
            <select value={form.kind} onChange={set('kind')}>
              {KINDS.map((kind) => (
                <option key={kind.value} value={kind.value}>{kind.label}</option>
              ))}
            </select>
          </div>

          {EXAM_KINDS.includes(form.kind) && (
            <div className="sv-field">
              <label>Which exam</label>
              <select value={form.exam} onChange={set('exam')}>
                {EXAMS.map((exam) => (
                  <option key={exam.value} value={exam.value}>{exam.label}</option>
                ))}
              </select>
            </div>
          )}

          <div className="sv-field">
            <label>Year</label>
            <input
              className="sv-input"
              type="number"
              min="1990"
              max={thisYear + 1}
              value={form.year}
              onChange={set('year')}
            />
          </div>
        </div>

        <div className="sv-field">
          <label>Title</label>
          <input
            className="sv-input"
            value={form.title}
            onChange={set('title')}
            placeholder="e.g. End term 2023 question paper"
          />
        </div>

        {/* Cohort: decides who approves this and who it shows up for */}
        <div className="sv-row">
          <div className="sv-field">
            <label>Whose course was this — branch</label>
            <select value={form.department} onChange={set('department')}>
              <option value="">Choose…</option>
              {(branchOptions
                ? DEPARTMENTS.filter((dept) => branchOptions.includes(dept.code))
                : DEPARTMENTS
              ).map((dept) => (
                <option key={dept.code} value={dept.code}>
                  {dept.code.toUpperCase()} · {dept.name}
                </option>
              ))}
            </select>
          </div>

          <div className="sv-field">
            <label>Graduating batch</label>
            <input
              className="sv-input"
              type="number"
              inputMode="numeric"
              min={BATCH_MIN}
              max={BATCH_MAX}
              step="1"
              value={form.graduatingBatch}
              onChange={set('graduatingBatch')}
              placeholder="2027"
              aria-invalid={form.graduatingBatch !== '' && !isValidBatch(form.graduatingBatch)}
            />
            {form.graduatingBatch !== '' && !isValidBatch(form.graduatingBatch) ? (
              <p className="sv-field-error">Four digit year, {BATCH_MIN} to {BATCH_MAX}</p>
            ) : (
              <p className="sv-muted" style={{ marginTop: '0.3rem' }}>
                The batch that took the course, not necessarily yours.
              </p>
            )}
          </div>
        </div>

        <div className="sv-field">
          <label>
            Professor{PROFESSOR_REQUIRED_KINDS.includes(form.kind) ? '' : ' (optional)'}
          </label>
          <ProfessorPicker
            selected={professors}
            onChange={setProfessors}
            department={form.department}
          />
          <p className="sv-muted" style={{ marginTop: '0.3rem' }}>
            {PROFESSOR_REQUIRED_KINDS.includes(form.kind)
              ? 'Required: this is grouped by whoever taught it, which is what makes it findable.'
              : 'Everyone sat the same paper, so this can be left blank.'}
          </p>
        </div>

        <div className="sv-field">
          <label>Course code printed on it (if different)</label>
          <input
            className="sv-input"
            value={form.codeAtTime}
            onChange={set('codeAtTime')}
            placeholder={course?.code || 'e.g. CSC-201'}
          />
          {codeMismatch ? (
            <p className="sv-field-warn">
              {course.name} has never been called {form.codeAtTime.toUpperCase()} (
              {(course.codes || []).map((entry) => entry.code).join(', ')}). Fine if that is
              really what the paper says, otherwise check it.
            </p>
          ) : (
            <p className="sv-muted" style={{ marginTop: '0.3rem' }}>
              Filled in from the year. Only change it if the header on the paper
              shows a different code.
            </p>
          )}
        </div>

        {/* The link. There is no upload option anywhere - by design. */}
        <div className="sv-field">
          <label>Google Drive link</label>
          <input
            className="sv-input"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://drive.google.com/file/d/…"
          />
          <p className="sv-muted" style={{ marginTop: '0.3rem' }}>
            Link the file itself, not the folder. We store the link, never the file.
          </p>
        </div>

        <label className="sv-storage-option" data-selected={publicConfirmed}>
          <input
            type="checkbox"
            checked={publicConfirmed}
            onChange={(event) => setPublicConfirmed(event.target.checked)}
          />
          <div>
            <strong>Sharing is set to “Anyone with the link”</strong>
            <span>
              Otherwise nobody but you can open it — and your custodian will see a
              blank preview and send it back.
            </span>
          </div>
        </label>

        <div className="sv-field">
          <label>Anything a reader should know (optional)</label>
          <textarea rows="2" value={form.note} onChange={set('note')} />
        </div>

        <div className="sv-actions">
          <button className="sv-btn" type="submit" disabled={submitting}>
            {submitting ? 'Sending…' : 'Send for approval'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddMaterial;
