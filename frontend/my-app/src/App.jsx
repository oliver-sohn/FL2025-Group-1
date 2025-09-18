import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import './App.css';

function App() {
  const [user, setUser] = useState(null);

  const handleLoginSuccess = async (credentialResponse) => {
    try {
      // Send the credential (JWT) to your backend for verification
      const res = await axios.post('http://localhost:8000/auth/callback', {
        token: credentialResponse.credential,
      });

      // Backend returns user info + JWT
      setUser(res.data.user);
      console.log('Backend response:', res.data);
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  const handleLoginError = () => {
    console.error('Google login failed');
  };

  return (
    <div className="App">
      {!user ? (
        <GoogleLogin
          onSuccess={handleLoginSuccess}
          onError={handleLoginError}
        />
      ) : (
        <div>
          <h2>Welcome, {user.name}</h2>
          <p>{user.email}</p>
        </div>
      )}
    </div>
  );
}

export default App;
