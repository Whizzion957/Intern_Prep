/**
 * Request a course (Saviour)
 *
 * Students can't write to the catalog - that's what keeps codes unique and the
 * course list clean. This is the pressure valve when a course genuinely isn't
 * there yet.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { courseAPI } from '../api';
import '../saviour.css';

const RequestCourse = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ code: '', name: '', semester: '', note: '' });
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const set = (field) => (event) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      await courseAPI.request(form);
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not file the request');
    }
  };

  if (done) {
    return (
      <div className="sv-page">
        <div className="sv-success">
          Filed. An admin will add it to the catalog, usually within a day.
        </div>
        <div className="sv-actions" style={{ marginTop: '1.25rem' }}>
          <button className="sv-btn" onClick={() => navigate('/saviour')}>Back to search</button>
        </div>
      </div>
    );
  }

  return (
    <div className="sv-page">
      <header className="sv-header">
        <h1>Request a course</h1>
        <p>Courses are added by admins so codes stay unique and searchable.</p>
      </header>

      <form className="sv-form" onSubmit={submit}>
        {error && <div className="sv-error">{error}</div>}

        <div className="sv-row">
          <div className="sv-field">
            <label>Course code</label>
            <input className="sv-input" value={form.code} onChange={set('code')} placeholder="CSC-201" />
          </div>
          <div className="sv-field">
            <label>Semester</label>
            <input className="sv-input" type="number" min="1" max="10" value={form.semester} onChange={set('semester')} />
          </div>
        </div>

        <div className="sv-field">
          <label>Course name</label>
          <input className="sv-input" value={form.name} onChange={set('name')} />
        </div>

        <div className="sv-field">
          <label>Anything else (old code it replaced, for instance)</label>
          <textarea rows="2" value={form.note} onChange={set('note')} />
        </div>

        <div className="sv-actions">
          <button className="sv-btn" type="submit">Send request</button>
        </div>
      </form>
    </div>
  );
};

export default RequestCourse;
