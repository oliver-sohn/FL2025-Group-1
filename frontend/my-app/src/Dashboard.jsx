import React from 'react';
import PropTypes from 'prop-types';
import NavBar from './NavBar';
import './App.css';

function Dashboard({ user, onLogout }) {
  return (
    <div className="dashboard">
      <NavBar user={user} onLogout={onLogout} />
      <main>
        <h2>This is your Dashboard</h2>
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
