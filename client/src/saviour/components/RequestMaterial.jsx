/**
 * Request material for a course (Saviour)
 *
 * A structured "I couldn't find X" for a course that already exists in the
 * catalog. It records a gap on the (kind, exam, year) slot - the same board the
 * empty paper cells feed - with an optional note so the ask is specific rather
 * than a bare +1.
 */

import { useState } from 'react';
import { materialAPI, KINDS, EXAMS, EXAM_KINDS } from '../api';

const thisYear = new Date().getFullYear();

const RequestMaterial = ({ course, canonicalCode, onClose, onDone }) => {
  const [form, setForm] = useState({
    kind: 'past_paper',
    exam: 'end',
    year: String(thisYear),
    note: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [count, setCount] = useState(null);

  const set = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));
  const needsExam = EXAM_KINDS.includes(form.kind);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    const year = Number(form.year);
    if (!Number.isInteger(year) || year < 1990 || year > thisYear + 1) {
      return setError(`Year must be between 1990 and ${thisYear + 1}`);
    }
    setBusy(true);
    try {
      const { data } = await materialAPI.request({
        course: course._id,
        kind: form.kind,
        exam: needsExam ? form.exam : null,
        year,
        note: form.note.trim() || undefined,
      });
      setCount(data.count);
      onDone?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not record the request');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sv-viewer" role="dialog" aria-modal="true" aria-label="Request material">
      <div className="sv-viewer-backdrop" onClick={onClose} />

      <div className="sv-modal">
        <header className="sv-modal-head">
          <div>
            <strong>Request material</strong>
            <span className="sv-muted"> · {canonicalCode} {course.name}</span>
          </div>
          <button className="sv-btn sv-btn-ghost sv-btn-sm" onClick={onClose} aria-label="Close">✕</button>
        </header>

        {count !== null ? (
          <div className="sv-modal-body">
            <div className="sv-success">
              Noted. {count === 1 ? 'You are the first to ask' : `${count} people have asked`} for this.
            </div>
            <p className="sv-muted" style={{ marginTop: '0.75rem' }}>
              It shows up on the gap board and nudges whoever has it to upload. If you find
              it yourself, add it and it helps everyone behind you.
            </p>
            <div className="sv-actions" style={{ marginTop: '1rem' }}>
              <button className="sv-btn" onClick={onClose}>Done</button>
            </div>
          </div>
        ) : (
          <form className="sv-modal-body" onSubmit={submit}>
            {error && <div className="sv-error">{error}</div>}

            <div className="sv-row">
              <div className="sv-field">
                <label>What are you after</label>
                <select value={form.kind} onChange={set('kind')}>
                  {KINDS.map((kind) => (
                    <option key={kind.value} value={kind.value}>{kind.label}</option>
                  ))}
                </select>
              </div>

              {needsExam && (
                <div className="sv-field">
                  <label>Which sitting</label>
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
              <label>Anything specific? (optional)</label>
              <textarea
                rows="3"
                value={form.note}
                onChange={set('note')}
                placeholder="e.g. the 2022 quiz-2, or Prof. Sharma's slides for unit 3"
              />
            </div>

            <div className="sv-actions">
              <button className="sv-btn" type="submit" disabled={busy}>
                {busy ? 'Sending…' : 'Send request'}
              </button>
              <button className="sv-btn sv-btn-ghost" type="button" onClick={onClose}>Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default RequestMaterial;
