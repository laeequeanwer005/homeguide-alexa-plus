
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.agent import answer_question
from app.services.documents import (
    DATA_DIR,
    list_documents,
    save_document,
)

app = FastAPI(
    title="HomeGuide API",
    description="Local appliance-manual search and troubleshooting API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


class ChatRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)


@app.get("/")
def root():
    return {
        "name": "HomeGuide",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "HomeGuide API",
    }


@app.get("/documents")
def documents():
    return {"documents": list_documents()}


@app.post("/documents/upload")
async def upload_document(file: UploadFile = File(...)):
    filename = Path(file.filename or "").name

    if not filename:
        raise HTTPException(status_code=400, detail="Filename is required.")

    content = await file.read()

    try:
        result = save_document(filename, content)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail="Unable to process this file. Check that it is a valid, readable document.",
        ) from exc

    return {
        "message": "Manual uploaded and indexed for keyword search.",
        "filename": result["filename"],
        "characters": result["characters"],
        "chunks": result["chunks"],
    }


@app.post("/chat")
def chat(request: ChatRequest):
    return answer_question(request.question)
