import React from 'react';
import PropTypes from 'prop-types';
import CardSection from './CardSection';

// map Google Calendar colorId
const colorFromId = (id) => {
  const map = {
    1: '#7986cb',
    2: '#33b679',
    3: '#8e24aa',
    4: '#e67c73',
    5: '#f6c026',
    6: '#f5511d',
    7: '#039be5',
    8: '#616161',
    9: '#3f51b5',
    10: '#0b8043',
    11: '#d50000',
  };
  return map?.[String(id)] || '#10b981';
};

// date formatting helpers
const toDate = (val) => (val instanceof Date ? val : new Date(val));
const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const fmtDate = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});
const fmtTime = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
});

function formatRange(start, end) {
  const s = toDate(start);
  const e = toDate(end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return '—';
  if (sameDay(s, e))
    return `${fmtDate.format(s)} • ${fmtTime.format(s)}–${fmtTime.format(e)}`;
  return `${fmtDate.format(s)}, ${fmtTime.format(s)} → ${fmtDate.format(e)}, ${fmtTime.format(e)}`;
}

function EventsSection({ events, loading, onRefresh, onAddClick }) {
  // ✅ Memoize list to avoid re-creation
  const list = React.useMemo(
    () => (Array.isArray(events) ? events : []),
    [events],
  );
  const isEmpty = list.length === 0;

  // ✅ sort events chronologically (earliest first)
  const safeTime = (v) => {
    const t = v instanceof Date ? v.getTime() : new Date(v).getTime();
    return Number.isFinite(t) ? t : Number.POSITIVE_INFINITY; // invalids go last
  };

  const sortedList = React.useMemo(
    () => [...list].sort((a, b) => safeTime(a.start) - safeTime(b.start)),
    [list],
  );

  return (
    <CardSection
      title="Events"
      action={
        <div style={{ display: 'flex', gap: 8 }}>
          {onRefresh && (
            <button type="button" className="btn btn-ghost" onClick={onRefresh}>
              Refresh
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary"
            aria-label="Add Event"
            title="Add Event"
            onClick={() => onAddClick?.('event')}
          >
            ＋
          </button>
        </div>
      }
    >
      {loading && (
        <div className="loading">
          <div className="spinner" aria-hidden />
          <span>Loading events…</span>
        </div>
      )}

      {!loading && isEmpty && (
        <p className="empty-state">
          No events yet. Upload your syllabus or add one manually!
        </p>
      )}

      {!loading && !isEmpty && (
        <ul className="list event-list">
          {sortedList.map((ev) => {
            const accent = colorFromId(ev?.colorId);
            return (
              <li
                key={ev.id}
                className="event-row"
                style={{ borderLeftColor: accent }}
              >
                <div className="event-main">
                  <div className="event-title-line">
                    {ev.course_name && (
                      <span className="chip">{ev.course_name}:</span>
                    )}
                    <span className="event-title">{ev.summary}</span>
                  </div>

                  <div className="event-sub">
                    <span className="event-date">
                      {formatRange(ev.start, ev.end)}
                    </span>
                    {ev.location ? <span className="sep">•</span> : null}
                    {ev.location ? (
                      <span className="event-loc">@ {ev.location}</span>
                    ) : null}
                    {ev.eventType ? (
                      <span className="badge">{ev.eventType}</span>
                    ) : null}
                  </div>

                  {ev.description ? (
                    <p className="event-desc" title={ev.description}>
                      {ev.description}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </CardSection>
  );
}

const EventShape = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  user_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  google_event_id: PropTypes.string,
  summary: PropTypes.string.isRequired,
  description: PropTypes.string,
  location: PropTypes.string,
  colorId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  eventType: PropTypes.string.isRequired,
  start: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)])
    .isRequired,
  end: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)])
    .isRequired,
  recurrence: PropTypes.string,
  course_name: PropTypes.string,
});

EventsSection.propTypes = {
  events: PropTypes.arrayOf(EventShape),
  loading: PropTypes.bool,
  onRefresh: PropTypes.func,
  onAddClick: PropTypes.func, // new prop for “+” button
};

EventsSection.defaultProps = {
  events: [],
  loading: false,
  onRefresh: null,
  onAddClick: null,
};

export default EventsSection;
