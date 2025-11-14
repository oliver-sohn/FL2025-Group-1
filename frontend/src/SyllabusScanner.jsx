import React, { useMemo, useState } from 'react';
import { FileScan } from 'lucide-react';
import PropTypes from 'prop-types';
import NavBar from './NavBar';
import CardSection from './components/CardSection';
import FileUpload from './components/FileUpload';
import ParsedItemsSection from './components/ParsedItems';
import ManualAddSection from './components/ManualAdd';
import './App.css';

/** ---------- Helpers: normalize event shape for the API ---------- * */

// Pull a usable date/time string out of either:
// - manual (Google-ish) { date | dateTime }
// - scanned (flat string/Date)
function pickDateLike(v) {
  if (!v) return null;
  if (typeof v === 'object') {
    if (v.dateTime) return v.dateTime; // ISO string
    if (v.date) return `${v.date}T00:00:00`; // all-day => midnight
  }
  return v; // already a string or Date
}

function isAllDayStart(event, startRaw) {
  if (event?.start && typeof event.start === 'object' && event.start.date)
    return true;
  return (
    typeof startRaw === 'string' && /^\d{4}-\d{2}-\d{2}(?!T)/.test(startRaw)
  );
}

// Backend expects a *string* for recurrence; keep it simple.
function toRecurrenceString(v) {
  if (!v) return '';
  if (Array.isArray(v)) return v.join('\n'); // if parser ever returns an array
  return String(v);
}

// Normalize both scanned + manual items to what the backend expects.
// IMPORTANT: backend requires these fields; send them even if empty:
// - description (string), colorId (string), recurrence (string), course_name (string), google_event_id (string)
function normalizeForApi(event, userId) {
  let startRaw = new Date(pickDateLike(event.start || event.start_time));
  let endRaw = pickDateLike(event.end || event.end_time);

  // Default end if missing
  if (!endRaw && startRaw && !Number.isNaN(startRaw.getTime())) {
    if (isAllDayStart(event, startRaw)) {
      endRaw = startRaw; // all-day single-day
    } else {
      const e = new Date(startRaw);
      e.setHours(e.getHours() + 1);
      endRaw = e.toISOString(); // timed default +1h
    }
  }

  startRaw = startRaw.toISOString();

  return {
    summary: event?.summary || event?.title || 'Untitled',
    description: event?.description ?? '',
    location: event?.location ?? '',
    colorId: event?.colorId ?? '1',
    eventType: event?.eventType || 'Event',
    start: startRaw,
    end: endRaw || startRaw,
    recurrence: toRecurrenceString(event?.recurrence),
    course_name: event?.course_name ?? '',
    user_id: userId,
    google_event_id: event?.google_event_id ?? null,
  };
}

// Pretty-print FastAPI error details
function prettyDetail(text) {
  try {
    const json = JSON.parse(text);
    const d = json.detail ?? json;
    return typeof d === 'string' ? d : JSON.stringify(d, null, 2);
  } catch {
    return text;
  }
}

/** -------------------- Component -------------------- * */

function SyllabusScanner({ user, onLogout }) {
  const [step, setStep] = useState('idle'); // 'idle' | 'scanning' | 'review'
  const [parsed, setParsed] = useState([]); // unified list (scanned + manual)
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [error, setError] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');

  const reset = () => {
    setStep('idle');
    setParsed([]);
    setSelectedIds(new Set());
    setError('');
    setUploadedFileName('');
  };

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

    if (!response.ok) {
      const text = await response.text();
      const msg = prettyDetail(text);
      throw new Error(`Parse failed: ${response.status}\n${msg}`);
    }

    try {
      return response.json();
    } catch (e) {
      throw new Error('Parse failed: invalid JSON from parser service');
    }
  };

  const onUpload = async (file) => {
    setUploadedFileName(file?.name || '');
    setError('');
    setStep('scanning');

    try {
      const parsedEvents = await parseFile(file);
      const parsedEventsWithIds = parsedEvents.map((event, i) => ({
        ...event,
        id: i,
      }));
      setParsed(parsedEventsWithIds);
      setSelectedIds(new Set(parsedEventsWithIds.map((m) => m.id))); // preselect all
      setStep('review');
    } catch (e) {
      setError(String(e.message || e));
      setStep('idle');
    }
  };

  const toggle = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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
    const body = normalizeForApi(event, user.id);
    const url = `${process.env.REACT_APP_BACKEND_URL}/events`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      const msg = prettyDetail(text);
      throw new Error(`POST /events failed: ${response.status}\n${msg}`);
    }

    return response.json();
  };

  const postEvents = async () =>
    Promise.all(selectedItems.map((event) => postEvent(event)));

  const postEventToGCal = async (eventId) => {
    const userId = user.id;
    const url = `${process.env.REACT_APP_BACKEND_URL}/gcal/add-event?event_id=${eventId}&user_id=${userId}`;
    const response = await fetch(url, {
      method: 'POST',
    });

    if (!response.ok) {
      const text = await response.text();
      const msg = prettyDetail(text);
      throw new Error(`POST /events failed: ${response.status}\n${msg}`);
    }

    return response.json();
  };

  const postEventsToGcal = async (eventIds) =>
    Promise.all(eventIds.map((eventId) => postEventToGCal(eventId)));

  const removePostedEvents = () => {
    const unselectedEvents = parsed.filter(
      (event) => !selectedIds.has(event.id),
    );
    setParsed(unselectedEvents);
    setSelectedIds(new Set());
  };

  const handleAddToSite = async () => {
    setError('');
    try {
      await postEvents();
      alert(`Added ${selectedItems.length} item(s) to your site ✨`);
      removePostedEvents();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      const msg = String(err?.message || err);
      setError(msg);
      alert('Some items failed to add. Check the error message below.');
    }
  };

  const handleAddToSiteAndGCal = async () => {
    setError('');
    try {
      const events = await postEvents();
      const eventIds = events.map((event) => event.id);
      await postEventsToGcal(eventIds);
      alert(`Added ${selectedItems.length} item(s) to your GCal ✨`);
      removePostedEvents();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      const msg = String(err?.message || err);
      setError(msg);
      alert('Some items failed to add. Check the error message below.');
    }
  };

  return (
    <div className="dashboard">
      <NavBar user={user} onLogout={onLogout} />
      <main className="dashboard-main">
        <h2 className="page-title">
          <FileScan size={24} />
          Syllabus Scanner
        </h2>

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
                const nextItem = {
                  id,
                  ...item,
                };
                setParsed((prev) => [...prev, nextItem]);
                setSelectedIds((prev) => {
                  const next = new Set(prev);
                  next.add(id);
                  return next;
                });
              }}
            />

            <div className="cta-row">
              <button className="btn" onClick={reset} type="button">
                Upload another syllabus
              </button>
              <button
                className="btn"
                disabled={selectedIds.size === 0}
                onClick={handleAddToSite}
                type="button"
              >
                Add to site
              </button>
              <button
                className="btn btn-primary"
                disabled={selectedIds.size === 0}
                onClick={handleAddToSiteAndGCal}
                type="button"
              >
                Add to site & export to Google Calendar
              </button>
            </div>
          </>
        )}

        {error && (
          // render as <pre> directly (not nested in <p>) to avoid hydration warning
          <pre
            className="error"
            role="alert"
            style={{ whiteSpace: 'pre-wrap' }}
          >
            {error}
          </pre>
        )}
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
