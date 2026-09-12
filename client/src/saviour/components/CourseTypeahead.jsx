/**
 * Course picker (Saviour)
 *
 * Searches every code a course has ever used, plus aliases and the name, so
 * typing the old code or the new one lands on the same course. Students can
 * only pick from the catalog - "not here?" files a request for an admin.
 */

import { useEffect, useRef, useState } from 'react';
import { courseAPI } from '../api';

const CourseTypeahead = ({ value, onSelect, onNotFound, placeholder, autoFocus }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef(null);

  // Debounced search
  useEffect(() => {
    if (!open) return undefined;

    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await courseAPI.search({ q: query, limit: 12 });
        setResults(data.courses);
        setHighlight(0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 180);

    return () => clearTimeout(handle);
  }, [query, open]);

  // Close on outside click
  useEffect(() => {
    const onClick = (event) => {
      if (boxRef.current && !boxRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const choose = (course) => {
    onSelect(course);
    setQuery('');
    setOpen(false);
  };

  const onKeyDown = (event) => {
    if (!open || results.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlight((index) => (index + 1) % results.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlight((index) => (index - 1 + results.length) % results.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      choose(results[highlight]);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="sv-typeahead" ref={boxRef}>
      <input
        className="sv-input"
        type="text"
        autoFocus={autoFocus}
        value={open ? query : value ? `${value.code} — ${value.name}` : query}
        placeholder={placeholder || 'Course code or name (old codes work too)'}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />

      {open && (
        <ul className="sv-results" role="listbox">
          {loading && results.length === 0 && (
            <li className="sv-result sv-muted">Searching…</li>
          )}

          {!loading && results.length === 0 && (
            <li className="sv-result sv-muted">No course matches that</li>
          )}

          {results.map((course, index) => (
            <li key={course._id}>
              <button
                type="button"
                className="sv-result"
                aria-selected={index === highlight}
                onMouseEnter={() => setHighlight(index)}
                onClick={() => choose(course)}
              >
                <span className="sv-code">{course.code}</span>
                <span>{course.name}</span>
                {/* Show the retired codes so people recognise the course
                    by whatever name they knew it under */}
                {course.allCodes.length > 1 && (
                  <span className="sv-code sv-code-old">
                    {course.allCodes.filter((code) => code !== course.code).join(', ')}
                  </span>
                )}
                {/* Which branches take it - the same name can mean a different
                    course for a different branch */}
                <span className="sv-muted">{course.scopeLabel}</span>
              </button>
            </li>
          ))}

          {onNotFound && (
            <li>
              <button type="button" className="sv-result sv-muted" onClick={onNotFound}>
                Can’t find it? Request that it be added →
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
};

export default CourseTypeahead;
