import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Clock, MessageCircle, Network, Radio, Send, Shuffle, Wifi } from "lucide-react";
import { createMessage, getMeshNodes, getMeshStatus, listMessages } from "../api";
import type { MeshNode, MeshStatus, Message } from "../types";
import { formatRelativeTime } from "../lib/format";
import { useOffline } from "../context/OfflineContext";

const POLL_INTERVAL_MS = 15_000;
const CHAT_POLL_INTERVAL_MS = 5_000;

function MeshChatPanel() {
  const { isOffline, queuedMessages, enqueueMessage } = useOffline();
  const [messages, setMessages] = useState<Message[]>([]);
  const [senderName, setSenderName] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await listMessages(100);
        if (!cancelled) setMessages(data);
      } catch {
        // Chat is a nice-to-have panel — stay quiet on transient poll failures.
      }
    }

    load();
    const interval = setInterval(load, CHAT_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const feedItems = useMemo(() => {
    const synced = [...messages]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((message) => ({ kind: "synced" as const, message }));
    const pending = queuedMessages.map((item) => ({ kind: "pending" as const, item }));
    return [...synced, ...pending];
  }, [messages, queuedMessages]);

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight });
  }, [feedItems]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    setSending(true);
    setError(null);
    try {
      if (isOffline) {
        enqueueMessage({ text: draft.trim(), sender_name: senderName.trim() || undefined });
      } else {
        const sent = await createMessage({
          text: draft.trim(),
          sender_name: senderName.trim() || undefined,
        });
        setMessages((prev) => [...prev, sent]);
      }
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="bg-blue-900/40 backdrop-blur-sm border border-blue-700 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <MessageCircle className="text-cyan-400" size={28} />
        <div>
          <h3 className="text-xl font-bold text-white">Mesh Chat</h3>
          <p className="text-gray-400 text-sm">
            Broadcast messages relayed over the mesh — "need help near the
            harbor," "road blocked," etc.
          </p>
        </div>
      </div>

      <div
        ref={feedRef}
        className="bg-blue-950/60 border border-blue-800 rounded-lg p-4 h-64 overflow-y-auto space-y-3 mb-4"
      >
        {feedItems.length === 0 && (
          <p className="text-gray-500 text-sm">
            No messages yet — be the first to broadcast one.
          </p>
        )}
        {feedItems.map((entry) =>
          entry.kind === "synced" ? (
            <div key={entry.message.id} className="text-sm">
              <div className="flex items-center gap-2">
                <span className="text-cyan-300 font-semibold">
                  {entry.message.sender_name || "Anonymous"}
                </span>
                {entry.message.source === "mesh" && (
                  <span className="px-2 py-0.5 bg-purple-900/50 text-purple-300 rounded-full text-xs">
                    via mesh · {entry.message.hop_count} hop
                    {entry.message.hop_count === 1 ? "" : "s"}
                  </span>
                )}
                <span className="text-gray-500 text-xs">
                  {formatRelativeTime(entry.message.created_at)}
                </span>
              </div>
              <p className="text-gray-200">{entry.message.text}</p>
            </div>
          ) : (
            <div key={entry.item.client_uuid} className="text-sm opacity-70">
              <div className="flex items-center gap-2">
                <span className="text-cyan-300 font-semibold">
                  {entry.item.sender_name || "Anonymous"}
                </span>
                <span className="px-2 py-0.5 bg-yellow-900/50 text-yellow-300 rounded-full text-xs flex items-center gap-1">
                  <Clock size={10} />
                  Pending sync
                </span>
              </div>
              <p className="text-gray-300">{entry.item.text}</p>
            </div>
          ),
        )}
      </div>

      {error && (
        <p className="text-red-300 bg-red-900/30 border border-red-700 rounded-lg p-3 text-sm mb-4">
          {error}
        </p>
      )}

      <form onSubmit={handleSend} className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={senderName}
          onChange={(e) => setSenderName(e.target.value)}
          placeholder="Your name (optional)"
          className="sm:w-40 bg-blue-950/60 border border-blue-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 text-sm"
        />
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={isOffline ? "Broadcast a message (queued offline)…" : "Broadcast a message…"}
          className="flex-1 bg-blue-950/60 border border-blue-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 text-sm"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-cyan-500 hover:to-blue-500 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <Send size={16} />
          {isOffline ? "Queue" : "Send"}
        </button>
      </form>
    </div>
  );
}

