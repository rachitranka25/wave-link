import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { syncMeshMessages, syncMeshReports } from "../api";
import type { MeshSyncMessageItem, MeshSyncReportItem } from "../types";
import {
  MESSAGE_QUEUE_KEY,
  REPORT_QUEUE_KEY,
  clearQueue,
  enqueue,
  generateId,
  getDeviceId,
  getQueue,
} from "../lib/offlineQueue";

const OFFLINE_FLAG_KEY = "wave-link-is-offline";

interface OfflineContextValue {
  isOffline: boolean;
  toggleOffline: () => void;
  queuedReports: MeshSyncReportItem[];
  queuedMessages: MeshSyncMessageItem[];
  enqueueReport: (payload: {
    text: string;
    hazard_type?: string;
    latitude?: number;
    longitude?: number;
  }) => void;
  enqueueMessage: (payload: { text: string; sender_name?: string }) => void;
  syncNow: () => Promise<void>;
  syncing: boolean;
  syncError: string | null;
}

const OfflineContext = createContext<OfflineContextValue | null>(null);

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [isOffline, setIsOffline] = useState(
    () => localStorage.getItem(OFFLINE_FLAG_KEY) === "true",
  );
  const [queuedReports, setQueuedReports] = useState<MeshSyncReportItem[]>(() =>
    getQueue<MeshSyncReportItem>(REPORT_QUEUE_KEY),
  );
  const [queuedMessages, setQueuedMessages] = useState<MeshSyncMessageItem[]>(() =>
    getQueue<MeshSyncMessageItem>(MESSAGE_QUEUE_KEY),
  );
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(OFFLINE_FLAG_KEY, String(isOffline));
  }, [isOffline]);

  const toggleOffline = useCallback(() => setIsOffline((prev) => !prev), []);

  const enqueueReport = useCallback<OfflineContextValue["enqueueReport"]>((payload) => {
    const deviceId = getDeviceId();
    const item: MeshSyncReportItem = {
      client_uuid: generateId(),
      text: payload.text,
      hazard_type: payload.hazard_type,
      latitude: payload.latitude,
      longitude: payload.longitude,
      relay_path: [deviceId],
      hop_count: 0,
    };
    setQueuedReports(enqueue(REPORT_QUEUE_KEY, item));
  }, []);

  const enqueueMessage = useCallback<OfflineContextValue["enqueueMessage"]>((payload) => {
    const deviceId = getDeviceId();
    const item: MeshSyncMessageItem = {
      client_uuid: generateId(),
      text: payload.text,
      sender_name: payload.sender_name,
      relay_path: [deviceId],
      hop_count: 0,
    };
    setQueuedMessages(enqueue(MESSAGE_QUEUE_KEY, item));
  }, []);

  const syncNow = useCallback(async () => {
    if (queuedReports.length === 0 && queuedMessages.length === 0) return;
    setSyncing(true);
    setSyncError(null);
    const deviceId = getDeviceId();
    try {
      if (queuedReports.length > 0) {
        await syncMeshReports(deviceId, queuedReports);
        clearQueue(REPORT_QUEUE_KEY);
        setQueuedReports([]);
      }
      if (queuedMessages.length > 0) {
        await syncMeshMessages(deviceId, queuedMessages);
        clearQueue(MESSAGE_QUEUE_KEY);
        setQueuedMessages([]);
      }
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }, [queuedReports, queuedMessages]);

  return (
    <OfflineContext.Provider
      value={{
        isOffline,
        toggleOffline,
        queuedReports,
        queuedMessages,
        enqueueReport,
        enqueueMessage,
        syncNow,
        syncing,
        syncError,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline(): OfflineContextValue {
  const ctx = useContext(OfflineContext);
  if (!ctx) throw new Error("useOffline must be used within OfflineProvider");
  return ctx;
}
