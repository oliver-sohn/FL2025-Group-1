import React from 'react';
import PropTypes from 'prop-types';
import CardSection from './CardSection';
import EventShape from './propTypes';

// map Google Calendar colorId → hex
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
  if (sameDay(s, e)) {
    return `${fmtDate.format(s)} • ${fmtTime.format(s)}–${fmtTime.format(e)}`;
  }
  return `${fmtDate.format(s)}, ${fmtTime.format(s)} → ${fmtDate.format(e)}, ${fmtTime.format(e)}`;
}

function ExamsSection({
  items,
  loading,
  onRefresh,
  onAddClick,
  onEdit,
  onDelete,
}) {
  const list = Array.isArray(items) ? items : [];
  const isEmpty = !loading && list.length === 0;

  return (
    <CardSection
      title="Exams / Quizzes"
      action={
        <>
          {onRefresh ? (
            <button type="button" className="btn btn-ghost" onClick={onRefresh}>
              Refresh
            </button>
          ) : null}
          <button
            className="btn btn-primary"
            type="button"
            aria-label="Add Exam"
            onClick={() => onAddClick?.('exam')}
            style={{ marginLeft: 8 }}
          >
            ＋
          </button>
        </>
      }
    >
      {loading && (
        <div className="loading">
          <div className="spinner" aria-hidden />
          <span>Loading exams…</span>
        </div>
      )}

      {isEmpty && <p className="empty-state">No exams yet.</p>}

      {!loading && !isEmpty && (
        <ul className="list event-list">
          {list.map((ev) => {
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
                    {/* {ev.eventType ? (
                      <span className="badge">{ev.eventType}</span>
                    ) : null} */}
                  </div>

                  {ev.description ? (
                    <p className="event-desc" title={ev.description}>
                      {ev.description}
                    </p>
                  ) : null}
                </div>

                <div className="item-actions">
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => onEdit?.(ev)}
                    aria-label={`Edit ${ev.summary}`}
                    title="Edit"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => onDelete?.(ev.id)}
                    aria-label={`Delete ${ev.summary}`}
                    title="Delete"
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </CardSection>
  );
}

ExamsSection.propTypes = {
  items: PropTypes.arrayOf(EventShape),
  loading: PropTypes.bool,
  onRefresh: PropTypes.func,
  onAddClick: PropTypes.func,
  onEdit: PropTypes.func, // NEW
  onDelete: PropTypes.func, // NEW
};

ExamsSection.defaultProps = {
  items: [],
  loading: false,
  onRefresh: null,
  onAddClick: undefined,
  onEdit: null,
  onDelete: null,
};

export default ExamsSection;
