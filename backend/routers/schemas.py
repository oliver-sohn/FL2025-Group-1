from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class UserBase(BaseModel):
    id: int
    google_id: str
    email: str
    name: str

    class Config:
        orm_mode = True


class TokenRequest(BaseModel):
    token: str

    class Config:
        orm_mode = True


class EventBase(BaseModel):
    # Basic Event Info
    summary: str
    description: Optional[str]
    location: Optional[str]
    colorId: Optional[str]
    eventType: str

    # Timing
    start: datetime
    end: datetime
    recurrence: Optional[str]

    # Non Google Calendar
    course_name: Optional[str]


class EventCreate(EventBase):
    user_id: int
    google_event_id: Optional[str]


class EventSchema(EventCreate):
    id: int

    class Config:
        orm_mode = True


class EventDraftSchema(BaseModel):
    title: str
    start_iso: Optional[str] = None
    end_iso: Optional[str] = None
    all_day: bool = False
    course: Optional[str] = None
    event_type: Optional[str] = None
    source_page: Optional[int] = None
    source_line: Optional[int] = None
    raw_text: str

    class Config:
        orm_mode = True
