/**
 * Professor picker (Saviour)
 *
 * Notes are worthless detached from whoever gave them, so this is a real
 * picker rather than a text box - it matches existing professors first and only
 * proposes a new one when nothing fits. New names land unverified for a
 * custodian to tidy, which keeps "Dr Sharma" and "A. Sharma" from splitting one
 * person's material into two piles.
 */

import { useEffect, useRef, useState } from 'react';
import { professorAPI } from '../api';

const ProfessorPicker = ({ selected, onChange, department }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handle = setTimeout(async () => {
      try {
        const { data } = await professorAPI.search({ q: query, department, limit: 8 });
        setResults(data.professors);
      } catch {
        setResults([]);
      }
    }, 180);
    return () => clearTimeout(handle);
  }, [query, department, open]);

  useEffect(() => {
    const onClick = (event) => {
      if (boxRef.current && !boxRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const add = (professor) => {
    if (!selected.some((entry) => entry.key === professor.key)) {
      onChange([...selected, professor]);
    }
    setQuery('');
    setOpen(false);
  };

  const remove = (key) => onChange(selected.filter((entry) => entry.key !== key));

  const exactMatch = results.some(
    (professor) => professor.name.toLowerCase() === query.trim().toLowerCase()
  );

  return (
    <div className="sv-typeahead" ref={boxRef}>
      {selected.length > 0 && (
        <div className="sv-chips">
          {selected.map((professor) => (
            <span className="sv-chip" key={professor.key}>
              {professor.name}
              {professor.isNew && <em className="sv-muted"> · new</em>}
              <button type="button" onClick={() => remove(professor.key)} aria-label="Remove">✕</button>
            </span>
          ))}
        </div>
      )}

      <input
        className="sv-input"
        value={query}
        placeholder="Who taught it? Start typing a name"
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />

      {open && (query || results.length > 0) && (
        <ul className="sv-results">
          {results.map((professor) => (
            <li key={professor._id}>
              <button
                type="button"
                className="sv-result"
                onClick={() => add({ key: professor._id, id: professor._id, name: professor.name })}
              >
                <span>{professor.name}</span>
                {!professor.verified && <span className="sv-muted">unverified</span>}
              </button>
            </li>
          ))}

          {query.trim() && !exactMatch && (
            <li>
              <button
                type="button"
                className="sv-result"
                onClick={() =>
                  add({ key: `new:${query.trim()}`, name: query.trim(), isNew: true })
                }
              >
                Add “{query.trim()}” as a new professor
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
};

export default ProfessorPicker;
