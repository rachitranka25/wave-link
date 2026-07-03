import { useEffect, useMemo, useState } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import { Map as MapIcon } from "lucide-react";
import { listReports } from "../api";
import type { Report } from "../types";
import { formatRelativeTime, hazardLabel, severityMarkerColor } from "../lib/format";

const INDIA_COASTLINE_CENTER: [number, number] = [15.9129, 79.74];
const POLL_INTERVAL_MS = 15_000;

export default function MapTab() {
  const [reports, setReports] = useState<Report[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await listReports({ limit: 200 });
        if (!cancelled) {
          setReports(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load reports");
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

  const geolocated = useMemo(
    () => reports.filter((r) => r.latitude != null && r.longitude != null),
    [reports],
  );

  const severityCounts = useMemo(() => {
    const counts = { high: 0, medium: 0, low: 0 };
    for (const report of geolocated) {
      if (report.severity_label === "high") counts.high += 1;
      else if (report.severity_label === "medium") counts.medium += 1;
      else if (report.severity_label === "low") counts.low += 1;
    }
    return counts;
  }, [geolocated]);

  return (
    <div className="space-y-6">
      <div className="bg-blue-900/40 backdrop-blur-sm border border-blue-700 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <MapIcon className="text-cyan-400" size={32} />
          <h2 className="text-3xl font-bold text-white">Live Hazard Map</h2>
        </div>
        <p className="text-gray-300 mb-6">
          Real-time visualization of ocean hazards across India's coastline
        </p>

        {error && (
          <p className="text-red-300 bg-red-900/30 border border-red-700 rounded-lg p-4 mb-4">
            {error}
          </p>
        )}

        <div className="rounded-lg overflow-hidden border border-blue-700 h-96">
          <MapContainer
            center={INDIA_COASTLINE_CENTER}
            zoom={5}
            scrollWheelZoom
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {geolocated.map((report) => (
              <CircleMarker
                key={report.id}
                center={[report.latitude as number, report.longitude as number]}
                radius={9}
                pathOptions={{
                  color: severityMarkerColor(report.severity_label),
                  fillColor: severityMarkerColor(report.severity_label),
                  fillOpacity: 0.8,
                }}
              >
                <Popup>
                  <div className="space-y-1">
                    <p className="font-semibold">
                      {hazardLabel(report.hazard_type)}
                    </p>
                    <p className="text-sm">{report.text}</p>
                    <p className="text-xs text-gray-500">
                      {formatRelativeTime(report.created_at)} · severity:{" "}
                      {report.severity_label ?? "unknown"}
                      {report.source === "mesh" ? " · via mesh" : ""}
                    </p>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>

        {!loading && geolocated.length === 0 && !error && (
          <p className="text-gray-400 text-sm mt-4">
            No geolocated reports yet — reports without GPS coordinates
            won't appear on the map.
          </p>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-red-900/40 border border-red-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-red-300 font-semibold">High Severity</span>
            <span className="text-red-300 text-2xl font-bold">
              {severityCounts.high}
            </span>
          </div>
          <div className="h-2 bg-red-600 rounded-full"></div>
        </div>
        <div className="bg-yellow-900/40 border border-yellow-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-yellow-300 font-semibold">
              Medium Severity
            </span>
            <span className="text-yellow-300 text-2xl font-bold">
              {severityCounts.medium}
            </span>
          </div>
          <div className="h-2 bg-yellow-600 rounded-full"></div>
        </div>
        <div className="bg-green-900/40 border border-green-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-green-300 font-semibold">
              Low Severity
            </span>
            <span className="text-green-300 text-2xl font-bold">
              {severityCounts.low}
            </span>
          </div>
          <div className="h-2 bg-green-600 rounded-full"></div>
        </div>
      </div>
    </div>
  );
}
