"""Train a severity classifier from verified hazard reports.

Run manually/offline once enough verified reports have accumulated:

    python -m app.ml.train

Reads verified Report rows from the database, fits a TF-IDF +
LogisticRegression pipeline mapping report text -> severity_label, and
saves it to data/severity_model.joblib. app/services/ml_model.py picks it
up automatically (loading is cached on first use, so a running server
needs a restart to see a freshly trained model).
"""

import os
import sys

import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from app.db import SessionLocal  # noqa: E402
from app.models import Report  # noqa: E402

MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "data", "severity_model.joblib")
MIN_SAMPLES = 20


def load_training_data() -> pd.DataFrame:
    db = SessionLocal()
    try:
        rows = (
            db.query(Report.text, Report.severity_label)
            .filter(Report.verified.is_(True))
            .filter(Report.severity_label.isnot(None))
            .all()
        )
    finally:
        db.close()
    return pd.DataFrame(rows, columns=["text", "severity_label"])


def train():
    df = load_training_data()
    if len(df) < MIN_SAMPLES:
        print(
            f"Only {len(df)} verified, labeled reports found (need >= {MIN_SAMPLES}). "
            "Skipping training — the rule-based heuristic in services/hf_nlp.py stays in use."
        )
        return

    model = Pipeline(
        [
            ("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=2)),
            ("clf", LogisticRegression(max_iter=1000, class_weight="balanced")),
        ]
    )
    model.fit(df["text"], df["severity_label"])

    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    print(f"Trained severity classifier on {len(df)} reports -> {MODEL_PATH}")


if __name__ == "__main__":
    train()
