import type {
  MeshMessageSyncResult,
  MeshNode,
  MeshStatus,
  MeshSyncMessageItem,
  MeshSyncReportItem,
  MeshSyncResult,
  Message,
  MessageCreatePayload,
  Report,
  ReportCreatePayload,
  StatsOut,
} from "./types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });
  } catch {
    throw new ApiError(
      "Could not reach the Wave-Link backend. Is it running?",
    );
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(
      body?.detail ?? `Request failed with status ${response.status}`,
      response.status,
    );
  }

  return response.json() as Promise<T>;
}

export function createReport(payload: ReportCreatePayload): Promise<Report> {
  return request<Report>("/reports", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function listReports(filters?: {
  severity?: string;
  hazard_type?: string;
  limit?: number;
  offset?: number;
}): Promise<Report[]> {
  const params = new URLSearchParams();
  if (filters?.severity) params.set("severity", filters.severity);
  if (filters?.hazard_type) params.set("hazard_type", filters.hazard_type);
  if (filters?.limit) params.set("limit", String(filters.limit));
  if (filters?.offset) params.set("offset", String(filters.offset));
  const query = params.toString();
  return request<Report[]>(`/reports${query ? `?${query}` : ""}`);
}

export function getStats(): Promise<StatsOut> {
  return request<StatsOut>("/reports/stats");
}

export function getMeshStatus(): Promise<MeshStatus> {
  return request<MeshStatus>("/mesh/status");
}

export function getMeshNodes(): Promise<MeshNode[]> {
  return request<MeshNode[]>("/mesh/nodes");
}

export function verifyReport(id: number): Promise<Report> {
  return request<Report>(`/reports/${id}/verify`, { method: "PATCH" });
}

export function listMessages(limit = 100, offset = 0): Promise<Message[]> {
  return request<Message[]>(`/messages?limit=${limit}&offset=${offset}`);
}

export function createMessage(payload: MessageCreatePayload): Promise<Message> {
  return request<Message>("/messages", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Flush a batch of offline-queued reports through the real mesh sync
 * protocol — this browser acts as the relay device handing them off. */
export function syncMeshReports(
  deviceId: string,
  reports: MeshSyncReportItem[],
): Promise<MeshSyncResult> {
  return request<MeshSyncResult>("/mesh/sync", {
    method: "POST",
    body: JSON.stringify({ device_id: deviceId, reports }),
  });
}

export function syncMeshMessages(
  deviceId: string,
  messages: MeshSyncMessageItem[],
): Promise<MeshMessageSyncResult> {
  return request<MeshMessageSyncResult>("/mesh/messages/sync", {
    method: "POST",
    body: JSON.stringify({ device_id: deviceId, messages }),
  });
}
