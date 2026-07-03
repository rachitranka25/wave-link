import os
import sys
import tempfile

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

_db_fd, _db_path = tempfile.mkstemp(suffix=".db")
os.close(_db_fd)
os.environ["DATABASE_URL"] = f"sqlite:///{_db_path}"
# The test suite fires far more than 30 write requests per run — raise the
# limit so tests exercise app behavior, not the rate limiter itself.
os.environ.setdefault("RATE_LIMIT_MAX_REQUESTS", "100000")

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services import hf_nlp


@pytest.fixture(autouse=True)
def fake_analyze(monkeypatch):
    """Every test gets a canned sentiment/NER result instead of downloading
    and running real HuggingFace models."""

    def _fake(text: str):
        negative_terms = ("flood", "danger", "trapped", "evacuate")
        is_negative = any(term in text.lower() for term in negative_terms)
        return {
            "sentiment_label": "NEGATIVE" if is_negative else "POSITIVE",
            "sentiment_score": 0.95,
            "entities": [],
        }

    monkeypatch.setattr(hf_nlp, "analyze_text", _fake)


@pytest.fixture()
def client():
    with TestClient(app) as test_client:
        yield test_client
