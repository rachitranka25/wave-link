"""Mesh sync protocol.

This is the backend half of offline peer-to-peer relay: phones that lose
connectivity during a storm keep queuing hazard reports locally and hand
them off device-to-device (Bluetooth/LoRa — outside this backend's reach)
until one of them reaches the internet. That device then POSTs everything
it's carrying to /mesh/sync. This module dedupes by client-generated UUID
(so re-sending an already-synced batch is a no-op), preserves the relay
path for provenance, and decays trust with hop count since longer relay
chains are more likely to have been tampered with or garbled.
"""

import json
from datetime import timedelta
from typing import List, Tuple

from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import models, schemas
from ..models import utcnow
from . import messages as messages_service
from .reports import get_by_client_uuid, run_ai_pipeline

BASE_TRUST = 1.0
HOP_DECAY = 0.85  # trust multiplier per relay hop
ACTIVE_NODE_WINDOW = timedelta(hours=24)


def _trust_for_hops(hop_count: int) -> float:
    return round(BASE_TRUST * (HOP_DECAY ** max(hop_count, 0)), 4)


def _upsert_node(
    db: Session, device_id: str, batch_trust_scores: List[float]
) -> models.MeshNode:
    node = db.query(models.MeshNode).filter(models.MeshNode.device_id == device_id).first()
    if node is None:
        node = models.MeshNode(device_id=device_id, reports_relayed=0, trust_score=1.0)
        db.add(node)

    node.last_seen = utcnow()
    if batch_trust_scores:
        # Running average of every report's trust score this node has ever relayed,
        # so a node that consistently relays long, low-trust chains trends down.
        prior_total = node.trust_score * node.reports_relayed
        new_total = prior_total + sum(batch_trust_scores)
        node.reports_relayed += len(batch_trust_scores)
        node.trust_score = round(new_total / node.reports_relayed, 4)
    return node


def sync_batch(db: Session, batch: schemas.MeshSyncBatch) -> Tuple[List[models.Report], int]:
    """Ingest a batch of mesh-relayed reports. Returns (accepted, duplicate_count)."""
    accepted: List[models.Report] = []
    duplicates = 0

    for item in batch.reports:
        if get_by_client_uuid(db, item.client_uuid) is not None:
            duplicates += 1
            continue

        ai_fields = run_ai_pipeline(item.text, item.hazard_type)
        relay_path = item.relay_path or [batch.device_id]

        report = models.Report(
            client_uuid=item.client_uuid,
            text=item.text,
            hazard_type=item.hazard_type,
            source="mesh",
            latitude=item.latitude,
            longitude=item.longitude,
            origin_device_id=relay_path[0],
            relay_path=json.dumps(relay_path),
            hop_count=item.hop_count,
            trust_score=_trust_for_hops(item.hop_count),
            **ai_fields,
        )
        db.add(report)
        accepted.append(report)

    _upsert_node(db, batch.device_id, [r.trust_score for r in accepted])
    db.commit()
    for report in accepted:
        db.refresh(report)
    return accepted, duplicates


def sync_message_batch(
    db: Session, batch: schemas.MeshMessageSyncBatch
) -> Tuple[List[models.MeshMessage], int]:
    """Ingest a batch of mesh-relayed chat messages. Same dedup/trust-decay
    mechanics as sync_batch, just for free-text messages instead of
    structured hazard reports — no AI analysis step."""
    accepted: List[models.MeshMessage] = []
    duplicates = 0

    for item in batch.messages:
        if messages_service.get_by_client_uuid(db, item.client_uuid) is not None:
            duplicates += 1
            continue

        relay_path = item.relay_path or [batch.device_id]

        message = models.MeshMessage(
            client_uuid=item.client_uuid,
            text=item.text,
            sender_name=item.sender_name,
            source="mesh",
            origin_device_id=relay_path[0],
            relay_path=json.dumps(relay_path),
            hop_count=item.hop_count,
            trust_score=_trust_for_hops(item.hop_count),
        )
        db.add(message)
        accepted.append(message)

    _upsert_node(db, batch.device_id, [m.trust_score for m in accepted])
    db.commit()
    for message in accepted:
        db.refresh(message)
    return accepted, duplicates


def list_nodes(db: Session) -> List[models.MeshNode]:
    return db.query(models.MeshNode).order_by(models.MeshNode.last_seen.desc()).all()


def get_status(db: Session) -> dict:
    nodes = db.query(models.MeshNode).all()
    cutoff = utcnow() - ACTIVE_NODE_WINDOW
    active_nodes = sum(1 for n in nodes if n.last_seen and n.last_seen >= cutoff)

    mesh_reports = (
        db.query(func.count(models.Report.id)).filter(models.Report.source == "mesh").scalar() or 0
    )
    direct_reports = (
        db.query(func.count(models.Report.id)).filter(models.Report.source != "mesh").scalar() or 0
    )
    avg_hop = (
        db.query(func.avg(models.Report.hop_count)).filter(models.Report.source == "mesh").scalar() or 0.0
    )

    return {
        "active_nodes": active_nodes,
        "total_nodes": len(nodes),
        "mesh_reports": mesh_reports,
        "direct_reports": direct_reports,
        "avg_hop_count": round(float(avg_hop), 2),
    }
