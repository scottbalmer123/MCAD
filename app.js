import { hasFirebaseStateSync, persistFirebaseState, startFirebaseStateSync } from "./firebase-service.js";

const STORAGE_KEY = "pulsegrid-cad-state-v1";
const SESSION_KEY = "macd-auth-session-v1";
const CHANNEL_NAME = "pulsegrid-cad-demo";
const LOCAL_SYNC_LABEL = "Demo sync";
const FIREBASE_CONNECTING_LABEL = "Firebase connecting";
const FIREBASE_ERROR_LABEL = "Firebase unavailable";
const DEFAULT_STAFF_ACCOUNTS = [
  {
    id: "admin01",
    username: "admin01",
    pin: "9999",
    role: "admin",
    displayName: "System Administrator",
    enabled: true
  },
  {
    id: "dispatch01",
    username: "dispatch01",
    pin: "2468",
    role: "dispatcher",
    displayName: "Dispatcher Desk 1",
    enabled: true
  },
  {
    id: "calltake01",
    username: "calltake01",
    pin: "1357",
    role: "call_taker",
    displayName: "Call Taker Alpha",
    enabled: true
  }
];
const DEFAULT_UNIT_PORTAL_ACCOUNTS = [
  {
    id: "MED-402",
    unitId: "MED-402",
    pin: "0402",
    role: "unit",
    displayName: "MED-402 iPad",
    enabled: true
  },
  {
    id: "MED-411",
    unitId: "MED-411",
    pin: "0411",
    role: "unit",
    displayName: "MED-411 iPad",
    enabled: true
  },
  {
    id: "SUP-01",
    unitId: "SUP-01",
    pin: "0001",
    role: "unit",
    displayName: "SUP-01 iPad",
    enabled: true
  }
];
const DEFAULT_UNIT_TYPES = [
  {
    id: "als",
    label: "ALS",
    description: "Advanced life support ambulance"
  },
  {
    id: "bls",
    label: "BLS",
    description: "Basic life support or patient transport"
  },
  {
    id: "supervisor",
    label: "Supervisor",
    description: "Clinical or operational supervisor vehicle"
  }
];
const ROLE_CONFIG = {
  admin: {
    label: "Administrator",
    homeView: "admin",
    views: ["admin"],
    note: "Administrator access includes user management, reporting, and fleet configuration."
  },
  dispatcher: {
    label: "Dispatcher",
    homeView: "dispatcher",
    views: ["dispatcher"],
    note: "Dispatcher access is limited to the dispatch board and incident control."
  },
  call_taker: {
    label: "Call Taker",
    homeView: "calltaking",
    views: ["calltaking"],
    note: "Call taker access is limited to incident intake and job creation."
  },
  unit: {
    label: "Unit iPad",
    homeView: "unit",
    views: ["unit"],
    note: "Unit access is locked to the linked field device and unit workspace."
  }
};

function cloneStaffAccounts(accounts = DEFAULT_STAFF_ACCOUNTS) {
  return accounts.map((account) => ({ ...account }));
}

function cloneUnitAccounts(accounts = DEFAULT_UNIT_PORTAL_ACCOUNTS) {
  return accounts.map((account) => ({ ...account }));
}

function cloneUnitTypes(unitTypes = DEFAULT_UNIT_TYPES) {
  return unitTypes.map((unitType) => ({ ...unitType }));
}

function normalizeUnitTypeId(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "unit-type";
}

function findUnitTypeIdByLabel(label, unitTypes = DEFAULT_UNIT_TYPES) {
  const normalizedLabel = normalizeUnitTypeId(label);
  const match = unitTypes.find((unitType) => (
    unitType.id === normalizedLabel
      || normalizeUnitTypeId(unitType.label) === normalizedLabel
  ));
  return match ? match.id : normalizedLabel;
}

function getUnitTypeLabelById(typeId, unitTypes = DEFAULT_UNIT_TYPES) {
  const match = unitTypes.find((unitType) => unitType.id === typeId);
  return match ? match.label : "";
}

const INCIDENT_STATUSES = [
  "Pending Dispatch",
  "Units Assigned",
  "En Route",
  "On Scene",
  "Transporting",
  "At Hospital",
  "Closed"
];
const UNIT_STATUSES = [
  "Available",
  "En Route",
  "On Scene",
  "Transporting",
  "At Hospital",
  "Out of Service"
];
const PROTOCOL_FAMILIES = [
  {
    id: "01",
    title: "Abdominal Pain / Problems",
    determinants: [
      {
        code: "01-E-1",
        level: "Echo",
        label: "Collapsed or ineffective breathing with abdominal complaint",
        priority: "Priority 1",
        response: "ALS + rapid response support"
      },
      {
        code: "01-D-1",
        level: "Delta",
        label: "Severe abdominal pain with shock or major deterioration",
        priority: "Priority 1",
        response: "ALS ambulance"
      },
      {
        code: "01-C-1",
        level: "Charlie",
        label: "Acute abdominal pain with persistent vomiting or guarding",
        priority: "Priority 2",
        response: "Urgent ambulance"
      },
      {
        code: "01-A-1",
        level: "Alpha",
        label: "Stable abdominal complaint",
        priority: "Priority 3",
        response: "Routine ambulance dispatch"
      }
    ]
  },
  {
    id: "02",
    title: "Allergic Reaction / Envenomation",
    determinants: [
      {
        code: "02-E-1",
        level: "Echo",
        label: "Anaphylaxis with ineffective breathing",
        priority: "Priority 1",
        response: "ALS + rapid response support"
      },
      {
        code: "02-D-1",
        level: "Delta",
        label: "Severe allergic reaction with breathing difficulty",
        priority: "Priority 1",
        response: "ALS ambulance"
      },
      {
        code: "02-C-1",
        level: "Charlie",
        label: "Progressive swelling or systemic reaction",
        priority: "Priority 2",
        response: "Urgent ambulance"
      },
      {
        code: "02-A-1",
        level: "Alpha",
        label: "Localized reaction, stable presentation",
        priority: "Priority 3",
        response: "Routine clinical response"
      }
    ]
  },
  {
    id: "05",
    title: "Back Pain",
    determinants: [
      {
        code: "05-D-1",
        level: "Delta",
        label: "Back pain with neurological deficit or collapse",
        priority: "Priority 1",
        response: "ALS ambulance"
      },
      {
        code: "05-C-1",
        level: "Charlie",
        label: "Severe back pain with inability to mobilize",
        priority: "Priority 2",
        response: "Urgent ambulance"
      },
      {
        code: "05-B-1",
        level: "Bravo",
        label: "Moderate back pain with functional limitation",
        priority: "Priority 3",
        response: "Standard ambulance response"
      },
      {
        code: "05-A-1",
        level: "Alpha",
        label: "Stable back pain, no red flags identified",
        priority: "Priority 4",
        response: "Routine transport or referral"
      }
    ]
  },
  {
    id: "06",
    title: "Breathing Problems",
    determinants: [
      {
        code: "06-E-1",
        level: "Echo",
        label: "Immediate airway or respiratory compromise",
        priority: "Priority 1",
        response: "ALS + rapid response support"
      },
      {
        code: "06-D-1",
        level: "Delta",
        label: "Severe respiratory distress",
        priority: "Priority 1",
        response: "ALS ambulance"
      },
      {
        code: "06-C-1",
        level: "Charlie",
        label: "Acute breathing difficulty, conscious",
        priority: "Priority 2",
        response: "ALS or intensive BLS"
      },
      {
        code: "06-A-1",
        level: "Alpha",
        label: "Stable breathing complaint",
        priority: "Priority 3",
        response: "Routine clinical transport"
      }
    ]
  },
  {
    id: "09",
    title: "Cardiac or Respiratory Arrest / Death",
    determinants: [
      {
        code: "09-E-1",
        level: "Echo",
        label: "Confirmed cardiac arrest or ineffective breathing",
        priority: "Priority 1",
        response: "ALS + rapid response support"
      },
      {
        code: "09-D-1",
        level: "Delta",
        label: "Unconscious with agonal or abnormal breathing",
        priority: "Priority 1",
        response: "ALS ambulance"
      },
      {
        code: "09-C-1",
        level: "Charlie",
        label: "Recently resuscitated or return of spontaneous circulation",
        priority: "Priority 1",
        response: "ALS ambulance + supervisor support"
      }
    ]
  },
  {
    id: "10",
    title: "Chest Pain / Cardiac Symptoms",
    determinants: [
      {
        code: "10-D-1",
        level: "Delta",
        label: "High-acuity chest pain or cardiac symptoms",
        priority: "Priority 1",
        response: "ALS + monitor capable crew"
      },
      {
        code: "10-C-1",
        level: "Charlie",
        label: "Chest pain, awake and breathing",
        priority: "Priority 2",
        response: "ALS ambulance"
      },
      {
        code: "10-A-1",
        level: "Alpha",
        label: "Lower-acuity cardiac complaint",
        priority: "Priority 3",
        response: "Routine ambulance dispatch"
      }
    ]
  },
  {
    id: "11",
    title: "Choking",
    determinants: [
      {
        code: "11-E-1",
        level: "Echo",
        label: "Complete airway obstruction",
        priority: "Priority 1",
        response: "ALS + rapid response support"
      },
      {
        code: "11-D-1",
        level: "Delta",
        label: "Partial obstruction with significant distress",
        priority: "Priority 1",
        response: "ALS ambulance"
      },
      {
        code: "11-C-1",
        level: "Charlie",
        label: "Resolved choking with ongoing respiratory concern",
        priority: "Priority 2",
        response: "Urgent ambulance"
      },
      {
        code: "11-A-1",
        level: "Alpha",
        label: "Resolved choking, now stable",
        priority: "Priority 3",
        response: "Routine clinical response"
      }
    ]
  },
  {
    id: "12",
    title: "Seizures / Convulsions",
    determinants: [
      {
        code: "12-D-1",
        level: "Delta",
        label: "Ongoing seizure or recurrent episodes",
        priority: "Priority 1",
        response: "ALS ambulance"
      },
      {
        code: "12-C-1",
        level: "Charlie",
        label: "Post-ictal, abnormal recovery",
        priority: "Priority 2",
        response: "Urgent ambulance"
      },
      {
        code: "12-A-1",
        level: "Alpha",
        label: "Recovered seizure patient, stable",
        priority: "Priority 3",
        response: "Clinical review transport"
      }
    ]
  },
  {
    id: "13",
    title: "Diabetic Problems",
    determinants: [
      {
        code: "13-E-1",
        level: "Echo",
        label: "Unresponsive diabetic emergency with ineffective breathing",
        priority: "Priority 1",
        response: "ALS + rapid response support"
      },
      {
        code: "13-D-1",
        level: "Delta",
        label: "Altered conscious state or seizure in diabetic patient",
        priority: "Priority 1",
        response: "ALS ambulance"
      },
      {
        code: "13-C-1",
        level: "Charlie",
        label: "Symptomatic hypo or hyperglycaemia, conscious",
        priority: "Priority 2",
        response: "Urgent ambulance"
      },
      {
        code: "13-A-1",
        level: "Alpha",
        label: "Stable diabetic issue requiring review",
        priority: "Priority 3",
        response: "Routine ambulance dispatch"
      }
    ]
  },
  {
    id: "17",
    title: "Falls",
    determinants: [
      {
        code: "17-D-1",
        level: "Delta",
        label: "Fall with major mechanism or critical symptoms",
        priority: "Priority 1",
        response: "ALS + lift assist if required"
      },
      {
        code: "17-C-1",
        level: "Charlie",
        label: "Fall with possible fracture or anticoagulant risk",
        priority: "Priority 2",
        response: "Urgent ambulance"
      },
      {
        code: "17-A-1",
        level: "Alpha",
        label: "Low-acuity fall, stable presentation",
        priority: "Priority 3",
        response: "Routine dispatch"
      }
    ]
  },
  {
    id: "18",
    title: "Headache",
    determinants: [
      {
        code: "18-D-1",
        level: "Delta",
        label: "Sudden severe headache with neurological deficit",
        priority: "Priority 1",
        response: "ALS ambulance"
      },
      {
        code: "18-C-1",
        level: "Charlie",
        label: "Severe headache with vomiting or altered function",
        priority: "Priority 2",
        response: "Urgent ambulance"
      },
      {
        code: "18-B-1",
        level: "Bravo",
        label: "Persistent significant headache, stable airway",
        priority: "Priority 3",
        response: "Standard ambulance response"
      },
      {
        code: "18-A-1",
        level: "Alpha",
        label: "Stable headache complaint",
        priority: "Priority 4",
        response: "Routine transport or referral"
      }
    ]
  },
  {
    id: "21",
    title: "Hemorrhage / Lacerations",
    determinants: [
      {
        code: "21-E-1",
        level: "Echo",
        label: "Massive uncontrolled hemorrhage with collapse",
        priority: "Priority 1",
        response: "ALS + rapid response support"
      },
      {
        code: "21-D-1",
        level: "Delta",
        label: "Serious external bleeding not controlled",
        priority: "Priority 1",
        response: "ALS ambulance"
      },
      {
        code: "21-C-1",
        level: "Charlie",
        label: "Significant laceration with ongoing blood loss",
        priority: "Priority 2",
        response: "Urgent ambulance"
      },
      {
        code: "21-A-1",
        level: "Alpha",
        label: "Controlled bleeding, stable patient",
        priority: "Priority 3",
        response: "Routine ambulance dispatch"
      }
    ]
  },
  {
    id: "23",
    title: "Overdose / Poisoning",
    determinants: [
      {
        code: "23-E-1",
        level: "Echo",
        label: "Unresponsive overdose presentation",
        priority: "Priority 1",
        response: "ALS + supervisor support"
      },
      {
        code: "23-D-1",
        level: "Delta",
        label: "Symptomatic overdose or toxidrome concern",
        priority: "Priority 1",
        response: "ALS ambulance"
      },
      {
        code: "23-C-1",
        level: "Charlie",
        label: "Exposure with active symptoms",
        priority: "Priority 2",
        response: "Urgent ambulance"
      }
    ]
  },
  {
    id: "24",
    title: "Pregnancy / Childbirth / Miscarriage",
    determinants: [
      {
        code: "24-E-1",
        level: "Echo",
        label: "Imminent delivery with critical maternal or neonatal compromise",
        priority: "Priority 1",
        response: "ALS ambulance + supervisor support"
      },
      {
        code: "24-D-1",
        level: "Delta",
        label: "Active labor complications or heavy vaginal bleeding",
        priority: "Priority 1",
        response: "ALS ambulance"
      },
      {
        code: "24-C-1",
        level: "Charlie",
        label: "Urgent pregnancy complaint with pain or reduced fetal concern",
        priority: "Priority 2",
        response: "Urgent ambulance"
      },
      {
        code: "24-A-1",
        level: "Alpha",
        label: "Stable pregnancy-related issue",
        priority: "Priority 3",
        response: "Routine ambulance dispatch"
      }
    ]
  },
  {
    id: "26",
    title: "Sick Person / General Medical",
    determinants: [
      {
        code: "26-D-1",
        level: "Delta",
        label: "Very sick patient or significant deterioration",
        priority: "Priority 1",
        response: "ALS ambulance"
      },
      {
        code: "26-C-1",
        level: "Charlie",
        label: "Abnormal vital concern, stable airway",
        priority: "Priority 2",
        response: "Urgent ambulance"
      },
      {
        code: "26-B-1",
        level: "Bravo",
        label: "Moderate acuity sick person",
        priority: "Priority 3",
        response: "Standard ambulance response"
      }
    ]
  },
  {
    id: "27",
    title: "Stab / Gunshot / Penetrating Trauma",
    determinants: [
      {
        code: "27-E-1",
        level: "Echo",
        label: "Penetrating trauma with ineffective breathing or arrest",
        priority: "Priority 1",
        response: "ALS + rapid response support"
      },
      {
        code: "27-D-1",
        level: "Delta",
        label: "Critical penetrating trauma to head, neck, chest, or abdomen",
        priority: "Priority 1",
        response: "ALS ambulance"
      },
      {
        code: "27-C-1",
        level: "Charlie",
        label: "Penetrating trauma to extremity with significant bleeding",
        priority: "Priority 2",
        response: "Urgent ambulance"
      }
    ]
  },
  {
    id: "28",
    title: "Stroke / CVA / TIA",
    determinants: [
      {
        code: "28-D-1",
        level: "Delta",
        label: "Suspected stroke with acute neurological deficit",
        priority: "Priority 1",
        response: "ALS ambulance"
      },
      {
        code: "28-C-1",
        level: "Charlie",
        label: "Resolved deficit or suspected TIA with ongoing concern",
        priority: "Priority 2",
        response: "Urgent ambulance"
      },
      {
        code: "28-A-1",
        level: "Alpha",
        label: "Stable neurological complaint requiring evaluation",
        priority: "Priority 3",
        response: "Routine ambulance dispatch"
      }
    ]
  },
  {
    id: "29",
    title: "Traffic / Transportation Incidents",
    determinants: [
      {
        code: "29-E-1",
        level: "Echo",
        label: "Major collision with entrapment and ineffective breathing",
        priority: "Priority 1",
        response: "ALS + rapid response support"
      },
      {
        code: "29-D-1",
        level: "Delta",
        label: "High-mechanism MVC or multiple patients",
        priority: "Priority 1",
        response: "ALS ambulance + additional resources"
      },
      {
        code: "29-C-1",
        level: "Charlie",
        label: "Injury collision with stable patients",
        priority: "Priority 2",
        response: "Urgent ambulance"
      },
      {
        code: "29-A-1",
        level: "Alpha",
        label: "Low-mechanism transport incident, no life threat identified",
        priority: "Priority 3",
        response: "Routine ambulance dispatch"
      }
    ]
  },
  {
    id: "30",
    title: "Traumatic Injuries",
    determinants: [
      {
        code: "30-D-1",
        level: "Delta",
        label: "Major trauma with significant mechanism or deterioration",
        priority: "Priority 1",
        response: "ALS ambulance"
      },
      {
        code: "30-C-1",
        level: "Charlie",
        label: "Moderate trauma with suspected fracture or head injury",
        priority: "Priority 2",
        response: "Urgent ambulance"
      },
      {
        code: "30-B-1",
        level: "Bravo",
        label: "Painful traumatic injury, stable presentation",
        priority: "Priority 3",
        response: "Standard ambulance response"
      }
    ]
  },
  {
    id: "31",
    title: "Unconscious / Fainting",
    determinants: [
      {
        code: "31-E-1",
        level: "Echo",
        label: "Unresponsive and not effectively breathing",
        priority: "Priority 1",
        response: "ALS + rapid response support"
      },
      {
        code: "31-D-1",
        level: "Delta",
        label: "Unconscious with abnormal breathing",
        priority: "Priority 1",
        response: "ALS ambulance"
      },
      {
        code: "31-C-1",
        level: "Charlie",
        label: "Syncope with ongoing concern",
        priority: "Priority 2",
        response: "Urgent ambulance"
      }
    ]
  },
  {
    id: "32",
    title: "Unknown Problem / Person Down",
    determinants: [
      {
        code: "32-E-1",
        level: "Echo",
        label: "Unknown problem with ineffective or absent breathing",
        priority: "Priority 1",
        response: "ALS + rapid response support"
      },
      {
        code: "32-D-1",
        level: "Delta",
        label: "Unresponsive person down, breathing status uncertain",
        priority: "Priority 1",
        response: "ALS ambulance"
      },
      {
        code: "32-C-1",
        level: "Charlie",
        label: "Person down, conscious but cause unclear",
        priority: "Priority 2",
        response: "Urgent ambulance"
      },
      {
        code: "32-A-1",
        level: "Alpha",
        label: "Welfare check medical concern, stable caller report",
        priority: "Priority 3",
        response: "Routine ambulance dispatch"
      }
    ]
  }
];

