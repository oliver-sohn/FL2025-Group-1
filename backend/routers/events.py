from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import events as crud_events
from backend.database.db import get_db
from backend.routers.schemas import EventBase, EventCreate, EventSchema

router = APIRouter(prefix="/events", tags=["Events"])


@router.post("/", response_model=EventSchema)
def create_event(event: EventCreate, db: Session = Depends(get_db)):
    return crud_events.create_event(db=db, event=event)


@router.get("/", response_model=List[EventSchema])
def get_events(user_id: int, db: Session = Depends(get_db)):
    return crud_events.get_events(db=db, user_id=user_id)


@router.get("/{event_id}", response_model=EventSchema)
def get_event(event_id: int, db: Session = Depends(get_db)):
    db_event = crud_events.get_event(db=db, event_id=event_id)
    if not db_event:
        raise HTTPException(status_code=404, detail="Event not found")
    return db_event


@router.put("/{event_id}", response_model=EventSchema)
def update_event(
    event_id: int, updated_event: EventCreate, db: Session = Depends(get_db)
):
    return crud_events.update_event(
        db=db, event_id=event_id, updated_event=updated_event
    )


@router.delete("/{event_id}")
def delete_event(event_id: int, db: Session = Depends(get_db)):
    crud_events.delete_event(db=db, event_id=event_id)
    return {"message": "Event deleted successfully"}
