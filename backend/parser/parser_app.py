from __future__ import annotations

import io
import re
from datetime import datetime
from typing import List, Optional

import dateparser
import fitz  # PyMuPDF
from dateutil import tz as dateutil_tz
from docx import Document

from routers.schemas import EventDraftSchema as EventDraft

__all__ = ["EventDraft", "parser"]


# ─────────────────────────────────────────────────────────────────────────────
# [extractors.py]
# These functions extract readable text from various syllabus file formats.
# PDFs use "blocks" mode to preserve column layout and spacing for table-like syllabi.
def _pdf_to_pages(file_bytes: bytes) -> List[str]:
    """Extract text from PDF pages while preserving layout structure."""
    pages = []
    with fitz.open(stream=file_bytes, filetype="pdf") as doc:
        for p in doc:
            # Extract and sort text blocks top-to-bottom, left-to-right.
            blocks = p.get_text("blocks")
            blocks = sorted(blocks, key=lambda b: (round(b[1], 1), round(b[0], 1)))
            # Join all blocks with line breaks to mimic natural row order.
            page_text = "\n".join(b[4].strip() for b in blocks if b[4].strip())
            pages.append(page_text)
    return pages


def _docx_to_text(file_bytes: bytes) -> str:
    """Extract plain text from .docx files."""
    with io.BytesIO(file_bytes) as f:
        doc = Document(f)
    return "\n".join(p.text for p in doc.paragraphs)


def _guess_text(file_bytes: bytes, filename: str) -> List[str]:
    """Dispatch helper that routes decoding logic based on file extension."""
    name = (filename or "").lower()
    if name.endswith(".pdf"):
        return _pdf_to_pages(file_bytes)
    if name.endswith(".docx"):
        return [_docx_to_text(file_bytes)]
    try:
        # Fall back to UTF-8 decoding for plain-text files.
        return [file_bytes.decode("utf-8", errors="ignore")]
    except Exception:
        return [""]


# ─────────────────────────────────────────────────────────────────────────────
# [heuristics.py]
# Regex-based signals for detecting event lines, dates, and keywords.
_DATEISH = re.compile(
    r"\b("
    r"((Mon|Tues|Tue|Wed|Thurs|Thu|Fri|Sat|Sun)\.?\,?\s*)?"
    r"((Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|"
    r"Sep(t|tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\.?\s+\d{1,2}(,\s*\d{4})?"
    r"|\d{1,2}/\d{1,2}(,\s*(Mon|Tues|Tue|Wed|Thurs|Thu|Fri|Sat|Sun))?(/\d{2,4})?)"
    r"|Week\s*\d+\s*[:\-–]\s*[A-Za-z]+\s*\d{1,2}"
    r"|[A-Za-z]+\s*\d{1,2}\s*[–\-]\s*[A-Za-z]+\s*\d{1,2}"
    r")",
    re.IGNORECASE,
)

_KEYWORDS = re.compile(
    r"\b(assignment|hw|homework|project|problem\s*set|pset|quiz|exam|midterm|final|"
    r"presentation|paper|essay|lab|due|deadline|deliverable|class|lecture|review|break|holiday|no\s*class|no\s*lecture)\b",
    re.IGNORECASE,
)

_TIME_RE = re.compile(
    r"\b\d{1,2}(:\d{2})?\s*(?:a|p)\.?m\.?"
    r"|\b\d{1,2}\s*(?:a|p)\.?m\.?"
    r"|\d{1,2}(:\d{2})?\s*(?:–|-|to)\s*\d{1,2}(:\d{2})?\s*(?:a|p)\.?m\.?",
    re.IGNORECASE,
)

_COURSE_RE = re.compile(r"\b([A-Z]{2,4}\s*\d{3,4}[A-Z]?)\b")

_DATE_TOKEN_RE = re.compile(
    r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.?\s+\d{1,2}(,\s*\d{4})?"
    r"|\d{1,2}/\d{1,2}(/\d{2,4})?",
    re.IGNORECASE,
)

# Maps detected keyword types to standardized event categories.
_TYPE_MAP = {
    "exam": "exam",
    "midterm": "exam",
    "final": "exam",
    "quiz": "exam",
    "project": "assignment",
    "lab": "assignment",
    "paper": "assignment",
    "essay": "assignment",
    "homework": "assignment",
    "assignment": "assignment",
    "pset": "assignment",
    "lecture": "event",
    "section": "event",
    "session": "event",
    "speaker": "event",
    "office hours": "event",
    "help session": "event",
    "review": "event",
}


def _force_exam_line(line: str) -> bool:
    """Explicitly capture final exam lines even if keywords are sparse."""
    return bool(re.search(r"\bfinal\s+exam\b", line, re.IGNORECASE)) and bool(
        _DATEISH.search(line)
    )


