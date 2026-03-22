import { useEffect, useState } from "react";
import { formatCoords, formatElapsed } from "../lib/time";
import { Incident, Unit, UnitSessionDraft, UnitStatus } from "../types/cad";
import SectionCard from "./SectionCard";
import StatusBadge from "./StatusBadge";

interface UnitConsoleProps {
  units: Unit[];
  incidents: Incident[];
  operatorName: string;
  lockedCallsign?: string | null;
  onUpsertUnitSession: (draft: UnitSessionDraft) => Promise<Unit>;
  onUpdateUnitStatus: (unitId: string, nextStatus: UnitStatus) => Promise<void>;
  onUpdateUnitTelemetry: (
    unitId: string,
    patch: { lastLocation?: Unit["lastLocation"]; locationTrackingEnabled?: boolean }
  ) => Promise<void>;
}

const unitStatusOptions: UnitStatus[] = [
  "Available",
  "En route",
  "On scene",
  "Transporting",
  "At hospital",
  "Clearing",
  "Out of service"
];

const storageKey = "medical-cad-unit-session";

export default function UnitConsole({
  units,
  incidents,
  operatorName,
  lockedCallsign,
  onUpsertUnitSession,
  onUpdateUnitStatus,
  onUpdateUnitTelemetry
}: UnitConsoleProps) {
  const [sessionUnitId, setSessionUnitId] = useState<string | null>(null);
  const [loginDraft, setLoginDraft] = useState<UnitSessionDraft>({
    callsign: "",
    crew: "",
    ipadLabel: ""
  });
  const [watchId, setWatchId] = useState<number | null>(null);
  const [geoMessage, setGeoMessage] = useState<string | null>(null);
  const unit = units.find((entry) => entry.id === sessionUnitId);
  const activeIncident = incidents.find((incident) => incident.id === unit?.activeIncidentId);

  useEffect(() => {
    if (lockedCallsign) {
      setSessionUnitId(lockedCallsign);
      return;
    }

    const savedSession = window.localStorage.getItem(storageKey);

    if (savedSession) {
      setSessionUnitId(savedSession);
    }
  }, [lockedCallsign]);

  useEffect(() => {
    if (lockedCallsign) {
      setLoginDraft((current) => ({
        ...current,
        callsign: lockedCallsign
      }));
    }
  }, [lockedCallsign]);

  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  async function handleLogin() {
    if (!loginDraft.callsign.trim()) {
      setGeoMessage("A callsign is required to log onto the iPad.");
      return;
    }

    const nextUnit = await onUpsertUnitSession(loginDraft);
    window.localStorage.setItem(storageKey, nextUnit.id);
    setSessionUnitId(nextUnit.id);
    setGeoMessage("Unit logged on. Dispatcher board will now receive status changes.");
  }

  async function startTracking() {
    if (!unit) {
      return;
    }

    if (!("geolocation" in navigator)) {
      setGeoMessage("Geolocation is not available on this iPad/browser.");
      return;
    }

    await onUpdateUnitTelemetry(unit.id, { locationTrackingEnabled: true });
    setGeoMessage("Requesting live GPS permission...");

    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
    }

    const nextWatchId = navigator.geolocation.watchPosition(
      async (position) => {
        setGeoMessage("Live location streaming to dispatcher view.");
        await onUpdateUnitTelemetry(unit.id, {
          locationTrackingEnabled: true,
          lastLocation: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          }
        });
      },
      async (error) => {
        setGeoMessage(error.message);
        setWatchId(null);
        await onUpdateUnitTelemetry(unit.id, { locationTrackingEnabled: false });
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10_000,
        timeout: 15_000
      }
    );

    setWatchId(nextWatchId);
  }

  async function stopTracking() {
    if (!unit) {
      return;
    }

    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }

    await onUpdateUnitTelemetry(unit.id, { locationTrackingEnabled: false });
    setGeoMessage("Location tracking paused.");
  }

  async function logOff() {
    if (!unit) {
      return;
    }

    await stopTracking();
    await onUpdateUnitStatus(unit.id, "Logged off");
    window.localStorage.removeItem(storageKey);
    setSessionUnitId(null);
    setLoginDraft({
      callsign: lockedCallsign ?? "",
      crew: "",
      ipadLabel: ""
    });
    setGeoMessage("Unit logged off from this iPad.");
  }

  if (!unit) {
    return (
      <div className="single-column">
        <SectionCard title="Unit Login" subtitle="Crew sign-on for iPad devices">
          <div className="form-grid compact-grid">
            <div className="auth-context">
              <p className="field-label">Signed in operator</p>
              <p>{operatorName}</p>
            </div>
            <label>
              <span>Callsign</span>
              <input
                value={loginDraft.callsign}
                disabled={Boolean(lockedCallsign)}
                onChange={(event) =>
                  setLoginDraft((current) => ({ ...current, callsign: event.target.value }))
                }
                placeholder="MICA401"
              />
            </label>
            <label>
              <span>Crew</span>
              <input
                value={loginDraft.crew}
                onChange={(event) =>
                  setLoginDraft((current) => ({ ...current, crew: event.target.value }))
                }
                placeholder="Crew names"
              />
            </label>
            <label>
              <span>iPad label</span>
              <input
                value={loginDraft.ipadLabel}
                onChange={(event) =>
                  setLoginDraft((current) => ({ ...current, ipadLabel: event.target.value }))
                }
                placeholder="North iPad 1"
              />
            </label>
            <div className="form-footer">
              <button type="button" onClick={handleLogin}>
                Log onto iPad
              </button>
              {geoMessage ? <p className="inline-message">{geoMessage}</p> : null}
            </div>
          </div>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="view-grid">
      <SectionCard
        title="Unit Console"
        subtitle={`${unit.callsign} crew workflow`}
        actions={<StatusBadge label={unit.status} />}
      >
        <div className="unit-console">
          <div className="console-summary">
            <div>
              <p className="field-label">Authenticated user</p>
              <p>{operatorName}</p>
            </div>
            <div>
              <p className="field-label">Crew</p>
              <p>{unit.crew || "Crew not set"}</p>
            </div>
            <div>
              <p className="field-label">iPad</p>
              <p>{unit.ipadLabel || "No device label"}</p>
            </div>
            <div>
              <p className="field-label">Last update</p>
              <p>{formatElapsed(unit.lastUpdate)}</p>
            </div>
          </div>

          <div className="assignment-card">
            <div>
              <p className="field-label">Active incident</p>
              <h3>{activeIncident ? activeIncident.id : "No active assignment"}</h3>
            </div>
            <div>
              <p className="supporting-text">
                {activeIncident
                  ? `${activeIncident.determinantCode} • ${activeIncident.address}, ${activeIncident.suburb}`
                  : "Dispatcher assignment will appear here as soon as the unit is attached to a job."}
              </p>
            </div>
          </div>

          <div className="status-row">
            {unitStatusOptions.map((status) => (
              <button
                key={status}
                type="button"
                className={status === unit.status ? "secondary active-pill" : "secondary"}
                onClick={() => onUpdateUnitStatus(unit.id, status)}
              >
                {status}
              </button>
            ))}
          </div>

          <div className="telemetry-card">
            <div>
              <p className="field-label">GPS telemetry</p>
              <p className="mono-text">{formatCoords(unit.lastLocation)}</p>
            </div>
            <div className="action-row">
              <button type="button" onClick={startTracking}>
                Start tracking
              </button>
              <button type="button" className="secondary" onClick={stopTracking}>
                Stop tracking
              </button>
              <button type="button" className="danger" onClick={logOff}>
                Log off
              </button>
            </div>
          </div>
          {geoMessage ? <p className="inline-message">{geoMessage}</p> : null}
        </div>
      </SectionCard>

      <SectionCard title="Crew Context" subtitle="What the unit can see">
        {activeIncident ? (
          <div className="protocol-card">
            <StatusBadge label={activeIncident.determinantLevel} />
            <p className="supporting-text">{activeIncident.responseMode}</p>
            <p className="detail-copy">{activeIncident.triageNotes}</p>
            {activeIncident.hazards ? (
              <p className="hazard-copy">Hazards: {activeIncident.hazards}</p>
            ) : null}
          </div>
        ) : (
          <p className="empty-state">
            No live incident is assigned. Stay logged on and the dispatcher board will push the next
            job to this console.
          </p>
        )}
      </SectionCard>
    </div>
  );
}
