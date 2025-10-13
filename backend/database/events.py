from typing import List, Optional

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.routers.schemas import EventBase, EventCreate, EventSchema

from .models import Event as EventModel


def create_event(db: Session, event: EventCreate) -> EventSchema:
    db_event = EventModel(
        user_id=event.user_id,
        google_event_id=event.google_event_id,
        summary=event.summary,
        description=event.description,
        location=event.location,
        colorId=event.colorId,
        eventType=event.eventType,
        start=event.start,
        end=event.end,
        recurrence=event.recurrence,
        course_name=event.course_name,
    )
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event


def get_events(db: Session, user_id: int) -> List[EventSchema]:
    stmt = select(EventModel).where(EventModel.user_id == user_id)
    return db.execute(stmt).scalars().all()


def get_event(db: Session, event_id: int) -> Optional[EventSchema]:
    stmt = select(EventModel).where(EventModel.id == event_id)
    return db.execute(stmt).scalars().first()


def update_event(db: Session, event_id: int, updated_event: EventCreate) -> EventSchema:
    stmt = select(EventModel).where(EventModel.id == event_id)
    db_event = db.execute(stmt).scalars().first()

    if not db_event:
        raise HTTPException(status_code=404, detail="Event not found")

    for field, value in updated_event.items():
        if value is not None:
            setattr(db_event, field, value)

    db.commit()
    db.refresh(db_event)
    return db_event


def delete_event(db: Session, event_id: int) -> None:
    stmt = select(EventModel).where(EventModel.id == event_id)
    db_event = db.execute(stmt).scalars().first()

    if not db_event:
        raise HTTPException(status_code=404, detail="Event not found")

    db.delete(db_event)
    db.commit()