const TRIAGE_SEVERITY_RANK = {
  alpha: 0,
  bravo: 1,
  charlie: 2,
  delta: 3,
  echo: 4
};

const TRIAGE_LEVEL_FALLBACKS = {
  echo: ["Echo", "Delta", "Charlie", "Bravo", "Alpha"],
  delta: ["Delta", "Charlie", "Bravo", "Alpha"],
  charlie: ["Charlie", "Bravo", "Alpha"],
  bravo: ["Bravo", "Alpha", "Charlie", "Delta", "Echo"],
  alpha: ["Alpha", "Bravo", "Charlie", "Delta", "Echo"]
};

const TRIAGE_BASE_QUESTIONS = [
  {
    id: "triageResponsiveness",
    shortLabel: "Responsiveness",
    prompt: "What is the patient's responsiveness?",
    hint: "Use the caller's best current report.",
    options: [
      {
        value: "alert",
        label: "Alert or responding normally",
        description: "No reduced responsiveness reported.",
        severity: "alpha",
        summary: "Patient reported alert or responding normally."
      },
      {
        value: "altered",
        label: "Altered, confused, or difficult to wake",
        description: "Escalate for reduced responsiveness.",
        severity: "charlie",
        summary: "Reduced responsiveness is reported."
      },
      {
        value: "unresponsive",
        label: "Unresponsive",
        description: "Treat as high acuity unless breathing confirms arrest.",
        severity: "delta",
        summary: "Patient reported unresponsive."
      }
    ]
  },
  {
    id: "triageBreathing",
    shortLabel: "Breathing",
    prompt: "What is the breathing status?",
    hint: "Confirm if breathing is normal, difficult, or ineffective.",
    options: [
      {
        value: "normal",
        label: "Breathing normally",
        description: "No immediate respiratory compromise reported.",
        severity: "alpha",
        summary: "Breathing reported normal."
      },
      {
        value: "labored",
        label: "Labored, noisy, or abnormal breathing",
        description: "Escalate for active respiratory concern.",
        severity: "charlie",
        summary: "Breathing difficulty is reported."
      },
      {
        value: "ineffective",
        label: "Ineffective, absent, or agonal breathing",
        description: "Treat as immediate life threat.",
        severity: "echo",
        summary: "Breathing is ineffective or absent."
      }
    ]
  }
];

const TRIAGE_ESCALATION_QUESTION = {
  id: "triageEscalation",
  shortLabel: "Red flags",
  prompt: "Are there added red flags or rapid deterioration?",
  hint: "Use this to lift the complaint profile when the caller reports worsening risk.",
  options: [
    {
      value: "none",
      label: "No added red flags",
      description: "No rapid deterioration, collapse, or major complication reported.",
      severity: "alpha",
      summary: "No added red flags reported."
    },
    {
      value: "urgent",
      label: "Worsening condition or major functional loss",
      description: "Escalate to urgent if the patient is deteriorating or unable to cope.",
      severity: "charlie",
      summary: "Caller reports worsening condition or major functional loss."
    },
    {
      value: "critical",
      label: "Collapse, shock, massive bleed, or immediate threat",
      description: "Escalate to the highest urgent tier available.",
      severity: "delta",
      summary: "Immediate red flags or rapid deterioration are reported."
    }
  ]
};

let state = loadState();
let currentSession = loadSession();
let currentView = sanitizeViewForSession(getInitialView(), currentSession);
let selectedUnitId = getDefaultSelectedUnitId();
let locationWatchId = null;
let backendMode = hasFirebaseStateSync() ? "firebase-pending" : "local";
let syncModeLabel = hasFirebaseStateSync() ? FIREBASE_CONNECTING_LABEL : LOCAL_SYNC_LABEL;
let determinantSelectionMode = "guided";
const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CHANNEL_NAME) : null;

const refs = {
  authShell: document.getElementById("authShell"),
  appShell: document.getElementById("appShell"),
  staffAuthForm: document.getElementById("staffAuthForm"),
  unitAccessForm: document.getElementById("unitAccessForm"),
  unitAccessSelect: document.getElementById("unitAccessSelect"),
  staffAuthError: document.getElementById("staffAuthError"),
  unitAuthError: document.getElementById("unitAuthError"),
  sessionBar: document.getElementById("sessionBar"),
  sessionRoleBadge: document.getElementById("sessionRoleBadge"),
  sessionName: document.getElementById("sessionName"),
  sessionNote: document.getElementById("sessionNote"),
  logoutButton: document.getElementById("logoutButton"),
  syncModeBadge: document.getElementById("syncModeBadge"),
  lastSavedBadge: document.getElementById("lastSavedBadge"),
  operationalNoteText: document.getElementById("operationalNoteText"),
  activeIncidentMetric: document.getElementById("activeIncidentMetric"),
  loggedInMetric: document.getElementById("loggedInMetric"),
  committedMetric: document.getElementById("committedMetric"),
  latestPingMetric: document.getElementById("latestPingMetric"),
  incidentQueueCount: document.getElementById("incidentQueueCount"),
  incidentBoard: document.getElementById("incidentBoard"),
  unitBoardBody: document.getElementById("unitBoardBody"),
  mapCanvas: document.getElementById("mapCanvas"),
  activityFeed: document.getElementById("activityFeed"),
  callTakingForm: document.getElementById("callTakingForm"),
  protocolFamilySelect: document.getElementById("protocolFamilySelect"),
  determinantSelect: document.getElementById("determinantSelect"),
  protocolFlowCopy: document.getElementById("protocolFlowCopy"),
  protocolQuestionFlow: document.getElementById("protocolQuestionFlow"),
  guidedDeterminantBadge: document.getElementById("guidedDeterminantBadge"),
  protocolSummary: document.getElementById("protocolSummary"),
  callPreview: document.getElementById("callPreview"),
  unitLoginScreen: document.getElementById("unitLoginScreen"),
  unitOpsScreen: document.getElementById("unitOpsScreen"),
  unitCasePanel: document.getElementById("unitCasePanel"),
  unitLoginForm: document.getElementById("unitLoginForm"),
  unitSelect: document.getElementById("unitSelect"),
  unitSummary: document.getElementById("unitSummary"),
  unitJobDetail: document.getElementById("unitJobDetail"),
  statusButtonGrid: document.getElementById("statusButtonGrid"),
  startTrackingButton: document.getElementById("startTrackingButton"),
  stopTrackingButton: document.getElementById("stopTrackingButton"),
  trackingHint: document.getElementById("trackingHint"),
  manualLocationForm: document.getElementById("manualLocationForm"),
  assignedJobs: document.getElementById("assignedJobs"),
  unitLogoutButton: document.getElementById("unitLogoutButton"),
  unitDispatchAlertScreen: document.getElementById("unitDispatchAlertScreen"),
  adminReportMetrics: document.getElementById("adminReportMetrics"),
  adminIncidentReportBody: document.getElementById("adminIncidentReportBody"),
  adminUnitStatusReportBody: document.getElementById("adminUnitStatusReportBody"),
  adminStaffForm: document.getElementById("adminStaffForm"),
  adminStaffMessage: document.getElementById("adminStaffMessage"),
  adminStaffTableBody: document.getElementById("adminStaffTableBody"),
  adminDeviceForm: document.getElementById("adminDeviceForm"),
  adminDeviceUnitSelect: document.getElementById("adminDeviceUnitSelect"),
  adminDeviceMessage: document.getElementById("adminDeviceMessage"),
  adminDeviceTableBody: document.getElementById("adminDeviceTableBody"),
  adminUnitTypeForm: document.getElementById("adminUnitTypeForm"),
  adminUnitTypeMessage: document.getElementById("adminUnitTypeMessage"),
  adminUnitTypeTableBody: document.getElementById("adminUnitTypeTableBody"),
  adminUnitForm: document.getElementById("adminUnitForm"),
  adminUnitTypeSelect: document.getElementById("adminUnitTypeSelect"),
  adminUnitStatusSelect: document.getElementById("adminUnitStatusSelect"),
  adminUnitMessage: document.getElementById("adminUnitMessage"),
  adminUnitTableBody: document.getElementById("adminUnitTableBody"),
  modeButtons: Array.from(document.querySelectorAll(".mode-button")),
  views: {
    admin: document.getElementById("adminView"),
    dispatcher: document.getElementById("dispatcherView"),
    calltaking: document.getElementById("calltakingView"),
    unit: document.getElementById("unitView")
  }
};

initialize().catch(handleBackendInitializationError);

async function initialize() {
  populateProtocolFamilySelect();
  populateDeterminantSelect();
  renderProtocolQuestionFlow();
  syncGuidedDeterminant();
  populateUnitAccessSelect();
  populateUnitSelect();
  bindEvents();
  await initializeBackendSync();
  render();
}

function bindEvents() {
  refs.staffAuthForm.addEventListener("submit", handleStaffAuthSubmit);
  refs.unitAccessForm.addEventListener("submit", handleUnitAuthSubmit);
  refs.logoutButton.addEventListener("click", handleSessionLogout);
  refs.modeButtons.forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.viewTarget));
  });

  refs.protocolFamilySelect.addEventListener("change", handleProtocolFamilyChange);
  refs.determinantSelect.addEventListener("change", handleDeterminantSelectionChange);
  refs.callTakingForm.addEventListener("input", handleCallTakingFormInput);
  refs.callTakingForm.addEventListener("change", handleCallTakingFormChange);
  refs.callTakingForm.addEventListener("submit", handleCallCreate);
  refs.unitLoginForm.addEventListener("submit", handleUnitLogin);
  refs.unitSelect.addEventListener("change", handleUnitSelectionChange);
  refs.unitLogoutButton.addEventListener("click", handleUnitLogout);
  refs.statusButtonGrid.addEventListener("click", handleUnitStatusClick);
  refs.unitOpsScreen.addEventListener("click", handleUnitOpsClick);
  refs.manualLocationForm.addEventListener("submit", handleManualLocationSubmit);
  refs.startTrackingButton.addEventListener("click", startBrowserTracking);
  refs.stopTrackingButton.addEventListener("click", stopBrowserTracking);
  refs.incidentBoard.addEventListener("click", handleIncidentBoardClick);
  refs.incidentBoard.addEventListener("change", handleIncidentBoardChange);
  refs.adminStaffForm.addEventListener("submit", handleAdminStaffSubmit);
  refs.adminDeviceForm.addEventListener("submit", handleAdminDeviceSubmit);
  refs.adminUnitTypeForm.addEventListener("submit", handleAdminUnitTypeSubmit);
  refs.adminUnitForm.addEventListener("submit", handleAdminUnitSubmit);
  refs.views.admin.addEventListener("click", handleAdminViewClick);
  [
    refs.adminStaffForm,
    refs.adminDeviceForm,
    refs.adminUnitTypeForm,
    refs.adminUnitForm
  ].forEach((form) => {
    form.addEventListener("reset", handleAdminFormReset);
  });

  if (channel) {
    channel.addEventListener("message", (event) => {
      if (backendMode === "local" && event.data && event.data.type === "state-update") {
        state = normalizeState(event.data.state);
        selectedUnitId = getDefaultSelectedUnitId();
        syncCurrentSessionWithState();
        render();
      }
      if (event.data && event.data.type === "session-update") {
        currentSession = event.data.session;
        selectedUnitId = getDefaultSelectedUnitId();
        currentView = sanitizeViewForSession(currentView, currentSession);
        render();
      }
    });
  }

  window.addEventListener("storage", (event) => {
    if (backendMode === "local" && event.key === STORAGE_KEY && event.newValue) {
      state = normalizeState(JSON.parse(event.newValue));
      selectedUnitId = getDefaultSelectedUnitId();
      syncCurrentSessionWithState();
      render();
    }
    if (event.key === SESSION_KEY) {
      currentSession = loadSession();
      selectedUnitId = getDefaultSelectedUnitId();
      currentView = sanitizeViewForSession(currentView, currentSession);
      render();
    }
  });
}

function handleBackendInitializationError(error) {
  console.error("Failed to initialize MACD backend", error);
  backendMode = "local";
  syncModeLabel = FIREBASE_ERROR_LABEL;
  render();
}

async function initializeBackendSync() {
  if (!hasFirebaseStateSync()) {
    backendMode = "local";
    syncModeLabel = LOCAL_SYNC_LABEL;
    cacheStateLocally();
    return;
  }

  handleBackendStatusChange({ mode: "firebase-pending", label: FIREBASE_CONNECTING_LABEL });

  const result = await startFirebaseStateSync({
    getSeedState: () => normalizeState(state),
    onRemoteState: (remoteState) => {
      state = normalizeState(remoteState);
      selectedUnitId = getDefaultSelectedUnitId();
      syncCurrentSessionWithState();
      cacheStateLocally();
      render();
    },
    onStatusChange: handleBackendStatusChange
  });

  if (result.mode === "firebase-error") {
    backendMode = "local";
    syncModeLabel = FIREBASE_ERROR_LABEL;
    cacheStateLocally();
  }
}

