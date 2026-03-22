import { ProtocolDefinition } from "../types/cad";

// Replace these examples with your licensed protocol library before production.
export const protocols: ProtocolDefinition[] = [
  {
    id: "airway-compromise",
    category: "Airway",
    chiefComplaint: "Airway compromise / ineffective breathing",
    determinantCode: "RESP-D1",
    determinantLevel: "Delta",
    responseMode: "Lights and sirens with advanced airway response",
    scriptedQuestions: [
      "Is the patient conscious right now?",
      "Is the patient breathing normally?",
      "Is there visible airway obstruction or cyanosis?"
    ],
    notes: "Use for severe respiratory distress or rapidly worsening airway symptoms."
  },
  {
    id: "cardiac-arrest",
    category: "Cardiac",
    chiefComplaint: "Cardiac arrest / unresponsive not breathing",
    determinantCode: "CARD-E1",
    determinantLevel: "Echo",
    responseMode: "Immediate resuscitation response",
    scriptedQuestions: [
      "Is the patient awake?",
      "Is the patient breathing?",
      "Is someone able to begin CPR now?"
    ],
    notes: "Highest priority sample workflow for resuscitation jobs."
  },
  {
    id: "stroke-suspected",
    category: "Neurology",
    chiefComplaint: "Suspected stroke / FAST positive",
    determinantCode: "NEURO-D2",
    determinantLevel: "Delta",
    responseMode: "Priority stroke response",
    scriptedQuestions: [
      "What time was the patient last seen well?",
      "Is there facial droop, arm weakness, or speech change?",
      "Is the patient anticoagulated?"
    ],
    notes: "Capture last-known-well time in the triage notes."
  },
  {
    id: "chest-pain",
    category: "Cardiac",
    chiefComplaint: "Chest pain / suspected ACS",
    determinantCode: "CARD-C1",
    determinantLevel: "Charlie",
    responseMode: "Urgent ALS response",
    scriptedQuestions: [
      "Is the pain severe or crushing?",
      "Does the patient have shortness of breath or sweating?",
      "Is there a cardiac history?"
    ],
    notes: "Escalate if pain is associated with collapse or poor perfusion."
  },
  {
    id: "fall-injury",
    category: "Trauma",
    chiefComplaint: "Fall with possible significant injury",
    determinantCode: "TRAUMA-C2",
    determinantLevel: "Charlie",
    responseMode: "Urgent trauma response",
    scriptedQuestions: [
      "What height or mechanism was involved?",
      "Is the patient able to stand or move?",
      "Is there head strike or anticoagulant use?"
    ],
    notes: "Good default for non-cardiac trauma without entrapment."
  },
  {
    id: "general-illness",
    category: "Medical",
    chiefComplaint: "General illness / low acuity",
    determinantCode: "MED-A1",
    determinantLevel: "Alpha",
    responseMode: "Routine response",
    scriptedQuestions: [
      "What is the main symptom?",
      "When did it begin?",
      "Is the patient alert and breathing normally?"
    ],
    notes: "Routine sample code for stable general medical complaints."
  },
  {
    id: "labor",
    category: "Obstetrics",
    chiefComplaint: "Labor / obstetric concern",
    determinantCode: "OBS-B1",
    determinantLevel: "Bravo",
    responseMode: "Prompt obstetric response",
    scriptedQuestions: [
      "How many weeks pregnant?",
      "Are contractions frequent or is there urge to push?",
      "Is there heavy bleeding or crowning?"
    ],
    notes: "Escalate if imminent delivery or significant bleeding is present."
  },
  {
    id: "mental-health",
    category: "Behavioral",
    chiefComplaint: "Behavioral crisis / self-harm concern",
    determinantCode: "BEHAV-C1",
    determinantLevel: "Charlie",
    responseMode: "Urgent medical and scene safety response",
    scriptedQuestions: [
      "Is there an immediate threat to the patient or others?",
      "Are weapons, drugs, or alcohol involved?",
      "Is law enforcement already on scene?"
    ],
    notes: "Use scene hazard field to flag safety risks."
  }
];
