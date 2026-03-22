import { useState } from "react";
import { formatCoords, formatElapsed, formatTimestamp, isTelemetryStale } from "../lib/time";
import { Incident, IncidentStatus, StatusEvent, Unit } from "../types/cad";
import OperationsMap from "./OperationsMap";
import SectionCard from "./SectionCard";
import StatusBadge from "./StatusBadge";

interface DispatcherViewProps {
  incidents: Incident[];
  units: Unit[];
  statusEvents: StatusEvent[];
  onAssignUnit: (incidentId: string, unitId: string) => Promise<void>;
  onSetIncidentStatus: (incidentId: string, status: IncidentStatus) => Promise<void>;
}

const incidentWorkflow: IncidentStatus[] = [
  "Queued",
  "Dispatched",
  "On scene",
  "Transporting",
  "At hospital",
  "Closed"
];

export default function DispatcherView({
  incidents,
  units,
  statusEvents,
  onAssignUnit,
  onSetIncidentStatus
}: DispatcherViewProps) {
  const [selectedUnits, setSelectedUnits] = useState<Record<string, string>>({});
  const openIncidents = incidents.filter((incident) => incident.status !== "Closed");
  const availableUnits = units.filter(
    (unit) => unit.status === "Available" || unit.status === "Clearing"
  );

  return (
    <div className="dispatcher-grid">
      <SectionCard
        title="Dispatcher"
        subtitle="Live incident queue"
        actions={<span className="count-chip">{openIncidents.length} open jobs</span>}
      >
        <div className="stack-list">
          {openIncidents.length === 0 ? (
            <p className="empty-state">No open incidents in the queue.</p>
          ) : null}
          {openIncidents.map((incident) => (
            <article key={incident.id} className="incident-card">
              <div className="incident-header">
                <div>
                  <div className="incident-title-row">
                    <h3>{incident.determinantCode}</h3>
                    <StatusBadge label={incident.status} />
                    <StatusBadge label={incident.determinantLevel} />
                  </div>
                  <p className="supporting-text">
                    {incident.chiefComplaint} at {incident.address}, {incident.suburb}
                  </p>
                </div>
                <div className="incident-meta">
                  <span>Created {formatElapsed(incident.createdAt)}</span>
                  <span>{incident.createdBy}</span>
                </div>
              </div>

              <div className="incident-columns">
                <div>
                  <p className="field-label">Caller</p>
                  <p>
                    {incident.callerName} • {incident.callerPhone}
                  </p>
                </div>
                <div>
                  <p className="field-label">Patient</p>
                  <p>
                    {incident.patientName || "Unknown"} • {incident.patientAge || "Age unknown"}
                  </p>
                </div>
                <div>
                  <p className="field-label">Response</p>
                  <p>{incident.responseMode}</p>
                </div>
              </div>

              <p className="detail-copy">{incident.triageNotes}</p>
              {incident.hazards ? <p className="hazard-copy">Hazards: {incident.hazards}</p> : null}

              <div className="incident-footer">
                <div className="chip-row">
                  {incident.assignedUnitIds.length === 0 ? (
                    <span className="soft-chip">Awaiting assignment</span>
                  ) : (
                    incident.assignedUnitIds.map((unitId) => (
                      <span key={unitId} className="soft-chip">
                        {unitId}
                      </span>
                    ))
                  )}
                </div>

                <div className="action-row">
                  <select
                    value={selectedUnits[incident.id] ?? ""}
                    onChange={(event) =>
                      setSelectedUnits((current) => ({
                        ...current,
                        [incident.id]: event.target.value
                      }))
                    }
                  >
                    <option value="">Assign unit...</option>
                    {availableUnits.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.callsign} ({unit.crew})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!selectedUnits[incident.id]}
                    onClick={() => onAssignUnit(incident.id, selectedUnits[incident.id])}
                  >
                    Dispatch unit
                  </button>
                </div>
              </div>

              <div className="status-row">
                {incidentWorkflow.map((status) => (
                  <button
                    key={status}
                    type="button"
                    className={status === incident.status ? "secondary active-pill" : "secondary"}
                    onClick={() => onSetIncidentStatus(incident.id, status)}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      </SectionCard>

      <div className="stack-column">
        <OperationsMap incidents={incidents} units={units} />

        <SectionCard
          title="Units"
          subtitle="AVL and status board"
          actions={<span className="count-chip">{units.length} logged units</span>}
        >
          <div className="stack-list">
            {units.length === 0 ? <p className="empty-state">No units are logged on.</p> : null}
            {units.map((unit) => (
              <article key={unit.id} className="unit-card">
                <div className="unit-header">
                  <div>
                    <h3>{unit.callsign}</h3>
                    <p className="supporting-text">
                      {unit.crew || "Crew not entered"} • {unit.ipadLabel || "No iPad label"}
                    </p>
                  </div>
                  <StatusBadge label={unit.status} />
                </div>
                <div className="unit-grid">
                  <div>
                    <p className="field-label">Current job</p>
                    <p>{unit.activeIncidentId ?? "Unassigned"}</p>
                  </div>
                  <div>
                    <p className="field-label">Tracking</p>
                    <p>{unit.locationTrackingEnabled ? "Streaming" : "Paused"}</p>
                  </div>
                  <div>
                    <p className="field-label">Last telemetry</p>
                    <p className={isTelemetryStale(unit.lastUpdate) ? "stale-text" : ""}>
                      {formatElapsed(unit.lastUpdate)}
                    </p>
                  </div>
                </div>
                <p className="mono-text">{formatCoords(unit.lastLocation)}</p>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Activity"
          subtitle="Recent status and workflow events"
          actions={<span className="count-chip">{statusEvents.length}</span>}
        >
          <div className="timeline">
            {statusEvents.length === 0 ? (
              <p className="empty-state">No recent events.</p>
            ) : null}
            {statusEvents.slice(0, 10).map((event) => (
              <article key={event.id} className="timeline-item">
                <div className="timeline-marker" />
                <div>
                  <div className="timeline-heading">
                    <strong>{event.actor}</strong>
                    <span>{formatTimestamp(event.timestamp)}</span>
                  </div>
                  <p>
                    {event.unitId ? `${event.unitId}: ` : ""}
                    {event.fromState} to {event.toState}
                    {event.incidentId ? ` on ${event.incidentId}` : ""}
                  </p>
                  <p className="supporting-text">{event.note}</p>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
