from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from backend.database.db import get_db
from backend.routers.schemas import EventDraftSchema
from backend.parser.parser_app import parser as parse_syllabus

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

        def to_schema(e):
            data = e.model_dump() if hasattr(e, "model_dump") else e.dict()
            return (
                EventDraftSchema.model_validate(data)
                if hasattr(EventDraftSchema, "model_validate")     # Pydantic v2
                else EventDraftSchema.parse_obj(data)              # Pydantic v1
            )

        return [to_schema(e) for e in events]


    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing file: {str(e)}")
