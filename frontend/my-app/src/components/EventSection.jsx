import React from 'react';
import CardSection from './CardSection';

function EventsSection() {
  // todo: fetch events, pass loading/error states, etc.
  return (
    <CardSection title="Events">
      <p className="empty-state">No events yet.</p>
      {/* when data is pulled: <ul className="list">...</ul> */}
    </CardSection>
  );
}

export default EventsSection;