function buildDefaultState() {
  const now = new Date();
  const minutesAgo = (minutes) => new Date(now.getTime() - minutes * 60000).toISOString();
  const incidentOneId = uid("incident");
  const incidentTwoId = uid("incident");
  const med402 = {
    id: "MED-402",
    typeId: "als",
    type: "ALS",
    crew: "Crew 402",
    deviceLabel: "iPad MED-402",
    status: "En Route",
    loggedIn: true,
    sessionStartedAt: "",
    pendingAlertIncidentId: "",
    activeIncidentViewId: "",
    assignedIncidentId: incidentOneId,
    location: {
      lat: -37.8142,
      lng: 144.9704,
      accuracy: 12,
      timestamp: minutesAgo(2),
      source: "GPS",
      note: "Mobile update"
    },
    lastStatusChange: minutesAgo(3)
  };

  const med411 = {
    id: "MED-411",
    typeId: "als",
    type: "ALS",
    crew: "Crew 411",
    deviceLabel: "iPad MED-411",
    status: "Available",
    loggedIn: true,
    sessionStartedAt: "",
    pendingAlertIncidentId: "",
    activeIncidentViewId: "",
    assignedIncidentId: "",
    location: {
      lat: -37.8061,
      lng: 144.9528,
      accuracy: 8,
      timestamp: minutesAgo(4),
      source: "Manual",
      note: "Docklands standby"
    },
    lastStatusChange: minutesAgo(15)
  };

  const patientTransport = {
    id: "PT-221",
    typeId: "bls",
    type: "BLS",
    crew: "",
    deviceLabel: "",
    status: "Available",
    loggedIn: false,
    sessionStartedAt: "",
    pendingAlertIncidentId: "",
    activeIncidentViewId: "",
    assignedIncidentId: "",
    location: {
      lat: -37.8208,
      lng: 144.9654,
      accuracy: 20,
      timestamp: minutesAgo(18),
      source: "Manual",
      note: "Southbank post"
    },
    lastStatusChange: minutesAgo(18)
  };

  const supervisor = {
    id: "SUP-01",
    typeId: "supervisor",
    type: "Supervisor",
    crew: "Duty Supervisor",
    deviceLabel: "iPad SUP-01",
    status: "Available",
    loggedIn: true,
    sessionStartedAt: "",
    pendingAlertIncidentId: "",
    activeIncidentViewId: "",
    assignedIncidentId: "",
    location: {
      lat: -37.8228,
      lng: 144.9764,
      accuracy: 10,
      timestamp: minutesAgo(1),
      source: "GPS",
      note: "CBD south sector"
    },
    lastStatusChange: minutesAgo(12)
  };

  return {
    meta: {
      syncMode: "Demo sync",
      lastSavedAt: now.toISOString()
    },
    incidents: [
      {
        id: incidentOneId,
        cadNumber: "MED-20260322-001",
        createdAt: minutesAgo(6),
        callTaker: "Primary Desk",
        callerName: "Hotel concierge",
        callback: "+61 3 9000 1001",
        locationText: "215 Collins Street, Melbourne",
        coordinates: {
          lat: -37.8159,
          lng: 144.9681
        },
        patientAge: "68",
        patientSex: "Male",
        chiefComplaint: "Acute chest pain and diaphoresis",
        notes: "Patient conscious in lobby. Staff reports sudden onset 10 minutes ago.",
        protocolFamilyId: "10",
        protocolTitle: "Chest Pain / Cardiac Symptoms",
        determinantCode: "10-D-1",
        determinantLevel: "Delta",
        determinantLabel: "High-acuity chest pain or cardiac symptoms",
        priority: "Priority 1",
        responsePlan: "ALS + monitor capable crew",
        status: "En Route",
        assignedUnits: [med402.id],
        assignmentHistory: [
          {
            unitId: med402.id,
            assignedAt: minutesAgo(5)
          }
        ]
      },
      {
        id: incidentTwoId,
        cadNumber: "MED-20260322-002",
        createdAt: minutesAgo(20),
        callTaker: "Primary Desk",
        callerName: "Neighbour",
        callback: "+61 3 9000 2002",
        locationText: "12 Park Lane, Carlton",
        coordinates: {
          lat: -37.8004,
          lng: 144.9672
        },
        patientAge: "79",
        patientSex: "Female",
        chiefComplaint: "Fall with hip pain",
        notes: "Unable to stand. Alert and breathing normally.",
        protocolFamilyId: "17",
        protocolTitle: "Falls",
        determinantCode: "17-C-1",
        determinantLevel: "Charlie",
        determinantLabel: "Fall with possible fracture or anticoagulant risk",
        priority: "Priority 2",
        responsePlan: "Urgent ambulance",
        status: "Pending Dispatch",
        assignedUnits: [],
        assignmentHistory: []
      }
    ],
    units: [med402, med411, patientTransport, supervisor],
    audit: [
      {
        id: uid("audit"),
        timestamp: minutesAgo(20),
        title: "Incident created",
        detail: "MED-20260322-002 logged by Primary Desk for fall response.",
        kind: "incident"
      },
      {
        id: uid("audit"),
        timestamp: minutesAgo(6),
        title: "Incident created",
        detail: "MED-20260322-001 logged for acute chest pain at Collins Street.",
        kind: "incident"
      },
      {
        id: uid("audit"),
        timestamp: minutesAgo(5),
        title: "Unit assigned",
        detail: "MED-402 assigned to MED-20260322-001.",
        kind: "dispatch"
      },
      {
        id: uid("audit"),
        timestamp: minutesAgo(3),
        title: "Status update",
        detail: "MED-402 changed status to En Route.",
        kind: "unit"
      },
      {
        id: uid("audit"),
        timestamp: minutesAgo(1),
        title: "Location update",
        detail: "SUP-01 sent a GPS location update.",
        kind: "location"
      }
    ],
    admin: {
      staffAccounts: cloneStaffAccounts(),
      unitAccounts: cloneUnitAccounts(),
      unitTypes: cloneUnitTypes()
    },
    ui: {
      lastView: "dispatcher",
      activeUnitId: med402.id
    }
  };
}

function loadState() {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const initialState = buildDefaultState();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initialState));
    return initialState;
  }

  try {
    const parsed = JSON.parse(raw);
    return normalizeState(parsed);
  } catch (error) {
    const fallbackState = buildDefaultState();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fallbackState));
    return fallbackState;
  }
}

function normalizeState(candidate) {
  const source = candidate || {};
  const defaults = buildDefaultState();
  const adminState = normalizeAdminState(source.admin);
  return {
    meta: {
      ...defaults.meta,
      ...(source.meta || {}),
      syncMode: source.meta && source.meta.syncMode === "Local demo sync"
        ? "Demo sync"
        : (source.meta && source.meta.syncMode) || defaults.meta.syncMode
    },
    incidents: Array.isArray(source.incidents)
      ? source.incidents.map((incident) => normalizeIncidentRecord(incident))
      : defaults.incidents,
    units: Array.isArray(source.units)
      ? source.units.map((unit) => normalizeUnitRecord(unit, adminState.unitTypes))
      : defaults.units,
    audit: Array.isArray(source.audit) ? source.audit : defaults.audit,
    admin: adminState,
    ui: {
      ...defaults.ui,
      ...(source.ui || {})
    }
  };
}

function normalizeAdminState(adminCandidate = {}) {
  return {
    staffAccounts: Array.isArray(adminCandidate.staffAccounts)
      ? adminCandidate.staffAccounts.map((account) => normalizeStaffAccount(account))
      : cloneStaffAccounts(),
    unitAccounts: Array.isArray(adminCandidate.unitAccounts)
      ? adminCandidate.unitAccounts.map((account) => normalizeUnitAccount(account))
      : cloneUnitAccounts(),
    unitTypes: Array.isArray(adminCandidate.unitTypes)
      ? adminCandidate.unitTypes.map((unitType) => normalizeUnitType(unitType))
      : cloneUnitTypes()
  };
}

function normalizeStaffAccount(account) {
  return {
    id: account.id || account.username,
    username: String(account.username || "").trim().toLowerCase(),
    pin: String(account.pin || ""),
    role: account.role || "dispatcher",
    displayName: account.displayName || account.username || "Staff account",
    enabled: account.enabled !== false
  };
}

function normalizeUnitAccount(account) {
  return {
    id: account.id || account.unitId,
    unitId: String(account.unitId || "").trim().toUpperCase(),
    pin: String(account.pin || ""),
    role: "unit",
    displayName: account.displayName || `${account.unitId || "Unit"} iPad`,
    enabled: account.enabled !== false
  };
}

function normalizeUnitType(unitType) {
  const label = String(unitType.label || unitType.id || "Unit Type").trim();
  return {
    id: normalizeUnitTypeId(unitType.id || label),
    label,
    description: unitType.description || ""
  };
}

function normalizeIncidentRecord(incident) {
  return {
    ...incident,
    assignedUnits: Array.isArray(incident.assignedUnits) ? incident.assignedUnits : [],
    assignmentHistory: Array.isArray(incident.assignmentHistory) ? incident.assignmentHistory : []
  };
}

function normalizeUnitRecord(unit, unitTypes = DEFAULT_UNIT_TYPES) {
  const typeId = normalizeUnitTypeId(unit.typeId || findUnitTypeIdByLabel(unit.type, unitTypes));
  return {
    ...unit,
    typeId,
    type: getUnitTypeLabelById(typeId, unitTypes) || unit.type || "Unit",
    sessionStartedAt: unit.sessionStartedAt || "",
    pendingAlertIncidentId: unit.pendingAlertIncidentId || "",
    activeIncidentViewId: unit.activeIncidentViewId || ""
  };
}

function getStaffAccounts() {
  return state && state.admin && Array.isArray(state.admin.staffAccounts) ? state.admin.staffAccounts : DEFAULT_STAFF_ACCOUNTS;
}

function getUnitPortalAccounts() {
  return state && state.admin && Array.isArray(state.admin.unitAccounts) ? state.admin.unitAccounts : DEFAULT_UNIT_PORTAL_ACCOUNTS;
}

function getUnitTypes() {
  return state && state.admin && Array.isArray(state.admin.unitTypes) ? state.admin.unitTypes : DEFAULT_UNIT_TYPES;
}

function getRoleLabel(role) {
  return ROLE_CONFIG[role] ? ROLE_CONFIG[role].label : "Unknown";
}

function getUnitDisplayType(unit, unitTypes = getUnitTypes()) {
  if (!unit) {
    return "Unit";
  }
  return getUnitTypeLabelById(unit.typeId, unitTypes) || unit.type || "Unit";
}

function syncUnitTypeLabels() {
  const unitTypes = getUnitTypes();
  state.units = state.units.map((unit) => ({
    ...unit,
    typeId: normalizeUnitTypeId(unit.typeId || findUnitTypeIdByLabel(unit.type, unitTypes)),
    type: getUnitTypeLabelById(
      normalizeUnitTypeId(unit.typeId || findUnitTypeIdByLabel(unit.type, unitTypes)),
      unitTypes
    ) || unit.type || "Unit"
  }));
}

function syncCurrentSessionWithState() {
  if (!currentSession) {
    return;
  }

  if (currentSession.role === "unit") {
    const account = getUnitPortalAccounts().find((entry) => entry.unitId === currentSession.unitId && entry.enabled !== false);
    if (!account) {
      if (locationWatchId && navigator.geolocation) {
        navigator.geolocation.clearWatch(locationWatchId);
      }
      locationWatchId = null;
      currentSession = null;
      currentView = getInitialView();
      saveSession();
      return;
    }

    currentSession = {
      ...currentSession,
      role: "unit",
      displayName: account.displayName,
      unitId: account.unitId
    };
    selectedUnitId = currentSession.unitId;
    saveSession();
    return;
  }

  const account = getStaffAccounts().find((entry) => entry.username === currentSession.username && entry.enabled !== false);
  if (!account) {
    currentSession = null;
    currentView = getInitialView();
    saveSession();
    return;
  }

  currentSession = {
    ...currentSession,
    role: account.role,
    username: account.username,
    displayName: account.displayName
  };
  currentView = sanitizeViewForSession(currentView, currentSession);
  saveSession();
}

function loadSession() {
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.role) {
      return null;
    }

    if (parsed.role === "unit") {
      const account = getUnitPortalAccounts().find((entry) => entry.unitId === parsed.unitId && entry.enabled !== false);
      return account
        ? {
            role: account.role,
            displayName: account.displayName,
            unitId: account.unitId,
            loggedInAt: parsed.loggedInAt || new Date().toISOString()
          }
        : null;
    }

    const account = getStaffAccounts().find((entry) => entry.username === parsed.username && entry.enabled !== false);
    return account
      ? {
          role: account.role,
          username: account.username,
          displayName: account.displayName,
          loggedInAt: parsed.loggedInAt || new Date().toISOString()
        }
      : null;
  } catch (error) {
    return null;
  }
}

function cacheStateLocally() {
  state.meta.syncMode = syncModeLabel;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function handleBackendStatusChange(status) {
  if (!status || !status.label) {
    return;
  }

  syncModeLabel = status.label;
  if (status.mode === "firebase") {
    backendMode = "firebase";
  } else if (status.mode === "firebase-pending") {
    backendMode = "firebase-pending";
  } else if (status.mode === "firebase-error") {
    backendMode = "local";
    console.error("Firebase sync error", status.error);
  } else {
    backendMode = "local";
  }

  cacheStateLocally();
  render();
}

function persistStateToFirebase() {
  const nextState = normalizeState(state);
  nextState.meta.syncMode = syncModeLabel;
  persistFirebaseState(nextState).catch((error) => {
    backendMode = "local";
    syncModeLabel = FIREBASE_ERROR_LABEL;
    console.error("Failed to write state to Firebase", error);
    cacheStateLocally();
    render();
  });
}

function saveSession() {
  if (!currentSession) {
    window.localStorage.removeItem(SESSION_KEY);
  } else {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(currentSession));
  }

  if (channel) {
    channel.postMessage({ type: "session-update", session: currentSession });
  }
}

function saveState() {
  state.meta.lastSavedAt = new Date().toISOString();
  cacheStateLocally();
  if (backendMode === "firebase") {
    persistStateToFirebase();
  } else if (channel) {
    channel.postMessage({ type: "state-update", state });
  }
  render();
}

function render() {
  renderAccess();
  if (!currentSession) {
    return;
  }

  currentView = sanitizeViewForSession(currentView, currentSession);
  renderNavigation();
  applyViewState();
  renderHeader();
  renderMetrics();
  renderIncidentBoard();
  renderUnitBoard();
  renderMap();
  renderActivityFeed();
  renderCallPreview();
  populateUnitAccessSelect();
  renderAdminDashboard();
  populateUnitSelect();
  renderUnitConsole();
}

function renderAccess() {
  const authenticated = Boolean(currentSession);
  refs.authShell.classList.toggle("is-hidden", authenticated);
  refs.appShell.classList.toggle("is-hidden", !authenticated);

  if (!authenticated) {
    refs.staffAuthError.textContent = "";
    refs.unitAuthError.textContent = "";
  }

  renderSessionBar();
  renderNavigation();
  applySessionDefaults();
}

function renderSessionBar() {
  if (!currentSession) {
    refs.sessionRoleBadge.textContent = "Not signed in";
    refs.sessionName.textContent = "Unauthenticated";
    refs.sessionNote.textContent = "Log on to access the appropriate workspace.";
    return;
  }

  const roleConfig = ROLE_CONFIG[currentSession.role];
  refs.sessionRoleBadge.textContent = roleConfig.label;
  refs.sessionName.textContent = currentSession.displayName;
  refs.sessionNote.textContent = roleConfig.note;
}

function renderNavigation() {
  refs.modeButtons.forEach((button) => {
    const allowed = canAccessView(button.dataset.viewTarget, currentSession);
    button.classList.toggle("is-hidden", !currentSession || !allowed);
  });
}

function applyViewState() {
  refs.modeButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.viewTarget === currentView);
  });
  Object.entries(refs.views).forEach(([name, element]) => {
    element.classList.toggle("active", name === currentView);
  });
}

function applySessionDefaults() {
  if (currentSession && currentSession.role === "unit") {
    selectedUnitId = currentSession.unitId;
  }
  refs.unitSelect.disabled = Boolean(currentSession && currentSession.role === "unit");
  if (currentSession && currentSession.role === "call_taker") {
    refs.callTakingForm.elements.callTaker.value = currentSession.displayName;
    refs.callTakingForm.elements.callTaker.readOnly = true;
  } else {
    if (!refs.callTakingForm.elements.callTaker.value) {
      refs.callTakingForm.elements.callTaker.value = "Primary Desk";
    }
    refs.callTakingForm.elements.callTaker.readOnly = false;
  }
}

