export type Severity = "low" | "medium" | "high";

export interface Report {
  id: number;
  client_uuid: string;
  text: string;
  hazard_type: string | null;
  source: "citizen" | "social_media" | "mesh";
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  verified: boolean;
  sentiment_label: string | null;
  sentiment_score: number | null;
  ner_entities: string | null;
  severity_label: Severity | string | null;
  origin_device_id: string | null;
  relay_path: string | null;
  hop_count: number;
  trust_score: number;
}

export interface ReportCreatePayload {
  text: string;
  hazard_type?: string;
  latitude?: number;
  longitude?: number;
  client_uuid?: string;
}

export interface StatsOut {
  total_reports: number;
  by_severity: Record<string, number>;
  by_hazard_type: Record<string, number>;
  by_source: Record<string, number>;
}

export interface MeshNode {
  device_id: string;
  last_seen: string;
  reports_relayed: number;
  trust_score: number;
}

export interface MeshStatus {
  active_nodes: number;
  total_nodes: number;
  mesh_reports: number;
  direct_reports: number;
  avg_hop_count: number;
}

export interface Message {
  id: number;
  client_uuid: string;
  text: string;
  sender_name: string | null;
  source: "citizen" | "mesh";
  created_at: string;
  origin_device_id: string | null;
  relay_path: string | null;
  hop_count: number;
  trust_score: number;
}

export interface MessageCreatePayload {
  text: string;
  sender_name?: string;
  client_uuid?: string;
}

export interface MeshSyncReportItem {
  client_uuid: string;
  text: string;
  hazard_type?: string;
  latitude?: number;
  longitude?: number;
  relay_path: string[];
  hop_count: number;
}

export interface MeshSyncMessageItem {
  client_uuid: string;
  text: string;
  sender_name?: string;
  relay_path: string[];
  hop_count: number;
}

export interface MeshSyncResult {
  accepted: number;
  duplicates: number;
  reports: Report[];
}

export interface MeshMessageSyncResult {
  accepted: number;
  duplicates: number;
  messages: Message[];
}

export const HAZARD_TYPES = [
  { value: "tsunami", label: "Tsunami" },
  { value: "storm-surge", label: "Storm Surge" },
  { value: "high-waves", label: "High Waves" },
  { value: "swell-surge", label: "Swell Surge" },
  { value: "coastal-current", label: "Coastal Current" },
  { value: "abnormal-sea", label: "Abnormal Sea Behavior" },
] as const;
