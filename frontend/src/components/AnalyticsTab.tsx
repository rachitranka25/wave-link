import { useEffect, useState } from "react";
import { BarChart3, Info } from "lucide-react";
import { getStats } from "../api";
import type { StatsOut } from "../types";
import { hazardLabel } from "../lib/format";

function BreakdownBars({
  data,
  labelFor = (key: string) => key,
  barColorClass = "bg-cyan-500",
}: {
  data: Record<string, number>;
  labelFor?: (key: string) => string;
  barColorClass?: string;
}) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map(([, count]) => count));

  if (entries.length === 0) {
    return <p className="text-gray-400 text-sm">No data yet.</p>;
  }

  return (
    <div className="space-y-3">
      {entries.map(([key, count]) => (
        <div key={key}>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-300">{labelFor(key)}</span>
            <span className="text-cyan-400 font-semibold">{count}</span>
          </div>
          <div className="h-2 bg-blue-950/60 rounded-full overflow-hidden">
            <div
              className={`h-full ${barColorClass} rounded-full`}
              style={{ width: `${(count / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsTab() {
  const [stats, setStats] = useState<StatsOut | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getStats()
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load stats");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-blue-900/40 backdrop-blur-sm border border-blue-700 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <BarChart3 className="text-cyan-400" size={32} />
          <h2 className="text-3xl font-bold text-white">
            Hazard Analytics Dashboard
          </h2>
        </div>
        <p className="text-gray-300 mb-6">
          Live breakdown of every report the platform has analyzed
        </p>

        {error && (
          <p className="text-red-300 bg-red-900/30 border border-red-700 rounded-lg p-4 mb-4">
            {error}
          </p>
        )}

        {stats && (
          <>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-blue-950/60 border border-blue-700 rounded-lg p-6">
                <h3 className="text-white font-bold text-lg mb-4">
                  Reports by Severity
                </h3>
                <BreakdownBars
                  data={stats.by_severity}
                  labelFor={(k) => k[0].toUpperCase() + k.slice(1)}
                  barColorClass="bg-red-500"
                />
              </div>

              <div className="bg-blue-950/60 border border-blue-700 rounded-lg p-6">
                <h3 className="text-white font-bold text-lg mb-4">
                  Reports by Source
                </h3>
                <BreakdownBars
                  data={stats.by_source}
                  labelFor={(k) =>
                    k === "mesh"
                      ? "Mesh Relay"
                      : k[0].toUpperCase() + k.slice(1)
                  }
                  barColorClass="bg-purple-500"
                />
              </div>
            </div>

            <div className="mt-6 bg-blue-950/60 border border-blue-700 rounded-lg p-6">
              <h3 className="text-white font-bold text-lg mb-4">
                Reports by Hazard Type
              </h3>
              <BreakdownBars
                data={stats.by_hazard_type}
                labelFor={hazardLabel}
                barColorClass="bg-cyan-500"
              />
            </div>

            <div className="mt-6 flex items-center gap-2 text-sm text-cyan-300 bg-cyan-900/20 border border-cyan-800 rounded-lg p-4">
              <Info size={16} className="shrink-0" />
              <span>
                Total reports analyzed: <strong>{stats.total_reports}</strong>.
                Social media monitoring (Twitter/Instagram/Facebook) is on
                the roadmap but not wired into this dashboard yet — every
                number above reflects real submitted reports only.
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
