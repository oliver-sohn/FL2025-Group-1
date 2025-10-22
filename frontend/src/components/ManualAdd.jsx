import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';

// ---- helpers copied to keep the payload consistent with /events ----
function pickDateLike(v) {
  if (!v) return null;
  if (typeof v === 'object') {
    if (v.dateTime) return v.dateTime;
    if (v.date) return `${v.date}T00:00:00`;
  }
  return v;
}

function isAllDayStart(event, startRaw) {
  if (event?.start && typeof event.start === 'object' && event.start.date)
    return true;
  return (
    typeof startRaw === 'string' && /^\d{4}-\d{2}-\d{2}(?!T)/.test(startRaw)
  );
}

function toRecurrenceString(v) {
  if (!v) return '';
  if (Array.isArray(v)) return v.join('\n');
  return String(v);
}

function normalizeForApi(event, userId) {
  const startRaw = pickDateLike(event.start || event.start_time);
  let endRaw = pickDateLike(event.end || event.end_time);

  if (!endRaw && startRaw) {
    const startDate = new Date(startRaw);
    if (!Number.isNaN(startDate.getTime())) {
      if (isAllDayStart(event, startRaw)) {
        endRaw = startRaw;
      } else {
        const e = new Date(startDate);
        e.setHours(e.getHours() + 1);
        endRaw = e.toISOString();
      }
    }
  }

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
// -------------------------------------------------------------------

function ManualAddModal({ open, defaultType, userId, onClose, onAdded }) {
  const [form, setForm] = useState({
    summary: '',
    date: '',
    time: '',
    location: '',
    description: '',
    eventType: defaultType || 'event',
  });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  // keep type in sync when a different "+" opens the modal
  useMemo(() => {
    setForm((f) => ({ ...f, eventType: defaultType || 'event' }));
  }, [defaultType]);

  const buildEventPayload = () => {
    // build Google-ish {start,end} from date+time
    const hasTime = Boolean(form.time);
    const start = hasTime
      ? { dateTime: `${form.date}T${form.time}` }
      : { date: form.date };
    const event = {
      summary: form.summary.trim(),
      description: form.description.trim(),
      location: form.location.trim(),
      start,
      end: start, // UI doesn’t collect end; backend will default +1h for timed
      eventType: form.eventType,
      recurrence: '',
      course_name: '',
      google_event_id: null,
    };
    return normalizeForApi(event, userId);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!form.summary || !form.date) {
      setErr('Please fill in at least Summary and Date.');
      return;
    }
    setSubmitting(true);
    try {
      const body = buildEventPayload();
      const url = `${process.env.REACT_APP_BACKEND_URL}/events`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      if (!res.ok) {
        let msg = text;
        try {
          const j = JSON.parse(text);
          msg =
            typeof j.detail === 'string'
              ? j.detail
              : JSON.stringify(j, null, 2);
        } catch {
          /* keep msg as text */
        }
        throw new Error(msg || `Request failed (${res.status})`);
      }
      const created = text ? JSON.parse(text) : null;
      if (onAdded) onAdded(created);
      setForm({
        summary: '',
        date: '',
        time: '',
        location: '',
        description: '',
        eventType: defaultType || 'event',
      });
      onClose();
    } catch (e2) {
      setErr(String(e2?.message || e2));
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Add item"
    >
      <div className="modal-card">
        <div className="modal-header">
          <h3>Add {form.eventType || defaultType || 'Event'}</h3>
          <button
            className="btn btn-ghost"
            type="button"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form className="manual-form" onSubmit={handleSubmit}>
          <div className="row">
            <label className="field grow" htmlFor="type">
              <span>Summary</span>
              <input
                type="text"
                value={form.summary}
                onChange={(e) => setForm({ ...form, summary: e.target.value })}
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
                placeholder="Room 101 / Zoom"
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
                placeholder="Any notes or details…"
              />
            </label>
          </div>

          <div className="row actions-right">
            <button className="btn" type="submit" disabled={submitting}>
              {submitting ? 'Adding…' : 'Add'}
            </button>
          </div>

          {err && (
            <p className="error" role="alert">
              {err}
            </p>
          )}
        </form>
      </div>

      {/* super light styles; add to your CSS file if you prefer */}
      <style>{`
        .modal-backdrop {
          position: fixed; inset: 0; background: rgba(0,0,0,0.35);
          display:flex; align-items:center; justify-content:center; z-index:999;
        }
        .modal-card {
          background: #fff; border-radius: 16px; padding: 16px; width: min(720px, 92vw);
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        .modal-header { display:flex; align-items:center; justify-content:space-between; margin-bottom: 8px; }
        .manual-form .row { display:flex; gap: 12px; align-items:flex-start; margin: 10px 0; }
        .manual-form .field { display:flex; flex-direction:column; gap:6px; min-width: 160px; }
        .manual-form .field.grow { flex: 1; }
        .row.actions-right { display:flex; justify-content:flex-end; }
      `}</style>
    </div>
  );
}

ManualAddModal.propTypes = {
  open: PropTypes.bool.isRequired,
  defaultType: PropTypes.string,
  userId: PropTypes.number.isRequired,
  onClose: PropTypes.func.isRequired,
  onAdded: PropTypes.func, // (createdEvent) => void
};

ManualAddModal.defaultProps = {
  defaultType: 'event',
  onAdded: undefined,
};

export default ManualAddModal;
