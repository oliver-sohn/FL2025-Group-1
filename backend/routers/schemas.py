from pydantic import BaseModel


class UserBase(BaseModel):
    id: int
    google_id: str
    email: str
    name: str

    class Config:
        orm_mode = True


class TokenRequest(BaseModel):
    token: str

    class Config:
        orm_mode = True