def _likely_event_line(line: str) -> bool:
    """Return True if a line looks like a schedulable event (date + keyword)."""
    if _force_exam_line(line):
        return True
    has_date = bool(_DATEISH.search(line))
    has_keyword = bool(_KEYWORDS.search(line))
    weekish = bool(re.search(r"\bWeek\s*\d+\b", line, re.IGNORECASE))
    return (has_date and has_keyword) or (weekish and has_date)


def _guess_event_type(text: str) -> Optional[str]:
    """Infer event type ('exam', 'assignment', 'event') from keyword context."""
    t = text.lower()
    for k, v in _TYPE_MAP.items():
        if k in t:
            return v
    if "due" in t or "deadline" in t:
        return "assignment"
    return None


def _split_multidate_line(line: str) -> list[str]:
    """Split lines containing multiple dates into individual event candidates."""
    date_pattern = (
        r"(?:\b(?:January|February|March|April|May|June|July|August|"
        r"September|Sept\.|October|November|December)\b"
        r"|\b\d{1,2}/\d{1,2}(?:/\d{2,4})?)"
    )
    matches = list(re.finditer(date_pattern, line, flags=re.IGNORECASE))
    if len(matches) <= 1:
        return [line]
    split_indices = [m.start() for m in matches[1:]]
    parts = []
    last = 0
    for idx in split_indices:
        parts.append(line[last:idx].strip())
        last = idx
    parts.append(line[last:].strip())
    return [p for p in parts if p]


# ─────────────────────────────────────────────────────────────────────────────
# [parser.py]
def _normalize_dt(text: str, base: Optional[datetime]) -> Optional[datetime]:
    """Parse natural-language date text into a datetime, relative to semester start."""
    return dateparser.parse(
        text,
        settings={
            "RELATIVE_BASE": base or datetime.now(),
            "PREFER_DAY_OF_MONTH": "first",
            "PREFER_DATES_FROM": "future",
            "DATE_ORDER": "MDY",
            "RETURN_AS_TIMEZONE_AWARE": False,
        },
    )


def _pick_summary(line: str) -> str:
    """Clean up an event line into a concise, human-readable summary."""
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
    summary = cleaned.strip() or "Course Event"
    return summary[:140]


def _truncate_after_sentence(text: str) -> str:
    """Trim off narrative text after the first relevant event sentence."""
    sentences = re.split(r"(?<=[.!?])\s+", text)
    kept = []
    for s in sentences:
        if _DATEISH.search(s) or _KEYWORDS.search(s):
            kept.append(s)
        else:
            break
    return " ".join(kept).strip() if kept else text


def _line_to_event(
    line: str,
    page_idx: int,
    line_idx: int,
    semester_base: Optional[datetime],
    tz: str,
) -> Optional[EventDraft]:
    """Convert a candidate line into an EventDraft object if it parses cleanly."""
    line = _truncate_after_sentence(line)
    dt = _normalize_dt(line, semester_base)
    if not dt:
        # Try a secondary parse using only extracted date tokens.
        subs = [m.group(0) for m in _DATE_TOKEN_RE.finditer(line)]
        dt = _normalize_dt(" ".join(subs), semester_base) if subs else None
    if not dt:
        return None

    has_time = bool(_TIME_RE.search(line))
    dueish = any(w in line.lower() for w in ["due", "deadline", "by", "submit"])
    if not has_time and dueish:
        # Assign 11:59 PM to typical due dates without explicit times.
        dt = dt.replace(hour=23, minute=59, second=0)

    tzinfo = dateutil_tz.gettz(tz)
    dt = dt.replace(tzinfo=tzinfo)

    course_m = _COURSE_RE.search(line)
    eventType = _guess_event_type(line) or "event"

    return EventDraft(
        summary=_pick_summary(line),
        start=dt,
        end=None,
        all_day=not has_time and not dueish,
        course_name=course_m.group(0) if course_m else None,
        eventType=eventType,
        source_page=page_idx,
        source_line=line_idx,
        raw_text=line.strip(),
    )


def _normalize_table_lines(lines: List[str]) -> List[str]:
    """Clean spacing and merge broken lines for table-like syllabi."""
    normalized = []
    for line in lines:
        line = re.sub(r"[\t\u00A0\u2000-\u200B\u202F]+", " ", line)
        compact = re.sub(r"\s{2,}", " ", line.strip())
        if (
            normalized
            and not re.search(r"[.:;]$", normalized[-1])
            and line[:1].islower()
        ):
            # Merge with previous if continuation of sentence.
            normalized[-1] += " " + compact
        else:
            normalized.append(compact)
    return normalized


def _split_unstructured_events(lines: list[str]) -> list[str]:
    """Extract events from freeform paragraphs without clear numbering."""
    merged = []
    for line in lines:
        subparts = _split_multidate_line(line)
        for s in subparts:
            if _DATEISH.search(s) and not re.search(r"^\d+\.", s):
                merged.append(s.strip())
    return merged


