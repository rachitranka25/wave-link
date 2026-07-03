export function severityColorClasses(severity: string | null): {
  text: string;
  bg: string;
  dot: string;
} {
  switch (severity) {
    case "high":
      return { text: "text-red-300", bg: "bg-red-900/50", dot: "bg-red-500" };
    case "medium":
      return {
        text: "text-yellow-300",
        bg: "bg-yellow-900/50",
        dot: "bg-yellow-500",
      };
    case "low":
      return {
        text: "text-green-300",
        bg: "bg-green-900/50",
        dot: "bg-green-500",
      };
    default:
      return {
        text: "text-gray-300",
        bg: "bg-gray-800/50",
        dot: "bg-gray-500",
      };
  }
}

export function severityMarkerColor(severity: string | null): string {
  switch (severity) {
    case "high":
      return "#f87171";
    case "medium":
      return "#facc15";
    case "low":
      return "#4ade80";
    default:
      return "#9ca3af";
  }
}

export function formatRelativeTime(isoDate: string): string {
  const date = new Date(
    isoDate.endsWith("Z") ? isoDate : `${isoDate}Z`,
  );
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.round(diffMs / 60000);

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

export function hazardLabel(hazardType: string | null): string {
  if (!hazardType) return "Unclassified";
  return hazardType
    .split("-")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}
