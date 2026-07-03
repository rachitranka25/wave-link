from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import schemas
from ..db import get_db
from ..services import reports as reports_service

router = APIRouter(prefix="/reports", tags=["reports"])


@router.post("", response_model=schemas.ReportOut)
def create_report(data: schemas.ReportCreate, db: Session = Depends(get_db)):
    if data.client_uuid and reports_service.get_by_client_uuid(db, data.client_uuid):
        raise HTTPException(status_code=409, detail="Report with this client_uuid already exists")
    return reports_service.create_report(db, data)


@router.get("", response_model=List[schemas.ReportOut])
def list_reports(
    severity: Optional[str] = None,
    hazard_type: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    return reports_service.list_reports(
        db, severity=severity, hazard_type=hazard_type, limit=limit, offset=offset
    )


@router.get("/stats", response_model=schemas.StatsOut)
def stats(db: Session = Depends(get_db)):
    return reports_service.get_stats(db)


@router.get("/{report_id}", response_model=schemas.ReportOut)
def get_report(report_id: int, db: Session = Depends(get_db)):
    report = reports_service.get_report(db, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.patch("/{report_id}/verify", response_model=schemas.ReportOut)
def verify_report(report_id: int, db: Session = Depends(get_db)):
    report = reports_service.verify_report(db, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    return report
