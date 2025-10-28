import PropTypes from 'prop-types';

const EventShape = PropTypes.exact({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  user_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  google_event_id: PropTypes.string,
  summary: PropTypes.string.isRequired,
  description: PropTypes.string,
  location: PropTypes.string,
  colorId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  eventType: PropTypes.string.isRequired,
  start: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)])
    .isRequired,
  end: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)])
    .isRequired,
  recurrence: PropTypes.string,
  course_name: PropTypes.string,
});

export default EventShape;
