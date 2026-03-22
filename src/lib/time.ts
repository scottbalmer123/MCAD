import { GeoPosition } from "../types/cad";

export function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function formatElapsed(value: string) {
  const diffMs = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(diffMs / 60_000);

  if (minutes <= 0) {
    return "just now";
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function formatCoords(location?: GeoPosition) {
  if (!location) {
    return "No GPS fix";
  }

  return `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`;
}

export function isTelemetryStale(value: string, thresholdMinutes = 5) {
  return Date.now() - new Date(value).getTime() > thresholdMinutes * 60_000;
}
