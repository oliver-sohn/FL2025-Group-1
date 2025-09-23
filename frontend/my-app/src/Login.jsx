import React from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { GoogleLogin } from '@react-oauth/google';
import './App.css';

function Login({ setUser }) {
  const handleLoginSuccess = async (credentialResponse) => {
    try {
      const res = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/auth/callback`,
        {
          token: credentialResponse.credential,
        },
      );

      setUser(res.data.user);
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  const handleLoginError = () => {
    console.error('Google login failed');
  };

  return (
    <div className="login-container">
      <h1>Welcome to the Syllabus Scanner</h1>
      <p>Please sign in using Google</p>
      <GoogleLogin onSuccess={handleLoginSuccess} onError={handleLoginError} />
    </div>
  );
}

Login.propTypes = {
  setUser: PropTypes.func.isRequired,
};

export default Login;
