import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import NavBar from './NavBar';
import EventsSection from './components/EventSection';
import AssignmentsSection from './components/AssignmentSection';
import ExamsSection from './components/ExamSection';

import './App.css';

function Dashboard({ user, onLogout }) {
  const [events, setEvents] = useState(undefined); // undefined on first render → tests your guards
  const [loading, setLoading] = useState(false);

  const getEvents = React.useCallback(async () => {
    const userId = user.id;
    const url = `${process.env.REACT_APP_BACKEND_URL}/events?user_id=${userId}`;
    const response = await fetch(url);
    return response.json();
  }, [user.id]);

  const fetchEvents = React.useCallback(async () => {
    setLoading(true);
    const e = await getEvents();
    setEvents(e);
    setLoading(false);
  }, [getEvents]);

  useEffect(() => {
    fetchEvents(); // load once when page mounts
  }, [fetchEvents]);

  return (
    <div className="dashboard">
      <NavBar user={user} onLogout={onLogout} />
      <main className="dashboard-main">
        <h2 className="page-title">This is your Dashboard</h2>
        <div className="cards-grid">
          <EventsSection
            loading={loading}
            events={events}
            onRefresh={fetchEvents} // uses the “Refresh” action in the card header
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
    id: PropTypes.number.isRequired,
  }).isRequired,
  onLogout: PropTypes.func.isRequired,
};

export default Dashboard;
