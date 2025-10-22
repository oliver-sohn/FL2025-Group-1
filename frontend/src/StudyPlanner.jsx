import React from 'react';
import PropTypes from 'prop-types';
import NavBar from './NavBar';
import WorkInProgress from './components/WorkInProgress';
import './App.css';

function StudyPlanner({ user, onLogout }) {
  return (
    <div className="dashboard">
      <NavBar user={user} onLogout={onLogout} />
      <main className="dashboard-main">
        <h2 className="page-title">Study Planner</h2>
        <WorkInProgress
          feature="Study Planner"
          note="Soon you’ll be able to schedule study sessions and visualize workload here."
        />
      </main>
    </div>
  );
}

StudyPlanner.propTypes = {
  user: PropTypes.shape({
    name: PropTypes.string.isRequired,
    email: PropTypes.string.isRequired,
  }).isRequired,
  onLogout: PropTypes.func.isRequired,
};

export default StudyPlanner;
