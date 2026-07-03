from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import declarative_base

Base = declarative_base()


def utcnow() -> datetime:
    """Naive UTC datetime — matches SQLite's storage format while avoiding
    the deprecated datetime.utcnow()."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Report(Base):
    __tablename__ = "reports"

    # Core report data
    id = Column(Integer, primary_key=True, index=True)
    client_uuid = Column(String, unique=True, index=True, nullable=False)
    text = Column(Text, nullable=False)
    hazard_type = Column(String, nullable=True)
    source = Column(String, nullable=False, default="citizen")  # citizen | social_media | mesh
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    created_at = Column(DateTime, default=utcnow)
    verified = Column(Boolean, default=False)

    # AI-derived data
    sentiment_label = Column(String, nullable=True)
    sentiment_score = Column(Float, nullable=True)
    ner_entities = Column(Text, nullable=True)  # JSON string
    severity_label = Column(String, nullable=True)

    # Mesh relay provenance (populated only for source == "mesh")
    origin_device_id = Column(String, nullable=True)
    relay_path = Column(Text, nullable=True)  # JSON string list of device ids
    hop_count = Column(Integer, default=0)
    trust_score = Column(Float, default=1.0)


class MeshNode(Base):
    __tablename__ = "mesh_nodes"

    device_id = Column(String, primary_key=True, index=True)
    last_seen = Column(DateTime, default=utcnow)
    reports_relayed = Column(Integer, default=0)
    trust_score = Column(Float, default=1.0)


class MeshMessage(Base):
    """A free-text message broadcast over the mesh — distinct from Report:
    no AI analysis, just relay + dedup + trust, for things like 'need help
    near the harbor' that don't fit the structured hazard-report shape."""

    __tablename__ = "mesh_messages"

    id = Column(Integer, primary_key=True, index=True)
    client_uuid = Column(String, unique=True, index=True, nullable=False)
    text = Column(Text, nullable=False)
    sender_name = Column(String, nullable=True)
    source = Column(String, nullable=False, default="citizen")  # citizen | mesh
    created_at = Column(DateTime, default=utcnow)

    origin_device_id = Column(String, nullable=True)
    relay_path = Column(Text, nullable=True)  # JSON string list of device ids
    hop_count = Column(Integer, default=0)
    trust_score = Column(Float, default=1.0)
