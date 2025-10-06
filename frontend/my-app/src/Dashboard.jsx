import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import NavBar from './NavBar';
import EventsSection from './components/EventSection';
import AssignmentsSection from './components/AssignmentSection';
import ExamsSection from './components/ExamSection';
import MOCK_EVENTS from './testFiles/mockEvents';

import './App.css';

function Dashboard({ user, onLogout }) {
  const [events, setEvents] = useState(undefined); // undefined on first render → tests your guards
  const [loading, setLoading] = useState(false);

  // fetching fake data - replace with real backend
  const fetchMock = () => {
    setLoading(true);
    // pretend we’re calling the server
    setTimeout(() => {
      setEvents(MOCK_EVENTS);
      setLoading(false);
    }, 800);
  };

  useEffect(() => {
    fetchMock(); // load once when page mounts
  }, []);

  return (
    <div className="dashboard">
      <NavBar user={user} onLogout={onLogout} />
      <main className="dashboard-main">
        <h2 className="page-title">This is your Dashboard</h2>
        <div className="cards-grid">
          <EventsSection // this is loading hardcoded data from the mockEvents file
            loading={loading}
            events={events}
            onRefresh={fetchMock} // uses the “Refresh” action in the card header
          />
          <AssignmentsSection />
          <ExamsSection />
        </div>
      </main>
    </div>
  );
}

Dashboard.propTypes = {
  user: PropTypes.shape({
    name: PropTypes.string.isRequired,
    email: PropTypes.string.isRequired,
  }).isRequired,
  onLogout: PropTypes.func.isRequired,
};

export default Dashboard;
