import { describe, expect, it } from "vitest";
import {
  formatRelativeTime,
  hazardLabel,
  severityColorClasses,
  severityMarkerColor,
} from "./format";

describe("severityColorClasses", () => {
  it("returns red tones for high severity", () => {
    expect(severityColorClasses("high").text).toBe("text-red-300");
  });

  it("returns yellow tones for medium severity", () => {
    expect(severityColorClasses("medium").text).toBe("text-yellow-300");
  });

  it("returns green tones for low severity", () => {
    expect(severityColorClasses("low").text).toBe("text-green-300");
  });

  it("falls back to gray for unknown/null severity", () => {
    expect(severityColorClasses(null).text).toBe("text-gray-300");
    expect(severityColorClasses("unexpected").text).toBe("text-gray-300");
  });
});

describe("severityMarkerColor", () => {
  it("maps each severity to a distinct hex color", () => {
    const colors = [
      severityMarkerColor("high"),
      severityMarkerColor("medium"),
      severityMarkerColor("low"),
      severityMarkerColor(null),
    ];
    expect(new Set(colors).size).toBe(4);
  });
});

describe("formatRelativeTime", () => {
  it("says 'just now' for a timestamp seconds ago", () => {
    const now = new Date().toISOString().replace("Z", "");
    expect(formatRelativeTime(now)).toBe("just now");
  });

  it("formats minutes ago", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString().replace("Z", "");
    expect(formatRelativeTime(fiveMinAgo)).toBe("5 min ago");
  });

  it("formats hours ago with correct pluralization", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 3_600_000).toISOString().replace("Z", "");
    expect(formatRelativeTime(twoHoursAgo)).toBe("2 hours ago");

    const oneHourAgo = new Date(Date.now() - 1 * 3_600_000).toISOString().replace("Z", "");
    expect(formatRelativeTime(oneHourAgo)).toBe("1 hour ago");
  });

  it("formats days ago", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000).toISOString().replace("Z", "");
    expect(formatRelativeTime(threeDaysAgo)).toBe("3 days ago");
  });
});

describe("hazardLabel", () => {
  it("title-cases hyphenated hazard types", () => {
    expect(hazardLabel("storm-surge")).toBe("Storm Surge");
    expect(hazardLabel("high-waves")).toBe("High Waves");
    expect(hazardLabel("tsunami")).toBe("Tsunami");
  });

  it("returns a fallback label for null", () => {
    expect(hazardLabel(null)).toBe("Unclassified");
  });
});
