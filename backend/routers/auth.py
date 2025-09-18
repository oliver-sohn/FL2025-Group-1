import os

from authlib.integrations.starlette_client import OAuth
from dotenv import load_dotenv
from fastapi import APIRouter, Request
from jose import jwt

from backend.database.crud import upsert_user_sync

load_dotenv()  # ensure env vars loaded when module imported

router = APIRouter()
oauth = OAuth()

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
JWT_SECRET = os.getenv("JWT_SECRET", "change-me")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

CONF_URL = "https://accounts.google.com/.well-known/openid-configuration"
oauth.register(
    name="google",
    client_id=GOOGLE_CLIENT_ID,
    client_secret=GOOGLE_CLIENT_SECRET,
    server_metadata_url=CONF_URL,
    client_kwargs={"scope": "openid email profile"},
)


def create_jwt(user_id: int, email: str):
    payload = {"sub": str(user_id), "email": email}
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token


@router.get("/login")
async def login(request: Request):
    # build callback URI pointing to this app
    redirect_uri = request.url_for("auth_callback")  # absolute URL
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/auth/callback")
async def auth_callback(request: Request):
    token = await oauth.google.authorize_access_token(request)

    userinfo = token.get("userinfo")
    if not userinfo:
        resp = await oauth.google.get("userinfo", token=token)
        userinfo = resp.json()

    google_id = userinfo["sub"]
    email = userinfo["email"]
    name = userinfo.get("name")

    # Upsert user into DB (sync)
    user = upsert_user_sync(google_id, email, name)

    # Store session
    request.session["user"] = {"id": user.id, "email": user.email}

    return {"message": f"Welcome {user.name}"}
