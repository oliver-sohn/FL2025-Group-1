import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from backend.database.db import Base, engine
from backend.routers.auth import router as auth_router

load_dotenv()

SESSION_SECRET = os.getenv("SESSION_SECRET")

Base.metadata.create_all(bind=engine)


app = FastAPI(title="Syllabus App")

# CORS
origins = [
    "http://localhost:3000",  # frontend
    "http://localhost:8000",  # backend
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # allow these origins
    allow_credentials=True,  # allow cookies / sessions
    allow_methods=["*"],  # allow all HTTP methods
    allow_headers=["*"],  # allow all headers
)

app.add_middleware(SessionMiddleware, secret_key=SESSION_SECRET)


app.include_router(auth_router)
