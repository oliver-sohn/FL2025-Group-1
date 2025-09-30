from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from backend.database.db import get_db
from backend.parser.parser_app import parser as parse_syllabus
from backend.routers.schemas import EventDraftSchema

router = APIRouter(prefix="/parse", tags=["Parser"])


@router.post("/", response_model=List[EventDraftSchema])
async def parse_events_from_file(
    file: UploadFile = File(...),
    semester_start: Optional[str] = Form(None),
    timezone: str = Form("America/Chicago"),
    db: Session = Depends(get_db),
):
    try:
        file_bytes = await file.read()
        events = parse_syllabus(
            file_bytes=file_bytes,
            filename=file.filename or "upload",
            semester_start=semester_start,
            timezone=timezone,
        )

        return events

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing file: {str(e)}")
