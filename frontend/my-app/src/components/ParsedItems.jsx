import React from 'react';
import PropTypes from 'prop-types';
import CardSection from './CardSection';

// date formatting
const toDate = (v) => (v instanceof Date ? v : new Date(v));
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

// actual parsedItems display - very similar to the events display
function ParsedItemsSection({ items, selectedIds, onToggle, onToggleAll }) {
  const list = Array.isArray(items) ? items : [];
  const allSelected =
    list.length > 0 && list.every((i) => selectedIds.has(i.id));

  return (
    <CardSection
      title="Select events to add to site / calendar"
      action={
        list.length > 0 ? (
          <button className="btn btn-ghost" type="button" onClick={onToggleAll}>
            {allSelected ? 'Clear all' : 'Select all'}
          </button>
        ) : null
      }
    >
      {list.length === 0 && <p className="empty-state">No items parsed yet.</p>}

      {list.length > 0 && (
        <ul className="list parsed-list">
          {list.map((item) => {
            const checkboxId = `parsed-${item.id}`;
            const title = item.summary || item.title || 'Untitled';
            const startVal = item.start_time || item.start;
            const endVal = item.end_time || item.end;

            return (
              <li key={item.id} className="parsed-row">
                <label className="row-check" htmlFor={checkboxId}>
                  <input
                    id={checkboxId}
                    type="checkbox"
                    checked={selectedIds.has(item.id)}
                    onChange={() => onToggle(item.id)}
                  />
                  <span>
                    <div className="event-title-line">
                      {item.course_name && (
                        <span className="chip">{item.course_name}</span>
                      )}
                      <span className="event-title">{title}</span>
                    </div>

                    <div className="event-sub">
                      <span className="event-date">
                        {formatRange(startVal, endVal)}
                      </span>
                      {item.eventType && (
                        <span className="badge">{item.eventType}</span>
                      )}
                    </div>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </CardSection>
  );
}

const ItemShape = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  // titles
  summary: PropTypes.string,
  title: PropTypes.string,
  // timing
  start_time: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.instanceOf(Date),
  ]),
  end_time: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
  start: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
  end: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
  // extras
  course_name: PropTypes.string,
  eventType: PropTypes.string,
});

ParsedItemsSection.propTypes = {
  items: PropTypes.arrayOf(ItemShape).isRequired,
  selectedIds: PropTypes.instanceOf(Set).isRequired,
  onToggle: PropTypes.func.isRequired,
  onToggleAll: PropTypes.func.isRequired,
};

export default ParsedItemsSection;
