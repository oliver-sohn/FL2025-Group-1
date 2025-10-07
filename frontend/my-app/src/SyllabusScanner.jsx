import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import NavBar from './NavBar';
import CardSection from './components/CardSection';
import FileUpload from './components/FileUpload';
import ParsedItemsSection from './components/ParsedItems';
import ManualAddSection from './components/ManualAdd';
import './App.css';

function SyllabusScanner({ user, onLogout }) {
  const [step, setStep] = useState('idle'); // 'idle' | 'scanning' | 'review'
  const [parsed, setParsed] = useState([]); // [{id,type,title,date,time}]
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [error, setError] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');

  const parseFile = async (file) => {
    const formData = new FormData();

    formData.append('file', file);
    formData.append('semester_start', '');
    formData.append('timezone', 'America/Chicago');

    const url = `${process.env.REACT_APP_BACKEND_URL}/parser/parse`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { accept: 'application/json' },
      body: formData,
    });

    return response.json();
  };

  const onUpload = async (file) => {
    // use the param so eslint/ts stop complaining + show feedback to user
    setUploadedFileName(file?.name || '');

    setError('');
    setStep('scanning');

    const parsedEvents = await parseFile(file);
    const parsedEventsWithIds = parsedEvents.map((event, i) => ({
      ...event,
      id: i,
    }));
    setParsed(parsedEventsWithIds);
    setSelectedIds(new Set(parsedEventsWithIds.map((m) => m.id))); // preselect all
    setStep('review');
  };

  const toggle = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds((prev) => {
      if (prev.size === parsed.length) return new Set();
      return new Set(parsed.map((p) => p.id));
    });
  };

  const selectedItems = useMemo(
    () => parsed.filter((p) => selectedIds.has(p.id)),
    [parsed, selectedIds],
  );

  const postEvent = async (event) => {
    const body = {
      summary: event.summary,
      description: event?.description ?? null,
      location: event?.location ?? null,
      colorId: event?.colorId ?? null,
      eventType: event.eventType,
      start: event.start,
      end: event?.end ?? event.start,
      recurrence: event?.recurrence ?? null,
      course_name: event?.course_name ?? null,
      user_id: user.id,
      google_event_id: event?.google_event_id ?? null,
    };

    const url = `${process.env.REACT_APP_BACKEND_URL}/events`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    return response.json();
  };

  const postEvents = async () => {
    await Promise.all(selectedItems.map((event) => postEvent(event)));
  };

  const handleAddToSite = async () => {
    await postEvents();
    alert(`Added ${selectedItems.length} item(s) to your site ✨`);
  };

  // const handleAddToSiteAndGCal = () => {
  //   // leaving this for now until everything's connected
  //   alert(
  //     `Added ${selectedItems.length} item(s) + exporting to Google Calendar 📆`,
  //   );
  // };

  return (
    <div className="dashboard">
      <NavBar user={user} onLogout={onLogout} />
      <main className="dashboard-main">
        <h2 className="page-title">Syllabus Scanner</h2>

        {step === 'idle' && (
          <CardSection title="Upload your syllabus (PDF)">
            <FileUpload onUpload={onUpload} />
            {uploadedFileName && (
              <p className="hint">Selected: {uploadedFileName}</p>
            )}
          </CardSection>
        )}

        {step === 'scanning' && (
          <CardSection title="Scanning your syllabus…">
            <div className="loading">
              <div className="spinner" aria-hidden />
              <span>Extracting events & assignments</span>
            </div>
          </CardSection>
        )}

        {step === 'review' && (
          <>
            <ParsedItemsSection
              items={parsed}
              selectedIds={selectedIds}
              onToggle={toggle}
              onToggleAll={toggleAll}
            />

            <ManualAddSection
              onAdd={(item) => {
                const id = String(Date.now());
                const nextItem = { id, ...item };
                setParsed((prev) => [...prev, nextItem]);
                setSelectedIds((prev) => {
                  const next = new Set(prev);
                  next.add(id);
                  return next;
                });
              }}
            />

            <div className="cta-row">
              <button
                className="btn"
                disabled={selectedIds.size === 0}
                onClick={handleAddToSite}
                type="button"
              >
                Add to site
              </button>
              {/* <button
                className="btn btn-primary"
                disabled={selectedIds.size === 0}
                onClick={handleAddToSiteAndGCal}
                type="button"
              >
                Add to site & export to GCal
              </button> */}
            </div>
          </>
        )}

        {error && <p className="error">{error}</p>}
      </main>
    </div>
  );
}

SyllabusScanner.propTypes = {
  user: PropTypes.shape({
    name: PropTypes.string.isRequired,
    email: PropTypes.string.isRequired,
    id: PropTypes.number.isRequired,
  }).isRequired,
  onLogout: PropTypes.func.isRequired,
};

export default SyllabusScanner;
