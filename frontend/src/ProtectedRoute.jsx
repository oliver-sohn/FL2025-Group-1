import React from 'react';
import { Navigate } from 'react-router-dom';
import PropTypes from 'prop-types';

// protected route fixes reacts default action of trying to load a component even if the user isn't logged in
// protected route checks us the user exists and if they do, then we can access the children pages (the rest of the application)
// if the user does not exist, it loads back to the log in page
function ProtectedRoute({ user, children }) {
  if (!user) {
    return <Navigate to="/" replace />;
  }
  return children;
}

ProtectedRoute.propTypes = {
  user: PropTypes.shape({
    name: PropTypes.string,
    email: PropTypes.string,
  }),
  children: PropTypes.node.isRequired,
};

ProtectedRoute.defaultProps = {
  user: null,
};

export default ProtectedRoute;
