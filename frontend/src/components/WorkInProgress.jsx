import React from 'react';
import PropTypes from 'prop-types';
import CardSection from './CardSection';

function WorkInProgress({ feature, note }) {
  return (
    <CardSection title={`${feature} — Work in progress`}>
      <div className="wip">
        <div className="wip-icon" aria-hidden>
          🚧
        </div>
        <p className="wip-text">We’re still building this part. {note}</p>
      </div>
    </CardSection>
  );
}

WorkInProgress.propTypes = {
  feature: PropTypes.string.isRequired,
  note: PropTypes.string,
};

WorkInProgress.defaultProps = {
  note: 'Check back soon!',
};

export default WorkInProgress;
