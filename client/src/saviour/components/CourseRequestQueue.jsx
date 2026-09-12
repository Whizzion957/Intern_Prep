/**
 * Course requests (Saviour) - admins and superadmins.
 *
 * Students can't write to the catalog, so when they can't find a course they
 * file a request. Accepting one is what actually creates the catalog entry,
 * which is why this is a small form rather than a single button: a request only
 * carries a code, a name and the student's own branch, but a real course has to
 * say whether it is institute-wide or shared, and which semester it sits in for
 * each branch that takes it.
 */

import { useState } from 'react';
import { courseAPI } from '../api';
import { DEPARTMENTS, DEFAULT_DEPARTMENT } from '../../constants/departments';

const CourseRequestQueue = ({ requests, onChange }) => {
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');

  const startAccept = (request) => {
    setError('');
    setEditing(request._id);
    setDraft({
      name: request.name,
      code: request.code,
      allDepartments: false,
      // One row per branch that takes it. Prefilled from what the student
      // filed, because they only know their own branch and the course may be
      // shared with others.
      offeredTo: [
        {
          department: request.department || DEFAULT_DEPARTMENT,
          semester: request.semester ? String(request.semester) : '',
        },
      ],
      aliases: [],
      aliasDraft: '',
      credits: '',
    });
  };

  const accept = async (request) => {
    setBusy(request._id);
    setError('');
    try {
      const offeredTo = draft.allDepartments
        ? []
        : draft.offeredTo
            .filter((row) => row.department)
            .map((row) => ({
              department: row.department.toLowerCase(),
              semester: row.semester ? Number(row.semester) : null,
            }));

      if (!draft.allDepartments && offeredTo.length === 0) {
        setBusy(null);
        return setError('Add at least one branch, or tick that every branch takes it');
      }

      await courseAPI.decideRequest(request._id, 'accepted', {
        name: draft.name,
        codes: [{ code: draft.code, current: true }],
        allDepartments: draft.allDepartments,
        offeredTo,
        defaultSemester: offeredTo[0]?.semester ?? null,
        aliases: [...draft.aliases, draft.aliasDraft].map((a) => a.trim()).filter(Boolean),
        credits: draft.credits ? Number(draft.credits) : null,
      });
      setEditing(null);
      onChange();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not accept');
    } finally {
      setBusy(null);
    }
  };

  const reject = async (request) => {
    const note = window.prompt('Why? The student sees this.') || 'Rejected';
    setBusy(request._id);
    try {
      await courseAPI.decideRequest(request._id, 'rejected', undefined, note);
      onChange();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reject');
    } finally {
      setBusy(null);
    }
  };

  if (requests.length === 0) return null;

  return (
    <section className="sv-section">
      <h2>Course requests ({requests.length})</h2>
      <p className="sv-muted" style={{ marginTop: '-0.5rem', marginBottom: '0.85rem' }}>
        Students asking for a course that isn’t in the catalog. Accepting adds it.
      </p>

      {error && <div className="sv-error">{error}</div>}

      {requests.map((request) => (
        <article className="sv-queue-item" key={request._id}>
          <div>
            <span className="sv-code">{request.code}</span> <strong>{request.name}</strong>
          </div>

          <div className="sv-queue-meta">
            {request.department && <span>{request.department.toUpperCase()}</span>}
            {request.semester && <span>semester {request.semester}</span>}
            <span>asked by {request.requestedBy?.fullName || request.requestedBy?.email}</span>
          </div>

          {request.note && <p className="sv-muted">{request.note}</p>}

          {editing === request._id ? (
            <div className="sv-relink">
              <div className="sv-row">
                <div className="sv-field">
                  <label>Course name</label>
                  <input
                    className="sv-input"
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  />
                </div>
                <div className="sv-field">
                  <label>Code</label>
                  <input
                    className="sv-input"
                    value={draft.code}
                    onChange={(e) => setDraft({ ...draft, code: e.target.value })}
                  />
                </div>
                <div className="sv-field">
                  <label>Credits</label>
                  <input
                    className="sv-input"
                    type="number"
                    value={draft.credits}
                    onChange={(e) => setDraft({ ...draft, credits: e.target.value })}
                  />
                </div>
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
                  <p className="sv-muted" style={{ margin: '0 0 0.5rem' }}>
                    The semester is per branch: the same course sits in different
                    semesters for different branches.
                  </p>

                  {draft.offeredTo.map((row, index) => (
                    <div className="sv-offer-row" key={index}>
                      <select
                        value={row.department}
                        onChange={(e) => setDraft({
                          ...draft,
                          offeredTo: draft.offeredTo.map((entry, i) =>
                            i === index ? { ...entry, department: e.target.value } : entry),
                        })}
                      >
                        <option value="">Branch…</option>
                        {DEPARTMENTS.map((dept) => (
                          <option key={dept.code} value={dept.code}>
                            {dept.code.toUpperCase()} · {dept.name}
                          </option>
                        ))}
                      </select>

                      <select
                        value={row.semester}
                        onChange={(e) => setDraft({
                          ...draft,
                          offeredTo: draft.offeredTo.map((entry, i) =>
                            i === index ? { ...entry, semester: e.target.value } : entry),
                        })}
                      >
                        <option value="">Semester…</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((sem) => (
                          <option key={sem} value={sem}>Semester {sem}</option>
                        ))}
                      </select>

                      {draft.offeredTo.length > 1 && (
                        <button
                          type="button"
                          className="sv-btn sv-btn-ghost sv-btn-sm"
                          onClick={() => setDraft({
                            ...draft,
                            offeredTo: draft.offeredTo.filter((_, i) => i !== index),
                          })}
                          aria-label="Remove this branch"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    className="sv-btn sv-btn-ghost sv-btn-sm"
                    onClick={() => setDraft({
                      ...draft,
                      offeredTo: [...draft.offeredTo, { department: '', semester: '' }],
                    })}
                  >
                    + Another branch
                  </button>
                </div>
              )}

              <div className="sv-field" style={{ marginTop: '0.75rem' }}>
                <label>Aliases students might type (optional)</label>
                <div className="sv-chips">
                  {draft.aliases.map((alias) => (
                    <span className="sv-chip" key={alias}>
                      {alias}
                      <button
                        type="button"
                        onClick={() => setDraft({
                          ...draft,
                          aliases: draft.aliases.filter((a) => a !== alias),
                        })}
                        aria-label={`Remove ${alias}`}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
                <input
                  className="sv-input"
                  value={draft.aliasDraft}
                  onChange={(e) => setDraft({ ...draft, aliasDraft: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter' && e.key !== ',') return;
                    e.preventDefault();
                    const alias = draft.aliasDraft.trim();
                    if (!alias || draft.aliases.includes(alias)) return;
                    setDraft({ ...draft, aliases: [...draft.aliases, alias], aliasDraft: '' });
                  }}
                  placeholder="Type DSA and press Enter"
                />
              </div>

              <div className="sv-actions" style={{ marginTop: '0.75rem' }}>
                <button className="sv-btn" disabled={busy === request._id} onClick={() => accept(request)}>
                  Add to catalog
                </button>
                <button className="sv-btn sv-btn-ghost" onClick={() => setEditing(null)}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="sv-actions">
              <button className="sv-btn" onClick={() => startAccept(request)}>Accept</button>
              <button
                className="sv-btn sv-btn-ghost"
                disabled={busy === request._id}
                onClick={() => reject(request)}
              >
                Reject
              </button>
            </div>
          )}
        </article>
      ))}
    </section>
  );
};

export default CourseRequestQueue;
