import { Incident, StatusEvent, Unit } from "../types/cad";

const now = Date.now();

export const demoUnits: Unit[] = [
  {
    id: "MICA401",
    callsign: "MICA401",
    crew: "A. Singh / T. Moore",
    ipadLabel: "North iPad 1",
    status: "Available",
    lastLocation: {
      latitude: -37.8136,
      longitude: 144.9631,
      accuracy: 18
    },
    lastUpdate: new Date(now - 2 * 60_000).toISOString(),
    activeIncidentId: null,
    locationTrackingEnabled: true
  },
  {
    id: "ALS215",
    callsign: "ALS215",
    crew: "J. Carter / M. Hale",
    ipadLabel: "West iPad 3",
    status: "En route",
    lastLocation: {
      latitude: -37.801,
      longitude: 144.92,
      accuracy: 12
    },
    lastUpdate: new Date(now - 90_000).toISOString(),
    activeIncidentId: "INC-1002",
    locationTrackingEnabled: true
  },
  {
    id: "BLS118",
    callsign: "BLS118",
    crew: "L. Tran / S. Patel",
    ipadLabel: "South iPad 2",
    status: "Out of service",
    lastUpdate: new Date(now - 30 * 60_000).toISOString(),
    activeIncidentId: null,
    locationTrackingEnabled: false
  }
];

export const demoIncidents: Incident[] = [
  {
    id: "INC-1002",
    callerName: "Nina Walton",
    callerPhone: "0400 111 222",
    patientName: "Michael Walton",
    patientAge: "67",
    address: "17 Queen Street",
    suburb: "Footscray",
    chiefComplaint: "Chest pain / suspected ACS",
    protocolId: "chest-pain",
    determinantCode: "CARD-C1",
    determinantLevel: "Charlie",
    responseMode: "Urgent ALS response",
    triageNotes: "Central chest pain radiating to jaw, onset 10 min ago.",
    hazards: "Apartment access via buzzer 9.",
    callbackConfirmed: true,
    location: {
      latitude: -37.8,
      longitude: 144.9
    },
    status: "Dispatched",
    assignedUnitIds: ["ALS215"],
    createdAt: new Date(now - 8 * 60_000).toISOString(),
    updatedAt: new Date(now - 4 * 60_000).toISOString(),
    createdBy: "Dispatcher 2"
  },
  {
    id: "INC-1003",
    callerName: "R. Hughes",
    callerPhone: "0412 888 555",
    patientName: "Emily Ross",
    patientAge: "31",
    address: "144 Collins Street",
    suburb: "Melbourne",
    chiefComplaint: "Behavioral crisis / self-harm concern",
    protocolId: "mental-health",
    determinantCode: "BEHAV-C1",
    determinantLevel: "Charlie",
    responseMode: "Urgent medical and scene safety response",
    triageNotes: "Locked in office, threatening self-harm, security on level 8.",
    hazards: "Security requesting police attendance.",
    callbackConfirmed: true,
    location: {
      latitude: -37.815,
      longitude: 144.966
    },
    status: "Queued",
    assignedUnitIds: [],
    createdAt: new Date(now - 3 * 60_000).toISOString(),
    updatedAt: new Date(now - 3 * 60_000).toISOString(),
    createdBy: "Call taker 5"
  }
];

export const demoStatusEvents: StatusEvent[] = [
  {
    id: "EVT-3001",
    unitId: "ALS215",
    incidentId: "INC-1002",
    fromState: "Available",
    toState: "En route",
    actor: "Dispatcher 2",
    note: "Assigned to chest pain job.",
    timestamp: new Date(now - 4 * 60_000).toISOString()
  },
  {
    id: "EVT-3002",
    unitId: null,
    incidentId: "INC-1003",
    fromState: "Pending triage",
    toState: "Queued",
    actor: "Call taker 5",
    note: "Behavioral health job created from call-taking form.",
    timestamp: new Date(now - 3 * 60_000).toISOString()
  }
];
