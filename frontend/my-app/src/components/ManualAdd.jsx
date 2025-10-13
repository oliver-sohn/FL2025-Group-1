import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import CardSection from './CardSection';

function toISOInTZ(dateStr, timeStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh = 0, mm = 0] = (timeStr || '00:00').split(':').map(Number);
  const local = new Date(y, m - 1, d, hh, mm, 0, 0);
  return local.toISOString();
}

function ManualAddSection({ onAdd }) {
  const defaultTZ = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      return 'UTC';
    }
  }, []);

  const [form, setForm] = useState({
    // basic
    summary: '',
    description: '',
    location: '',
    eventType: '', // e.g., "Exam", "Lecture", "Assignment Due"
    // future idea; showing but disabled so schema parity is clear
    colorId: '',
    // timing (start)
    startDate: '',
    startTime: '',
    // timing (end)
    endDate: '',
    endTime: '',
    timeZone: defaultTZ,
    // recurrence (optional, e.g., "RRULE:FREQ=WEEKLY;BYDAY=MO")
    recurrence: '',
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleChange = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.summary || !form.startDate) return;

    const hasStartTime = Boolean(form.startTime);
    const hasEndInputs = Boolean(form.endDate || form.endTime);

    // Build start
    const start = hasStartTime
      ? {
          dateTime: toISOInTZ(form.startDate, form.startTime),
          timeZone: form.timeZone,
        }
      : {
          date: form.startDate, // all-day
          timeZone: form.timeZone,
        };

    // Build end:
    // - if user provided end date/time, respect it
    // - else if startTime provided but no end → default +1 hour
    // - else (all-day) → same date
    let end;
    if (hasEndInputs) {
      const endDate = form.endDate || form.startDate;
      if (form.endTime) {
        end = {
          dateTime: toISOInTZ(endDate, form.endTime),
          timeZone: form.timeZone,
        };
      } else if (hasStartTime) {
        // No endTime but timed start → +1 hour default
        const iso = toISOInTZ(endDate, form.startTime);
        const plus1h = new Date(iso);
        plus1h.setHours(plus1h.getHours() + 1);
        end = { dateTime: plus1h.toISOString(), timeZone: form.timeZone };
      } else {
        // all-day with end date but no time
        end = { date: endDate, timeZone: form.timeZone };
      }
    } else if (hasStartTime) {
      // default timed duration 1h
      const startISO = toISOInTZ(form.startDate, form.startTime);
      const plus1h = new Date(startISO);
      plus1h.setHours(plus1h.getHours() + 1);
      end = { dateTime: plus1h.toISOString(), timeZone: form.timeZone };
    } else {
      // all-day same date
      end = { date: form.startDate, timeZone: form.timeZone };
    }

    const payload = {
      // Basic Event Info
      summary: form.summary.trim(),
      description: form.description.trim() || undefined,
      location: form.location.trim() || undefined,
      colorId: form.colorId || undefined, // currently unused; fine to omit
      eventType: form.eventType.trim() || undefined,

      // Time
      start,
      end,

      // Recurrence
      recurrence: form.recurrence.trim() ? [form.recurrence.trim()] : undefined,

      // Not collecting these in manual flow right now:
      // recurringEventId: undefined,
      // originalStartTime: undefined,
    };

    onAdd(payload);

    // reset (keep timezone; it’s user preference)
    setForm({
      summary: '',
      description: '',
      location: '',
      eventType: '',
      colorId: '',
      startDate: '',
      startTime: '',
      endDate: '',
      endTime: '',
      timeZone: form.timeZone,
      recurrence: '',
    });
  };

  return (
    <CardSection title="Manual upload">
      <form className="manual-form" onSubmit={handleSubmit}>
        {/* Row 1 — Title + Type */}
        <div className="row">
          <label className="field grow" htmlFor="summary-field">
            <span>Title</span>
            <input
              id="summary-field"
              type="text"
              value={form.summary}
              onChange={handleChange('summary')}
              placeholder="Exam 1 / HW 2 / Guest lecture…"
              required
            />
          </label>

          <label className="field" htmlFor="event-type-field">
            <span>Event type</span>
            <input
              id="event-type-field"
              type="text"
              value={form.eventType}
              onChange={handleChange('eventType')}
              placeholder="Exam / Lecture / Assignment / Other"
              required
            />
          </label>
        </div>

        {/* Row 2 — Date/Time */}
        <div className="row">
          <label className="field" htmlFor="start-date-field">
            <span>Start date</span>
            <input
              id="start-date-field"
              type="date"
              value={form.startDate}
              onChange={handleChange('startDate')}
              required
            />
          </label>

          <label className="field" htmlFor="start-time-field">
            <span>Start time (optional)</span>
            <input
              id="start-time-field"
              type="time"
              value={form.startTime}
              onChange={handleChange('startTime')}
            />
          </label>

          <label className="field" htmlFor="end-date-field">
            <span>End date (optional)</span>
            <input
              id="end-date-field"
              type="date"
              value={form.endDate}
              onChange={handleChange('endDate')}
            />
          </label>

          <label className="field" htmlFor="end-time-field">
            <span>End time (optional)</span>
            <input
              id="end-time-field"
              type="time"
              value={form.endTime}
              onChange={handleChange('endTime')}
            />
          </label>
        </div>

        {/* Row 3 — Location / Timezone */}
        <div className="row">
          <label className="field grow" htmlFor="location-field">
            <span>Location (optional)</span>
            <input
              id="location-field"
              type="text"
              value={form.location}
              onChange={handleChange('location')}
              placeholder="Jubel Hall 101 / Zoom…"
            />
          </label>

          <label className="field" htmlFor="tz-field">
            <span>Time zone</span>
            <input
              id="tz-field"
              type="text"
              value={form.timeZone}
              onChange={handleChange('timeZone')}
              placeholder="America/Chicago"
            />
          </label>
        </div>

        {/* Row 4 — Advanced toggle */}
        <div className="row">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setShowAdvanced((v) => !v)}
          >
            {showAdvanced ? 'Hide advanced' : 'Show advanced'}
          </button>
        </div>

        {showAdvanced && (
          <>
            {/* Row 5 — Description */}
            <div className="row">
              <label className="field grow" htmlFor="desc-field">
                <span>Description (optional)</span>
                <textarea
                  id="desc-field"
                  rows={3}
                  value={form.description}
                  onChange={handleChange('description')}
                  placeholder="Notes, agenda, prep links…"
                />
              </label>
            </div>

            {/* Row 6 — Recurrence / Color */}
            <div className="row">
              <label className="field" htmlFor="color-field">
                <span>Color ID (future)</span>
                <input
                  id="color-field"
                  type="text"
                  value={form.colorId}
                  onChange={handleChange('colorId')}
                  placeholder="e.g., 5"
                  disabled
                  title="Reserved for future; managed by system"
                />
              </label>
            </div>
          </>
        )}

        {/* Actions */}
        <div className="row actions-right">
          <button className="btn" type="submit">
            Add
          </button>
        </div>
      </form>
    </CardSection>
  );
}

ManualAddSection.propTypes = {
  onAdd: PropTypes.func.isRequired, // (eventPayload) => void
};

export default ManualAddSection;
