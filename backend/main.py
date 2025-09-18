import os

from dotenv import load_dotenv
from fastapi import FastAPI
from starlette.middleware.sessions import SessionMiddleware

# from backend.auth import router as auth_router
from backend.routers.users import router as user_router
from backend.database.db import Base, engine

# Load .env
load_dotenv()

SESSION_SECRET = os.getenv("SESSION_SECRET")

Base.metadata.create_all(bind=engine)


app = FastAPI()

app.add_middleware(SessionMiddleware, secret_key=SESSION_SECRET)

# app.include_router(auth_router)

app.include_router(user_router)

