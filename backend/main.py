from fastapi import FastAPI

import msilib

app = FastAPI()




@app.get("/")
def        read_root():
    return {"Hello": "World"}


def read():
    pass
