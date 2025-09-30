import React from 'react';
import PropTypes from 'prop-types';
import NavBar from './NavBar';
import EventsSection from './components/EventSection';
import AssignmentsSection from './components/AssignmentSection';
import ExamsSection from './components/ExamSection';
import './App.css';

function Dashboard({ user, onLogout }) {
  return (
    <div className="dashboard">
      <NavBar user={user} onLogout={onLogout} />
      <main className="dashboard-main">
        <div className="cards-grid">
          <EventsSection />
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
