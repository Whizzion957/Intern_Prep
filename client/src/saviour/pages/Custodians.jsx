/**
 * Custodians (Saviour) - superadmin only.
 *
 * One student per branch per graduating batch: in practice whoever already owns
 * that batch's saviour Drive folder. Appointing them here is what routes
 * approvals to them, and recording the folder URL is what lets the approval
 * panel tell them where to re-upload a file.
 *
 * Appointment is by email, so someone can be made custodian before they have
 * ever signed in.
 */

import { useCallback, useEffect, useState } from 'react';
import { custodianAPI } from '../api';
import { DEPARTMENTS, DEFAULT_DEPARTMENT, BATCH_MIN, BATCH_MAX, isValidBatch } from '../../constants/departments';
import '../saviour.css';

const thisYear = new Date().getFullYear();

const Custodians = () => {
  const [custodians, setCustodians] = useState([]);
  const [form, setForm] = useState({
    email: '',
    department: DEFAULT_DEPARTMENT,
    graduatingBatch: String(thisYear + 1),
    driveFolderUrl: '',
    note: '',
  });
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await custodianAPI.list();
      setCustodians(data.custodians);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load custodians');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const set = (field) => (event) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const assign = async (event) => {
    event.preventDefault();
    setError('');
    setWarning('');

    if (!form.department) return setError('Pick a branch');
    if (!isValidBatch(form.graduatingBatch)) {
      return setError(`Graduating batch must be a four digit year between ${BATCH_MIN} and ${BATCH_MAX}`);
    }

    try {
      const { data } = await custodianAPI.assign({
        ...form,
        graduatingBatch: Number(form.graduatingBatch),
      });
      if (data.warning) setWarning(data.warning);
      setForm((prev) => ({ ...prev, email: '', driveFolderUrl: '', note: '' }));
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not assign');
    }
  };

  const standDown = async (custodian) => {
    if (!window.confirm(`Stand ${custodian.email} down?`)) return;
    await custodianAPI.remove(custodian._id);
    load();
  };

  // Group by batch: that is how people think about who is responsible
  const batches = [...new Set(custodians.map((entry) => entry.graduatingBatch))].sort(
    (a, b) => b - a
  );

  return (
    <div className="sv-page">
      <header className="sv-header">
        <h1>Custodians</h1>
        <p>One student per branch per graduating batch. They approve that cohort’s submissions.</p>
      </header>

      {error && <div className="sv-error">{error}</div>}
      {warning && <div className="sv-notice">{warning}</div>}

      <form className="sv-form" onSubmit={assign} style={{ marginBottom: '2.5rem' }}>
        <div className="sv-row">
          <div className="sv-field">
            <label>IITR email</label>
            <input
              className="sv-input"
              value={form.email}
              onChange={set('email')}
              placeholder="pradyumn_k@cs.iitr.ac.in"
            />
          </div>
          <div className="sv-field">
            <label>Branch</label>
            <select value={form.department} onChange={set('department')}>
              {DEPARTMENTS.map((dept) => (
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
              aria-invalid={form.graduatingBatch !== '' && !isValidBatch(form.graduatingBatch)}
            />
            {form.graduatingBatch !== '' && !isValidBatch(form.graduatingBatch) && (
              <p className="sv-field-error">Four digit year, {BATCH_MIN} to {BATCH_MAX}</p>
            )}
          </div>
        </div>

        <div className="sv-field">
          <label>That batch’s saviour Drive folder (optional)</label>
          <input
            className="sv-input"
            value={form.driveFolderUrl}
            onChange={set('driveFolderUrl')}
            placeholder="https://drive.google.com/drive/folders/…"
          />
          <p className="sv-muted" style={{ marginTop: '0.3rem' }}>
            Shown to them in the approval panel, so re-uploading a file is one click away.
          </p>
        </div>

        <div className="sv-actions">
          <button className="sv-btn" type="submit">Assign</button>
        </div>
      </form>

      {batches.map((batch) => (
        <section className="sv-section" key={batch}>
          <h2>Batch of {batch}</h2>
          <div className="sv-scroll">
            <table className="sv-grid">
              <thead>
                <tr>
                  <th>Branch</th>
                  <th>Custodian</th>
                  <th>Folder</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {custodians
                  .filter((entry) => entry.graduatingBatch === batch)
                  .map((entry) => (
                    <tr key={entry._id}>
                      <td>{entry.department.toUpperCase()}</td>
                      <td>
                        {entry.user?.fullName || <em className="sv-muted">not signed in yet</em>}
                        <br />
                        <span className="sv-muted">{entry.email}</span>
                      </td>
                      <td>
                        {entry.driveFolderUrl ? (
                          <a href={entry.driveFolderUrl} target="_blank" rel="noopener noreferrer">open</a>
                        ) : (
                          <span className="sv-muted">—</span>
                        )}
                      </td>
                      <td>
                        <button className="sv-btn sv-btn-ghost sv-btn-sm" onClick={() => standDown(entry)}>
                          Stand down
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      {custodians.length === 0 && (
        <div className="sv-empty">
          Nobody appointed yet. Until then every submission falls to the superadmins.
        </div>
      )}
    </div>
  );
};

export default Custodians;
