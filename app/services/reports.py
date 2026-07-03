import json
import uuid
from datetime import datetime
from typing import List, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import models, schemas
from . import hf_nlp, ml_model


def run_ai_pipeline(text: str, hazard_type: Optional[str]) -> dict:
    """Shared by direct report creation and mesh sync: sentiment + NER +
    severity, packaged as the fields Report expects."""
    analysis = hf_nlp.analyze_text(text)
    severity = ml_model.predict_severity(
        text, hazard_type, analysis["sentiment_label"], analysis["sentiment_score"]
    )
    return {
        "sentiment_label": analysis["sentiment_label"],
        "sentiment_score": analysis["sentiment_score"],
        "ner_entities": json.dumps(analysis["entities"]),
        "severity_label": severity,
    }


def get_by_client_uuid(db: Session, client_uuid: str) -> Optional[models.Report]:
    return db.query(models.Report).filter(models.Report.client_uuid == client_uuid).first()


def create_report(db: Session, data: schemas.ReportCreate, source: str = "citizen") -> models.Report:
    ai_fields = run_ai_pipeline(data.text, data.hazard_type)

    report = models.Report(
        client_uuid=data.client_uuid or str(uuid.uuid4()),
        text=data.text,
        hazard_type=data.hazard_type,
        source=source,
        latitude=data.latitude,
        longitude=data.longitude,
        **ai_fields,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


def list_reports(
    db: Session,
    severity: Optional[str] = None,
    hazard_type: Optional[str] = None,
    since: Optional[datetime] = None,
    limit: int = 100,
    offset: int = 0,
) -> List[models.Report]:
    query = db.query(models.Report)
    if severity:
        query = query.filter(models.Report.severity_label == severity)
    if hazard_type:
        query = query.filter(models.Report.hazard_type == hazard_type)
    if since:
        query = query.filter(models.Report.created_at >= since)
    return (
        query.order_by(models.Report.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


def get_report(db: Session, report_id: int) -> Optional[models.Report]:
    return db.query(models.Report).filter(models.Report.id == report_id).first()


def verify_report(db: Session, report_id: int) -> Optional[models.Report]:
    report = get_report(db, report_id)
    if report is None:
        return None
    report.verified = True
    db.commit()
    db.refresh(report)
    return report


def get_stats(db: Session) -> dict:
    total = db.query(func.count(models.Report.id)).scalar() or 0

    def _counts(column):
        rows = db.query(column, func.count(models.Report.id)).group_by(column).all()
        return {str(key): count for key, count in rows if key is not None}

    return {
        "total_reports": total,
        "by_severity": _counts(models.Report.severity_label),
        "by_hazard_type": _counts(models.Report.hazard_type),
        "by_source": _counts(models.Report.source),
    }
