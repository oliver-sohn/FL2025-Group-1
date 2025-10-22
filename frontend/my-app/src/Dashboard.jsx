// frontend/my-app/src/Dashboard.jsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import NavBar from './NavBar';
import EventsSection from './components/EventSection';
import AssignmentsSection from './components/AssignmentSection';
import ExamsSection from './components/ExamSection';
import './App.css';

/** ---------- helpers (hoisted to avoid hook deps noise) ---------- */

const normalizeType = (t) =>
  String(t || 'event')
    .toLowerCase()
    .trim();

const isExamLike = (t) =>
  ['exam', 'quiz', 'midterm', 'final', 'test'].includes(normalizeType(t));

const safeTime = (v) => {
  const t = v instanceof Date ? v.getTime() : new Date(v).getTime();
  return Number.isFinite(t) ? t : Number.POSITIVE_INFINITY;
};
const byStart = (a, b) => safeTime(a.start) - safeTime(b.start);

// build a local wall-time ISO-ish string from date+time fields
const pickDateLike = (dateStr, timeStr) => {
  if (!dateStr) return null;
  const safeTimeStr = timeStr ? `${timeStr}:00` : '00:00:00';
  return `${dateStr}T${safeTimeStr}`;
};

const toRecurrenceString = (v) => {
  if (!v) return '';
  if (Array.isArray(v)) return v.join('\n');
  return String(v);
};

const isAllDayString = (start) =>
  typeof start === 'string' && /^\d{4}-\d{2}-\d{2}T00:00:00$/.test(start);

const normalizeManualFormToApi = (
  { title, date, time, location, description, eventType },
  userId,
) => {
  const start = pickDateLike(date, time);
  let end = start;

  if (start && !isAllDayString(start)) {
    const d = new Date(start);
    if (!Number.isNaN(d.getTime())) {
      const plus1h = new Date(d);
      plus1h.setHours(plus1h.getHours() + 1);
      end = plus1h.toISOString();
    }
  }

  return {
    summary: title || 'Untitled',
    description: description || '',
    location: location || '',
    colorId: '1',
    eventType: eventType || 'event',
    start,
    end: end || start,
    recurrence: toRecurrenceString(''),
    course_name: '',
    user_id: userId,
    // IMPORTANT: use null to avoid UNIQUE conflicts on '' in DB
    google_event_id: null,
  };
};

const prettyDetail = (text) => {
  try {
    const json = JSON.parse(text);
    const d = json.detail ?? json;
    return typeof d === 'string' ? d : JSON.stringify(d, null, 2);
  } catch {
    return text;
  }
};

/** ---------------- modal ---------------- */

function ManualAddModal({ isOpen, defaultType, onClose, onSubmit }) {
  const [form, setForm] = useState({
    title: '',
    date: '',
    time: '',
    location: '',
    description: '',
    eventType: defaultType || 'event',
  });

  React.useEffect(() => {
    if (isOpen) setForm((f) => ({ ...f, eventType: defaultType || 'event' }));
  }, [isOpen, defaultType]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title || !form.date) return;
    onSubmit(form);
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-header">
          <h3>Add {form.eventType}</h3>
          <button
            type="button"
            className="icon-btn"
            aria-label="Close"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <form className="manual-form" onSubmit={handleSubmit}>
          <div className="row">
            <label className="field grow" htmlFor="title">
              <span>Title</span>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Exam 1 / HW 2 / Guest lecture…"
                required
              />
            </label>
          </div>

          <div className="row">
            <label className="field" htmlFor="date">
              <span>Date</span>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </label>
            <label className="field" htmlFor="time">
              <span>Time (optional)</span>
              <input
                type="time"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
              />
            </label>
            <label className="field grow" htmlFor="location">
              <span>Location (optional)</span>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Zoom / Room 2.118"
              />
            </label>
          </div>

          <div className="row">
            <label className="field grow" htmlFor="description">
              <span>Description (optional)</span>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Anything else to remember…"
              />
            </label>
          </div>

          <div className="row actions-right">
            <button className="btn btn-ghost" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="btn" type="submit">
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

ManualAddModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  defaultType: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

ManualAddModal.defaultProps = {
  defaultType: 'event',
};

/** ---------------- page ---------------- */

function Dashboard({ user, onLogout }) {
  const [events, setEvents] = useState(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDefaultType, setModalDefaultType] = useState('event');

  // memoize raw list to keep downstream memos stable
  const list = useMemo(() => (Array.isArray(events) ? events : []), [events]);

  const getEvents = useCallback(async () => {
    const userId = user.id;
    const url = `${process.env.REACT_APP_BACKEND_URL}/events?user_id=${userId}`;
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `GET /events failed: ${res.status}\n${prettyDetail(text)}`,
      );
    }
    return res.json();
  }, [user.id]);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const e = await getEvents();
      setEvents(e);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }, [getEvents]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // group + sort chronologically
  const grouped = useMemo(() => {
    const assignments = list.filter((item) =>
      ['assignment', 'homework', 'hw', 'todo'].includes(
        normalizeType(item.eventType),
      ),
    );
    const exams = list.filter((item) => isExamLike(item.eventType));
    const plainEvents = list.filter(
      (item) =>
        !['assignment', 'homework', 'hw', 'todo'].includes(
          normalizeType(item.eventType),
        ) && !isExamLike(item.eventType),
    );

    return {
      events: [...plainEvents].sort(byStart),
      assignments: [...assignments].sort(byStart),
      exams: [...exams].sort(byStart),
    };
  }, [list]);

  // modal controls
  const openAddFor = (defaultType) => {
    setModalDefaultType(defaultType);
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setError('');
  };

  // POST
  const postEvent = async (manualForm) => {
    const body = normalizeManualFormToApi(manualForm, user.id);
    const url = `${process.env.REACT_APP_BACKEND_URL}/events`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `POST /events failed: ${res.status}\n${prettyDetail(text)}`,
      );
    }
    return res.json();
  };

  const handleManualSubmit = async (manualForm) => {
    setError('');
    try {
      await postEvent(manualForm);
      closeModal();
      await fetchEvents();
    } catch (e) {
      setError(String(e.message || e));
    }
  };

  return (
    <div className="dashboard">
      <NavBar user={user} onLogout={onLogout} />
      <main className="dashboard-main">
        <h2 className="page-title">This is your Dashboard</h2>

        <div className="cards-grid">
          <EventsSection
            loading={loading}
            events={grouped.events}
            onRefresh={fetchEvents}
            onAddClick={() => openAddFor('event')}
          />

          <AssignmentsSection
            loading={loading}
            items={grouped.assignments}
            onRefresh={fetchEvents}
            onAddClick={() => openAddFor('assignment')}
          />

          <ExamsSection
            loading={loading}
            items={grouped.exams}
            onRefresh={fetchEvents}
            onAddClick={() => openAddFor('exam')}
          />
        </div>

        {error && (
          <pre
            className="error"
            role="alert"
            style={{ whiteSpace: 'pre-wrap', marginTop: 12 }}
          >
            {error}
          </pre>
        )}
      </main>

      <ManualAddModal
        isOpen={modalOpen}
        defaultType={modalDefaultType}
        onClose={closeModal}
        onSubmit={handleManualSubmit}
      />
    </div>
  );
}

Dashboard.propTypes = {
  user: PropTypes.shape({
    name: PropTypes.string.isRequired,
    email: PropTypes.string.isRequired,
    id: PropTypes.number.isRequired,
  }).isRequired,
  onLogout: PropTypes.func.isRequired,
};

export default Dashboard;
