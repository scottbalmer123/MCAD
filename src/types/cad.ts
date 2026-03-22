export type DeterminantLevel = "Alpha" | "Bravo" | "Charlie" | "Delta" | "Echo";

export type UnitStatus =
  | "Logged off"
  | "Available"
  | "En route"
  | "On scene"
  | "Transporting"
  | "At hospital"
  | "Clearing"
  | "Out of service";

export type IncidentStatus =
  | "Pending triage"
  | "Queued"
  | "Dispatched"
  | "On scene"
  | "Transporting"
  | "At hospital"
  | "Closed";

export interface GeoPosition {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface ProtocolDefinition {
  id: string;
  category: string;
  chiefComplaint: string;
  determinantCode: string;
  determinantLevel: DeterminantLevel;
  responseMode: string;
  scriptedQuestions: string[];
  notes: string;
}

export interface Incident {
  id: string;
  callerName: string;
  callerPhone: string;
  patientName: string;
  patientAge: string;
  address: string;
  suburb: string;
  chiefComplaint: string;
  protocolId: string;
  determinantCode: string;
  determinantLevel: DeterminantLevel;
  responseMode: string;
  triageNotes: string;
  hazards: string;
  callbackConfirmed: boolean;
  location?: GeoPosition;
  status: IncidentStatus;
  assignedUnitIds: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface Unit {
  id: string;
  callsign: string;
  crew: string;
  ipadLabel: string;
  status: UnitStatus;
  lastLocation?: GeoPosition;
  lastUpdate: string;
  activeIncidentId?: string | null;
  locationTrackingEnabled: boolean;
}

export interface StatusEvent {
  id: string;
  unitId: string | null;
  incidentId: string | null;
  fromState: string;
  toState: string;
  actor: string;
  note: string;
  timestamp: string;
}

export interface CallTakingDraft {
  callTakerName: string;
  callerName: string;
  callerPhone: string;
  patientName: string;
  patientAge: string;
  address: string;
  suburb: string;
  chiefComplaint: string;
  protocolId: string;
  triageNotes: string;
  hazards: string;
  callbackConfirmed: boolean;
  latitude?: string;
  longitude?: string;
}

export interface UnitSessionDraft {
  callsign: string;
  crew: string;
  ipadLabel: string;
}

export type RoleView = "call-taker" | "dispatcher" | "unit";

export type UserRole = RoleView;

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  active: boolean;
  allowedUnitId?: string | null;
}