def _merge_table_blocks(lines: list[str]) -> list[str]:
    """Combine multi-line event rows while stopping before narrative sections."""
    merged = []
    date_pattern = re.compile(
        r"\b("
        r"(Mon|Tue|Tues|Wed|Thu|Thurs|Fri|Sat|Sun)\.?|"
        r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.?|"
        r"\d{1,2}/\d{1,2}"
        r")\b",
        re.IGNORECASE,
    )
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if not line:
            i += 1
            continue
        if date_pattern.search(line):
            block = [line]
            # Look ahead up to 4 lines to join wrapped rows.
            for j in range(1, 5):
                if i + j >= len(lines):
                    break
                next_line = lines[i + j].strip()
                if not next_line:
                    continue
                # Stop joining when a new date or policy section begins.
                if date_pattern.search(next_line) or re.match(
                    r"^\s*[A-Z][A-Za-z\s]+Policy\b", next_line
                ):
                    break
                # Stop on long narrative lines (policy text or paragraphs).
                if (
                    len(next_line.split()) >= 12
                    and not _DATEISH.search(next_line)
                    and not _KEYWORDS.search(next_line)
                ):
                    break
                block.append(next_line)
            merged.append(" ".join(block))
        i += 1
    return merged


def _group_nearby_lines(lines: list[str], max_distance: int = 5) -> list[str]:
    """Join short lines that are semantically connected (e.g., date + description)."""
    grouped = []
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if not line:
            i += 1
            continue
        combined = line
        for j in range(1, max_distance + 1):
            if i + j >= len(lines):
                break
            next_line = lines[i + j].strip()
            if not next_line:
                continue
            # Do not merge if both contain dates—likely separate events.
            if _DATEISH.search(line) and _DATEISH.search(next_line):
                break
            # Merge if first has keyword and next has date (e.g., "Due on ..." lines).
            if _KEYWORDS.search(line) and _DATEISH.search(next_line):
                combined = line + " " + next_line
                i += j
                break
            # Merge if overall combined text still looks like a valid event.
            test_line = combined + " " + next_line
            if _likely_event_line(test_line):
                combined = test_line
                i += j
                break
        grouped.append(combined)
        i += 1
    return grouped


# ─────────────────────────────────────────────────────────────────────────────
# Public API
def parser(
    file_bytes: bytes,
    filename: str,
    semester_start: Optional[str] = None,
    timezone: str = "America/Chicago",
) -> List[EventDraft]:
    """Main entrypoint: parse syllabi into EventDraft objects."""
    pages = _guess_text(file_bytes, filename)
    base = datetime.fromisoformat(semester_start) if semester_start else None
    events: List[EventDraft] = []

    for p_idx, page in enumerate(pages):
        raw_lines = page.splitlines()
        short_lines = sum(1 for line in raw_lines if len(line.strip()) < 120)
        table_like = sum(1 for line in raw_lines if re.search(r"\s{3,}|\t", line))
        ratio_short = short_lines / max(len(raw_lines), 1)
        ratio_table = table_like / max(len(raw_lines), 1)

        # Detect typical table-structured pages by headers or keywords.
        if re.search(
            r"(?i)(tentative\s+(course\s*)?schedule|class\s+schedule|course\s+schedule|weekly\s+schedule|course\s+overview|session\s*\|\s*date\s*\|\s*topic)",
            page,
        ):
            ratio_table = 1.0

        # Decide parsing strategy: unstructured text vs. table-like layout.
        if ratio_short > 0.8 and ratio_table < 0.3:
            page_lines = _normalize_table_lines(raw_lines)
            unstructured = []
            # Attempt to split loose paragraphs into events.
            if not any(re.search(r"^\d+\.", line) for line in page_lines):
                unstructured = _split_unstructured_events(page_lines)
                if len(unstructured) >= len(page_lines) / 2:
                    page_lines = unstructured
            # If no clear structure detected, fall back to table-based merging.
            if not unstructured:
                page_lines = _merge_table_blocks(page_lines)
            page_lines = _group_nearby_lines(page_lines, max_distance=2)
        else:
            # Default for tables and lists with clear separations.
            page_lines = _normalize_table_lines(raw_lines)
            page_lines = _merge_table_blocks(page_lines)
            page_lines = _group_nearby_lines(page_lines, max_distance=2)

        # Convert all valid lines into event objects.
        for l_idx, line in enumerate(page_lines):
            if not line.strip() or not _likely_event_line(line):
                continue
            for sub in _split_multidate_line(line):
                evt = _line_to_event(sub, p_idx, l_idx, base, timezone)
                if evt:
                    events.append(evt)

    # Sort events chronologically for consistent output.
    events.sort(key=lambda e: ((e.start or ""), e.summary))
    return events
