import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);

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

  return (
    <div className="App">
      {!user ? (
        <div className="login-container">
          <h1>Welcome to the Syllabus Scanner</h1>
          <p>Please sign in using Google</p>
          <div className="googleLogin-btn">
            <GoogleLogin
              onSuccess={handleLoginSuccess}
              onError={handleLoginError}
            />
          </div>
        </div>
      ) : (
        <div className="dashboard">
          <header className="banner">
            <h1 className="user-name">Welcome, {user.name}</h1>

            <nav className="navbar">
              <ul>
                <li>Home</li>
                <li>Syllabus Scanner</li>
                <li>Study Planner</li>
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
                  <button type="button" className="logout-btn">
                    Logout
                  </button>
                </div>
              )}
            </div>
          </header>
        </div>
      )}
    </div>
  );
}

export default App;
