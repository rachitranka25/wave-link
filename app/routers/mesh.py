from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import schemas
from ..db import get_db
from ..services import mesh as mesh_service

router = APIRouter(prefix="/mesh", tags=["mesh"])


@router.post("/sync", response_model=schemas.MeshSyncResult)
def sync(batch: schemas.MeshSyncBatch, db: Session = Depends(get_db)):
    accepted, duplicates = mesh_service.sync_batch(db, batch)
    return schemas.MeshSyncResult(accepted=len(accepted), duplicates=duplicates, reports=accepted)


@router.post("/messages/sync", response_model=schemas.MeshMessageSyncResult)
def sync_messages(batch: schemas.MeshMessageSyncBatch, db: Session = Depends(get_db)):
    accepted, duplicates = mesh_service.sync_message_batch(db, batch)
    return schemas.MeshMessageSyncResult(
        accepted=len(accepted), duplicates=duplicates, messages=accepted
    )


@router.get("/nodes", response_model=List[schemas.MeshNodeOut])
def nodes(db: Session = Depends(get_db)):
    return mesh_service.list_nodes(db)


@router.get("/status", response_model=schemas.MeshStatusOut)
def status(db: Session = Depends(get_db)):
    return mesh_service.get_status(db)
