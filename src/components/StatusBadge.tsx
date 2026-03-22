interface StatusBadgeProps {
  label: string;
}

function getTone(label: string) {
  const normalized = label.toLowerCase();

  if (
    normalized.includes("echo") ||
    normalized.includes("delta") ||
    normalized.includes("transport") ||
    normalized.includes("on scene")
  ) {
    return "alert";
  }

  if (
    normalized.includes("available") ||
    normalized.includes("alpha") ||
    normalized.includes("closed")
  ) {
    return "ok";
  }

  if (
    normalized.includes("charlie") ||
    normalized.includes("bravo") ||
    normalized.includes("dispatched") ||
    normalized.includes("queued") ||
    normalized.includes("en route")
  ) {
    return "warn";
  }

  return "muted";
}

export default function StatusBadge({ label }: StatusBadgeProps) {
  return <span className={`status-badge tone-${getTone(label)}`}>{label}</span>;
}
