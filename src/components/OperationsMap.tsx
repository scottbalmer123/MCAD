import { Incident, Unit } from "../types/cad";
import SectionCard from "./SectionCard";

interface OperationsMapProps {
  incidents: Incident[];
  units: Unit[];
}

function projectCoordinate(
  latitude: number,
  longitude: number,
  bounds: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  }
) {
  const latSpan = Math.max(bounds.maxLat - bounds.minLat, 0.01);
  const lonSpan = Math.max(bounds.maxLon - bounds.minLon, 0.01);

  return {
    x: ((longitude - bounds.minLon) / lonSpan) * 100,
    y: ((bounds.maxLat - latitude) / latSpan) * 100
  };
}

export default function OperationsMap({ incidents, units }: OperationsMapProps) {
  const incidentPoints = incidents
    .filter((incident) => incident.status !== "Closed" && incident.location)
    .map((incident) => ({
      id: incident.id,
      label: incident.determinantCode,
      latitude: incident.location!.latitude,
      longitude: incident.location!.longitude
    }));

  const unitPoints = units
    .filter((unit) => unit.lastLocation)
    .map((unit) => ({
      id: unit.id,
      label: unit.callsign,
      latitude: unit.lastLocation!.latitude,
      longitude: unit.lastLocation!.longitude
    }));

  const allPoints = [...incidentPoints, ...unitPoints];

  if (allPoints.length === 0) {
    return (
      <SectionCard title="Operations Map" subtitle="Live position overview">
        <p className="empty-state">
          No incident coordinates or unit GPS fixes are available yet.
        </p>
      </SectionCard>
    );
  }

  const bounds = allPoints.reduce(
    (current, point) => ({
      minLat: Math.min(current.minLat, point.latitude),
      maxLat: Math.max(current.maxLat, point.latitude),
      minLon: Math.min(current.minLon, point.longitude),
      maxLon: Math.max(current.maxLon, point.longitude)
    }),
    {
      minLat: allPoints[0].latitude,
      maxLat: allPoints[0].latitude,
      minLon: allPoints[0].longitude,
      maxLon: allPoints[0].longitude
    }
  );

  return (
    <SectionCard title="Operations Map" subtitle="Live position overview">
      <div className="map-surface">
        <div className="map-grid" />
        {incidentPoints.map((point) => {
          const projection = projectCoordinate(point.latitude, point.longitude, bounds);
          return (
            <div
              key={point.id}
              className="map-marker incident-marker"
              style={{ left: `${projection.x}%`, top: `${projection.y}%` }}
            >
              <span />
              <span className="marker-label">{point.label}</span>
            </div>
          );
        })}
        {unitPoints.map((point) => {
          const projection = projectCoordinate(point.latitude, point.longitude, bounds);
          return (
            <div
              key={point.id}
              className="map-marker unit-marker"
              style={{ left: `${projection.x}%`, top: `${projection.y}%` }}
            >
              <span />
              <span className="marker-label">{point.label}</span>
            </div>
          );
        })}
      </div>
      <div className="map-legend">
        <span className="legend-item">
          <i className="legend-dot legend-unit" />
          Unit GPS
        </span>
        <span className="legend-item">
          <i className="legend-dot legend-incident" />
          Incident address
        </span>
      </div>
    </SectionCard>
  );
}
