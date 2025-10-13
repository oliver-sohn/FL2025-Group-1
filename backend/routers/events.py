from typing import List

import requests
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import events as crud_events
from backend.database.db import get_db
from backend.database.models import User
from backend.database.users import select_user_by_id
from backend.routers.schemas import EventCreate, EventSchema

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


# Google Events Logic
@router.post(
    "/google",
    #  response_model=EventSchema
)
def post_event_to_google(user_id: int, event_id: int, db: Session = Depends(get_db)):
    event = crud_events.get_event(db, event_id=event_id)
    user: User = select_user_by_id(db, user_id)
    access_token = user.access_token

    url = "https://www.googleapis.com/calendar/v3/calendars/primary/events"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }
    data = {
        "summary": event.summary,
        "description": event.description or "",
        "location": event.location or "",
        "colorId": event.colorId or "1",
        "eventType": "default",
        "start": {
            "dateTime": event.start.isoformat(),
            "timeZone": str(event.start.tzinfo),
        },
        "end": {"dateTime": event.end.isoformat(), "timeZone": str(event.end.tzinfo)},
        # "recurrence": event.recurrence #leaving blank for now
    }

    resp = requests.post(url, headers=headers, json=data)

    if resp.status_code == 200:
        data = resp.json()
        updated_event = {"google_event_id": data.get("id")}
        event = crud_events.update_event(
            db, event_id=event_id, updated_event=updated_event
        )
        return event
    else:
        raise Exception("Error uploading event to GCal")
