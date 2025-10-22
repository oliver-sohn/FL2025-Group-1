import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from database.db import Base, engine
from routers.auth import router as auth_router
from routers.events import router as event_router
from routers.parser import router as parser_router

load_dotenv()

SESSION_SECRET = os.getenv("SESSION_SECRET")

# Uncomment the below line to reset the database tables
#SBase.metadata.drop_all(bind=engine)

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
app.include_router(event_router)
app.include_router(parser_router, prefix="/parser")
