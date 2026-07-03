import { useState } from "react";
import type { FormEvent } from "react";
import { AlertTriangle, Clock, CheckCircle2, Send } from "lucide-react";
import { createReport, ApiError } from "../api";
import type { Report } from "../types";
import { HAZARD_TYPES } from "../types";
import { severityColorClasses } from "../lib/format";
import { useOffline } from "../context/OfflineContext";

type SubmitResult = { kind: "synced"; report: Report } | { kind: "queued" };

function getGeolocation(): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position),
      () => resolve(null),
      { timeout: 5000 },
    );
  });
}

export default function ReportTab() {
  const { isOffline, enqueueReport } = useOffline();
  const [hazardType, setHazardType] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const position = await getGeolocation();
      const text = `${location}: ${description}`;

      if (isOffline) {
        enqueueReport({
          text,
          hazard_type: hazardType,
          latitude: position?.coords.latitude,
          longitude: position?.coords.longitude,
        });
        setResult({ kind: "queued" });
      } else {
        const report = await createReport({
          text,
          hazard_type: hazardType,
          latitude: position?.coords.latitude,
          longitude: position?.coords.longitude,
        });
        setResult({ kind: "synced", report });
      }
      setHazardType("");
      setLocation("");
      setDescription("");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Something went wrong submitting your report. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (result?.kind === "queued") {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-blue-900/40 backdrop-blur-sm border border-blue-700 rounded-xl p-8 text-center">
          <Clock className="text-yellow-400 mx-auto mb-4" size={56} />
          <h2 className="text-3xl font-bold text-white mb-2">
            Saved on This Device
          </h2>
          <p className="text-gray-300 mb-6">
            You're in simulated-offline mode, so this report is queued
            locally instead of being sent — just like a phone with no signal.
            Severity won't be assessed until it syncs, since that analysis
            happens on the server. Toggle back online and hit{" "}
            <strong>Sync Now</strong> in the header to send it through the
            mesh sync protocol.
          </p>

          <button
            onClick={() => setResult(null)}
            className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-cyan-500 hover:to-blue-500 transition-all"
          >
            Report Another Hazard
          </button>
        </div>
      </div>
    );
  }

  if (result?.kind === "synced") {
    const colors = severityColorClasses(result.report.severity_label);
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-blue-900/40 backdrop-blur-sm border border-blue-700 rounded-xl p-8 text-center">
          <CheckCircle2 className="text-green-400 mx-auto mb-4" size={56} />
          <h2 className="text-3xl font-bold text-white mb-2">
            Report Submitted
          </h2>
          <p className="text-gray-300 mb-6">
            Thank you — our AI has analyzed your report and it's now live on
            the platform.
          </p>

          <div className="bg-blue-950/60 border border-blue-800 rounded-lg p-6 text-left space-y-3 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">AI-Assessed Severity</span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${colors.bg} ${colors.text}`}
              >
                {(result.report.severity_label ?? "unknown").toUpperCase()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Detected Sentiment</span>
              <span className="text-white">{result.report.sentiment_label}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Report ID</span>
              <span className="text-white font-mono text-sm">
                #{result.report.id}
              </span>
            </div>
          </div>

          <button
            onClick={() => setResult(null)}
            className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-cyan-500 hover:to-blue-500 transition-all"
          >
            Submit Another Report
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-blue-900/40 backdrop-blur-sm border border-blue-700 rounded-xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <AlertTriangle className="text-yellow-400" size={40} />
          <div>
            <h2 className="text-3xl font-bold text-white">
              Report Ocean Hazard
            </h2>
            <p className="text-gray-300">
              Help protect our coastal communities by reporting hazards
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-white font-semibold mb-2">
              Hazard Type
            </label>
            <select
              value={hazardType}
              onChange={(e) => setHazardType(e.target.value)}
              className="w-full bg-blue-950/60 border border-blue-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-400"
              required
            >
              <option value="">Select hazard type</option>
              {HAZARD_TYPES.map((h) => (
                <option key={h.value} value={h.value}>
                  {h.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-white font-semibold mb-2">
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Mumbai Coast, Marina Beach Chennai"
              className="w-full bg-blue-950/60 border border-blue-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
              required
            />
            <p className="text-gray-500 text-xs mt-2">
              We'll also try to attach your device's GPS location, if you
              allow it.
            </p>
          </div>

          <div>
            <label className="block text-white font-semibold mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what you observed..."
              rows={4}
              className="w-full bg-blue-950/60 border border-blue-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
              required
            />
          </div>

          {error && (
            <p className="text-red-300 bg-red-900/30 border border-red-700 rounded-lg p-4">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white py-4 rounded-lg font-bold text-lg hover:from-cyan-500 hover:to-blue-500 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Send size={20} />
            {submitting
              ? isOffline
                ? "Saving locally…"
                : "Analyzing & Submitting…"
              : isOffline
                ? "Queue Report (Offline)"
                : "Submit Report"}
          </button>
        </form>

        <div className="mt-6 p-4 bg-cyan-900/30 border border-cyan-700 rounded-lg">
          <p className="text-cyan-200 text-sm">
            {isOffline ? (
              <>
                <strong>Simulated offline:</strong> this report will be
                queued on this device and only reaches the platform (and
                gets AI-analyzed) once you go back online and sync — same as
                a real phone with no signal.
              </>
            ) : (
              <>
                <strong>Note:</strong> Your report is analyzed by our AI
                (sentiment + entity + severity detection) the moment you
                submit it, and cross-referenced with other reports to help
                authorities prioritize response.
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
