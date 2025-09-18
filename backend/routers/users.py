from typing import List

import backend.database.models as models
import backend.routers.schemas as schemas
from backend.database.db import get_db
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from starlette import status

router = APIRouter(prefix="/users", tags=["Users"])


@router.post(
    "/", status_code=status.HTTP_201_CREATED, response_model=List[schemas.UserBase]
)
def create_user(user: schemas.UserBase, db: Session = Depends(get_db)):
    new_user = models.User(**user.dict())
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return [new_user]
