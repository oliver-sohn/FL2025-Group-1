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
    user_id: int
    google_event_id: Optional[str]

    summary: str
    description: str
    location: Optional[str]
    start: datetime
    end: datetime
    recurrence: Optional[str]


class EventSchema(EventBase):
    id: int

    class Config:
        orm_mode = True
