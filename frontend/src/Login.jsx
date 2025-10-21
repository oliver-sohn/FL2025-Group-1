import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { useSearchParams, useNavigate } from 'react-router-dom';
import './App.css';
import axios from 'axios';

function Login({ setUser }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Check for user info in query params (callback step)
  useEffect(() => {
    const verifyToken = async () => {
      const token = searchParams.get('jwt_token');

      if (!token) return;

      try {
        const res = await axios.post(
          `${process.env.REACT_APP_BACKEND_URL}/auth/verify`,
          { token },
        );
        setUser(res.data.user);
        navigate('/dashboard');
      } catch (err) {
        console.error('Token verification failed:', err);
      }
    };

    verifyToken();
  }, [navigate, searchParams, setUser]);

  // Redirect to backend to start Google OAuth
  const handleGoogleLogin = () => {
    window.location.href = `${process.env.REACT_APP_BACKEND_URL}/auth/login`;
  };

  return (
    <div className="login-container">
      <h1>Welcome to the Syllabus Scanner</h1>
      <p>Please sign in using Google</p>
      <button onClick={handleGoogleLogin} className="google-btn" type="button">
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg"
          alt="Google Logo"
        />
        <span>Sign in with Google</span>
      </button>
    </div>
  );
}

Login.propTypes = {
  setUser: PropTypes.func.isRequired,
};

export default Login;
