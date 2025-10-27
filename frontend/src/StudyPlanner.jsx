/* eslint-disable jsx-a11y/label-has-associated-control */
import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  Calendar,
  Clock,
  Settings,
  Plus,
  Check,
  RefreshCw,
  X,
} from 'lucide-react';
import NavBar from './NavBar';
import './App.css';
import './StudyPlanner.css';

// Find gaps between events with buffer times
const findGaps = (dayStart, dayEnd, events, bufferBefore, bufferAfter) => {
  const gaps = [];
  let currentTime = new Date(dayStart);

  events.forEach((event) => {
    const eventStart = new Date(event.start.dateTime || event.start.date);
    const eventEnd = new Date(event.end.dateTime || event.end.date);

    const bufferedStart = new Date(
      eventStart.getTime() - bufferBefore * 60 * 1000,
    );
    const bufferedEnd = new Date(eventEnd.getTime() + bufferAfter * 60 * 1000);

    if (currentTime < bufferedStart) {
      gaps.push([currentTime, bufferedStart]);
    }

    currentTime = new Date(Math.max(currentTime, bufferedEnd));
  });

  if (currentTime < dayEnd) {
    gaps.push([currentTime, dayEnd]);
  }

  return gaps;
};

const generateStudyBlocks = (events, weekStart, preferences) => {
  const blocks = [];

  const {
    preferredDays,
    preferredStartTime,
    preferredEndTime,
    minBlockDuration,
    maxBlockDuration,
    bufferBefore,
    bufferAfter,
  } = preferences;

  const [startHour, startMin] = preferredStartTime.split(':').map(Number);
  const [endHour, endMin] = preferredEndTime.split(':').map(Number);

  Array.from({ length: 7 }).forEach((_, dayOffset) => {
    const currentDay = new Date(weekStart);
    currentDay.setDate(weekStart.getDate() + dayOffset);

    const dayStart = new Date(currentDay);
    dayStart.setHours(startHour, startMin, 0, 0);

    const dayEnd = new Date(currentDay);
    dayEnd.setHours(endHour, endMin, 0, 0);

    const dayEvents = events
      .filter((event) => {
        const eventStart = new Date(event.start.dateTime || event.start.date);
        return eventStart.toDateString() === currentDay.toDateString();
      })
      .sort((a, b) => {
        const aStart = new Date(a.start.dateTime || a.start.date);
        const bStart = new Date(b.start.dateTime || b.start.date);
        return aStart - bStart;
      });

    const gaps = findGaps(
      dayStart,
      dayEnd,
      dayEvents,
      bufferBefore,
      bufferAfter,
    );

    gaps.forEach(([gapStart, gapEnd]) => {
      const gapDuration = (gapEnd - gapStart) / (1000 * 60);

      if (gapDuration >= minBlockDuration) {
        let blockStart = new Date(gapStart);

        while ((gapEnd - blockStart) / (1000 * 60) >= minBlockDuration) {
          const remainingTime = (gapEnd - blockStart) / (1000 * 60);
          const blockDuration = Math.min(maxBlockDuration, remainingTime);
          const blockEnd = new Date(
            blockStart.getTime() + blockDuration * 60 * 1000,
          );

          const blockStartHour =
            blockStart.getHours() + blockStart.getMinutes() / 60;
          const blockEndHour = blockEnd.getHours() + blockEnd.getMinutes() / 60;
          const prefStartHour = startHour + startMin / 60;
          const prefEndHour = endHour + endMin / 60;

          const matchesPreferences =
            preferredDays.includes(blockStart.getDay()) &&
            blockStartHour >= prefStartHour &&
            blockEndHour <= prefEndHour;

          blocks.push({
            start: blockStart.toISOString(),
            end: blockEnd.toISOString(),
            duration: blockDuration,
            matchesPreferences,
          });

          blockStart = new Date(blockEnd);
        }
      }
    });
  });

  return blocks;
};

// Mock API - replace with your actual API calls
const api = {
  getCalendarEvents: async (userId, startDate, endDate) => {
    const url = `${process.env.REACT_APP_BACKEND_URL}/gcal/events?user_id=${userId}&start_date=${startDate}&end_date=${endDate}`;
    const response = await fetch(url);
    const data = await response.json();
    return data;
  },
  addStudyBlock: async (userId, summary, start, end) => {
    console.log('Adding study block:', { userId, summary, start, end });
    const url = `${process.env.REACT_APP_BACKEND_URL}/gcal/study-block?user_id=${userId}&summary=${summary}&start=${start}&end=${end}`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, summary, start, end }),
    });
  },
};

