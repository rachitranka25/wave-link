"""Trained severity classifier wrapper.

Falls back to the rule-based heuristic in app/services/hf_nlp.py until a
model has actually been trained (via app/ml/train.py) and saved to
MODEL_PATH — there's no labeled data to train on yet in a fresh deployment.
"""

import os
from functools import lru_cache
from typing import Optional

from . import hf_nlp

MODEL_PATH = os.environ.get(
    "SEVERITY_MODEL_PATH",
    os.path.join(os.path.dirname(__file__), "..", "..", "data", "severity_model.joblib"),
)


@lru_cache(maxsize=1)
def _load_model():
    if not os.path.exists(MODEL_PATH):
        return None
    import joblib

    return joblib.load(MODEL_PATH)


def predict_severity(
    text: str,
    hazard_type: Optional[str],
    sentiment_label: str,
    sentiment_score: float,
) -> str:
    model = _load_model()
    if model is None:
        return hf_nlp.score_severity(text, hazard_type, sentiment_label, sentiment_score)
    return str(model.predict([text])[0])
