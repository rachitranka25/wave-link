from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import schemas
from ..db import get_db
from ..services import messages as messages_service

router = APIRouter(prefix="/messages", tags=["messages"])


@router.post("", response_model=schemas.MessageOut)
def create_message(data: schemas.MessageCreate, db: Session = Depends(get_db)):
    return messages_service.create_message(db, data)


@router.get("", response_model=List[schemas.MessageOut])
def list_messages(limit: int = 100, offset: int = 0, db: Session = Depends(get_db)):
    return messages_service.list_messages(db, limit=limit, offset=offset)
