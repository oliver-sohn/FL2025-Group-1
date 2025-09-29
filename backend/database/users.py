from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import User


def upsert_user_sync(db: Session, google_id: str, email: str, name: str = None):
    stmt = select(User).where(User.google_id == google_id)
    result = db.execute(stmt)
    user = result.scalars().first()

    if user is None:
        user = User(google_id=google_id, email=email, name=name)
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        user.name = name
        user.email = email
        db.commit()
        db.refresh(user)

    return user