function StudyPlanner({ user, onLogout }) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(today.setDate(diff));
  });

  const [events, setEvents] = useState([]);
  const [studyBlocks, setStudyBlocks] = useState([]);
  const [showPreferences, setShowPreferences] = useState(false);
  const [showOnlyMatching, setShowOnlyMatching] = useState(false);
  const [addingBlock, setAddingBlock] = useState(null);
  const [selectedBlock, setSelectedBlock] = useState(null);

  const [preferences, setPreferences] = useState({
    preferredDays: [1, 2, 3, 4, 5],
    preferredStartTime: '00:00',
    preferredEndTime: '23:59',
    minBlockDuration: 30,
    maxBlockDuration: 120,
    bufferBefore: 15,
    bufferAfter: 15,
  });

  const loadCalendar = useCallback(async () => {
    try {
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const calendarData = await api.getCalendarEvents(
        user.id,
        currentWeekStart.toISOString(),
        weekEnd.toISOString(),
      );

      console.log(calendarData);

      setEvents(calendarData.items || []);
    } catch (error) {
      console.error('Error loading calendar:', error);
    }
  }, [currentWeekStart, user]);

  useEffect(() => {
    loadCalendar();
  }, [loadCalendar]);

  useEffect(() => {
    const blocks = generateStudyBlocks(events, currentWeekStart, preferences);
    setStudyBlocks(blocks);
  }, [events, preferences, currentWeekStart]);

  const handleBlockClick = (block) => {
    setSelectedBlock(block);
  };

  const handleConfirmAddBlock = async () => {
    if (!selectedBlock) return;

    setAddingBlock(selectedBlock.start);
    setSelectedBlock(null);

    try {
      await api.addStudyBlock(
        user.id,
        'Study Block',
        selectedBlock.start,
        selectedBlock.end,
      );

      await loadCalendar();
    } catch (error) {
      console.error('Error adding study block:', error);
      alert('Failed to add study block. Please try again.');
    }
    setAddingBlock(null);
  };

  const handleCancelAddBlock = () => {
    setSelectedBlock(null);
  };

  const regenerateBlocks = () => {
    const blocks = generateStudyBlocks(events, currentWeekStart, preferences);
    setStudyBlocks(blocks);
  };

  const getWeekDays = () =>
    Array.from({ length: 7 }).map((_, i) => {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + i);
      return date;
    });

  const navigateWeek = (direction) => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + direction * 7);
    setCurrentWeekStart(newDate);
  };

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const weekDays = getWeekDays();

  const getEventPosition = (startTime, endTime) => {
    const start = new Date(startTime);
    const end = new Date(endTime);

    const startHour = start.getHours() + start.getMinutes() / 60;
    const endHour = end.getHours() + end.getMinutes() / 60;

    const top = (startHour / 24) * 100;
    const height = ((endHour - startHour) / 24) * 100;

    return { top: `${top}%`, height: `${height}%` };
  };

  const getEventsForDay = (date) =>
    events.filter((event) => {
      const eventDate = new Date(event.start.dateTime || event.start.date);
      return eventDate.toDateString() === date.toDateString();
    });

  const getStudyBlocksForDay = (date) =>
    studyBlocks.filter((block) => {
      const blockDate = new Date(block.start);
      const matches = blockDate.toDateString() === date.toDateString();
      if (showOnlyMatching) {
        return matches && block.matchesPreferences;
      }
      return matches;
    });

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatHour = (hour) => {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="dashboard">
      <NavBar user={user} onLogout={onLogout} />

      <main className="dashboard-main">
        <div className="study-planner-header">
          <div className="study-planner-title-row">
            <h2 className="page-title study-planner-title">
              <Calendar size={24} />
              Study Planner
            </h2>

            <div className="study-planner-controls">
              <label className="study-planner-checkbox-label">
                <input
                  type="checkbox"
                  checked={showOnlyMatching}
                  onChange={(e) => setShowOnlyMatching(e.target.checked)}
                  className="study-planner-checkbox"
                />
                Show only preferred blocks
              </label>

              <button
                type="button"
                onClick={regenerateBlocks}
                className="btn study-planner-btn-icon"
                title="Regenerate study blocks"
              >
                <RefreshCw size={14} />
                Regenerate
              </button>

              <button
                type="button"
                onClick={() => setShowPreferences(!showPreferences)}
                className="btn btn-primary study-planner-btn-icon"
              >
                <Settings size={14} />
                Preferences
              </button>
            </div>
          </div>

          <div className="study-planner-nav">
            <button
              type="button"
              onClick={() => navigateWeek(-1)}
              className="btn"
            >
              ← Previous
            </button>
            <span className="study-planner-week-label">
              {currentWeekStart.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
            <button
              type="button"
              onClick={() => navigateWeek(1)}
              className="btn"
            >
              Next →
            </button>
          </div>
        </div>

        {showPreferences && (
          <div className="card preferences-card">
            <div className="card-header">
              <h3>Study Preferences</h3>
              <button
                type="button"
                onClick={() => setShowPreferences(false)}
                className="btn btn-ghost"
              >
                Close
              </button>
            </div>
            <div className="card-body">
              <div className="preferences-grid">
                <div className="field">
                  <div className="preferences-field-label">Preferred Days</div>
                  <div className="preferences-days-grid">
                    {dayNames.map((day, index) => (
                      <button
                        type="button"
                        key={day}
                        onClick={() => {
                          const newDays = preferences.preferredDays.includes(
                            index,
                          )
                            ? preferences.preferredDays.filter(
                                (d) => d !== index,
                              )
                            : [...preferences.preferredDays, index];
                          setPreferences({
                            ...preferences,
                            preferredDays: newDays,
                          });
                        }}
                        className={`btn preferences-day-btn ${
                          preferences.preferredDays.includes(index)
                            ? 'preferences-day-btn-active'
                            : ''
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="field">
                  <div className="preferences-field-label">Time Range</div>
                  <div className="preferences-time-row">
                    <label>
                      <span className="sr-only">Start Time</span>
                      <input
                        type="time"
                        value={preferences.preferredStartTime}
                        onChange={(e) =>
                          setPreferences({
                            ...preferences,
                            preferredStartTime: e.target.value,
                          })
                        }
                      />
                    </label>
                    <span className="preferences-time-separator">to</span>
                    <label>
                      <span className="sr-only">End Time</span>
                      <input
                        type="time"
                        value={preferences.preferredEndTime}
                        onChange={(e) =>
                          setPreferences({
                            ...preferences,
                            preferredEndTime: e.target.value,
                          })
                        }
                      />
                    </label>
                  </div>
                </div>

                <div className="field">
                  <div className="preferences-field-label">
                    Block Duration (min)
                  </div>
                  <div className="preferences-time-row">
                    <label>
                      <span className="sr-only">Minimum Duration</span>
                      <input
                        type="number"
                        value={preferences.minBlockDuration}
                        onChange={(e) =>
                          setPreferences({
                            ...preferences,
                            minBlockDuration: parseInt(e.target.value, 10),
                          })
                        }
                        className="preferences-duration-input"
                        min="15"
                        step="15"
                      />
                    </label>
                    <span className="preferences-time-separator">to</span>
                    <label>
                      <span className="sr-only">Maximum Duration</span>
                      <input
                        type="number"
                        value={preferences.maxBlockDuration}
                        onChange={(e) =>
                          setPreferences({
                            ...preferences,
                            maxBlockDuration: parseInt(e.target.value, 10),
                          })
                        }
                        className="preferences-duration-input"
                        min="15"
                        step="15"
                      />
                    </label>
                  </div>
                </div>

                <div className="field">
                  <div className="preferences-field-label">
                    Buffer Time (min)
                  </div>
                  <div className="preferences-time-row">
                    <span className="preferences-buffer-label">Before:</span>
                    <label>
                      <span className="sr-only">Buffer Before</span>
                      <input
                        type="number"
                        value={preferences.bufferBefore}
                        onChange={(e) =>
                          setPreferences({
                            ...preferences,
                            bufferBefore: parseInt(e.target.value, 10),
                          })
                        }
                        className="preferences-buffer-input"
                        min="0"
                        step="5"
                      />
                    </label>
                    <span className="preferences-buffer-label">After:</span>
                    <label>
                      <span className="sr-only">Buffer After</span>
                      <input
                        type="number"
                        value={preferences.bufferAfter}
                        onChange={(e) =>
                          setPreferences({
                            ...preferences,
                            bufferAfter: parseInt(e.target.value, 10),
                          })
                        }
                        className="preferences-buffer-input"
                        min="0"
                        step="5"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedBlock && (
          <div className="confirmation-modal-overlay">
            <div className="confirmation-modal">
              <div className="confirmation-modal-header">
                <h3>Add Study Block?</h3>
                <button
                  type="button"
                  onClick={handleCancelAddBlock}
                  className="confirmation-modal-close"
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="confirmation-modal-body">
                <p>
                  <strong>Time:</strong> {formatTime(selectedBlock.start)} -{' '}
                  {formatTime(selectedBlock.end)}
                </p>
                <p>
                  <strong>Duration:</strong> {selectedBlock.duration} minutes
                </p>
                <p>
                  <strong>Date:</strong>{' '}
                  {new Date(selectedBlock.start).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <div className="confirmation-modal-actions">
                <button
                  type="button"
                  onClick={handleCancelAddBlock}
                  className="btn btn-ghost"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAddBlock}
                  className="btn btn-primary"
                >
                  <Check size={14} />
                  Add to Calendar
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="card">
          <div className="calendar-header">
            <div className="calendar-grid">
              <div className="calendar-time-cell" />
              {weekDays.map((day) => {
                const dayIndex = day.getDay();
                return (
                  <div key={day.toISOString()} className="calendar-day-cell">
                    <div className="calendar-day-name">
                      {dayNames[dayIndex]}
                    </div>
                    <div className="calendar-day-number">{day.getDate()}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="calendar-body">
            <div className="calendar-body-grid">
              <div className="calendar-time-column">
                {hours.map((hour) => (
                  <div key={hour} className="calendar-hour-cell">
                    {formatHour(hour)}
                  </div>
                ))}
              </div>

              {weekDays.map((day) => (
                <div key={day.toISOString()} className="calendar-day-column">
                  {hours.map((hour) => (
                    <div key={hour} className="calendar-hour-row" />
                  ))}

                  {getEventsForDay(day).map((event) => {
                    const pos = getEventPosition(
                      event.start.dateTime || event.start.date,
                      event.end.dateTime || event.end.date,
                    );
                    return (
                      <div
                        key={event.id}
                        className="calendar-event"
                        style={{ top: pos.top, height: pos.height }}
                      >
                        <div className="calendar-event-title">
                          {event.summary}
                        </div>
                        <div className="calendar-event-time">
                          {formatTime(event.start.dateTime || event.start.date)}
                        </div>
                      </div>
                    );
                  })}

                  {getStudyBlocksForDay(day).map((block) => {
                    const pos = getEventPosition(block.start, block.end);
                    const isAdding = addingBlock === block.start;
                    const isSelected = selectedBlock?.start === block.start;

                    return (
                      <button
                        type="button"
                        key={block.start}
                        className={`study-block ${
                          block.matchesPreferences
                            ? 'study-block-preferred'
                            : 'study-block-other'
                        } ${isSelected ? 'study-block-selected' : ''}`}
                        style={{ top: pos.top, height: pos.height }}
                        onClick={() => !isAdding && handleBlockClick(block)}
                        disabled={isAdding}
                      >
                        <div className="study-block-header">
                          <div className="study-block-title">
                            {isAdding ? (
                              <Clock size={12} className="spinner" />
                            ) : (
                              <Plus size={12} />
                            )}
                            Study Block
                          </div>
                          {block.matchesPreferences && (
                            <Check size={12} className="study-block-check" />
                          )}
                        </div>
                        <div className="study-block-time">
                          {formatTime(block.start)}
                        </div>
                        <div className="study-block-duration">
                          {block.duration} min
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card legend-card">
          <div className="card-body legend-body">
            <div className="legend-container">
              <div className="legend-item">
                <div className="legend-box legend-box-event" />
                <span className="legend-text">Existing Events</span>
              </div>
              <div className="legend-item">
                <div className="legend-box legend-box-preferred" />
                <span className="legend-text">Preferred Study Blocks</span>
              </div>
              <div className="legend-item">
                <div className="legend-box legend-box-other" />
                <span className="legend-text">Other Study Blocks</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

StudyPlanner.propTypes = {
  user: PropTypes.shape({
    name: PropTypes.string.isRequired,
    email: PropTypes.string.isRequired,
    id: PropTypes.number.isRequired,
  }).isRequired,
  onLogout: PropTypes.func.isRequired,
};

export default StudyPlanner;
