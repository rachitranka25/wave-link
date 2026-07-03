from datetime import datetime
from typing import Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class ReportBase(BaseModel):
    text: str = Field(..., min_length=1)
    hazard_type: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class ReportCreate(ReportBase):
    client_uuid: Optional[str] = None  # generated server-side if omitted


class ReportOut(ReportBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    client_uuid: str
    source: str
    verified: bool
    created_at: datetime
    sentiment_label: Optional[str] = None
    sentiment_score: Optional[float] = None
    ner_entities: Optional[str] = None
    severity_label: Optional[str] = None
    origin_device_id: Optional[str] = None
    relay_path: Optional[str] = None
    hop_count: int = 0
    trust_score: float = 1.0


class StatsOut(BaseModel):
    total_reports: int
    by_severity: Dict[str, int]
    by_hazard_type: Dict[str, int]
    by_source: Dict[str, int]


class MeshReportItem(ReportBase):
    client_uuid: str
    relay_path: List[str] = Field(default_factory=list)
    hop_count: int = 0


class MeshSyncBatch(BaseModel):
    device_id: str
    reports: List[MeshReportItem]


class MeshSyncResult(BaseModel):
    accepted: int
    duplicates: int
    reports: List[ReportOut]


class MeshNodeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    device_id: str
    last_seen: datetime
    reports_relayed: int
    trust_score: float


class MeshStatusOut(BaseModel):
    active_nodes: int
    total_nodes: int
    mesh_reports: int
    direct_reports: int
    avg_hop_count: float


class MessageBase(BaseModel):
    text: str = Field(..., min_length=1)
    sender_name: Optional[str] = None


class MessageCreate(MessageBase):
    client_uuid: Optional[str] = None  # generated server-side if omitted


class MessageOut(MessageBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    client_uuid: str
    source: str
    created_at: datetime
    origin_device_id: Optional[str] = None
    relay_path: Optional[str] = None
    hop_count: int = 0
    trust_score: float = 1.0


class MeshMessageItem(MessageBase):
    client_uuid: str
    relay_path: List[str] = Field(default_factory=list)
    hop_count: int = 0


class MeshMessageSyncBatch(BaseModel):
    device_id: str
    messages: List[MeshMessageItem]


class MeshMessageSyncResult(BaseModel):
    accepted: int
    duplicates: int
    messages: List[MessageOut]
