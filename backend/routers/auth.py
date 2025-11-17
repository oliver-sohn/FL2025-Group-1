import datetime
import os
import time

import jwt
import requests
from authlib.integrations.starlette_client import OAuth
from database.db import get_db
from database.users import select_user_by_google_id, select_user_by_id, upsert_user_sync
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

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
        # ensures refresh_token is returned every time -- not needed anymore since we are using access token
        # "access_type": "offline",
        # "prompt": "consent",
    },
)


@router.get("/login")
@router.get("/login/")
async def login(request: Request):
    redirect_uri = (
        f"{str(request.base_url).rstrip('/')}/api/auth/callback"
        if os.getenv("IS_KUBERNETES")
        else request.url_for("auth_callback")
    )
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/callback")
@router.get("/callback/")
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

    google_id = userinfo["sub"]
    email = userinfo["email"]
    name = userinfo.get("name", "User")
    access_token = token["access_token"]
    expires_in = token["expires_in"]

    upsert_user_sync(
        db,
        google_id=google_id,
        email=email,
        name=name,
        access_token=access_token,
        expires_in=expires_in,
    )

    jwt_token = jwt.encode(
        {
            "google_id": google_id,
            "email": email,
            "name": name,
            "exp": time.time() + 3600,
        },
        os.getenv("JWT_SECRET"),
        os.getenv("JWT_ALGORITHM"),
    )

    # Redirect back to frontend with jwt_token
    redirect_url = f"{FRONTEND_URL}?jwt_token={jwt_token}"
    return RedirectResponse(url=redirect_url)


@router.post("/verify")
@router.post("/verify/")
async def verify_token(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    token = data.get("token")

    if not token:
        raise HTTPException(status_code=400, detail="Missing token")

    try:
        decoded = jwt.decode(token, os.getenv("JWT_SECRET"), os.getenv("JWT_ALGORITHM"))
        user = select_user_by_google_id(db, google_id=decoded["google_id"])
        return {
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.name,
            },
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.get("/session")
@router.get("/session/")
async def check_session(user_id: int, db: Session = Depends(get_db)):
    user = select_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    now = datetime.datetime.utcnow()
    if user.token_expires_at < now:
        raise HTTPException(status_code=401, detail="Session expired")
