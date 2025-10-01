import React, { useState } from 'react';
import PropTypes from 'prop-types';
import CardSection from './CardSection';

function ManualAddSection({ onAdd }) {
  const [form, setForm] = useState({
    type: 'event',
    title: '',
    date: '',
    time: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title || !form.date) return;
    onAdd(form);
    setForm({ type: 'event', title: '', date: '', time: '' });
  };

  return (
    <CardSection title="Manual upload">
      <form className="manual-form" onSubmit={handleSubmit}>
        <div className="row">
          <label className="field" htmlFor="type-field">
            <span>Type</span>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option value="event">Event</option>
              <option value="assignment">Assignment</option>
            </select>
          </label>
          <label className="field grow" htmlFor="title-field">
            <span>Title</span>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Exam 1 / HW 2 / Guest lecture…"
              required
            />
          </label>
        </div>

        <div className="row">
          <label className="field" htmlFor="date-field">
            <span>Date</span>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
            />
          </label>
          <label className="field" htmlFor="time-field">
            <span>Time (optional)</span>
            <input
              type="time"
              value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })}
            />
          </label>
          <div className="row actions-right">
            <button className="btn" type="submit">
              Add
            </button>
          </div>
        </div>
      </form>
    </CardSection>
  );
}

ManualAddSection.propTypes = {
  onAdd: PropTypes.func.isRequired, // ({type,title,date,time}) => void
};

export default ManualAddSection;
