import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import './App.css';

function NavBar({ user, onLogout }) {
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <header className="banner">
      <h1 className="user-name">Welcome, {user.name}</h1>

      <nav className="navbar">
        <ul>
          <li>
            <Link to="/dashboard">Home</Link>
          </li>
          <li>
            <Link to="/scanner">Syllabus Scanner</Link>
          </li>
          <li>
            <Link to="/planner">Study Planner</Link>
          </li>
        </ul>
      </nav>

      <div className="user-menu">
        <button
          type="button"
          className="user-email-btn"
          onClick={() => setShowDropdown(!showDropdown)}
        >
          {user.email}
        </button>
        {showDropdown && (
          <div className="dropdown">
            <button type="button" className="logout-btn" onClick={onLogout}>
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

NavBar.propTypes = {
  user: PropTypes.shape({
    name: PropTypes.string.isRequired,
    email: PropTypes.string.isRequired,
  }).isRequired,
  onLogout: PropTypes.func.isRequired,
};

export default NavBar;
