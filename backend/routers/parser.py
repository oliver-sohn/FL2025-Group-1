from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from backend.database.db import get_db
from backend.routers.schemas import EventSchema

router = APIRouter(prefix="/parse", tags=["Parser"])


# Placeholder function for now
def parse():
    return []


@router.post("/", response_model=List[EventSchema])
async def parse_events_from_file(
    file: UploadFile = File(...), db: Session = Depends(get_db)
):
    try:
        contents = await file.read()
        parsed_events = parse(contents)
        return parsed_events

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing file: {str(e)}")
