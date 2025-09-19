from fastapi import FastAPI

#parser imports
from fastapi.middleware.cors import CORSMiddleware
from parser_app import router as parser_router


app = FastAPI(title="Syllabus App")

# Middleware for parser_app.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # PROD: ["http://localhost:3000", "https://your-frontend.com"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"Hello": "World"}


app.include_router(parser_router, prefix="/parser")

def read():
    pass
