import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useSearchParams, useNavigate } from 'react-router-dom';
import './App.css';
import axios from 'axios';

function Login({ setUser }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isContactOpen, setIsContactOpen] = useState(false);

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
  const openContact = () => setIsContactOpen(true);
  const closeContact = () => setIsContactOpen(false);

  return (
    <div className="auth-page">
      {/* Top nav / header */}
      <header className="auth-nav">
        <div className="auth-nav-center">Syllabus Scanner</div>
        <nav className="auth-nav-right" aria-label="Secondary navigation">
          {/* Contact opens modal instead of routing */}
          <button
            type="button"
            className="nav-link nav-link-btn"
            onClick={openContact}
          >
            Contact
          </button>
        </nav>
      </header>

      {/* Main hero section */}
      <main className="auth-hero">
        <section className="auth-hero-card" aria-labelledby="hero-title">
          <h1 id="hero-title" className="hero-title">
            Work smarter with your classes.
          </h1>
          <p className="hero-sub">
            Syllabus Scanner pulls key dates from your course syllabi and turns
            them into a unified view of assignments, quizzes, and exams. Upload
            once, review everything in one place, and stay on top of your
            semester.
          </p>

          <div className="hero-cta">
            <button
              onClick={handleGoogleLogin}
              className="google-btn"
              type="button"
            >
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg"
                alt="Google Logo"
              />
              <span>Sign in with Google</span>
            </button>
            <p className="hero-note">
              Use your Google account to get started in seconds.
            </p>
          </div>
        </section>
        <section
          className="auth-hero-card"
          aria-labelledby="hero-title"
          id="how-it-works"
        >
          <h1 id="hero-title" className="hero-title">
            How it Works
          </h1>
          <p className="hero-sub">
            Once you sign in, you’ll land on your personalized dashboard — the
            hub for everything you need to stay on top of your semester. Your
            dashboard collects all your upcoming events, assignments, quizzes,
            and exams in one place, so you never miss an important date. From
            there, you can head to the Scanner page to upload your syllabi. Our
            algorithm reads through each file, pulls out key deadlines, and
            prepares everything for quick review and Google Calendar syncing.
            Finally, the Study Blocks feature analyzes your Google Calendar and
            automatically finds the best open times for you to study, plan, or
            catch up on work — no more guessing or scheduling chaos.
          </p>
        </section>
      </main>
      {/* Contact modal */}
      {isContactOpen && (
        <>
          <button
            type="button"
            className="modal-overlay"
            aria-label="Close contact information"
            onClick={closeContact}
          />
          <div
            className="modal-backdrop"
            role="dialog"
            aria-modal="true"
            aria-labelledby="contact-modal-title"
          >
            <div className="modal">
              <div className="modal-header">
                <h3 id="contact-modal-title">Contact</h3>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Close"
                  onClick={closeContact}
                >
                  ✕
                </button>
              </div>

              <div className="modal-body">
                <p>Have questions or feedback? Reach out anytime:</p>
                <p>
                  <strong>Email:</strong>{' '}
                  <a href="mailto:support@syllabusscanner.app">
                    support@syllabusscanner.app
                  </a>
                </p>
                <p>
                  <strong>Address:</strong> 1234 Study Lane, Suite 200, St.
                  Louis, MO 63130
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

Login.propTypes = {
  setUser: PropTypes.func.isRequired,
};

export default Login;
