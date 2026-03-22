import { useEffect, useState } from "react";
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc
} from "firebase/firestore";
import { demoIncidents, demoStatusEvents, demoUnits } from "../data/demoData";
import { protocols } from "../data/protocols";
import { db, isFirebaseConfigured } from "../lib/firebase";
import {
  CallTakingDraft,
  GeoPosition,
  Incident,
  IncidentStatus,
  StatusEvent,
  Unit,
  UnitSessionDraft,
  UserProfile,
  UnitStatus
} from "../types/cad";

function toIso(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object" && "toDate" in value) {
    const maybeTimestamp = value as { toDate?: () => Date };

    if (typeof maybeTimestamp.toDate === "function") {
      return maybeTimestamp.toDate().toISOString();
    }
  }

  return new Date().toISOString();
}

function toLocation(value: unknown) {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const source = value as Record<string, unknown>;
  const latitude = Number(source.latitude);
  const longitude = Number(source.longitude);

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return undefined;
  }

  return {
    latitude,
    longitude,
    accuracy: typeof source.accuracy === "number" ? source.accuracy : undefined
  };
}

function mapIncident(id: string, raw: Record<string, unknown>): Incident {
  return {
    id,
    callerName: String(raw.callerName ?? ""),
    callerPhone: String(raw.callerPhone ?? ""),
    patientName: String(raw.patientName ?? ""),
    patientAge: String(raw.patientAge ?? ""),
    address: String(raw.address ?? ""),
    suburb: String(raw.suburb ?? ""),
    chiefComplaint: String(raw.chiefComplaint ?? ""),
    protocolId: String(raw.protocolId ?? ""),
    determinantCode: String(raw.determinantCode ?? ""),
    determinantLevel: String(raw.determinantLevel ?? "Alpha") as Incident["determinantLevel"],
    responseMode: String(raw.responseMode ?? ""),
    triageNotes: String(raw.triageNotes ?? ""),
    hazards: String(raw.hazards ?? ""),
    callbackConfirmed: Boolean(raw.callbackConfirmed),
    location: toLocation(raw.location),
    status: String(raw.status ?? "Queued") as IncidentStatus,
    assignedUnitIds: Array.isArray(raw.assignedUnitIds)
      ? raw.assignedUnitIds.map((value) => String(value))
      : [],
    createdAt: toIso(raw.createdAt),
    updatedAt: toIso(raw.updatedAt),
    createdBy: String(raw.createdBy ?? "Unknown")
  };
}

function mapUnit(id: string, raw: Record<string, unknown>): Unit {
  return {
    id,
    callsign: String(raw.callsign ?? id),
    crew: String(raw.crew ?? ""),
    ipadLabel: String(raw.ipadLabel ?? ""),
    status: String(raw.status ?? "Logged off") as UnitStatus,
    lastLocation: toLocation(raw.lastLocation),
    lastUpdate: toIso(raw.lastUpdate),
    activeIncidentId:
      raw.activeIncidentId === null || raw.activeIncidentId === undefined
        ? null
        : String(raw.activeIncidentId),
    locationTrackingEnabled: Boolean(raw.locationTrackingEnabled)
  };
}

function mapStatusEvent(id: string, raw: Record<string, unknown>): StatusEvent {
  return {
    id,
    unitId:
      raw.unitId === null || raw.unitId === undefined ? null : String(raw.unitId),
    incidentId:
      raw.incidentId === null || raw.incidentId === undefined
        ? null
        : String(raw.incidentId),
    fromState: String(raw.fromState ?? ""),
    toState: String(raw.toState ?? ""),
    actor: String(raw.actor ?? "System"),
    note: String(raw.note ?? ""),
    timestamp: toIso(raw.timestamp)
  };
}

function parseCoordinate(value?: string) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function assertRole(
  session: UserProfile | null,
  allowedRoles: UserProfile["role"][],
  action: string
) {
  if (!isFirebaseConfigured) {
    return;
  }

  if (!session || !allowedRoles.includes(session.role)) {
    throw new Error(`You do not have permission to ${action}.`);
  }
}

function getActorName(session: UserProfile | null, fallback: string) {
  return session?.displayName || fallback;
}

