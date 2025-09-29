import React from 'react';
import PropTypes from 'prop-types';
import NavBar from './NavBar';

function StudyPlanner({ user, onLogout }) {
  return (
    <div>
      <NavBar user={user} onLogout={onLogout} />
      <main>
        <h2>Study Planner Page</h2>
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
