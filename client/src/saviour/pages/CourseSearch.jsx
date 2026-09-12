/**
 * Saviour landing page
 *
 * One search box. Typing a code (old or new), an alias or a name goes straight
 * to that course's page - the whole point being that nobody should have to
 * navigate a folder tree to find a past paper.
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CourseTypeahead from '../components/CourseTypeahead';
import { gapAPI, custodianAPI, kindLabel, examLabel } from '../api';
import '../saviour.css';

const CourseSearch = () => {
  const navigate = useNavigate();
  const [gaps, setGaps] = useState([]);
  // Whether to offer the approval / custodian pages. The navbar deliberately
  // carries one Saviour tab, so these hang off the landing page instead.
  const [role, setRole] = useState({ isAdmin: false, isSuperadmin: false, custodianships: [] });

  useEffect(() => {
    gapAPI
      .list({ limit: 12 })
      .then(({ data }) => setGaps(data.gaps))
      .catch(() => setGaps([]));

    custodianAPI
      .mine()
      .then(({ data }) => setRole(data))
      .catch(() => {});
  }, []);

  const canApprove = role.isSuperadmin || role.custodianships.length > 0;

  return (
    <div className="sv-page">
      <header className="sv-header">
        <h1>Saviour</h1>
        <p>Past papers, notes and slides by course. Search by code or name.</p>
      </header>

      <CourseTypeahead
        autoFocus
        onSelect={(course) => navigate(`/saviour/course/${course.code}`)}
        onNotFound={() => navigate('/saviour/request-course')}
      />

      <div className="sv-actions" style={{ marginTop: '1rem' }}>
        <Link className="sv-btn sv-btn-ghost sv-btn-sm" to="/saviour/add">Add material</Link>
        {(canApprove || role.isAdmin) && (
          <Link className="sv-btn sv-btn-ghost sv-btn-sm" to="/saviour/approvals">
            Approvals
            {role.custodianships.length > 0 && !role.isSuperadmin && (
              <> · {role.custodianships
                .map((entry) => `${entry.department.toUpperCase()} ’${String(entry.graduatingBatch).slice(2)}`)
                .join(', ')}</>
            )}
          </Link>
        )}
        {role.isSuperadmin && (
          <Link className="sv-btn sv-btn-ghost sv-btn-sm" to="/saviour/custodians">Custodians</Link>
        )}
      </div>

      {gaps.length > 0 && (
        <section className="sv-section">
          <h2>Most wanted right now</h2>
          <p className="sv-muted" style={{ marginTop: '-0.5rem', marginBottom: '0.85rem' }}>
            Slots people looked for and found empty. If you have one of these, it
            is the single most useful thing you can upload.
          </p>

          <table className="sv-grid">
            <thead>
              <tr>
                <th>Course</th>
                <th>What’s missing</th>
                <th>Year</th>
                <th>Asked by</th>
              </tr>
            </thead>
            <tbody>
              {gaps.map((gap) => (
                <tr key={gap._id}>
                  <td>
                    <span className="sv-code">{gap.codeAtTime}</span> {gap.course.name}
                  </td>
                  <td>
                    {kindLabel(gap.kind)}
                    {gap.exam ? ` — ${examLabel(gap.exam)}` : ''}
                  </td>
                  <td>{gap.year}</td>
                  <td>{gap.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
};

export default CourseSearch;
