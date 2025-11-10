import React from 'react';
import PropTypes from 'prop-types';
// eslint-disable-next-line import/no-unresolved
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import { useNavigate } from 'react-router-dom';
import './ErrorBoundary.css';

// Functional Error Popup Component
function ErrorFallback({ error, resetErrorBoundary }) {
  const [showStack, setShowStack] = React.useState(false);

  return (
    <>
      <button
        type="button"
        className="modal-overlay"
        onClick={resetErrorBoundary}
        aria-label="Close error dialog"
      />
      <div className="modal-backdrop">
        <div className="modal error-modal">
          {/* Header */}
          <div className="modal-header error-header">
            <h3>
              <span style={{ fontSize: '1.3rem', marginRight: '0.5rem' }}>
                ⚠️
              </span>
              Something Went Wrong
            </h3>
            <button
              type="button"
              className="icon-btn"
              onClick={resetErrorBoundary}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="error-body">
            <p className="error-message">
              An unexpected error occurred. You can try resetting the page or
              return to the dashboard.
            </p>

            <div className="error-details-box">
              <p className="error-details-label">Error Details:</p>
              <p className="error-details-text">{error?.toString()}</p>
            </div>

            {error?.stack && (
              <div className="error-stack-section">
                <button
                  className="stack-toggle-btn"
                  onClick={() => setShowStack(!showStack)}
                  type="button"
                >
                  <span className="stack-toggle-icon">
                    {showStack ? '▼' : '▶'}
                  </span>
                  Stack Trace
                </button>
                {showStack && <pre className="error-stack">{error.stack}</pre>}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="error-footer">
            <button
              type="button"
              onClick={resetErrorBoundary}
              className="btn btn-primary"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// Custom wrapper component with navigation support
function ErrorBoundary({ children }) {
  const navigate = useNavigate();

  const handleError = (error, errorInfo) => {
    // Log error to console or error reporting service
    console.error('Error caught by boundary:', error, errorInfo);
  };

  const handleReset = () => {
    navigate('/dashboard');
  };

  return (
    <ReactErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={handleError}
      onReset={handleReset}
    >
      {children}
    </ReactErrorBoundary>
  );
}

ErrorFallback.propTypes = {
  error: PropTypes.instanceOf(Error).isRequired,
  resetErrorBoundary: PropTypes.func.isRequired,
};

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
};

// Export the wrapper for use in your app
export default ErrorBoundary;
