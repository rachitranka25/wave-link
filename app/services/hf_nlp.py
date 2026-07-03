"""Text analysis: sentiment, named entities, and a severity heuristic.

Model pipelines are loaded lazily (only on first real use) and cached, so
importing this module — e.g. from tests — never triggers a HuggingFace model
download or requires network access.
"""

from functools import lru_cache
from typing import List, Optional

# Pinned explicitly rather than left to `pipeline()`'s default — the
# library warns "Using a pipeline without specifying a model name and
# revision in production is not recommended" for good reason: an
# unpinned default can change out from under you on a library upgrade.
# These are the actual models the app has been using all along; pinning
# them just makes that deliberate and documented (see README's "AI
# Models" section for what each one does and how big it is).
SENTIMENT_MODEL = "distilbert/distilbert-base-uncased-finetuned-sst-2-english"
NER_MODEL = "dbmdz/bert-large-cased-finetuned-conll03-english"

HAZARD_BASE_WEIGHT = {
    "tsunami": 5,
    "storm-surge": 4,
    "high-waves": 3,
    "swell-surge": 3,
    "coastal-current": 2,
    "abnormal-sea": 2,
}

CRITICAL_TERMS = [
    "evacuate",
    "trapped",
    "drowning",
    "collapsed",
    "emergency",
    "flooding",
    "deaths",
    "casualties",
    "missing",
]


@lru_cache(maxsize=1)
def _sentiment_pipe():
    from transformers import pipeline

    return pipeline("sentiment-analysis", model=SENTIMENT_MODEL)


@lru_cache(maxsize=1)
def _ner_pipe():
    from transformers import pipeline

    return pipeline("ner", model=NER_MODEL, aggregation_strategy="simple")


def serialize_entities(entities: List[dict]) -> List[dict]:
    """Convert HF pipeline output (numpy scalars, etc.) into JSON-safe dicts."""
    serialized = []
    for entity in entities:
        clean = dict(entity)
        if "score" in clean:
            clean["score"] = float(clean["score"])
        serialized.append(clean)
    return serialized


def analyze_text(text: str) -> dict:
    """Run sentiment + NER over free text."""
    sentiment_result = _sentiment_pipe()(text)[0]
    ner_result = _ner_pipe()(text)

    return {
        "sentiment_label": sentiment_result["label"],
        "sentiment_score": float(sentiment_result["score"]),
        "entities": serialize_entities(ner_result),
    }


def score_severity(
    text: str,
    hazard_type: Optional[str],
    sentiment_label: str,
    sentiment_score: float,
) -> str:
    """Rule-based severity heuristic, used as a fallback when no trained
    classifier is available (see app/services/ml_model.py). Combines the
    hazard type's base weight, presence of critical terms, and how strongly
    negative the sentiment is.
    """
    weight = HAZARD_BASE_WEIGHT.get((hazard_type or "").lower(), 1)

    lowered = text.lower()
    if any(term in lowered for term in CRITICAL_TERMS):
        weight += 2

    if sentiment_label.upper().startswith("NEG"):
        weight += sentiment_score  # 0..1

    if weight >= 5:
        return "high"
    if weight >= 3:
        return "medium"
    return "low"
