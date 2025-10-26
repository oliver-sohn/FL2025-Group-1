import requests
from database import events as crud_events
from database.db import get_db
from database.models import User
from database.users import select_user_by_id
from fastapi import APIRouter, Depends
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
        data = resp.json()
        updated_event = {"google_event_id": data.get("id")}
        event = crud_events.update_event(
            db, event_id=event_id, updated_event=updated_event
        )
        return event
    else:
        raise Exception("Error uploading event to GCal")
