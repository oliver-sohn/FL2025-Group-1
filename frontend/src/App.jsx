import React, { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import './App.css';
import axios from 'axios';
import Dashboard from './Dashboard';
import SyllabusScanner from './SyllabusScanner';
import StudyPlanner from './StudyPlanner';
import Login from './Login';
import ProtectedRoute from './ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  const [user, setUser] = useState(null);

  const handleLogout = () => {
    setUser(null);
  };

  useEffect(() => {
    if (!user) return;

    const interval = setInterval(async () => {
      try {
        await axios.get(
          `${process.env.REACT_APP_BACKEND_URL}/auth/session?user_id=${user.id}`,
        );
      } catch (err) {
        if (err.response?.status === 401) {
          clearInterval(interval);
          handleLogout();
        }
      }
    }, 60_000); // check every minute

    // eslint-disable-next-line consistent-return
    return () => clearInterval(interval); // cleanup on unmount
  }, [user]);

  return (
    <Router>
      <ErrorBoundary>
        <Routes>
          <Route
            path="/"
            element={
              !user ? (
                <Login setUser={setUser} />
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
      </ErrorBoundary>
    </Router>
  );
}

export default App;
