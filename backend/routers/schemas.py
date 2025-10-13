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
    summary: str  # title
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

    class Config:
        orm_mode = True


class EventCreate(EventBase):
    user_id: int
    google_event_id: Optional[str]

    class Config:
        orm_mode = True


class EventSchema(EventCreate):
    id: int

    class Config:
        orm_mode = True


class EventDraftSchema(BaseModel):
    # aligned to EventBase
    summary: str
    description: Optional[str] = None
    location: Optional[str] = None
    colorId: Optional[str] = None
    eventType: str = "Event"

    start: datetime
    end: Optional[datetime] = None
    recurrence: Optional[str] = None

    # non Gcal
    course_name: Optional[str] = None

    # draft only helpers
    all_day: bool = False
    source_page: Optional[int] = None
    source_line: Optional[int] = None
    raw_text: str

    class Config:
        orm_mode = True
