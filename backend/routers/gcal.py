from datetime import datetime
import requests
from database import events as crud_events
from database.db import get_db
from database.models import User
from database.users import select_user_by_id
from fastapi import APIRouter, Depends, HTTPException
from routers.schemas import EventSchema
from sqlalchemy.orm import Session

router = APIRouter(prefix="/gcal", tags=["GCal"])


# Google Events Logic
@router.post("/add-event", response_model=EventSchema)
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
        resp_data = resp.json() or {}
        google_event_id = resp_data.get("id", None)
        event.google_event_id = google_event_id
        db.commit()
        db.refresh(event)
        print(event)
        return event
    else:
        raise Exception("Error uploading event to GCal")


@router.get("/events")
def get_calendar_events(
    user_id: int, start_date: str, end_date: str, db: Session = Depends(get_db)
):
    """Get user's Google Calendar events for a date range"""
    user = select_user_by_id(db, user_id)
    access_token = user.access_token

    url = "https://www.googleapis.com/calendar/v3/calendars/primary/events"
    headers = {
        "Authorization": f"Bearer {access_token}",
    }
    params = {
        "timeMin": start_date,
        "timeMax": end_date,
        "singleEvents": True,
        "orderBy": "startTime",
    }

    resp = requests.get(url, headers=headers, params=params)

    if resp.status_code == 200:
        return resp.json()
    else:
        raise HTTPException(
            status_code=resp.status_code, detail="Error fetching calendar events"
        )


@router.post("/study-block")
def add_study_block_to_calendar(
    user_id: int, summary: str, start: str, end: str, db: Session = Depends(get_db)
):
    """Add a study block directly to Google Calendar"""
    user = select_user_by_id(db, user_id)
    access_token = user.access_token

    # Parse the datetime strings
    start_dt = datetime.fromisoformat(start.replace("Z", "+00:00"))
    end_dt = datetime.fromisoformat(end.replace("Z", "+00:00"))

    url = "https://www.googleapis.com/calendar/v3/calendars/primary/events"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }
    data = {
        "summary": summary,
        "description": "Study block created by Study Planner",
        "colorId": "5",  # Yellow color for study blocks
        "start": {
            "dateTime": start_dt.isoformat(),
            "timeZone": str(start_dt.tzinfo) if start_dt.tzinfo else "America/Chicago",
        },
        "end": {
            "dateTime": end_dt.isoformat(),
            "timeZone": str(end_dt.tzinfo) if end_dt.tzinfo else "America/Chicago",
        },
    }

    resp = requests.post(url, headers=headers, json=data)

    if resp.status_code == 200:
        return resp.json()
    else:
        raise HTTPException(
            status_code=resp.status_code, detail="Error adding event to calendar"
        )
