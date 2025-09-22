import React, { useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';

// import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import './App.css';
import Dashboard from './Dashboard';
import SyllabusScanner from './SyllabusScanner';
import StudyPlanner from './StudyPlanner';
import Login from './Login';
import ProtectedRoute from './ProtectedRoute';

function App() {
  const [user, setUser] = useState(null);
  // const [showDropdown, setShowDropdown] = useState(false);

  const handleLoginSuccess = async (credentialResponse) => {
    try {
      const res = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/auth/callback`,
        {
          token: credentialResponse.credential,
        },
      );

      setUser(res.data.user);
      // console.log('Backend response:', res.data);
    } catch (err) {
      // console.error('Login failed:', err);
    }
  };

  const handleLoginError = () => {
    // console.error('Google login failed');
  };

  const handleLogout = () => {
    setUser(null);
  };

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            !user ? (
              <Login
                handleLoginSuccess={handleLoginSuccess}
                handleLoginError={handleLoginError}
              />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }
        />
        <Route
          path="/dashboard"
          element={
            // see protected route file for further explanation
            <ProtectedRoute user={user}>
              <Dashboard user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/scanner"
          element={
            <ProtectedRoute user={user}>
              <SyllabusScanner user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/planner"
          element={
            <ProtectedRoute user={user}>
              <StudyPlanner user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
