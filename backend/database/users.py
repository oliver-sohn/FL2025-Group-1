from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from .db import get_db
from .models import User


def upsert_user_sync(google_id: str, email: str, name: str = None):
    """
    Insert a user if no user with google_id exists, otherwise update fields.
    Uses its own SessionLocal that it closes before returning.
    """
    session: Session = Depends(get_db())

    stmt = select(User).where(User.google_id == google_id)
    result = session.execute(stmt)
    user = result.scalars().first()

    if user is None:
        user = User(google_id=google_id, email=email, name=name)
        session.add(user)
        session.commit()
        session.refresh(user)
    else:
        user.name = name
        user.email = email
        session.commit()
        session.refresh(user)

    return user
