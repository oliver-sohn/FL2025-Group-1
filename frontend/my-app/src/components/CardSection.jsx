import React from 'react';
import PropTypes from 'prop-types';

function CardSection({ title, children, action }) {
  return (
    <section className="card">
      <header className="card-header">
        <h3>{title}</h3>
        {action ? <div className="card-action">{action}</div> : null}
      </header>
      <div className="card-body">{children}</div>
    </section>
  );
}

CardSection.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node,
  action: PropTypes.node,
};

CardSection.defaultProps = {
  children: null,
  action: null,
};

export default CardSection;