function renderHeader() {
  refs.syncModeBadge.textContent = syncModeLabel;
  refs.lastSavedBadge.textContent = `Last update ${formatRelativeTime(state.meta.lastSavedAt)}`;
  refs.trackingHint.textContent = window.isSecureContext
    ? "This page is in a secure context. Browser geolocation can be used on supported devices."
    : "Browser GPS needs HTTPS or localhost. Use the manual fields below if the device is not in a secure context.";
  refs.operationalNoteText.textContent = backendMode === "firebase" || backendMode === "firebase-pending"
    ? "Dispatcher, call taker, and unit updates are syncing through Firebase Realtime Database."
    : "This prototype shares data inside the browser only. True dispatcher-to-iPad live tracking needs a secure backend API or WebSocket service.";
}

function renderMetrics() {
  const activeIncidents = state.incidents.filter((incident) => incident.status !== "Closed").length;
  const loggedInUnits = state.units.filter((unit) => unit.loggedIn).length;
  const committedUnits = state.units.filter((unit) => !["Available", "Out of Service"].includes(unit.status)).length;
  const latestLocation = state.units
    .map((unit) => unit.location && unit.location.timestamp)
    .filter(Boolean)
    .sort((a, b) => new Date(b) - new Date(a))[0];

  refs.activeIncidentMetric.textContent = String(activeIncidents);
  refs.loggedInMetric.textContent = String(loggedInUnits);
  refs.committedMetric.textContent = String(committedUnits);
  refs.latestPingMetric.textContent = latestLocation ? formatRelativeTime(latestLocation) : "No data";
  refs.incidentQueueCount.textContent = `${activeIncidents} active`;
}

function renderIncidentBoard() {
  if (!state.incidents.length) {
    refs.incidentBoard.innerHTML = '<div class="empty-state">No incidents in the queue.</div>';
    return;
  }

  const sortedIncidents = [...state.incidents].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  refs.incidentBoard.innerHTML = sortedIncidents.map((incident) => {
    const assignableUnits = getAssignableUnits(incident.id);
    const assignedUnitChips = incident.assignedUnits.length
      ? incident.assignedUnits.map((unitId) => `<span class="tag tag-unit">${escapeHtml(unitId)}</span>`).join("")
      : '<span class="tag">Unassigned</span>';

    const statusOptions = INCIDENT_STATUSES.map((status) => {
      const selected = incident.status === status ? "selected" : "";
      return `<option value="${escapeAttribute(status)}" ${selected}>${escapeHtml(status)}</option>`;
    }).join("");

    const assignOptions = [
      '<option value="">Select unit</option>',
      ...assignableUnits.map((unit) => `<option value="${escapeAttribute(unit.id)}">${escapeHtml(unit.id)} • ${escapeHtml(unit.status)}</option>`)
    ].join("");

    return `
      <article class="incident-card level-${incident.determinantLevel.toLowerCase()}">
        <div class="incident-topline">
          <div>
            <h3>${escapeHtml(incident.cadNumber)} • ${escapeHtml(incident.protocolTitle)}</h3>
            <div class="incident-subline">
              <span class="tag tag-code">${escapeHtml(incident.determinantCode)}</span>
              <span class="tag">${escapeHtml(incident.priority)}</span>
              <span class="tag tag-status">${escapeHtml(incident.status)}</span>
            </div>
          </div>
          <span class="tag">${formatRelativeTime(incident.createdAt)}</span>
        </div>
        <div class="card-meta">
          <span>${escapeHtml(incident.locationText)}</span>
          <span>Caller: ${escapeHtml(incident.callerName)}</span>
          <span>Complaint: ${escapeHtml(incident.chiefComplaint)}</span>
        </div>
        <p class="incident-notes">${escapeHtml(incident.notes || "No additional notes entered.")}</p>
        <div class="card-meta">
          <span>${escapeHtml(incident.determinantLevel)} determinant</span>
          <span>Response: ${escapeHtml(incident.responsePlan)}</span>
          <span>${escapeHtml(
            incident.determinantSource === "manual_override"
              ? `Manual override from ${incident.guidedDeterminantCode || "guided recommendation"}`
              : incident.determinantSource === "guided"
                ? "Generated from guided triage"
                : "Protocol code recorded"
          )}</span>
        </div>
        <div class="card-meta">
          <span>${escapeHtml(incident.interrogationSummary || "Guided triage summary not recorded.")}</span>
          <span>Units: ${assignedUnitChips}</span>
        </div>
        <div class="card-actions">
          <select class="action-select" data-role="assign-select" data-incident-id="${escapeAttribute(incident.id)}">
            ${assignOptions}
          </select>
          <button class="secondary-button" data-action="assign-unit" data-incident-id="${escapeAttribute(incident.id)}">Assign unit</button>
          <select class="action-select" data-action="incident-status" data-incident-id="${escapeAttribute(incident.id)}">
            ${statusOptions}
          </select>
          <button class="danger-button" data-action="close-incident" data-incident-id="${escapeAttribute(incident.id)}">Close job</button>
        </div>
      </article>
    `;
  }).join("");
}

function renderUnitBoard() {
  const rows = [...state.units]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((unit) => {
      const incident = unit.assignedIncidentId ? getIncidentById(unit.assignedIncidentId) : null;
      const location = unit.location
        ? `${unit.location.lat.toFixed(4)}, ${unit.location.lng.toFixed(4)}`
        : "No fix";
      const statusClass = !unit.loggedIn
        ? "offline"
        : unit.status === "Available"
          ? "available"
          : "committed";

      return `
        <tr>
          <td>
            <strong>${escapeHtml(unit.id)}</strong><br>
            <span class="hint-text">${escapeHtml(getUnitDisplayType(unit))}${unit.crew ? ` • ${escapeHtml(unit.crew)}` : ""}</span>
          </td>
          <td><span class="status-pill ${statusClass}">${escapeHtml(unit.loggedIn ? unit.status : "Logged off")}</span></td>
          <td>${incident ? `${escapeHtml(incident.cadNumber)}<br><span class="hint-text">${escapeHtml(incident.locationText)}</span>` : '<span class="hint-text">None</span>'}</td>
          <td>${escapeHtml(location)}</td>
          <td>${unit.location && unit.location.timestamp ? formatRelativeTime(unit.location.timestamp) : "No update"}</td>
        </tr>
      `;
    }).join("");

  refs.unitBoardBody.innerHTML = rows || '<tr><td colspan="5">No units configured.</td></tr>';
}

function renderMap() {
  const incidentPoints = state.incidents
    .filter((incident) => incident.coordinates && incident.status !== "Closed")
    .map((incident) => ({
      kind: "incident",
      id: incident.id,
      label: incident.cadNumber,
      lat: incident.coordinates.lat,
      lng: incident.coordinates.lng,
      relatedUnitIds: incident.assignedUnits
    }));

  const unitPoints = state.units
    .filter((unit) => unit.location)
    .map((unit) => ({
      kind: "unit",
      id: unit.id,
      label: unit.id,
      lat: unit.location.lat,
      lng: unit.location.lng,
      assignedIncidentId: unit.assignedIncidentId
    }));

  const points = [...incidentPoints, ...unitPoints];
  if (!points.length) {
    refs.mapCanvas.innerHTML = '<text x="48" y="64" fill="#9eb4c2">No mappable coordinates yet.</text>';
    return;
  }

  const lats = points.map((point) => point.lat);
  const lngs = points.map((point) => point.lng);
  const bounds = {
    minLat: Math.min(...lats) - 0.01,
    maxLat: Math.max(...lats) + 0.01,
    minLng: Math.min(...lngs) - 0.01,
    maxLng: Math.max(...lngs) + 0.01
  };

  const project = (lat, lng) => {
    const padding = 70;
    const width = 960 - padding * 2;
    const height = 520 - padding * 2;
    const x = padding + ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng || 1)) * width;
    const y = padding + (1 - (lat - bounds.minLat) / (bounds.maxLat - bounds.minLat || 1)) * height;
    return { x, y };
  };

  const grid = Array.from({ length: 5 }, (_, index) => {
    const y = 70 + index * 95;
    return `<line x1="40" y1="${y}" x2="920" y2="${y}" stroke="rgba(255,255,255,0.06)" stroke-width="1" />`;
  }).join("");

  const assignmentLines = state.units
    .filter((unit) => unit.assignedIncidentId && unit.location)
    .map((unit) => {
      const incident = getIncidentById(unit.assignedIncidentId);
      if (!incident || !incident.coordinates) {
        return "";
      }

      const unitPoint = project(unit.location.lat, unit.location.lng);
      const incidentPoint = project(incident.coordinates.lat, incident.coordinates.lng);
      return `<line x1="${unitPoint.x}" y1="${unitPoint.y}" x2="${incidentPoint.x}" y2="${incidentPoint.y}" stroke="rgba(240,180,92,0.72)" stroke-width="2" stroke-dasharray="8 8" />`;
    }).join("");

  const incidentMarkup = incidentPoints.map((point) => {
    const plotted = project(point.lat, point.lng);
    return `
      <g>
        <circle cx="${plotted.x}" cy="${plotted.y}" r="10" fill="#ff6b5f" />
        <circle cx="${plotted.x}" cy="${plotted.y}" r="24" fill="rgba(255,107,95,0.12)" />
        <text x="${plotted.x + 16}" y="${plotted.y + 5}" fill="#edf6fb" font-size="14">${escapeHtml(point.label)}</text>
      </g>
    `;
  }).join("");

  const unitMarkup = unitPoints.map((point) => {
    const plotted = project(point.lat, point.lng);
    return `
      <g>
        <rect x="${plotted.x - 10}" y="${plotted.y - 10}" width="20" height="20" rx="5" fill="#1dd0b3" />
        <text x="${plotted.x + 16}" y="${plotted.y + 5}" fill="#9ef2e4" font-size="14">${escapeHtml(point.label)}</text>
      </g>
    `;
  }).join("");

  refs.mapCanvas.innerHTML = `
    <rect x="18" y="18" width="924" height="484" rx="22" fill="rgba(3, 9, 15, 0.28)" stroke="rgba(255,255,255,0.08)" />
    ${grid}
    ${assignmentLines}
    ${incidentMarkup}
    ${unitMarkup}
  `;
}

function renderActivityFeed() {
  const items = [...state.audit]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 14);

  refs.activityFeed.innerHTML = items.length
    ? items.map((entry) => `
      <article class="activity-item">
        <h3>${escapeHtml(entry.title)}</h3>
        <p>${escapeHtml(entry.detail)}</p>
        <span class="activity-time">${formatRelativeTime(entry.timestamp)}</span>
      </article>
    `).join("")
    : '<div class="empty-state">No activity yet.</div>';
}

function renderProtocolQuestionFlow() {
  const family = getSelectedProtocolFamily();
  const flow = getProtocolQuestionFlow(family);
  const formData = new FormData(refs.callTakingForm);

  refs.protocolFlowCopy.textContent = `Select the closest ${family.title.toLowerCase()} profile, then confirm life threats and red flags to generate the determinant code.`;
  refs.protocolQuestionFlow.innerHTML = flow.map((question) => {
    const optionsMarkup = question.options.map((option) => {
      const checked = String(formData.get(question.id) || "") === option.value ? "checked" : "";
      return `
        <label class="question-option">
          <input
            type="radio"
            name="${escapeAttribute(question.id)}"
            value="${escapeAttribute(option.value)}"
            data-triage-input="true"
            ${checked}
            required
          >
          <span>
            <strong>${escapeHtml(option.label)}</strong>
            <span>${escapeHtml(option.description)}</span>
          </span>
        </label>
      `;
    }).join("");

    return `
      <article class="question-card">
        <div class="question-card-head">
          <h4>${escapeHtml(question.prompt)}</h4>
          <p>${escapeHtml(question.hint)}</p>
        </div>
        <div class="question-option-list">
          ${optionsMarkup}
        </div>
      </article>
    `;
  }).join("");

  updateProtocolSummary();
}

function handleProtocolFamilyChange() {
  determinantSelectionMode = "guided";
  populateDeterminantSelect();
  renderProtocolQuestionFlow();
  syncGuidedDeterminant();
  renderCallPreview();
}

function handleDeterminantSelectionChange() {
  determinantSelectionMode = "manual";
  updateProtocolSummary();
  renderCallPreview();
}

function handleCallTakingFormInput(event) {
  if (event.target.matches("[data-triage-input]")) {
    determinantSelectionMode = "guided";
    syncGuidedDeterminant();
  } else if (event.target !== refs.protocolFamilySelect && event.target !== refs.determinantSelect) {
    renderCallPreview();
  }
}

function handleCallTakingFormChange(event) {
  if (event.target.matches("[data-triage-input]")) {
    determinantSelectionMode = "guided";
    syncGuidedDeterminant();
    renderCallPreview();
  }
}

function syncGuidedDeterminant() {
  const guided = getGuidedDetermination();
  if (determinantSelectionMode !== "manual") {
    populateDeterminantSelect(guided.recommended.code);
  }
  updateProtocolSummary(guided);
}

function updateProtocolSummary(guided = getGuidedDetermination()) {
  const selectedDeterminant = getSelectedDeterminant();
  const manualOverride = determinantSelectionMode === "manual" && selectedDeterminant.code !== guided.recommended.code;

  refs.guidedDeterminantBadge.classList.toggle("manual", manualOverride);
  if (manualOverride) {
    refs.guidedDeterminantBadge.textContent = `Manual ${selectedDeterminant.code}`;
  } else if (!guided.hasComplaintProfile) {
    refs.guidedDeterminantBadge.textContent = "Guided code pending";
  } else {
    refs.guidedDeterminantBadge.textContent = `Guided ${guided.recommended.code}`;
  }

  const summaryCopy = manualOverride
    ? `The structured flow recommends ${guided.recommended.code}, but the current determinant is manually set to ${selectedDeterminant.code}.`
    : !guided.hasComplaintProfile
      ? "Select the complaint profile question to anchor the determinant, then confirm life-threat and red-flag findings."
    : guided.ready
      ? `The structured flow currently recommends ${guided.recommended.code} based on the selected complaint profile and red-flag screening.`
      : "Choose an answer for each guided question to fully validate the determinant recommendation.";

  const reasoningMarkup = guided.reasoning.length
    ? `<ul class="protocol-summary-list">${guided.reasoning.map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")}</ul>`
    : '<p class="protocol-summary-copy">No guided responses selected yet.</p>';

  refs.protocolSummary.innerHTML = `
    <div class="protocol-summary-head">
      <span class="tag tag-code">${escapeHtml(manualOverride ? selectedDeterminant.code : guided.recommended.code)}</span>
      <span class="tag">${escapeHtml(manualOverride ? selectedDeterminant.priority : guided.recommended.priority)}</span>
      <span class="tag">${escapeHtml(`${guided.answeredCount}/${guided.totalQuestions} questions answered`)}</span>
      <span class="tag">${escapeHtml(manualOverride ? `Suggested ${guided.recommended.code}` : "Guided selection active")}</span>
    </div>
    <p class="protocol-summary-copy">${escapeHtml(summaryCopy)}</p>
    ${reasoningMarkup}
  `;
}