export function useCadData(session: UserProfile | null) {
  const [incidents, setIncidents] = useState<Incident[]>(
    isFirebaseConfigured ? [] : demoIncidents
  );
  const [units, setUnits] = useState<Unit[]>(isFirebaseConfigured ? [] : demoUnits);
  const [statusEvents, setStatusEvents] = useState<StatusEvent[]>(
    isFirebaseConfigured ? [] : demoStatusEvents
  );
  const [loading, setLoading] = useState(isFirebaseConfigured);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!db || !isFirebaseConfigured) {
      setLoading(false);
      return;
    }

    if (!session) {
      setIncidents([]);
      setUnits([]);
      setStatusEvents([]);
      setLoading(false);
      return;
    }

    let mounted = true;
    const unsubscribers: Array<() => void> = [];

    setError(null);
    setLoading(true);

    unsubscribers.push(
      onSnapshot(
        query(collection(db, "incidents"), orderBy("createdAt", "desc")),
        (snapshot) => {
          setIncidents(
            snapshot.docs.map((document) =>
              mapIncident(document.id, document.data() as Record<string, unknown>)
            )
          );
          if (mounted) {
            setLoading(false);
          }
        },
        (snapshotError) => {
          setError(snapshotError.message);
          setLoading(false);
        }
      )
    );

    unsubscribers.push(
      onSnapshot(
        query(collection(db, "units"), orderBy("lastUpdate", "desc")),
        (snapshot) => {
          setUnits(
            snapshot.docs.map((document) =>
              mapUnit(document.id, document.data() as Record<string, unknown>)
            )
          );
        },
        (snapshotError) => setError(snapshotError.message)
      )
    );

    unsubscribers.push(
      onSnapshot(
        query(collection(db, "statusEvents"), orderBy("timestamp", "desc")),
        (snapshot) => {
          setStatusEvents(
            snapshot.docs.map((document) =>
              mapStatusEvent(document.id, document.data() as Record<string, unknown>)
            )
          );
        },
        (snapshotError) => setError(snapshotError.message)
      )
    );

    return () => {
      mounted = false;
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [session]);

  async function createIncident(draft: CallTakingDraft) {
    assertRole(session, ["dispatcher", "call-taker"], "create incidents");

    const protocol = protocols.find((entry) => entry.id === draft.protocolId);

    if (!protocol) {
      throw new Error("A determinant code must be selected before creating a job.");
    }

    const now = new Date().toISOString();
    const actorName = getActorName(session, draft.callTakerName || "Call taker");
    const latitude = parseCoordinate(draft.latitude);
    const longitude = parseCoordinate(draft.longitude);
    const location =
      latitude !== undefined && longitude !== undefined ? { latitude, longitude } : undefined;

    const nextIncident: Incident = {
      id: crypto.randomUUID(),
      callerName: draft.callerName,
      callerPhone: draft.callerPhone,
      patientName: draft.patientName,
      patientAge: draft.patientAge,
      address: draft.address,
      suburb: draft.suburb,
      chiefComplaint: draft.chiefComplaint || protocol.chiefComplaint,
      protocolId: protocol.id,
      determinantCode: protocol.determinantCode,
      determinantLevel: protocol.determinantLevel,
      responseMode: protocol.responseMode,
      triageNotes: draft.triageNotes,
      hazards: draft.hazards,
      callbackConfirmed: draft.callbackConfirmed,
      location,
      status: "Queued",
      assignedUnitIds: [],
      createdAt: now,
      updatedAt: now,
      createdBy: actorName
    };

    if (!db || !isFirebaseConfigured) {
      setIncidents((current) => [nextIncident, ...current]);
      setStatusEvents((current) => [
        {
          id: crypto.randomUUID(),
          unitId: null,
          incidentId: nextIncident.id,
          fromState: "Pending triage",
          toState: "Queued",
          actor: actorName,
          note: `Created ${protocol.determinantCode} job for dispatcher queue.`,
          timestamp: now
        },
        ...current
      ]);
      return nextIncident;
    }

    const incidentPayload = {
      callerName: draft.callerName,
      callerPhone: draft.callerPhone,
      patientName: draft.patientName,
      patientAge: draft.patientAge,
      address: draft.address,
      suburb: draft.suburb,
      chiefComplaint: nextIncident.chiefComplaint,
      protocolId: protocol.id,
      determinantCode: protocol.determinantCode,
      determinantLevel: protocol.determinantLevel,
      responseMode: protocol.responseMode,
      triageNotes: draft.triageNotes,
      hazards: draft.hazards,
      callbackConfirmed: draft.callbackConfirmed,
      location,
      status: "Queued",
      assignedUnitIds: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: actorName
    };

    const incidentRef = await addDoc(collection(db, "incidents"), incidentPayload);

    await addDoc(collection(db, "statusEvents"), {
      unitId: null,
      incidentId: incidentRef.id,
      fromState: "Pending triage",
      toState: "Queued",
      actor: actorName,
      note: `Created ${protocol.determinantCode} job for dispatcher queue.`,
      timestamp: serverTimestamp()
    });

    return {
      ...nextIncident,
      id: incidentRef.id
    };
  }

  async function upsertUnitSession(draft: UnitSessionDraft) {
    assertRole(session, ["dispatcher", "unit"], "manage unit sessions");

    const lockedUnitId =
      session?.role === "unit" ? session.allowedUnitId?.trim().toUpperCase() : undefined;
    const requestedUnitId = draft.callsign.trim().toUpperCase();
    const unitId = lockedUnitId || requestedUnitId;
    const now = new Date().toISOString();

    if (!unitId) {
      throw new Error("A callsign is required to log onto a unit console.");
    }

    if (session?.role === "unit" && !lockedUnitId) {
      throw new Error("This iPad account is missing allowedUnitId in users/{uid}.");
    }

    if (session?.role === "unit" && lockedUnitId && requestedUnitId && requestedUnitId !== lockedUnitId) {
      throw new Error(`This iPad account is locked to ${lockedUnitId}.`);
    }

    const existingUnit = units.find((unit) => unit.id === unitId);
    const nextUnit: Unit = {
      id: unitId,
      callsign: unitId,
      crew: draft.crew,
      ipadLabel: draft.ipadLabel,
      status: existingUnit?.status ?? "Available",
      lastLocation: existingUnit?.lastLocation,
      lastUpdate: now,
      activeIncidentId: existingUnit?.activeIncidentId ?? null,
      locationTrackingEnabled: existingUnit?.locationTrackingEnabled ?? false
    };

    if (!db || !isFirebaseConfigured) {
      setUnits((current) => {
        const remaining = current.filter((unit) => unit.id !== unitId);
        return [nextUnit, ...remaining];
      });
      return nextUnit;
    }

    await setDoc(
      doc(db, "units", unitId),
      {
        callsign: unitId,
        crew: draft.crew,
        ipadLabel: draft.ipadLabel,
        status: existingUnit?.status ?? "Available",
        activeIncidentId: existingUnit?.activeIncidentId ?? null,
        locationTrackingEnabled: existingUnit?.locationTrackingEnabled ?? false,
        lastUpdate: serverTimestamp()
      },
      { merge: true }
    );

    return nextUnit;
  }

  async function updateUnitStatus(unitId: string, nextStatus: UnitStatus) {
    assertRole(session, ["dispatcher", "unit"], "update unit status");

    if (session?.role === "unit" && session.allowedUnitId !== unitId) {
      throw new Error("This iPad account cannot update another unit.");
    }

    const unit = units.find((entry) => entry.id === unitId);
    const now = new Date().toISOString();
    const actorName = getActorName(session, unitId);

    if (!unit) {
      return;
    }

    if (!db || !isFirebaseConfigured) {
      setUnits((current) =>
        current.map((entry) =>
          entry.id === unitId
            ? {
                ...entry,
                status: nextStatus,
                lastUpdate: now
              }
            : entry
        )
      );
      setStatusEvents((current) => [
        {
          id: crypto.randomUUID(),
          unitId,
          incidentId: unit.activeIncidentId ?? null,
          fromState: unit.status,
          toState: nextStatus,
          actor: actorName,
          note:
            session?.role === "dispatcher"
              ? "Status changed from dispatcher console."
              : "Status changed from iPad unit console.",
          timestamp: now
        },
        ...current
      ]);
      return;
    }

    await updateDoc(doc(db, "units", unitId), {
      status: nextStatus,
      lastUpdate: serverTimestamp()
    });

    await addDoc(collection(db, "statusEvents"), {
      unitId,
      incidentId: unit.activeIncidentId ?? null,
      fromState: unit.status,
      toState: nextStatus,
      actor: actorName,
      note:
        session?.role === "dispatcher"
          ? "Status changed from dispatcher console."
          : "Status changed from iPad unit console.",
      timestamp: serverTimestamp()
    });
  }

  async function updateUnitTelemetry(
    unitId: string,
    patch: {
      lastLocation?: GeoPosition;
      locationTrackingEnabled?: boolean;
    }
  ) {
    assertRole(session, ["dispatcher", "unit"], "update unit telemetry");

    if (session?.role === "unit" && session.allowedUnitId !== unitId) {
      throw new Error("This iPad account cannot update another unit.");
    }

    const now = new Date().toISOString();

    if (!db || !isFirebaseConfigured) {
      setUnits((current) =>
        current.map((unit) =>
          unit.id === unitId
            ? {
                ...unit,
                lastLocation: patch.lastLocation ?? unit.lastLocation,
                locationTrackingEnabled:
                  patch.locationTrackingEnabled ?? unit.locationTrackingEnabled,
                lastUpdate: now
              }
            : unit
        )
      );
      return;
    }

    await setDoc(
      doc(db, "units", unitId),
      {
        ...(patch.lastLocation ? { lastLocation: patch.lastLocation } : {}),
        ...(patch.locationTrackingEnabled !== undefined
          ? { locationTrackingEnabled: patch.locationTrackingEnabled }
          : {}),
        lastUpdate: serverTimestamp()
      },
      { merge: true }
    );
  }

  async function assignUnitToIncident(incidentId: string, unitId: string) {
    assertRole(session, ["dispatcher"], "assign units");

    const incident = incidents.find((entry) => entry.id === incidentId);
    const unit = units.find((entry) => entry.id === unitId);
    const now = new Date().toISOString();
    const actorName = getActorName(session, "Dispatcher");

    if (!incident || !unit) {
      return;
    }

    if (!db || !isFirebaseConfigured) {
      setIncidents((current) =>
        current.map((entry) =>
          entry.id === incidentId
            ? {
                ...entry,
                assignedUnitIds: Array.from(new Set([...entry.assignedUnitIds, unitId])),
                status: "Dispatched",
                updatedAt: now
              }
            : entry
        )
      );
      setUnits((current) =>
        current.map((entry) =>
          entry.id === unitId
            ? {
                ...entry,
                activeIncidentId: incidentId,
                status: "En route",
                lastUpdate: now
              }
            : entry
        )
      );
      setStatusEvents((current) => [
        {
          id: crypto.randomUUID(),
          unitId,
          incidentId,
          fromState: unit.status,
          toState: "En route",
          actor: actorName,
          note: `Assigned ${unit.callsign} to ${incident.determinantCode}.`,
          timestamp: now
        },
        ...current
      ]);
      return;
    }

    await updateDoc(doc(db, "incidents", incidentId), {
      assignedUnitIds: arrayUnion(unitId),
      status: "Dispatched",
      updatedAt: serverTimestamp()
    });

    await setDoc(
      doc(db, "units", unitId),
      {
        activeIncidentId: incidentId,
        status: "En route",
        lastUpdate: serverTimestamp()
      },
      { merge: true }
    );

    await addDoc(collection(db, "statusEvents"), {
      unitId,
      incidentId,
      fromState: unit.status,
      toState: "En route",
      actor: actorName,
      note: `Assigned ${unit.callsign} to ${incident.determinantCode}.`,
      timestamp: serverTimestamp()
    });
  }

  async function setIncidentStatus(incidentId: string, status: IncidentStatus) {
    assertRole(session, ["dispatcher"], "update incident workflow");

    const now = new Date().toISOString();
    const actorName = getActorName(session, "Dispatcher");

    if (!db || !isFirebaseConfigured) {
      setIncidents((current) =>
        current.map((incident) =>
          incident.id === incidentId
            ? {
                ...incident,
                status,
                updatedAt: now
              }
            : incident
        )
      );
      setStatusEvents((current) => [
        {
          id: crypto.randomUUID(),
          unitId: null,
          incidentId,
          fromState: "Workflow",
          toState: status,
          actor: actorName,
          note: "Incident status updated from dispatcher board.",
          timestamp: now
        },
        ...current
      ]);
      return;
    }

    await updateDoc(doc(db, "incidents", incidentId), {
      status,
      updatedAt: serverTimestamp()
    });

    await addDoc(collection(db, "statusEvents"), {
      unitId: null,
      incidentId,
      fromState: "Workflow",
      toState: status,
      actor: actorName,
      note: "Incident status updated from dispatcher board.",
      timestamp: serverTimestamp()
    });
  }

  return {
    incidents,
    units,
    statusEvents,
    loading,
    error,
    syncMode: isFirebaseConfigured ? "firebase" : "demo",
    createIncident,
    upsertUnitSession,
    updateUnitStatus,
    updateUnitTelemetry,
    assignUnitToIncident,
    setIncidentStatus
  };
}
