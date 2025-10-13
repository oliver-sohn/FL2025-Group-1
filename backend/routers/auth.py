import os
import time

import jwt
import requests
from authlib.integrations.starlette_client import OAuth
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse, RedirectResponse
from sqlalchemy.orm import Session

from backend.database.db import get_db
from backend.database.users import upsert_user_sync
from backend.routers.schemas import UserBase

load_dotenv()

router = APIRouter(prefix="/auth", tags=["Auth"])

# --- Google OAuth setup ---
oauth = OAuth()
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
FRONTEND_URL = os.getenv("FRONTEND_URL")

CONF_URL = "https://accounts.google.com/.well-known/openid-configuration"
oauth.register(
    name="google",
    client_id=GOOGLE_CLIENT_ID,
    client_secret=GOOGLE_CLIENT_SECRET,
    server_metadata_url=CONF_URL,
    client_kwargs={
        "scope": "openid email profile https://www.googleapis.com/auth/calendar.events",
        "access_type": "offline",
        "prompt": "consent",  # ensures refresh_token is returned every time
    },
)


@router.get("/login")
async def login(request: Request):
    redirect_uri = request.url_for("auth_callback")
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/callback")
async def auth_callback(request: Request, db: Session = Depends(get_db)):
    try:
        token = await oauth.google.authorize_access_token(request)
    except Exception as e:
        print("OAuth Error:", e)
        raise HTTPException(status_code=400, detail="OAuth authorization failed")

    # Fetch user info
    userinfo = token.get("userinfo")
    if not userinfo:
        resp = requests.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {token['access_token']}"},
        )
        userinfo = resp.json()

    google_id = userinfo["sub"],
    email = userinfo["email"],
    name = userinfo.get("name"),

    jwt_token = jwt.encode(
        {"google_id": google_id, "email": email, "name": name, "exp": time.time() + 3600},
        os.getenv("JWT_SECRET"),
        os.getenv("JWT_ALGORITHM"),
    )

    # access_token = token["access_token"]
    # refresh_token = token.get("refresh_token")

    # print(token)

    upsert_user_sync(db, google_id, email, name)

    # Redirect back to frontend with user info
    redirect_url = f"{FRONTEND_URL}?jwt_token={jwt_token}"
    return RedirectResponse(url=redirect_url)

@router.post("/verify")
async def verify_token(request: Request):
    data = await request.json()
    token = data.get("token")

    if not token:
        raise HTTPException(status_code=400, detail="Missing token")

    try:
        decoded = jwt.decode(token, os.getenv("JWT_SECRET"), os.getenv("JWT_ALGORITHM"))
        return JSONResponse({"valid": True, "user": decoded})
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")