function renderCallPreview() {
  const family = getSelectedProtocolFamily();
  const determinant = getSelectedDeterminant();
  const guided = getGuidedDetermination();
  const manualOverride = determinantSelectionMode === "manual" && determinant.code !== guided.recommended.code;
  const formData = new FormData(refs.callTakingForm);
  const complaint = formData.get("chiefComplaint") || "Complaint pending";
  const locationText = formData.get("locationText") || "Location pending";

  refs.callPreview.innerHTML = `
    <article class="preview-block">
      <h3 class="preview-title">${escapeHtml(family.title)}</h3>
      <div class="preview-row">
        <div>
          <span class="preview-label">Determinant</span>
          <span class="preview-value mono">${escapeHtml(determinant.code)}</span>
        </div>
        <div>
          <span class="preview-label">Priority</span>
          <span class="preview-value">${escapeHtml(determinant.priority)}</span>
        </div>
        <div>
          <span class="preview-label">Response</span>
          <span class="preview-value">${escapeHtml(determinant.response)}</span>
        </div>
        <div>
          <span class="preview-label">Guided status</span>
          <span class="preview-value">${escapeHtml(
            manualOverride
              ? `Manual override from ${guided.recommended.code}`
              : guided.hasComplaintProfile
                ? `${guided.answeredCount}/${guided.totalQuestions} questions answered`
                : "Complaint profile pending"
          )}</span>
        </div>
        <div>
          <span class="preview-label">Complaint</span>
          <span class="preview-value">${escapeHtml(complaint)}</span>
        </div>
        <div>
          <span class="preview-label">Location</span>
          <span class="preview-value">${escapeHtml(locationText)}</span>
        </div>
      </div>
    </article>
    <article class="preview-block">
      <span class="preview-label">Clinical summary</span>
      <div class="preview-value">${escapeHtml(determinant.label)}</div>
    </article>
    <article class="preview-block">
      <span class="preview-label">Guided triage summary</span>
      <div class="preview-value">${escapeHtml(buildInterrogationSummary(guided))}</div>
    </article>
  `;
}

function renderAdminDashboard() {
  populateAdminDeviceUnitSelect(refs.adminDeviceForm.elements.unitId.value || "");
  populateAdminUnitTypeSelect(refs.adminUnitForm.elements.typeId.value || "");
  populateAdminUnitStatusSelect(refs.adminUnitForm.elements.status.value || "");
  renderAdminReporting();
  renderAdminStaffTable();
  renderAdminDeviceTable();
  renderAdminUnitTypeTable();
  renderAdminUnitTable();
}

function renderAdminReporting() {
  const incidents = [...state.incidents];
  const openIncidents = incidents.filter((incident) => incident.status !== "Closed");
  const priorityOneIncidents = incidents.filter((incident) => incident.priority === "Priority 1");
  const enabledStaff = getStaffAccounts().filter((account) => account.enabled !== false).length;
  const enabledDevices = getUnitPortalAccounts().filter((account) => account.enabled !== false).length;
  const loggedInUnits = state.units.filter((unit) => unit.loggedIn).length;
  const averageDispatchMinutes = getAverageDispatchMinutes();
  const criticalOpenCount = openIncidents.filter((incident) => incident.priority === "Priority 1").length;
  const distinctProtocols = new Set(incidents.map((incident) => incident.protocolFamilyId)).size;

  refs.adminReportMetrics.innerHTML = [
    {
      label: "Open incidents",
      value: String(openIncidents.length),
      hint: `${criticalOpenCount} Priority 1`
    },
    {
      label: "Staff access",
      value: String(enabledStaff),
      hint: `${getStaffAccounts().length} configured`
    },
    {
      label: "Unit iPads",
      value: String(enabledDevices),
      hint: `${loggedInUnits} logged in now`
    },
    {
      label: "Avg dispatch",
      value: averageDispatchMinutes === null ? "N/A" : `${averageDispatchMinutes} min`,
      hint: "Call created to first unit assignment"
    }
  ].map((metric) => `
    <article class="admin-metric-card">
      <span class="preview-label">${escapeHtml(metric.label)}</span>
      <strong>${escapeHtml(metric.value)}</strong>
      <span class="hint-text">${escapeHtml(metric.hint)}</span>
    </article>
  `).join("");

  refs.adminIncidentReportBody.innerHTML = [
    ["Total incidents", incidents.length],
    ["Pending dispatch", incidents.filter((incident) => incident.status === "Pending Dispatch").length],
    ["Assigned or responding", incidents.filter((incident) => ["Units Assigned", "En Route", "On Scene", "Transporting", "At Hospital"].includes(incident.status)).length],
    ["Closed jobs", incidents.filter((incident) => incident.status === "Closed").length],
    ["Priority 1 cases", priorityOneIncidents.length],
    ["Protocol families used", distinctProtocols]
  ].map(([label, value]) => `
    <tr>
      <td>${escapeHtml(String(label))}</td>
      <td>${escapeHtml(String(value))}</td>
    </tr>
  `).join("");

  const statusCounts = [
    ...UNIT_STATUSES.map((status) => ({
      label: status,
      count: state.units.filter((unit) => unit.loggedIn && unit.status === status).length
    })),
    {
      label: "Logged off",
      count: state.units.filter((unit) => !unit.loggedIn).length
    }
  ];

  refs.adminUnitStatusReportBody.innerHTML = statusCounts.map((entry) => `
    <tr>
      <td>${escapeHtml(entry.label)}</td>
      <td>${escapeHtml(String(entry.count))}</td>
    </tr>
  `).join("");
}

function renderAdminStaffTable() {
  const rows = [...getStaffAccounts()]
    .sort((a, b) => a.username.localeCompare(b.username))
    .map((account) => `
      <tr>
        <td>
          <strong>${escapeHtml(account.username)}</strong><br>
          <span class="hint-text">${escapeHtml(account.displayName)}</span>
        </td>
        <td>${escapeHtml(getRoleLabel(account.role))}</td>
        <td><span class="status-pill ${account.enabled !== false ? "available" : "offline"}">${escapeHtml(account.enabled !== false ? "Enabled" : "Disabled")}</span></td>
        <td class="admin-action-cell">
          <button class="secondary-button" type="button" data-admin-action="edit-staff" data-record-id="${escapeAttribute(account.id)}">Edit</button>
          <button class="${account.enabled !== false ? "danger-button" : "secondary-button"}" type="button" data-admin-action="toggle-staff" data-record-id="${escapeAttribute(account.id)}">${escapeHtml(account.enabled !== false ? "Disable" : "Enable")}</button>
        </td>
      </tr>
    `).join("");

  refs.adminStaffTableBody.innerHTML = rows || '<tr><td colspan="4">No staff users configured.</td></tr>';
}

function renderAdminDeviceTable() {
  const rows = [...getUnitPortalAccounts()]
    .sort((a, b) => a.unitId.localeCompare(b.unitId))
    .map((account) => {
      const unit = getUnitById(account.unitId);
      return `
        <tr>
          <td>
            <strong>${escapeHtml(account.unitId)}</strong><br>
            <span class="hint-text">${escapeHtml(unit ? getUnitDisplayType(unit) : "Linked unit missing")}</span>
          </td>
          <td>${escapeHtml(account.displayName)}</td>
          <td><span class="status-pill ${account.enabled !== false ? "available" : "offline"}">${escapeHtml(account.enabled !== false ? "Enabled" : "Disabled")}</span></td>
          <td class="admin-action-cell">
            <button class="secondary-button" type="button" data-admin-action="edit-device" data-record-id="${escapeAttribute(account.id)}">Edit</button>
            <button class="${account.enabled !== false ? "danger-button" : "secondary-button"}" type="button" data-admin-action="toggle-device" data-record-id="${escapeAttribute(account.id)}">${escapeHtml(account.enabled !== false ? "Disable" : "Enable")}</button>
          </td>
        </tr>
      `;
    }).join("");

  refs.adminDeviceTableBody.innerHTML = rows || '<tr><td colspan="4">No unit iPad access records configured.</td></tr>';
}

function renderAdminUnitTypeTable() {
  const rows = [...getUnitTypes()]
    .sort((a, b) => a.label.localeCompare(b.label))
    .map((unitType) => `
      <tr>
        <td><strong>${escapeHtml(unitType.label)}</strong></td>
        <td>${escapeHtml(unitType.description || "No description")}</td>
        <td>${escapeHtml(String(state.units.filter((unit) => normalizeUnitTypeId(unit.typeId) === unitType.id).length))}</td>
        <td class="admin-action-cell">
          <button class="secondary-button" type="button" data-admin-action="edit-unit-type" data-record-id="${escapeAttribute(unitType.id)}">Edit</button>
        </td>
      </tr>
    `).join("");

  refs.adminUnitTypeTableBody.innerHTML = rows || '<tr><td colspan="4">No unit types configured.</td></tr>';
}

function renderAdminUnitTable() {
  const rows = [...state.units]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((unit) => {
      const locationText = unit.location
        ? `${unit.location.lat.toFixed(4)}, ${unit.location.lng.toFixed(4)}`
        : "No fix";
      const locationNote = unit.location && unit.location.note ? unit.location.note : "No note";
      const pillClass = !unit.loggedIn
        ? "offline"
        : unit.status === "Available"
          ? "available"
          : "committed";

      return `
        <tr>
          <td>
            <strong>${escapeHtml(unit.id)}</strong><br>
            <span class="hint-text">${escapeHtml(unit.deviceLabel || "No device label")}</span>
          </td>
          <td>${escapeHtml(getUnitDisplayType(unit))}</td>
          <td><span class="status-pill ${pillClass}">${escapeHtml(unit.loggedIn ? unit.status : "Logged off")}</span></td>
          <td>
            ${escapeHtml(locationText)}<br>
            <span class="hint-text">${escapeHtml(locationNote)}</span>
          </td>
          <td class="admin-action-cell">
            <button class="secondary-button" type="button" data-admin-action="edit-unit" data-record-id="${escapeAttribute(unit.id)}">Edit</button>
          </td>
        </tr>
      `;
    }).join("");

  refs.adminUnitTableBody.innerHTML = rows || '<tr><td colspan="5">No units configured.</td></tr>';
}

function getAverageDispatchMinutes() {
  const dispatchTimes = state.incidents
    .map((incident) => {
      const firstAssignment = [...(incident.assignmentHistory || [])]
        .sort((a, b) => new Date(a.assignedAt) - new Date(b.assignedAt))[0];
      if (!firstAssignment) {
        return null;
      }
      const minutes = Math.max(0, Math.round((new Date(firstAssignment.assignedAt) - new Date(incident.createdAt)) / 60000));
      return Number.isFinite(minutes) ? minutes : null;
    })
    .filter((minutes) => minutes !== null);

  if (!dispatchTimes.length) {
    return null;
  }

  return Math.round(dispatchTimes.reduce((sum, minutes) => sum + minutes, 0) / dispatchTimes.length);
}

function setAdminMessage(ref, message, kind = "info") {
  if (!ref) {
    return;
  }
  ref.textContent = message;
  ref.dataset.kind = kind;
}

function clearAdminMessage(ref) {
  if (!ref) {
    return;
  }
  ref.textContent = "";
  delete ref.dataset.kind;
}

function getAdminMessageRefForForm(form) {
  if (form === refs.adminStaffForm) {
    return refs.adminStaffMessage;
  }
  if (form === refs.adminDeviceForm) {
    return refs.adminDeviceMessage;
  }
  if (form === refs.adminUnitTypeForm) {
    return refs.adminUnitTypeMessage;
  }
  if (form === refs.adminUnitForm) {
    return refs.adminUnitMessage;
  }
  return null;
}

function handleAdminFormReset(event) {
  const form = event.target;
  const preserveMessage = form.dataset.preserveMessage === "true";
  window.requestAnimationFrame(() => {
    form.elements.recordId.value = "";
    if (form === refs.adminDeviceForm) {
      populateAdminDeviceUnitSelect("");
    }
    if (form === refs.adminUnitForm) {
      populateAdminUnitTypeSelect("");
      populateAdminUnitStatusSelect("Available");
    }
    if (!preserveMessage) {
      clearAdminMessage(getAdminMessageRefForForm(form));
    }
    delete form.dataset.preserveMessage;
  });
}

function handleAdminStaffSubmit(event) {
  event.preventDefault();
  if (!hasRole("admin")) {
    return;
  }

  const form = refs.adminStaffForm;
  const formData = new FormData(form);
  const recordId = String(formData.get("recordId") || "").trim();
  const username = String(formData.get("username") || "").trim().toLowerCase();
  const displayName = String(formData.get("displayName") || "").trim();
  const role = String(formData.get("role") || "").trim();
  const pin = String(formData.get("pin") || "").trim();
  const enabled = formData.get("enabled") === "on";
  const accounts = getStaffAccounts();
  const existing = accounts.find((account) => account.id === recordId) || null;

  if (!username || !displayName || !pin || !ROLE_CONFIG[role] || role === "unit") {
    setAdminMessage(refs.adminStaffMessage, "Enter a username, display name, role, and PIN for the staff account.", "error");
    return;
  }

  if (accounts.some((account) => account.username === username && account.id !== recordId)) {
    setAdminMessage(refs.adminStaffMessage, "That staff username is already in use.", "error");
    return;
  }

  const otherEnabledAdmins = accounts.filter((account) => account.id !== recordId && account.role === "admin" && account.enabled !== false).length;
  if (!enabled || role !== "admin") {
    if (existing && existing.role === "admin" && existing.enabled !== false && otherEnabledAdmins === 0) {
      setAdminMessage(refs.adminStaffMessage, "At least one enabled admin account must remain available.", "error");
      return;
    }
  }

  const nextAccount = normalizeStaffAccount({
    id: recordId || username,
    username,
    displayName,
    role,
    pin,
    enabled
  });

  if (existing) {
    const index = accounts.findIndex((account) => account.id === existing.id);
    accounts[index] = nextAccount;
    if (currentSession && currentSession.username === existing.username) {
      if (!nextAccount.enabled) {
        currentSession = null;
        currentView = getInitialView();
      } else {
        currentSession = {
          ...currentSession,
          role: nextAccount.role,
          username: nextAccount.username,
          displayName: nextAccount.displayName
        };
        currentView = sanitizeViewForSession(currentView, currentSession);
      }
      saveSession();
    }
    addAudit("Admin update", `Staff user ${nextAccount.username} updated.`, "admin");
  } else {
    accounts.push(nextAccount);
    addAudit("Admin update", `Staff user ${nextAccount.username} created.`, "admin");
  }

  form.dataset.preserveMessage = "true";
  form.reset();
  saveState();
  setAdminMessage(refs.adminStaffMessage, `${nextAccount.username} saved.`, "success");
}

function handleAdminDeviceSubmit(event) {
  event.preventDefault();
  if (!hasRole("admin")) {
    return;
  }

  const form = refs.adminDeviceForm;
  const formData = new FormData(form);
  const recordId = String(formData.get("recordId") || "").trim();
  const unitId = String(formData.get("unitId") || "").trim().toUpperCase();
  const displayName = String(formData.get("displayName") || "").trim();
  const pin = String(formData.get("pin") || "").trim();
  const enabled = formData.get("enabled") === "on";
  const accounts = getUnitPortalAccounts();
  const existing = accounts.find((account) => account.id === recordId) || null;

  if (!unitId || !displayName || !pin) {
    setAdminMessage(refs.adminDeviceMessage, "Select a unit, then enter a display name and PIN for the iPad access record.", "error");
    return;
  }

  if (!getUnitById(unitId)) {
    setAdminMessage(refs.adminDeviceMessage, "That linked unit does not exist in the fleet registry.", "error");
    return;
  }

  if (accounts.some((account) => account.unitId === unitId && account.id !== recordId)) {
    setAdminMessage(refs.adminDeviceMessage, "A device access record already exists for that unit.", "error");
    return;
  }

  const nextAccount = normalizeUnitAccount({
    id: recordId || unitId,
    unitId,
    displayName,
    pin,
    enabled
  });

  if (existing) {
    const index = accounts.findIndex((account) => account.id === existing.id);
    accounts[index] = nextAccount;
    addAudit("Admin update", `Unit iPad access for ${nextAccount.unitId} updated.`, "admin");
  } else {
    accounts.push(nextAccount);
    addAudit("Admin update", `Unit iPad access for ${nextAccount.unitId} created.`, "admin");
  }

  populateUnitAccessSelect();
  form.dataset.preserveMessage = "true";
  form.reset();
  saveState();
  setAdminMessage(refs.adminDeviceMessage, `${nextAccount.unitId} iPad access saved.`, "success");
}

