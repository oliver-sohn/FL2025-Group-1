import React from 'react';
import PropTypes from 'prop-types';
import { GoogleLogin } from '@react-oauth/google';
import './App.css';

function Login({ handleLoginSuccess, handleLoginError }) {
  return (
    <div className="login-container">
      <h1>Welcome to the Syllabus Scanner</h1>
      <p>Please sign in using Google</p>
      <GoogleLogin onSuccess={handleLoginSuccess} onError={handleLoginError} />
    </div>
  );
}

Login.propTypes = {
  handleLoginSuccess: PropTypes.func.isRequired,
  handleLoginError: PropTypes.func.isRequired,
};

export default Login;
