from __future__ import annotations

import io
import re
from datetime import datetime
from typing import List, Optional

import dateparser
import fitz  # PyMuPDF
from dateutil import tz as dateutil_tz
from docx import Document

from backend.routers.schemas import EventDraftSchema as EventDraft

__all__ = ["EventDraft", "parser"]


# ─────────────────────────────────────────────────────────────────────────────
# [extractors.py]
def _pdf_to_pages(file_bytes: bytes) -> List[str]:
    pages = []
    with fitz.open(stream=file_bytes, filetype="pdf") as doc:
        for p in doc:
            pages.append(p.get_text("text"))
    return pages


def _docx_to_text(file_bytes: bytes) -> str:
    with io.BytesIO(file_bytes) as f:
        doc = Document(f)
    return "\n".join(p.text for p in doc.paragraphs)


def _guess_text(file_bytes: bytes, filename: str) -> List[str]:
    name = (filename or "").lower()
    if name.endswith(".pdf"):
        return _pdf_to_pages(file_bytes)
    if name.endswith(".docx"):
        return [_docx_to_text(file_bytes)]
    try:
        return [file_bytes.decode("utf-8", errors="ignore")]
    except Exception:
        return [""]


# ─────────────────────────────────────────────────────────────────────────────
# [heuristics.py]
_DATEISH = re.compile(
    r"\b("
    r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.?\s+\d{1,2}(,\s*\d{4})?"
    r"|\d{1,2}/\d{1,2}(/\d{2,4})?"
    r"|\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b"
    r")",
    re.IGNORECASE,
)

_KEYWORDS = re.compile(
    r"\b(assignment|hw|homework|project|problem\s*set|pset|quiz|exam|midterm|final|"
    r"presentation|paper|essay|lab|due|deadline|deliverable)\b",
    re.IGNORECASE,
)

_TIME_RE = re.compile(r"\b(\d{1,2}(:\d{2})?\s*(am|pm)|\d{1,2}:\d{2})\b", re.IGNORECASE)

_COURSE_RE = re.compile(r"\b([A-Z]{2,4}\s*\d{3,4}[A-Z]?)\b")  # e.g., CSCI 330, MATH233

_DATE_TOKEN_RE = re.compile(
    r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.?\s+\d{1,2}(,\s*\d{4})?"
    r"|\d{1,2}/\d{1,2}(/\d{2,4})?",
    re.IGNORECASE,
)

_TYPE_MAP = {
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


def _likely_event_line(line: str) -> bool:
    return bool(_DATEISH.search(line)) and bool(_KEYWORDS.search(line))


def _guess_event_type(text: str) -> Optional[str]:
    t = text.lower()
    for k, v in _TYPE_MAP.items():
        if k in t:
            return v
    if "due" in t or "deadline" in t:
        return "assignment"
    return None


# ─────────────────────────────────────────────────────────────────────────────
# [parser.py]
def _normalize_dt(text: str, base: Optional[datetime]) -> Optional[datetime]:
    return dateparser.parse(
        text,
        settings={
            "RELATIVE_BASE": base or datetime.now(),
            "PREFER_DATES_FROM": "future",
            "RETURN_AS_TIMEZONE_AWARE": False,
        },
    )


def _pick_title(line: str) -> str:
    cleaned = re.sub(
        r"^\s*(Week\s*\d+:?)?\s*((Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s*)?"
        r"((Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.?\s+\d{1,2}(,\s*\d{4})?|"
        r"\d{1,2}/\d{1,2}(/\d{2,4})?)\s*[:-]?\s*",
        "",
        line,
        flags=re.IGNORECASE,
    )
    cleaned = re.sub(
        r"^(Due|Deadline|Deliverable)\s*[:\-]\s*", "", cleaned, flags=re.IGNORECASE
    )
    title = cleaned.strip() or "Course Event"
    return title[:140]


def _line_to_event(
    line: str,
    page_idx: int,
    line_idx: int,
    semester_base: Optional[datetime],
    tz: str,
) -> Optional[EventDraft]:
    dt = _normalize_dt(line, semester_base)
    if not dt:
        subs = [m.group(0) for m in _DATE_TOKEN_RE.finditer(line)]
        dt = _normalize_dt(" ".join(subs), semester_base) if subs else None
    if not dt:
        return None

    has_time = bool(_TIME_RE.search(line))
    dueish = any(w in line.lower() for w in ["due", "deadline", "by", "submit"])
    if not has_time and dueish:
        dt = dt.replace(hour=23, minute=59, second=0)

    tzinfo = dateutil_tz.gettz(tz)
    dt = dt.replace(tzinfo=tzinfo)

    course_m = _COURSE_RE.search(line)
    event_type = _guess_event_type(line)

    return EventDraft(
        title=_pick_title(line),
        start_iso=dt.isoformat(),
        end_iso=None,  # future: parse ranges like "2–4pm"
        all_day=not has_time and not dueish,
        course=course_m.group(0) if course_m else None,
        event_type=event_type,
        source_page=page_idx,
        source_line=line_idx,
        raw_text=line.strip(),
    )


# ─────────────────────────────────────────────────────────────────────────────
# Public API
def parser(
    file_bytes: bytes,
    filename: str,
    semester_start: Optional[str] = None,  # e.g., "2025-08-26"
    timezone: str = "America/Chicago",
) -> List[EventDraft]:
    """
    Parse a syllabus file (PDF/DOCX/TXT) into EventDrafts.

    Returns:
        List[EventDraft]: sorted by (start_iso, title) for stable UI.

    Notes:
      - If `semester_start` is provided, it anchors year resolution (e.g., "Oct 3").
      - If a line has 'due/deadline/by/submit' but no explicit time, we set 23:59 local.
      - Timezone is applied via dateutil; output datetimes are ISO8601 with tz.
    """
    pages = _guess_text(file_bytes, filename)
    base = datetime.fromisoformat(semester_start) if semester_start else None

    events: List[EventDraft] = []
    for p_idx, page in enumerate(pages):
        for l_idx, line in enumerate(page.splitlines()):
            if not line.strip():
                continue
            if not _likely_event_line(line):
                continue
            evt = _line_to_event(line, p_idx, l_idx, base, timezone)
            if evt:
                events.append(evt)

    events.sort(key=lambda e: ((e.start_iso or ""), e.title))
    return events
