import uuid
from typing import List, Optional

from sqlalchemy.orm import Session

from .. import models, schemas


def get_by_client_uuid(db: Session, client_uuid: str) -> Optional[models.MeshMessage]:
    return db.query(models.MeshMessage).filter(models.MeshMessage.client_uuid == client_uuid).first()


def create_message(
    db: Session, data: schemas.MessageCreate, source: str = "citizen"
) -> models.MeshMessage:
    message = models.MeshMessage(
        client_uuid=data.client_uuid or str(uuid.uuid4()),
        text=data.text,
        sender_name=data.sender_name,
        source=source,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


def list_messages(db: Session, limit: int = 100, offset: int = 0) -> List[models.MeshMessage]:
    return (
        db.query(models.MeshMessage)
        .order_by(models.MeshMessage.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
