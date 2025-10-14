import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import User


def select_user_by_id(db: Session, id: str):
    stmt = select(User).where(User.id == id)
    result = db.execute(stmt)
    user = result.scalars().first()
    return user


def select_user_by_google_id(db: Session, google_id: str):
    stmt = select(User).where(User.google_id == google_id)
    result = db.execute(stmt)
    user = result.scalars().first()
    return user


def upsert_user_sync(
    db: Session,
    google_id: str,
    email: str,
    name: str,
    access_token: str,
    expires_in: int,
):
    stmt = select(User).where(User.google_id == google_id)
    result = db.execute(stmt)
    user = result.scalars().first()

    expires_at = datetime.datetime.utcnow() + datetime.timedelta(seconds=expires_in)

    if user is None:
        user = User(
            google_id=google_id,
            email=email,
            name=name,
            access_token=access_token,
            token_expires_at=expires_at,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        user.email = email
        user.name = name
        user.access_token = access_token
        user.token_expires_at = expires_at
        db.commit()
        db.refresh(user)

    return user
