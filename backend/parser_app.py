# parser_app.py
# ─────────────────────────────────────────────────────────────────────────────
# Syllabus Parser MVP (single file)
# Cut-lines marked with [MODULE: ...] to make later splitting trivial.
# ─────────────────────────────────────────────────────────────────────────────

from fastapi import APIRouter, UploadFile, File, Form
from fastapi.responses import JSONResponse 
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import io
import re

# External libs
import fitz  # PyMuPDF - extracts PDF bytes from PDFs
from docx import Document # Extracts from .docx files
import dateparser # natural language date parser
from dateutil import tz as dateutil_tz # advanced datetime utilities

router = APIRouter(tags=["parser"])


# ─────────────────────────────────────────────────────────────────────────────
# [MODULE: models.py]
class EventDraft(BaseModel):
    title: str
    start_iso: Optional[str] = None
    end_iso: Optional[str] = None
    all_day: bool = False
    course: Optional[str] = None
    event_type: Optional[str] = None  # "assignment", "exam", etc.
    source_page: Optional[int] = None
    source_line: Optional[int] = None
    raw_text: str


# ─────────────────────────────────────────────────────────────────────────────
# [MODULE: extractors.py]
def pdf_to_pages(file_bytes: bytes) -> List[str]:
    pages = []
    with fitz.open(stream=file_bytes, filetype="pdf") as doc:
        for p in doc:
            pages.append(p.get_text("text"))
    return pages


def docx_to_text(file_bytes: bytes) -> str:
    with io.BytesIO(file_bytes) as f:
        doc = Document(f)
    return "\n".join(p.text for p in doc.paragraphs)


def guess_text(file_bytes: bytes, filename: str) -> List[str]:
    name = (filename or "").lower()
    if name.endswith(".pdf"):
        return pdf_to_pages(file_bytes)
    if name.endswith(".docx"):
        return [docx_to_text(file_bytes)]
    try:
        return [file_bytes.decode("utf-8", errors="ignore")]
    except Exception:
        return [""]


# ─────────────────────────────────────────────────────────────────────────────
# [MODULE: heuristics.py]
DATEISH = re.compile(
    r"\b("
    r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.?\s+\d{1,2}(,\s*\d{4})?"
    r"|\d{1,2}/\d{1,2}(/\d{2,4})?"
    r"|\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b"
    r")",
    re.IGNORECASE,
)

KEYWORDS = re.compile(
    r"\b(assignment|hw|homework|project|problem\s*set|pset|quiz|exam|midterm|final|"
    r"presentation|paper|essay|lab|due|deadline|deliverable)\b",
    re.IGNORECASE,
)

TIME_RE = re.compile(r"\b(\d{1,2}(:\d{2})?\s*(am|pm)|\d{1,2}:\d{2})\b", re.IGNORECASE)

COURSE_RE = re.compile(r"\b([A-Z]{2,4}\s*\d{3,4}[A-Z]?)\b")  # e.g., CSCI 330, MATH233

DATE_TOKEN_RE = re.compile(
    r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.?\s+\d{1,2}(,\s*\d{4})?"
    r"|\d{1,2}/\d{1,2}(/\d{2,4})?",
    re.IGNORECASE,
)

TYPE_MAP = {
    "exam": "exam",
    "midterm": "exam",
    "final": "exam",
    "quiz": "quiz",
    "project": "project",
    "lab": "lab",
    "paper": "paper",
    "essay": "paper",
    "homework": "assignment",
    "assignment": "assignment",
    "pset": "assignment",
}


def likely_event_line(line: str) -> bool:
    return bool(DATEISH.search(line)) and bool(KEYWORDS.search(line))


def guess_event_type(text: str) -> Optional[str]:
    t = text.lower()
    for k, v in TYPE_MAP.items():
        if k in t:
            return v
    if "due" in t or "deadline" in t:
        return "assignment"
    return None