function handleAdminUnitTypeSubmit(event) {
  event.preventDefault();
  if (!hasRole("admin")) {
    return;
  }

  const form = refs.adminUnitTypeForm;
  const formData = new FormData(form);
  const recordId = String(formData.get("recordId") || "").trim();
  const label = String(formData.get("label") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const unitTypes = getUnitTypes();

  if (!label) {
    setAdminMessage(refs.adminUnitTypeMessage, "Enter a label for the unit type.", "error");
    return;
  }

  const nextUnitType = normalizeUnitType({
    id: recordId || label,
    label,
    description
  });

  if (unitTypes.some((unitType) => unitType.id === nextUnitType.id && unitType.id !== recordId)) {
    setAdminMessage(refs.adminUnitTypeMessage, "That unit type label already exists.", "error");
    return;
  }

  if (unitTypes.some((unitType) => normalizeUnitTypeId(unitType.label) === normalizeUnitTypeId(label) && unitType.id !== recordId)) {
    setAdminMessage(refs.adminUnitTypeMessage, "That unit type label already exists.", "error");
    return;
  }

  const existingIndex = unitTypes.findIndex((unitType) => unitType.id === recordId);
  if (existingIndex >= 0) {
    unitTypes[existingIndex] = nextUnitType;
    addAudit("Admin update", `Unit type ${nextUnitType.label} updated.`, "admin");
  } else {
    unitTypes.push(nextUnitType);
    addAudit("Admin update", `Unit type ${nextUnitType.label} created.`, "admin");
  }

  syncUnitTypeLabels();
  form.dataset.preserveMessage = "true";
  form.reset();
  saveState();
  setAdminMessage(refs.adminUnitTypeMessage, `${nextUnitType.label} saved.`, "success");
}

function handleAdminUnitSubmit(event) {
  event.preventDefault();
  if (!hasRole("admin")) {
    return;
  }

  const form = refs.adminUnitForm;
  const formData = new FormData(form);
  const recordId = String(formData.get("recordId") || "").trim();
  const unitId = String(formData.get("unitId") || "").trim().toUpperCase();
  const typeId = String(formData.get("typeId") || "").trim();
  const status = String(formData.get("status") || "").trim();
  const crew = String(formData.get("crew") || "").trim();
  const deviceLabel = String(formData.get("deviceLabel") || "").trim();
  const latitude = String(formData.get("latitude") || "").trim();
  const longitude = String(formData.get("longitude") || "").trim();
  const locationNote = String(formData.get("locationNote") || "").trim();
  const loggedIn = formData.get("loggedIn") === "on";
  const unitTypes = getUnitTypes();
  const existing = state.units.find((unit) => unit.id === recordId) || null;
  const now = new Date().toISOString();

  if (!unitId || !typeId || !UNIT_STATUSES.includes(status)) {
    setAdminMessage(refs.adminUnitMessage, "Enter a unit ID, type, and status for the fleet record.", "error");
    return;
  }

  if (!unitTypes.some((unitType) => unitType.id === typeId)) {
    setAdminMessage(refs.adminUnitMessage, "Select a valid unit type before saving the fleet record.", "error");
    return;
  }

  if (state.units.some((unit) => unit.id === unitId && unit.id !== recordId)) {
    setAdminMessage(refs.adminUnitMessage, "That unit ID is already registered.", "error");
    return;
  }

  if ((latitude && !longitude) || (!latitude && longitude)) {
    setAdminMessage(refs.adminUnitMessage, "Enter both latitude and longitude, or leave both blank.", "error");
    return;
  }

  const coordinates = latitude && longitude ? createCoordinates(latitude, longitude) : null;
  if ((latitude || longitude) && !coordinates) {
    setAdminMessage(refs.adminUnitMessage, "Latitude and longitude must be valid numeric coordinates.", "error");
    return;
  }

  if (existing && existing.id !== unitId) {
    state.incidents.forEach((incident) => {
      incident.assignedUnits = incident.assignedUnits.map((assignedUnitId) => assignedUnitId === existing.id ? unitId : assignedUnitId);
      incident.assignmentHistory = (incident.assignmentHistory || []).map((entry) => ({
        ...entry,
        unitId: entry.unitId === existing.id ? unitId : entry.unitId
      }));
    });
    getUnitPortalAccounts().forEach((account) => {
      if (account.unitId === existing.id) {
        account.unitId = unitId;
        if (account.id === existing.id) {
          account.id = unitId;
        }
      }
    });
    if (state.ui.activeUnitId === existing.id) {
      state.ui.activeUnitId = unitId;
    }
    if (selectedUnitId === existing.id) {
      selectedUnitId = unitId;
    }
  }

  const nextUnit = {
    id: unitId,
    typeId,
    type: getUnitTypeLabelById(typeId, unitTypes) || "Unit",
    crew,
    deviceLabel,
    status,
    loggedIn,
    sessionStartedAt: loggedIn ? (existing && existing.sessionStartedAt) || now : "",
    pendingAlertIncidentId: loggedIn && existing ? existing.pendingAlertIncidentId || "" : "",
    activeIncidentViewId: loggedIn && existing ? existing.activeIncidentViewId || "" : "",
    assignedIncidentId: existing ? existing.assignedIncidentId || "" : "",
    location: coordinates
      ? {
          lat: coordinates.lat,
          lng: coordinates.lng,
          accuracy: existing && existing.location ? existing.location.accuracy : 15,
          source: "Admin",
          note: locationNote,
          timestamp: now
        }
      : null,
    lastStatusChange: existing && existing.status === status ? existing.lastStatusChange : now
  };

  if (existing) {
    const index = state.units.findIndex((unit) => unit.id === recordId);
    state.units[index] = {
      ...existing,
      ...nextUnit
    };
    addAudit("Admin update", `Unit ${unitId} updated in the fleet registry.`, "admin");
  } else {
    state.units.push(nextUnit);
    addAudit("Admin update", `Unit ${unitId} created in the fleet registry.`, "admin");
  }

  populateUnitAccessSelect();
  form.dataset.preserveMessage = "true";
  form.reset();
  saveState();
  setAdminMessage(refs.adminUnitMessage, `${unitId} saved.`, "success");
}

function handleAdminViewClick(event) {
  if (!hasRole("admin")) {
    return;
  }

  const actionButton = event.target.closest("[data-admin-action]");
  if (!actionButton) {
    return;
  }

  const recordId = actionButton.dataset.recordId || "";

  if (actionButton.dataset.adminAction === "edit-staff") {
    const account = getStaffAccounts().find((entry) => entry.id === recordId);
    if (!account) {
      return;
    }
    refs.adminStaffForm.elements.recordId.value = account.id;
    refs.adminStaffForm.elements.username.value = account.username;
    refs.adminStaffForm.elements.displayName.value = account.displayName;
    refs.adminStaffForm.elements.role.value = account.role;
    refs.adminStaffForm.elements.pin.value = account.pin;
    refs.adminStaffForm.elements.enabled.checked = account.enabled !== false;
    setAdminMessage(refs.adminStaffMessage, `Editing ${account.username}.`, "info");
  }

  if (actionButton.dataset.adminAction === "toggle-staff") {
    const account = getStaffAccounts().find((entry) => entry.id === recordId);
    if (!account) {
      return;
    }
    const otherEnabledAdmins = getStaffAccounts().filter((entry) => entry.id !== account.id && entry.role === "admin" && entry.enabled !== false).length;
    if (account.role === "admin" && account.enabled !== false && otherEnabledAdmins === 0) {
      setAdminMessage(refs.adminStaffMessage, "At least one enabled admin account must remain available.", "error");
      return;
    }
    account.enabled = account.enabled === false;
    if (currentSession && currentSession.username === account.username) {
      if (account.enabled === false) {
        currentSession = null;
        currentView = getInitialView();
      } else {
        currentSession.displayName = account.displayName;
      }
      saveSession();
    }
    addAudit("Admin update", `Staff user ${account.username} ${account.enabled !== false ? "enabled" : "disabled"}.`, "admin");
    saveState();
    setAdminMessage(refs.adminStaffMessage, `${account.username} ${account.enabled !== false ? "enabled" : "disabled"}.`, "success");
  }

  if (actionButton.dataset.adminAction === "edit-device") {
    const account = getUnitPortalAccounts().find((entry) => entry.id === recordId);
    if (!account) {
      return;
    }
    refs.adminDeviceForm.elements.recordId.value = account.id;
    populateAdminDeviceUnitSelect(account.unitId);
    refs.adminDeviceForm.elements.displayName.value = account.displayName;
    refs.adminDeviceForm.elements.pin.value = account.pin;
    refs.adminDeviceForm.elements.enabled.checked = account.enabled !== false;
    setAdminMessage(refs.adminDeviceMessage, `Editing ${account.unitId} iPad access.`, "info");
  }

  if (actionButton.dataset.adminAction === "toggle-device") {
    const account = getUnitPortalAccounts().find((entry) => entry.id === recordId);
    if (!account) {
      return;
    }
    account.enabled = account.enabled === false;
    populateUnitAccessSelect();
    addAudit("Admin update", `Unit iPad access for ${account.unitId} ${account.enabled !== false ? "enabled" : "disabled"}.`, "admin");
    saveState();
    setAdminMessage(refs.adminDeviceMessage, `${account.unitId} iPad access ${account.enabled !== false ? "enabled" : "disabled"}.`, "success");
  }

  if (actionButton.dataset.adminAction === "edit-unit-type") {
    const unitType = getUnitTypes().find((entry) => entry.id === recordId);
    if (!unitType) {
      return;
    }
    refs.adminUnitTypeForm.elements.recordId.value = unitType.id;
    refs.adminUnitTypeForm.elements.label.value = unitType.label;
    refs.adminUnitTypeForm.elements.description.value = unitType.description;
    setAdminMessage(refs.adminUnitTypeMessage, `Editing ${unitType.label}.`, "info");
  }

  if (actionButton.dataset.adminAction === "edit-unit") {
    const unit = getUnitById(recordId);
    if (!unit) {
      return;
    }
    refs.adminUnitForm.elements.recordId.value = unit.id;
    refs.adminUnitForm.elements.unitId.value = unit.id;
    populateAdminUnitTypeSelect(unit.typeId);
    populateAdminUnitStatusSelect(unit.status);
    refs.adminUnitForm.elements.crew.value = unit.crew || "";
    refs.adminUnitForm.elements.deviceLabel.value = unit.deviceLabel || "";
    refs.adminUnitForm.elements.latitude.value = unit.location ? unit.location.lat : "";
    refs.adminUnitForm.elements.longitude.value = unit.location ? unit.location.lng : "";
    refs.adminUnitForm.elements.locationNote.value = unit.location ? unit.location.note || "" : "";
    refs.adminUnitForm.elements.loggedIn.checked = unit.loggedIn;
    setAdminMessage(refs.adminUnitMessage, `Editing ${unit.id}.`, "info");
  }
}

function renderUnitConsole() {
  const unit = getUnitById(selectedUnitId || refs.unitSelect.value);
  const sessionActive = Boolean(unit && unit.sessionStartedAt);

  refs.unitLoginScreen.classList.toggle("is-hidden", sessionActive);
  refs.unitOpsScreen.classList.toggle("is-hidden", !sessionActive);

  if (!unit) {
    refs.unitSummary.innerHTML = '<div class="empty-state">No unit selected for this iPad.</div>';
    refs.assignedJobs.innerHTML = '<div class="empty-state">No case data is available.</div>';
    refs.unitJobDetail.innerHTML = '<div class="panel-body"><div class="empty-state">No unit case is open.</div></div>';
    refs.unitDispatchAlertScreen.classList.add("is-hidden");
    refs.unitDispatchAlertScreen.innerHTML = "";
    updateStatusButtons(null);
    return;
  }

  refs.unitSelect.value = unit.id;
  if (!sessionActive) {
    if (!refs.unitLoginForm.elements.crewName.value) {
      refs.unitLoginForm.elements.crewName.value = unit.crew || "";
    }
    if (!refs.unitLoginForm.elements.deviceLabel.value) {
      refs.unitLoginForm.elements.deviceLabel.value = unit.deviceLabel || `iPad ${unit.id}`;
    }
    refs.unitSummary.innerHTML = "";
    refs.assignedJobs.innerHTML = "";
    refs.unitJobDetail.innerHTML = "";
    refs.unitDispatchAlertScreen.classList.add("is-hidden");
    refs.unitDispatchAlertScreen.innerHTML = "";
    refs.unitCasePanel.classList.remove("is-hidden");
    updateStatusButtons(null);
    return;
  }

  refs.unitSummary.innerHTML = `
    <article class="unit-summary-card">
      <div>
        <p class="panel-kicker">Unit active</p>
        <h2>${escapeHtml(unit.id)} • ${escapeHtml(getUnitDisplayType(unit))}</h2>
        <p>${escapeHtml(unit.crew || "Crew not recorded")} • ${escapeHtml(unit.deviceLabel || "Device not labelled")}</p>
      </div>
      <div class="unit-summary-meta">
        <span class="tag tag-status">${escapeHtml(unit.status)}</span>
        <span class="tag">${escapeHtml(unit.assignedIncidentId || "No live dispatch")}</span>
        <span class="tag">${escapeHtml(unit.location && unit.location.timestamp ? `Location ${formatRelativeTime(unit.location.timestamp)}` : "No location fix")}</span>
      </div>
    </article>
  `;

  updateStatusButtons(unit);
  renderAssignedJobs(unit);
  renderUnitJobDetail(unit);
  renderUnitDispatchAlert(unit);
  refs.unitCasePanel.classList.toggle("is-hidden", Boolean(unit.activeIncidentViewId));
}

function renderAssignedJobs(unit) {
  if (!unit) {
    refs.assignedJobs.innerHTML = '<div class="empty-state">No unit selected.</div>';
    return;
  }

  const jobs = getUnitSessionIncidents(unit);
  refs.assignedJobs.innerHTML = jobs.length
    ? jobs.map(({ incident, assignedAt, currentAssignment }) => {
      const active = unit.activeIncidentViewId === incident.id ? " job-card-active" : "";
      const alerting = unit.pendingAlertIncidentId === incident.id ? " job-card-alert" : "";
      return `
        <article class="job-card unit-job-card${active}${alerting}" data-unit-action="open-incident" data-incident-id="${escapeAttribute(incident.id)}">
          <div class="unit-job-card-head">
            <div>
              <h3>${escapeHtml(incident.cadNumber)}</h3>
              <p>${escapeHtml(incident.locationText)}</p>
            </div>
            <span class="tag">${escapeHtml(currentAssignment ? "Current" : "Session history")}</span>
          </div>
          <p>${escapeHtml(incident.chiefComplaint)}</p>
          <div class="incident-subline">
            <span class="tag tag-code">${escapeHtml(incident.determinantCode)}</span>
            <span class="tag tag-status">${escapeHtml(incident.status)}</span>
            <span class="tag">${escapeHtml(`Assigned ${formatRelativeTime(assignedAt)}`)}</span>
          </div>
          <div class="card-actions">
            <button class="secondary-button" type="button" data-unit-action="open-incident" data-incident-id="${escapeAttribute(incident.id)}">Open case</button>
            ${currentAssignment && incident.status !== "En Route"
              ? `<button class="primary-button" type="button" data-unit-action="acknowledge-dispatch" data-incident-id="${escapeAttribute(incident.id)}">En Route</button>`
              : ""}
          </div>
        </article>
      `;
    }).join("")
    : '<div class="empty-state">No cases have been assigned during this login period.</div>';
}

function renderUnitJobDetail(unit) {
  const incident = getUnitActiveIncident(unit);
  if (!incident) {
    refs.unitJobDetail.innerHTML = `
      <div class="panel-header">
        <div>
          <p class="panel-kicker">Job detail</p>
          <h2>No case open</h2>
        </div>
      </div>
      <div class="panel-body">
        <div class="empty-state">Open a case from the list above, or accept a new dispatch from the alert screen.</div>
      </div>
    `;
    return;
  }

  refs.unitJobDetail.innerHTML = `
    <div class="panel-header">
      <div>
        <p class="panel-kicker">Job detail</p>
        <h2>${escapeHtml(incident.cadNumber)} • ${escapeHtml(incident.protocolTitle)}</h2>
      </div>
      <div class="card-actions">
        <button class="secondary-button" type="button" data-unit-action="clear-active-incident">Back to case list</button>
      </div>
    </div>
    <div class="panel-body unit-job-layout">
      <div class="unit-job-copy">
        <div class="incident-subline">
          <span class="tag tag-code">${escapeHtml(incident.determinantCode)}</span>
          <span class="tag">${escapeHtml(incident.priority)}</span>
          <span class="tag tag-status">${escapeHtml(incident.status)}</span>
        </div>
        <div class="summary-grid">
          <div>
            <span class="preview-label">Location</span>
            <div class="preview-value">${escapeHtml(incident.locationText)}</div>
          </div>
          <div>
            <span class="preview-label">Caller</span>
            <div class="preview-value">${escapeHtml(incident.callerName)}</div>
          </div>
          <div>
            <span class="preview-label">Callback</span>
            <div class="preview-value">${escapeHtml(incident.callback || "Not recorded")}</div>
          </div>
          <div>
            <span class="preview-label">Patient</span>
            <div class="preview-value">${escapeHtml(formatPatientDescriptor(incident))}</div>
          </div>
        </div>
        <article class="preview-block">
          <span class="preview-label">Chief complaint</span>
          <div class="preview-value">${escapeHtml(incident.chiefComplaint)}</div>
        </article>
        <article class="preview-block">
          <span class="preview-label">Dispatch notes</span>
          <div class="preview-value">${escapeHtml(incident.notes || "No additional notes entered.")}</div>
        </article>
        <article class="preview-block">
          <span class="preview-label">Response plan</span>
          <div class="preview-value">${escapeHtml(incident.responsePlan)}</div>
          <span class="activity-time">${escapeHtml(incident.interrogationSummary || "No guided triage summary recorded.")}</span>
        </article>
      </div>
      <div class="unit-map-panel">
        <div class="unit-map-frame-wrap">
          ${renderUnitMapFrame(incident)}
        </div>
        <div class="tracking-actions">
          <a class="primary-button button-link" href="${escapeAttribute(getGoogleMapsUrl(incident))}" target="_blank" rel="noreferrer">Open Google Maps</a>
          <a class="secondary-button button-link" href="${escapeAttribute(getAppleMapsUrl(incident))}" target="_blank" rel="noreferrer">Open Apple Maps</a>
          ${incident.status !== "En Route"
            ? `<button class="primary-button" type="button" data-unit-action="acknowledge-dispatch" data-incident-id="${escapeAttribute(incident.id)}">En Route</button>`
            : ""}
        </div>
      </div>
    </div>
  `;
}

function renderUnitDispatchAlert(unit) {
  const incident = getUnitPendingAlertIncident(unit);
  const hasAlert = Boolean(incident);
  refs.unitDispatchAlertScreen.classList.toggle("is-hidden", !hasAlert);
  refs.unitDispatchAlertScreen.innerHTML = hasAlert
    ? `
      <div class="unit-alert-card">
        <p class="panel-kicker">New dispatch</p>
        <h2>${escapeHtml(incident.cadNumber)}</h2>
        <p class="unit-alert-location">${escapeHtml(incident.locationText)}</p>
        <p class="unit-alert-copy">${escapeHtml(incident.chiefComplaint)}</p>
        <div class="incident-subline">
          <span class="tag tag-code">${escapeHtml(incident.determinantCode)}</span>
          <span class="tag">${escapeHtml(incident.priority)}</span>
          <span class="tag tag-status">${escapeHtml(incident.status)}</span>
        </div>
        <button class="primary-button" type="button" data-unit-action="acknowledge-dispatch" data-incident-id="${escapeAttribute(incident.id)}">En Route</button>
      </div>
    `
    : "";
}

function populateUnitAccessSelect() {
  refs.unitAccessSelect.innerHTML = [
    '<option value="">Select device</option>',
    ...getUnitPortalAccounts()
      .filter((account) => account.enabled !== false)
      .sort((a, b) => a.unitId.localeCompare(b.unitId))
      .map((account) => (
      `<option value="${escapeAttribute(account.unitId)}">${escapeHtml(account.unitId)} • ${escapeHtml(account.displayName)}</option>`
    ))
  ].join("");
}

function populateAdminDeviceUnitSelect(selectedUnitId = "") {
  refs.adminDeviceUnitSelect.innerHTML = [
    '<option value="">Select unit</option>',
    ...[...state.units]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((unit) => (
        `<option value="${escapeAttribute(unit.id)}">${escapeHtml(unit.id)} • ${escapeHtml(getUnitDisplayType(unit))}</option>`
      ))
  ].join("");
  refs.adminDeviceUnitSelect.value = selectedUnitId && state.units.some((unit) => unit.id === selectedUnitId)
    ? selectedUnitId
    : "";
}

function populateAdminUnitTypeSelect(selectedTypeId = "") {
  const unitTypes = [...getUnitTypes()];
  refs.adminUnitTypeSelect.innerHTML = unitTypes
    .sort((a, b) => a.label.localeCompare(b.label))
    .map((unitType) => `<option value="${escapeAttribute(unitType.id)}">${escapeHtml(unitType.label)}</option>`)
    .join("");
  if (!refs.adminUnitTypeSelect.options.length) {
    return;
  }
  refs.adminUnitTypeSelect.value = unitTypes.some((unitType) => unitType.id === selectedTypeId)
    ? selectedTypeId
    : refs.adminUnitTypeSelect.options[0].value;
}

function populateAdminUnitStatusSelect(selectedStatus = "") {
  refs.adminUnitStatusSelect.innerHTML = UNIT_STATUSES
    .map((status) => `<option value="${escapeAttribute(status)}">${escapeHtml(status)}</option>`)
    .join("");
  if (!refs.adminUnitStatusSelect.options.length) {
    return;
  }
  refs.adminUnitStatusSelect.value = UNIT_STATUSES.includes(selectedStatus)
    ? selectedStatus
    : UNIT_STATUSES[0];
}

function populateProtocolFamilySelect() {
  refs.protocolFamilySelect.innerHTML = PROTOCOL_FAMILIES
    .map((family) => `<option value="${escapeAttribute(family.id)}">${escapeHtml(family.id)} • ${escapeHtml(family.title)}</option>`)
    .join("");
}

function populateDeterminantSelect(selectedCode = "") {
  const family = getSelectedProtocolFamily();
  const fallbackCode = selectedCode || getLowestAcuityDeterminant(family).code;
  refs.determinantSelect.innerHTML = family.determinants
    .map((determinant) => `<option value="${escapeAttribute(determinant.code)}">${escapeHtml(determinant.code)} • ${escapeHtml(determinant.label)}</option>`)
    .join("");
  refs.determinantSelect.value = family.determinants.some((determinant) => determinant.code === fallbackCode)
    ? fallbackCode
    : getLowestAcuityDeterminant(family).code;
}

function populateUnitSelect() {
  const visibleUnits = getVisibleUnitsForCurrentSession();
  refs.unitSelect.innerHTML = visibleUnits
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((unit) => {
      const selected = (selectedUnitId || state.ui.activeUnitId) === unit.id ? "selected" : "";
      return `<option value="${escapeAttribute(unit.id)}" ${selected}>${escapeHtml(unit.id)} • ${escapeHtml(getUnitDisplayType(unit))}</option>`;
    })
    .join("");
}

function handleStaffAuthSubmit(event) {
  event.preventDefault();
  refs.unitAuthError.textContent = "";
  const formData = new FormData(refs.staffAuthForm);
  const username = String(formData.get("username") || "").trim().toLowerCase();
  const pin = String(formData.get("pin") || "").trim();
  const account = getStaffAccounts().find((entry) => entry.username === username && entry.pin === pin && entry.enabled !== false);

  if (!account) {
    refs.staffAuthError.textContent = "Invalid staff username or PIN.";
    return;
  }

  refs.staffAuthError.textContent = "";
  refs.unitAuthError.textContent = "";
  currentSession = {
    role: account.role,
    username: account.username,
    displayName: account.displayName,
    loggedInAt: new Date().toISOString()
  };
  refs.staffAuthForm.reset();
  selectedUnitId = getDefaultSelectedUnitId();
  currentView = sanitizeViewForSession(getHomeViewForSession(currentSession), currentSession);
  saveSession();
  setView(currentView);
  render();
}

function handleUnitAuthSubmit(event) {
  event.preventDefault();
  refs.staffAuthError.textContent = "";
  const formData = new FormData(refs.unitAccessForm);
  const unitId = String(formData.get("unitAccount") || "").trim();
  const pin = String(formData.get("pin") || "").trim();
  const account = getUnitPortalAccounts().find((entry) => entry.unitId === unitId && entry.pin === pin && entry.enabled !== false);

  if (!account) {
    refs.unitAuthError.textContent = "Invalid unit iPad selection or PIN.";
    return;
  }

  refs.unitAuthError.textContent = "";
  refs.staffAuthError.textContent = "";
  currentSession = {
    role: account.role,
    displayName: account.displayName,
    unitId: account.unitId,
    loggedInAt: new Date().toISOString()
  };
  refs.unitAccessForm.reset();
  selectedUnitId = account.unitId;
  state.ui.activeUnitId = account.unitId;
  currentView = "unit";
  saveSession();
  setView("unit");
  render();
}

function handleSessionLogout() {
  if (locationWatchId && navigator.geolocation) {
    navigator.geolocation.clearWatch(locationWatchId);
  }
  locationWatchId = null;
  refs.staffAuthForm.reset();
  refs.unitAccessForm.reset();
  refs.staffAuthError.textContent = "";
  refs.unitAuthError.textContent = "";
  currentSession = null;
  currentView = getInitialView();
  saveSession();
  render();
}

function handleCallCreate(event) {
  event.preventDefault();
  if (!hasRole("call_taker")) {
    return;
  }
  const formData = new FormData(refs.callTakingForm);
  const family = getProtocolFamily(formData.get("protocolFamily"));
  const guided = getGuidedDetermination();
  const determinant = family.determinants.find((item) => item.code === formData.get("determinantCode")) || getLowestAcuityDeterminant(family);
  const manualOverride = determinantSelectionMode === "manual" && determinant.code !== guided.recommended.code;
  const incident = {
    id: uid("incident"),
    cadNumber: nextCadNumber(),
    createdAt: new Date().toISOString(),
    callTaker: currentSession.displayName,
    callerName: String(formData.get("callerName") || "Unknown"),
    callback: String(formData.get("callback") || ""),
    locationText: String(formData.get("locationText") || ""),
    coordinates: createCoordinates(formData.get("latitude"), formData.get("longitude")),
    patientAge: String(formData.get("patientAge") || ""),
    patientSex: String(formData.get("patientSex") || ""),
    chiefComplaint: String(formData.get("chiefComplaint") || ""),
    notes: String(formData.get("notes") || ""),
    protocolFamilyId: family.id,
    protocolTitle: family.title,
    determinantCode: determinant.code,
    determinantLevel: determinant.level,
    determinantLabel: determinant.label,
    priority: determinant.priority,
    responsePlan: determinant.response,
    determinantSource: manualOverride ? "manual_override" : "guided",
    guidedDeterminantCode: guided.recommended.code,
    interrogationSummary: buildInterrogationSummary(guided),
    status: "Pending Dispatch",
    assignedUnits: []
  };

  state.incidents.unshift(incident);
  addAudit(
    "Incident created",
    `${incident.cadNumber} created for ${incident.protocolTitle} at ${incident.locationText} with ${incident.determinantCode}.`,
    "incident"
  );
  refs.callTakingForm.reset();
  refs.callTakingForm.elements.callTaker.value = currentSession.displayName;
  determinantSelectionMode = "guided";
  populateProtocolFamilySelect();
  populateDeterminantSelect();
  renderProtocolQuestionFlow();
  syncGuidedDeterminant();
  saveState();
  setView(getHomeViewForSession(currentSession));
}

function handleUnitLogin(event) {
  event.preventDefault();
  if (!hasRole("unit")) {
    return;
  }
  const formData = new FormData(refs.unitLoginForm);
  const unitId = currentSession.unitId || String(formData.get("unitId") || "");
  const crewName = String(formData.get("crewName") || "");
  const deviceLabel = String(formData.get("deviceLabel") || `iPad ${unitId}`);
  const unit = getUnitById(unitId);

  if (!unit) {
    return;
  }

  const now = new Date().toISOString();
  selectedUnitId = unitId;
  state.ui.activeUnitId = unitId;
  unit.loggedIn = true;
  unit.crew = crewName;
  unit.deviceLabel = deviceLabel;
  unit.sessionStartedAt = now;
  unit.pendingAlertIncidentId = "";
  unit.activeIncidentViewId = "";
  unit.lastStatusChange = now;
  addAudit("Unit login", `${unit.id} logged on from ${deviceLabel}.`, "unit");
  refs.unitLoginForm.reset();
  saveState();
}

function handleUnitSelectionChange(event) {
  if (currentSession && currentSession.role === "unit") {
    selectedUnitId = currentSession.unitId;
    refs.unitSelect.value = currentSession.unitId;
    render();
    return;
  }
  selectedUnitId = event.target.value;
  state.ui.activeUnitId = selectedUnitId;
  render();
}

function handleUnitLogout() {
  if (!hasRole("unit")) {
    return;
  }
  const unitId = selectedUnitId || refs.unitSelect.value;
  const unit = getUnitById(unitId);
  if (!unit) {
    return;
  }

  if (locationWatchId) {
    stopBrowserTracking();
  }

  unit.loggedIn = false;
  unit.crew = "";
  unit.deviceLabel = "";
  unit.sessionStartedAt = "";
  unit.pendingAlertIncidentId = "";
  unit.activeIncidentViewId = "";
  if (!unit.assignedIncidentId && unit.status !== "Out of Service") {
    unit.status = "Available";
  }
  refs.unitLoginForm.reset();
  refs.unitSelect.value = unit.id;
  refs.unitLoginForm.elements.deviceLabel.value = `iPad ${unit.id}`;
  addAudit("Unit logout", `${unit.id} logged off the iPad session.`, "unit");
  selectedUnitId = unitId;
  state.ui.activeUnitId = unitId;
  saveState();
}

function handleUnitStatusClick(event) {
  if (!hasRole("unit")) {
    return;
  }
  const button = event.target.closest("[data-unit-status]");
  if (!button) {
    return;
  }

  const unit = getUnitById(selectedUnitId || refs.unitSelect.value);
  if (!unit) {
    return;
  }

  unit.loggedIn = true;
  unit.status = button.dataset.unitStatus;
  unit.lastStatusChange = new Date().toISOString();
  state.ui.activeUnitId = unit.id;
  selectedUnitId = unit.id;

  if (unit.assignedIncidentId) {
    const incident = getIncidentById(unit.assignedIncidentId);
    if (incident) {
      if (unit.status === "Available") {
        incident.assignedUnits = incident.assignedUnits.filter((assignedUnitId) => assignedUnitId !== unit.id);
        unit.assignedIncidentId = "";
        unit.activeIncidentViewId = "";
        unit.pendingAlertIncidentId = "";
        if (!incident.assignedUnits.length) {
          incident.status = "Closed";
        }
      } else {
        const mappedStatus = mapUnitStatusToIncidentStatus(unit.status);
        if (mappedStatus) {
          incident.status = mappedStatus;
        }
        if (unit.status === "En Route") {
          unit.pendingAlertIncidentId = "";
          unit.activeIncidentViewId = incident.id;
        }
      }
    }
  }

  addAudit("Status update", `${unit.id} changed status to ${unit.status}.`, "unit");
  saveState();
}

function handleUnitOpsClick(event) {
  if (!hasRole("unit")) {
    return;
  }
  const actionButton = event.target.closest("[data-unit-action]");
  if (!actionButton) {
    return;
  }

  const unit = getUnitById(selectedUnitId || refs.unitSelect.value);
  if (!unit) {
    return;
  }

  if (actionButton.dataset.unitAction === "open-incident") {
    unit.activeIncidentViewId = actionButton.dataset.incidentId || "";
    saveState();
  }

  if (actionButton.dataset.unitAction === "clear-active-incident") {
    unit.activeIncidentViewId = "";
    saveState();
  }

  if (actionButton.dataset.unitAction === "acknowledge-dispatch") {
    acknowledgeUnitDispatch(unit, actionButton.dataset.incidentId || "");
  }
}

function handleManualLocationSubmit(event) {
  event.preventDefault();
  if (!hasRole("unit")) {
    return;
  }
  const unit = getUnitById(selectedUnitId || refs.unitSelect.value);
  if (!unit) {
    return;
  }

  const formData = new FormData(refs.manualLocationForm);
  const lat = Number(formData.get("latitude"));
  const lng = Number(formData.get("longitude"));
  const note = String(formData.get("locationNote") || "");
  updateUnitLocation(unit.id, {
    lat,
    lng,
    accuracy: 15,
    source: "Manual",
    note
  });
  refs.manualLocationForm.reset();
}

function handleIncidentBoardClick(event) {
  if (!hasRole("dispatcher")) {
    return;
  }
  const actionButton = event.target.closest("[data-action]");
  if (!actionButton) {
    return;
  }

  const incidentId = actionButton.dataset.incidentId;
  const incident = getIncidentById(incidentId);
  if (!incident) {
    return;
  }

  if (actionButton.dataset.action === "assign-unit") {
    const selector = refs.incidentBoard.querySelector(
      `[data-role="assign-select"][data-incident-id="${escapeSelectorValue(incidentId)}"]`
    );
    const unitId = selector ? selector.value : "";
    const unit = getUnitById(unitId);
    if (!unit) {
      return;
    }

    if (!incident.assignedUnits.includes(unit.id)) {
      incident.assignedUnits.push(unit.id);
      recordIncidentAssignment(incident, unit.id);
    }
    unit.assignedIncidentId = incident.id;
    unit.loggedIn = true;
    if (unit.sessionStartedAt) {
      unit.pendingAlertIncidentId = incident.id;
    }
    incident.status = incident.status === "Pending Dispatch" ? "Units Assigned" : incident.status;
    addAudit("Unit assigned", `${unit.id} assigned to ${incident.cadNumber}.`, "dispatch");
    saveState();
  }

  if (actionButton.dataset.action === "close-incident") {
    incident.status = "Closed";
    incident.assignedUnits.forEach((unitId) => {
      const unit = getUnitById(unitId);
      if (unit && unit.assignedIncidentId === incident.id) {
        unit.assignedIncidentId = "";
        unit.pendingAlertIncidentId = "";
        if (unit.activeIncidentViewId === incident.id) {
          unit.activeIncidentViewId = "";
        }
        if (unit.status !== "Out of Service") {
          unit.status = "Available";
        }
      }
    });
    incident.assignedUnits = [];
    addAudit("Incident closed", `${incident.cadNumber} closed from dispatcher view.`, "dispatch");
    saveState();
  }
}

function handleIncidentBoardChange(event) {
  if (!hasRole("dispatcher")) {
    return;
  }
  const selector = event.target.closest("[data-action='incident-status']");
  if (!selector) {
    return;
  }

  const incident = getIncidentById(selector.dataset.incidentId);
  if (!incident) {
    return;
  }

  incident.status = selector.value;
  if (incident.status === "Closed") {
    incident.assignedUnits.forEach((unitId) => {
      const unit = getUnitById(unitId);
      if (unit && unit.assignedIncidentId === incident.id) {
        unit.assignedIncidentId = "";
        unit.pendingAlertIncidentId = "";
        if (unit.activeIncidentViewId === incident.id) {
          unit.activeIncidentViewId = "";
        }
        if (unit.status !== "Out of Service") {
          unit.status = "Available";
        }
      }
    });
    incident.assignedUnits = [];
  }
  addAudit("Incident status", `${incident.cadNumber} set to ${incident.status}.`, "dispatch");
  saveState();
}

function startBrowserTracking() {
  if (!hasRole("unit")) {
    return;
  }
  const unit = getUnitById(selectedUnitId || refs.unitSelect.value);
  if (!unit || !navigator.geolocation) {
    return;
  }

  if (locationWatchId) {
    navigator.geolocation.clearWatch(locationWatchId);
  }

  locationWatchId = navigator.geolocation.watchPosition(
    (position) => {
      updateUnitLocation(unit.id, {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        source: "GPS",
        note: "Browser geolocation"
      });
    },
    (error) => {
      addAudit("Tracking error", `${unit.id} location tracking error: ${error.message}.`, "location");
      saveState();
    },
    {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 10000
    }
  );

  addAudit("Tracking started", `${unit.id} started browser location tracking.`, "location");
  saveState();
}

function stopBrowserTracking() {
  if (!hasRole("unit")) {
    return;
  }
  if (locationWatchId && navigator.geolocation) {
    navigator.geolocation.clearWatch(locationWatchId);
  }
  locationWatchId = null;
  const unit = getUnitById(selectedUnitId || refs.unitSelect.value);
  if (unit) {
    addAudit("Tracking stopped", `${unit.id} stopped browser location tracking.`, "location");
    saveState();
  }
}

function updateUnitLocation(unitId, payload) {
  if (currentSession && currentSession.role === "unit" && currentSession.unitId !== unitId) {
    return;
  }
  const unit = getUnitById(unitId);
  if (!unit || Number.isNaN(payload.lat) || Number.isNaN(payload.lng)) {
    return;
  }

  unit.location = {
    lat: Number(payload.lat),
    lng: Number(payload.lng),
    accuracy: payload.accuracy || null,
    source: payload.source || "Manual",
    note: payload.note || "",
    timestamp: new Date().toISOString()
  };
  unit.loggedIn = true;
  state.ui.activeUnitId = unit.id;
  selectedUnitId = unit.id;
  addAudit("Location update", `${unit.id} reported ${unit.location.source} position ${unit.location.lat.toFixed(4)}, ${unit.location.lng.toFixed(4)}.`, "location");
  saveState();
}

function setView(viewName, persist = true) {
  currentView = sanitizeViewForSession(viewName, currentSession);
  if (currentSession) {
    applyViewState();
  }
  if (persist && currentSession) {
    state.ui.lastView = currentView;
    const url = new URL(window.location.href);
    url.searchParams.set("view", currentView);
    window.history.replaceState({}, "", url);
    cacheStateLocally();
  }
}

function addAudit(title, detail, kind) {
  state.audit.unshift({
    id: uid("audit"),
    timestamp: new Date().toISOString(),
    title,
    detail,
    kind
  });
  state.audit = state.audit.slice(0, 100);
}

function nextCadNumber() {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const todayCount = state.incidents.filter((incident) => incident.cadNumber.includes(datePart)).length + 1;
  return `MED-${datePart}-${String(todayCount).padStart(3, "0")}`;
}

function mapUnitStatusToIncidentStatus(unitStatus) {
  switch (unitStatus) {
    case "En Route":
      return "En Route";
    case "On Scene":
      return "On Scene";
    case "Transporting":
      return "Transporting";
    case "At Hospital":
      return "At Hospital";
    default:
      return null;
  }
}

function hasRole(role) {
  return Boolean(currentSession && currentSession.role === role);
}

function getHomeViewForSession(session = currentSession) {
  if (!session || !ROLE_CONFIG[session.role]) {
    return "dispatcher";
  }
  return ROLE_CONFIG[session.role].homeView;
}

function canAccessView(viewName, session = currentSession) {
  if (!session || !ROLE_CONFIG[session.role]) {
    return false;
  }
  return ROLE_CONFIG[session.role].views.includes(viewName);
}

function sanitizeViewForSession(viewName, session = currentSession) {
  const safeView = ["admin", "dispatcher", "calltaking", "unit"].includes(viewName) ? viewName : getHomeViewForSession(session);
  return canAccessView(safeView, session) ? safeView : getHomeViewForSession(session);
}

function getDefaultSelectedUnitId() {
  if (currentSession && currentSession.role === "unit") {
    return currentSession.unitId;
  }
  return state.ui.activeUnitId || (state.units[0] && state.units[0].id) || "";
}

function getVisibleUnitsForCurrentSession() {
  if (currentSession && currentSession.role === "unit") {
    return state.units.filter((unit) => unit.id === currentSession.unitId);
  }
  return [...state.units];
}

function getAssignableUnits(currentIncidentId) {
  return state.units.filter((unit) => {
    if (unit.assignedIncidentId && unit.assignedIncidentId !== currentIncidentId) {
      return false;
    }
    return unit.status !== "Out of Service";
  });
}

function getSelectedProtocolFamily() {
  return getProtocolFamily(refs.protocolFamilySelect.value || PROTOCOL_FAMILIES[0].id);
}

function getSelectedDeterminant() {
  const family = getSelectedProtocolFamily();
  return family.determinants.find((item) => item.code === refs.determinantSelect.value) || getLowestAcuityDeterminant(family);
}

function getProtocolFamily(familyId) {
  return PROTOCOL_FAMILIES.find((family) => family.id === familyId) || PROTOCOL_FAMILIES[0];
}

function getProtocolQuestionFlow(family = getSelectedProtocolFamily()) {
  return [
    ...TRIAGE_BASE_QUESTIONS,
    {
      id: "triageComplaintProfile",
      shortLabel: "Profile",
      prompt: `Which ${family.title.toLowerCase()} profile is the closest fit?`,
      hint: "Choose the scripted determinant profile that best matches the caller's report.",
      options: family.determinants.map((determinant) => ({
        value: determinant.code,
        label: `${determinant.code} • ${determinant.label}`,
        description: `${determinant.priority} • ${determinant.response}`,
        severity: determinant.level.toLowerCase(),
        determinantCode: determinant.code,
        summary: determinant.label
      }))
    },
    TRIAGE_ESCALATION_QUESTION
  ];
}

function getGuidedDetermination() {
  const family = getSelectedProtocolFamily();
  const flow = getProtocolQuestionFlow(family);
  const formData = new FormData(refs.callTakingForm);
  const selectedOptions = flow.map((question) => {
    const value = String(formData.get(question.id) || "");
    return {
      question,
      option: question.options.find((item) => item.value === value) || null
    };
  });
  const answeredSelections = selectedOptions.filter((entry) => entry.option);
  const complaintSelection = selectedOptions.find((entry) => entry.question.id === "triageComplaintProfile");
  const baseDeterminant = complaintSelection && complaintSelection.option && complaintSelection.option.determinantCode
    ? family.determinants.find((item) => item.code === complaintSelection.option.determinantCode) || getLowestAcuityDeterminant(family)
    : getLowestAcuityDeterminant(family);

  const highestSeverity = answeredSelections.reduce((currentLevel, entry) => {
    const nextLevel = entry.option && entry.option.severity ? entry.option.severity : "alpha";
    return getSeverityRank(nextLevel) > getSeverityRank(currentLevel) ? nextLevel : currentLevel;
  }, baseDeterminant.level.toLowerCase());

  return {
    family,
    flow,
    answeredCount: answeredSelections.length,
    totalQuestions: flow.length,
    ready: answeredSelections.length === flow.length,
    hasComplaintProfile: Boolean(complaintSelection && complaintSelection.option),
    baseDeterminant,
    recommended: pickDeterminantForSeverity(family, highestSeverity),
    reasoning: answeredSelections.map((entry) => `${entry.question.shortLabel}: ${entry.option.summary || entry.option.label}`)
  };
}

function getLowestAcuityDeterminant(family = getSelectedProtocolFamily()) {
  return pickDeterminantForSeverity(family, "alpha");
}

function pickDeterminantForSeverity(family, severity) {
  const fallbackLevels = TRIAGE_LEVEL_FALLBACKS[String(severity || "alpha").toLowerCase()] || TRIAGE_LEVEL_FALLBACKS.alpha;
  for (const level of fallbackLevels) {
    const match = family.determinants.find((determinant) => determinant.level === level);
    if (match) {
      return match;
    }
  }
  return family.determinants[family.determinants.length - 1] || family.determinants[0];
}

function buildInterrogationSummary(guided = getGuidedDetermination()) {
  if (!guided.reasoning.length) {
    return `Guided interrogation pending for ${guided.family.title}.`;
  }
  return `${guided.recommended.code} from ${guided.reasoning.join(" | ")}`;
}

function getSeverityRank(level) {
  return TRIAGE_SEVERITY_RANK[String(level || "alpha").toLowerCase()] || TRIAGE_SEVERITY_RANK.alpha;
}

function getUnitSessionIncidents(unit) {
  const sessionStart = unit.sessionStartedAt ? new Date(unit.sessionStartedAt).getTime() : 0;
  return state.incidents
    .map((incident) => {
      const latestAssignment = getLatestUnitAssignment(incident, unit.id);
      const assignedDuringSession = latestAssignment ? new Date(latestAssignment.assignedAt).getTime() >= sessionStart : false;
      const currentAssignment = incident.assignedUnits.includes(unit.id);
      if (!currentAssignment && !assignedDuringSession) {
        return null;
      }

      return {
        incident,
        assignedAt: latestAssignment ? latestAssignment.assignedAt : incident.createdAt,
        currentAssignment
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (a.currentAssignment !== b.currentAssignment) {
        return Number(b.currentAssignment) - Number(a.currentAssignment);
      }
      return new Date(b.assignedAt) - new Date(a.assignedAt);
    });
}

function getLatestUnitAssignment(incident, unitId) {
  return [...(incident.assignmentHistory || [])]
    .filter((entry) => entry.unitId === unitId)
    .sort((a, b) => new Date(b.assignedAt) - new Date(a.assignedAt))[0] || null;
}

function getUnitPendingAlertIncident(unit) {
  if (!unit.pendingAlertIncidentId) {
    return null;
  }
  const incident = getIncidentById(unit.pendingAlertIncidentId);
  return incident && incident.assignedUnits.includes(unit.id) && incident.status !== "Closed" ? incident : null;
}

function getUnitActiveIncident(unit) {
  return unit.activeIncidentViewId ? getIncidentById(unit.activeIncidentViewId) : null;
}

function acknowledgeUnitDispatch(unit, incidentId) {
  const incident = getIncidentById(incidentId);
  if (!unit || !incident) {
    return;
  }

  unit.loggedIn = true;
  unit.assignedIncidentId = incident.id;
  unit.pendingAlertIncidentId = "";
  unit.activeIncidentViewId = incident.id;
  unit.status = "En Route";
  unit.lastStatusChange = new Date().toISOString();
  incident.status = "En Route";
  addAudit("Dispatch acknowledged", `${unit.id} acknowledged ${incident.cadNumber} and went En Route.`, "unit");
  saveState();
}

function recordIncidentAssignment(incident, unitId) {
  if (!Array.isArray(incident.assignmentHistory)) {
    incident.assignmentHistory = [];
  }
  incident.assignmentHistory.push({
    unitId,
    assignedAt: new Date().toISOString()
  });
}

function renderUnitMapFrame(incident) {
  const embedUrl = getOpenStreetMapEmbedUrl(incident);
  return embedUrl
    ? `<iframe class="unit-map-frame" src="${escapeAttribute(embedUrl)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Map to ${escapeAttribute(incident.locationText)}"></iframe>`
    : '<div class="empty-state">No coordinates are available for an embedded map. Use the navigation links below.</div>';
}

function getOpenStreetMapEmbedUrl(incident) {
  if (!incident.coordinates) {
    return "";
  }

  const lat = Number(incident.coordinates.lat);
  const lng = Number(incident.coordinates.lng);
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return "";
  }

  const west = lng - 0.01;
  const south = lat - 0.01;
  const east = lng + 0.01;
  const north = lat + 0.01;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${west}%2C${south}%2C${east}%2C${north}&layer=mapnik&marker=${lat}%2C${lng}`;
}

function getGoogleMapsUrl(incident) {
  if (incident.coordinates) {
    return `https://www.google.com/maps/dir/?api=1&destination=${incident.coordinates.lat},${incident.coordinates.lng}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(incident.locationText || "")}`;
}

function getAppleMapsUrl(incident) {
  if (incident.coordinates) {
    return `https://maps.apple.com/?daddr=${incident.coordinates.lat},${incident.coordinates.lng}`;
  }
  return `https://maps.apple.com/?daddr=${encodeURIComponent(incident.locationText || "")}`;
}

function formatPatientDescriptor(incident) {
  const pieces = [incident.patientAge, incident.patientSex].filter(Boolean);
  return pieces.length ? pieces.join(" • ") : "Not stated";
}

function getUnitById(unitId) {
  return state.units.find((unit) => unit.id === unitId);
}

function getIncidentById(incidentId) {
  return state.incidents.find((incident) => incident.id === incidentId);
}

function updateStatusButtons(unit) {
  Array.from(refs.statusButtonGrid.querySelectorAll("[data-unit-status]")).forEach((button) => {
    button.classList.toggle("active", unit && button.dataset.unitStatus === unit.status);
  });
}

function createCoordinates(latValue, lngValue) {
  if (latValue === "" || lngValue === "" || latValue === null || lngValue === null) {
    return null;
  }

  const lat = Number(latValue);
  const lng = Number(lngValue);
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return null;
  }

  return { lat, lng };
}

function getInitialView() {
  const requestedView = new URLSearchParams(window.location.search).get("view");
  if (["admin", "dispatcher", "calltaking", "unit"].includes(requestedView)) {
    return requestedView;
  }
  return state.ui.lastView || "dispatcher";
}

function formatRelativeTime(isoString) {
  if (!isoString) {
    return "Unknown";
  }

  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000));

  if (diffMinutes < 1) {
    return "just now";
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }
  if (diffMinutes < 1440) {
    return `${Math.round(diffMinutes / 60)}h ago`;
  }
  return new Date(isoString).toLocaleString();
}

function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#96;");
}

function escapeSelectorValue(value) {
  return String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}