export default function MeshTab() {
  const [status, setStatus] = useState<MeshStatus | null>(null);
  const [nodes, setNodes] = useState<MeshNode[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [statusData, nodesData] = await Promise.all([
          getMeshStatus(),
          getMeshNodes(),
        ]);
        if (cancelled) return;
        setStatus(statusData);
        setNodes(nodesData);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load mesh data");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-blue-900/40 backdrop-blur-sm border border-blue-700 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Network className="text-cyan-400" size={32} />
          <h2 className="text-3xl font-bold text-white">Mesh Network</h2>
        </div>
        <p className="text-gray-300 mb-6">
          Offline peer-to-peer relay: when cell towers go down during a
          storm, phones keep queuing hazard reports and hand them off
          device-to-device until one reaches the internet and syncs here.
        </p>

        {error && (
          <p className="text-red-300 bg-red-900/30 border border-red-700 rounded-lg p-4 mb-4">
            {error}
          </p>
        )}
        {!error && loading && <p className="text-gray-400">Loading mesh data…</p>}

        {status && (
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-cyan-600 to-blue-600 rounded-xl p-6 text-white">
              <Wifi size={28} className="mb-2" />
              <p className="text-3xl font-bold">{status.active_nodes}</p>
              <p className="text-cyan-100 text-sm">
                Active Relay Nodes (24h)
              </p>
            </div>
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl p-6 text-white">
              <Network size={28} className="mb-2" />
              <p className="text-3xl font-bold">{status.total_nodes}</p>
              <p className="text-purple-100 text-sm">Known Relay Devices</p>
            </div>
            <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl p-6 text-white">
              <Radio size={28} className="mb-2" />
              <p className="text-3xl font-bold">{status.mesh_reports}</p>
              <p className="text-pink-100 text-sm">
                Reports via Mesh vs. {status.direct_reports} direct
              </p>
            </div>
            <div className="bg-gradient-to-br from-pink-600 to-red-600 rounded-xl p-6 text-white">
              <Shuffle size={28} className="mb-2" />
              <p className="text-3xl font-bold">
                {status.avg_hop_count.toFixed(1)}
              </p>
              <p className="text-red-100 text-sm">Avg. Relay Hop Count</p>
            </div>
          </div>
        )}

        <div className="bg-blue-950/60 border border-blue-700 rounded-lg overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-blue-900/60 text-gray-300 text-sm">
              <tr>
                <th className="px-4 py-3">Device</th>
                <th className="px-4 py-3">Last Seen</th>
                <th className="px-4 py-3">Reports Relayed</th>
                <th className="px-4 py-3">Trust Score</th>
              </tr>
            </thead>
            <tbody>
              {nodes.map((node) => (
                <tr
                  key={node.device_id}
                  className="border-t border-blue-800 text-white"
                >
                  <td className="px-4 py-3 font-mono text-sm">
                    {node.device_id}
                  </td>
                  <td className="px-4 py-3 text-gray-300 text-sm">
                    {formatRelativeTime(node.last_seen)}
                  </td>
                  <td className="px-4 py-3">{node.reports_relayed}</td>
                  <td className="px-4 py-3">{node.trust_score.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && nodes.length === 0 && !error && (
            <p className="text-gray-400 text-sm p-4">
              No relay devices have synced yet. Once a phone that relayed
              offline reports comes back online and calls the mesh sync
              endpoint, it'll show up here.
            </p>
          )}
        </div>
      </div>

      <MeshChatPanel />

      <div className="bg-blue-900/40 backdrop-blur-sm border border-blue-700 rounded-xl p-8">
        <h3 className="text-xl font-bold text-white mb-4">
          How the mesh protocol works
        </h3>
        <ul className="space-y-3 text-gray-300">
          <li className="flex items-start gap-2">
            <span className="text-cyan-400 mt-1">•</span>
            <span>
              A phone offline during a storm keeps queuing hazard reports
              locally instead of failing to submit.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-cyan-400 mt-1">•</span>
            <span>
              Nearby phones relay those reports device-to-device (radio
              transport is on-device, outside this backend) until one
              reaches connectivity.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-cyan-400 mt-1">•</span>
            <span>
              That device batch-syncs everything it's carrying. Each report
              carries a client-generated UUID, so re-syncing the same batch
              twice is a safe no-op — no duplicate reports.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-cyan-400 mt-1">•</span>
            <span>
              Trust score decays with hop count (0.85 per hop) since longer
              relay chains are more likely to be tampered with or garbled.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-cyan-400 mt-1">•</span>
            <span>
              The "Simulate Offline" toggle in the header demonstrates this
              exact sync protocol from your browser — it queues locally and
              syncs for real. A browser can't do actual phone-to-phone radio
              relay, though; that piece would live in a native mobile app.
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
