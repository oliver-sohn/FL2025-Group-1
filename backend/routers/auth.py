import os

import requests
from authlib.integrations.starlette_client import OAuth
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Request
from jose import jwt

from backend.database.crud import upsert_user_sync

from .schemas import TokenRequest

load_dotenv()

router = APIRouter()
oauth = OAuth()

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
FRONTEND_URL = os.getenv("FRONTEND_URL")
JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM")

CONF_URL = "https://accounts.google.com/.well-known/openid-configuration"
oauth.register(
    name="google",
    client_id=GOOGLE_CLIENT_ID,
    client_secret=GOOGLE_CLIENT_SECRET,
    server_metadata_url=CONF_URL,
    client_kwargs={"scope": "openid email profile"},
)


@router.post("/auth/callback")
async def auth_callback(token_request: TokenRequest, request: Request):
    token = token_request.token

    # Verify the token with Google
    google_resp = requests.get(
        "https://oauth2.googleapis.com/tokeninfo", params={"id_token": token}
    )

    if google_resp.status_code != 200:
        raise HTTPException(status_code=400, detail="Invalid Google token")

    userinfo = google_resp.json()

    google_id = userinfo["sub"]
    email = userinfo["email"]
    name = userinfo.get("name")

    user = upsert_user_sync(google_id, email, name)

    # Store session (optional, if you’re using server-side sessions)
    # request.session["user"] = {"id": user.id, "email": user.email}

    return {
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
        },
    }
