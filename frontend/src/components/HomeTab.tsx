import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Bell,
  BadgeCheck,
  Globe,
  Radio,
  Shield,
  TrendingUp,
  Users,
} from "lucide-react";
import type { Tab } from "../App";
import { getStats, listReports, verifyReport } from "../api";
import type { Report, StatsOut } from "../types";
import { formatRelativeTime, hazardLabel, severityColorClasses } from "../lib/format";

const POLL_INTERVAL_MS = 15_000;

export default function HomeTab({
  onNavigate,
}: {
  onNavigate: (tab: Tab) => void;
}) {
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState<StatsOut | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState<number | null>(null);

  async function handleVerify(id: number) {
    setVerifyingId(id);
    try {
      const updated = await verifyReport(id);
      setReports((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch {
      // Best-effort — the report just stays unverified if this fails.
    } finally {
      setVerifyingId(null);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [reportsData, statsData] = await Promise.all([
          listReports({ limit: 5 }),
          getStats(),
        ]);
        if (cancelled) return;
        setReports(reportsData);
        setStats(statsData);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load data");
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

  const statTiles = [
    {
      icon: TrendingUp,
      value: stats?.total_reports ?? 0,
      label: "Reports Submitted",
      from: "from-cyan-600 to-blue-600",
    },
    {
      icon: AlertTriangle,
      value: stats?.by_severity.high ?? 0,
      label: "High Severity Alerts",
      from: "from-blue-600 to-purple-600",
    },
    {
      icon: Radio,
      value: stats?.by_source.mesh ?? 0,
      label: "Mesh-Relayed Reports",
      from: "from-purple-600 to-pink-600",
    },
    {
      icon: Globe,
      value: Object.keys(stats?.by_hazard_type ?? {}).length,
      label: "Hazard Types Tracked",
      from: "from-pink-600 to-red-600",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl p-8 md:p-12 text-white">
        <div className="flex items-center gap-3 mb-4">
          <Shield size={48} className="text-cyan-200" />
          <div>
            <h2 className="text-4xl font-bold mb-2">Wave-Link Platform</h2>
            <p className="text-xl text-cyan-100">
              Crowdsourced Ocean Hazard Reporting & Resilient Mesh Network
            </p>
          </div>
        </div>
        <p className="text-lg mb-6 text-cyan-50">
          A resilient disaster management system integrating citizen reports,
          AI-powered analysis, and offline peer-to-peer mesh relay to protect
          India's vast coastline — even when cell towers go down.
        </p>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => onNavigate("report")}
            className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-cyan-50 transition-all"
          >
            Report a Hazard
          </button>
          <button
            onClick={() => onNavigate("map")}
            className="bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-800 transition-all"
          >
            View Live Map
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-blue-900/40 backdrop-blur-sm border border-blue-700 rounded-xl p-6">
          <Users className="text-cyan-400 mb-4" size={40} />
          <h3 className="text-xl font-bold text-white mb-2">
            Crowdsourced Reports
          </h3>
          <p className="text-gray-300">
            Citizens and coastal communities report hazards in real-time
            through our mobile-friendly platform.
          </p>
        </div>
        <div className="bg-blue-900/40 backdrop-blur-sm border border-blue-700 rounded-xl p-6">
          <Radio className="text-cyan-400 mb-4" size={40} />
          <h3 className="text-xl font-bold text-white mb-2">
            Offline Mesh Relay
          </h3>
          <p className="text-gray-300">
            When towers go down, reports hop device-to-device until one
            reaches the internet, then sync with dedup and trust scoring.
          </p>
        </div>
        <div className="bg-blue-900/40 backdrop-blur-sm border border-blue-700 rounded-xl p-6">
          <Globe className="text-cyan-400 mb-4" size={40} />
          <h3 className="text-xl font-bold text-white mb-2">
            AI-Powered Severity
          </h3>
          <p className="text-gray-300">
            Every report is scored for sentiment, entities, and severity
            automatically as it's submitted.
          </p>
        </div>
      </div>

      <div className="bg-blue-900/40 backdrop-blur-sm border border-blue-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bell className="text-cyan-400" />
            Recent Hazard Reports
          </h3>
          <span className="text-sm text-gray-400">Live Updates</span>
        </div>

        {error && (
          <p className="text-red-300 bg-red-900/30 border border-red-700 rounded-lg p-4">
            {error}
          </p>
        )}
        {!error && loading && (
          <p className="text-gray-400">Loading reports…</p>
        )}
        {!error && !loading && reports.length === 0 && (
          <p className="text-gray-400">
            No hazard reports yet. Be the first to report one.
          </p>
        )}

        <div className="space-y-4">
          {reports.map((report) => {
            const colors = severityColorClasses(report.severity_label);
            return (
              <div
                key={report.id}
                className="bg-blue-950/60 border border-blue-800 rounded-lg p-4 flex items-start justify-between gap-4"
              >
                <div className="flex gap-4">
                  <AlertTriangle className={colors.text} size={24} />
                  <div>
                    <h4 className="text-white font-semibold">
                      {hazardLabel(report.hazard_type)}
                    </h4>
                    <p className="text-gray-400 text-sm line-clamp-1">
                      {report.text}
                    </p>
                    <p className="text-gray-500 text-xs mt-1">
                      {formatRelativeTime(report.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${colors.bg} ${colors.text}`}
                  >
                    {(report.severity_label ?? "unknown").toUpperCase()}
                  </span>
                  {report.source === "mesh" && (
                    <span className="px-3 py-1 bg-purple-900/50 text-purple-300 rounded-full text-xs font-semibold">
                      Mesh
                    </span>
                  )}
                  {report.verified ? (
                    <span className="px-3 py-1 bg-blue-900/50 text-blue-300 rounded-full text-xs font-semibold flex items-center gap-1">
                      <BadgeCheck size={14} />
                      Verified
                    </span>
                  ) : (
                    <button
                      onClick={() => handleVerify(report.id)}
                      disabled={verifyingId === report.id}
                      className="px-3 py-1 bg-blue-950/60 border border-blue-700 text-gray-300 hover:border-cyan-400 hover:text-white rounded-full text-xs font-semibold disabled:opacity-60"
                    >
                      {verifyingId === report.id ? "Verifying…" : "Mark Verified"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        {statTiles.map((tile) => (
          <div
            key={tile.label}
            className={`bg-gradient-to-br ${tile.from} rounded-xl p-6 text-white`}
          >
            <tile.icon size={32} className="mb-2" />
            <p className="text-3xl font-bold">{tile.value}</p>
            <p className="text-cyan-100">{tile.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
