# backend/database/db.py
import os
from pathlib import Path

from dotenv import load_dotenv, find_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Try to find a .env starting from the current working dir
env_path = find_dotenv(usecwd=True)

# Fallback: force the project root relative to this file
if not env_path:
    env_path = Path(__file__).resolve().parents[2] / ".env"
    env_path = str(env_path)

# Load it
load_dotenv(env_path)

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL not set. Expected it in your .env at project root. "
        "Example: DATABASE_URL=sqlite:///./dev.db"
    )

engine_kwargs = {}
if DATABASE_URL.startswith("sqlite"):
    # Required in many FastAPI+SQLite local setups
    engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, **engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
