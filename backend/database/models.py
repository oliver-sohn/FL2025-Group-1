from sqlalchemy import TIMESTAMP, Column, DateTime, ForeignKey, Integer, String, text
from sqlalchemy.orm import relationship

from .db import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, nullable=False)
    google_id = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    name = Column(String)
    created_at = Column(TIMESTAMP(timezone=True), server_default=text("now()"))

    events = relationship("Event", back_populates="user")


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    google_event_id = Column(String, unique=True, nullable=True)

    summary = Column(String, nullable=False)  # name of event
    description = Column(String, nullable=False)
    location = Column(String, nullable=True)
    start = Column(DateTime, nullable=False)
    end = Column(DateTime, nullable=False)
    recurrence = Column(String, nullable=True)

    user = relationship("User", back_populates="events")


# https://developers.google.com/workspace/calendar/api/v3/reference/events/insert