# ─────────────────────────────────────────────────────────────────────────────
# [MODULE: parser.py]
def normalize_dt(text: str, base: Optional[datetime]) -> Optional[datetime]:
    return dateparser.parse(
        text,
        settings={
            "RELATIVE_BASE": base or datetime.now(),
            "PREFER_DATES_FROM": "future",
            "RETURN_AS_TIMEZONE_AWARE": False,
        },
    )


def pick_title(line: str) -> str:
    # Remove common leading date/boilerplate fragments to surface the human title
    cleaned = re.sub(
        r"^\s*(Week\s*\d+:?)?\s*((Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s*)?"
        r"((Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.?\s+\d{1,2}(,\s*\d{4})?|"
        r"\d{1,2}/\d{1,2}(/\d{2,4})?)\s*[:-]?\s*",
        "",
        line,
        flags=re.IGNORECASE,
    )
    # Trim leading labels like "Due:", "Deadline:", etc.
    cleaned = re.sub(r"^(Due|Deadline|Deliverable)\s*[:\-]\s*", "", cleaned, flags=re.IGNORECASE)
    title = cleaned.strip() or "Course Event"
    return title[:140]


def parse_line_to_event(
    line: str,
    page_idx: int,
    line_idx: int,
    semester_base: Optional[datetime],
    tz: str,
) -> Optional[EventDraft]:
    # Try whole line first
    dt = normalize_dt(line, semester_base)
    if not dt:
        # Fallback: pull out explicit date tokens and try again
        tokens = DATE_TOKEN_RE.findall(line)
        if tokens:
            # findall returns tuples due to groups; rebuild a simple string of visible matches
            token_texts = DATE_TOKEN_RE.findall(line)
        # Better: iterate over finditer to get actual substrings
        subs = [m.group(0) for m in DATE_TOKEN_RE.finditer(line)]
        dt = normalize_dt(" ".join(subs), semester_base) if subs else None

    if not dt:
        return None

    # Time handling
    has_time = bool(TIME_RE.search(line))
    dueish = any(w in line.lower() for w in ["due", "deadline", "by", "submit"])
    if not has_time and dueish:
        dt = dt.replace(hour=23, minute=59, second=0)

    # Attach timezone
    tzinfo = dateutil_tz.gettz(tz)
    dt = dt.replace(tzinfo=tzinfo)

    # Course / type
    course_m = COURSE_RE.search(line)
    event_type = guess_event_type(line)

    return EventDraft(
        title=pick_title(line),
        start_iso=dt.isoformat(),
        end_iso=None,  # add end times when you parse ranges like "2–4pm"
        all_day=not has_time and not dueish,
        course=course_m.group(0) if course_m else None,
        event_type=event_type,
        source_page=page_idx,
        source_line=line_idx,
        raw_text=line.strip(),
    )


# ─────────────────────────────────────────────────────────────────────────────
# [MODULE: app routes]
@router.post("/parse")
async def parse_syllabus(
    file: UploadFile = File(...),
    semester_start: Optional[str] = Form(None),   # e.g., "2025-08-26"
    timezone: str = Form("America/Chicago"),
):
    """
    Upload a syllabus (PDF/DOCX/TXT). Returns a list of EventDrafts.
    """
    file_bytes = await file.read()
    pages = guess_text(file_bytes, file.filename)

    # Use semester start as a year anchor so "Oct 3" maps to the right year
    base = datetime.fromisoformat(semester_start) if semester_start else None

    events: List[EventDraft] = []
    for p_idx, page in enumerate(pages):
        for l_idx, line in enumerate(page.splitlines()):
            if not line.strip():
                continue
            if not likely_event_line(line):
                continue
            evt = parse_line_to_event(line, p_idx, l_idx, base, timezone)
            if evt:
                events.append(evt)

    # Sort for stable UI
    events.sort(key=lambda e: ((e.start_iso or ""), e.title))

    return JSONResponse([e.model_dump() for e in events])


# Optional: local dev entrypoint
# Run: uvicorn main:app --reload
