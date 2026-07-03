from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .db import init_db
from .middleware.rate_limit import RateLimitMiddleware
from .routers import mesh, messages, reports
from .services.hf_nlp import analyze_text


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Wave-Link AI Service", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RateLimitMiddleware)

app.include_router(reports.router)
app.include_router(mesh.router)
app.include_router(messages.router)


@app.get("/")
def read_root():
    return {"message": "Wave-Link AI service is running and ready to analyze text."}


@app.get("/health")
def health_check():
    return {"status": "ok"}


class AnalysisRequest(BaseModel):
    text: str


@app.post("/analyze/")
def analyze_endpoint(request: AnalysisRequest):
    """Raw sentiment + NER, no persistence. Kept for backward compatibility —
    prefer POST /reports for anything that should show up on the dashboard."""
    return analyze_text(request.text)
