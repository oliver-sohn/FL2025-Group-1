import React from 'react';
import PropTypes from 'prop-types';
import NavBar from './NavBar';

function SyllabusScanner({ user, onLogout }) {
  return (
    <div>
      <NavBar user={user} onLogout={onLogout} />
      <main>
        <h2>Syllabus Scanner Page</h2>
      </main>
    </div>
  );
}

SyllabusScanner.propTypes = {
  user: PropTypes.shape({
    name: PropTypes.string.isRequired,
    email: PropTypes.string.isRequired,
  }).isRequired,
  onLogout: PropTypes.func.isRequired,
};

export default SyllabusScanner;
