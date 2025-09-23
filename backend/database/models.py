from sqlalchemy import TIMESTAMP, Column, Integer, String, text

from .db import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, nullable=False)
    google_id = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    name = Column(String)
    created_at = Column(TIMESTAMP(timezone=True), server_default=text("now()"))
