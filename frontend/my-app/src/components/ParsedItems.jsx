import React from 'react';
import PropTypes from 'prop-types';
import CardSection from './CardSection';

function ParsedItemsSection({ items, selectedIds, onToggle, onToggleAll }) {
  const allSelected =
    items.length > 0 && items.every((i) => selectedIds.has(i.id));

  return (
    <CardSection
      title="Select events to add to site / calendar"
      action={
        items.length > 0 ? (
          <button className="btn btn-ghost" type="button" onClick={onToggleAll}>
            {allSelected ? 'Clear all' : 'Select all'}
          </button>
        ) : null
      }
    >
      {items.length === 0 ? (
        <p className="empty-state">No items parsed yet.</p>
      ) : (
        <ul className="list parsed-list">
          {items.map((item) => (
            <li key={item.id} className="parsed-row">
              <label className="row-check" htmlFor="item-list">
                <input
                  type="checkbox"
                  checked={selectedIds.has(item.id)}
                  onChange={() => onToggle(item.id)}
                />
                <span>
                  <strong>{item.title}</strong>
                  <span className="muted">
                    {' '}
                    • {item.type} • {item.date}{' '}
                    {item.time ? `@ ${item.time}` : ''}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </CardSection>
  );
}

ParsedItemsSection.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      type: PropTypes.oneOf(['event', 'assignment']).isRequired,
      title: PropTypes.string.isRequired,
      date: PropTypes.string.isRequired,
      time: PropTypes.string,
    }),
  ).isRequired,
  selectedIds: PropTypes.instanceOf(Set).isRequired,
  onToggle: PropTypes.func.isRequired,
  onToggleAll: PropTypes.func.isRequired,
};

export default ParsedItemsSection;
