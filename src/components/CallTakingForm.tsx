import { FormEvent, useEffect, useState } from "react";
import { protocols } from "../data/protocols";
import { CallTakingDraft } from "../types/cad";
import SectionCard from "./SectionCard";
import StatusBadge from "./StatusBadge";

interface CallTakingFormProps {
  callTakerName: string;
  onCreateIncident: (draft: CallTakingDraft) => Promise<unknown>;
}

const initialDraft: CallTakingDraft = {
  callTakerName: "",
  callerName: "",
  callerPhone: "",
  patientName: "",
  patientAge: "",
  address: "",
  suburb: "",
  chiefComplaint: "",
  protocolId: protocols[0].id,
  triageNotes: "",
  hazards: "",
  callbackConfirmed: true,
  latitude: "",
  longitude: ""
};

export default function CallTakingForm({
  callTakerName,
  onCreateIncident
}: CallTakingFormProps) {
  const [draft, setDraft] = useState<CallTakingDraft>(initialDraft);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const selectedProtocol =
    protocols.find((protocol) => protocol.id === draft.protocolId) ?? protocols[0];

  useEffect(() => {
    setDraft((current) => ({
      ...current,
      callTakerName
    }));
  }, [callTakerName]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      await onCreateIncident({
        ...draft,
        chiefComplaint: draft.chiefComplaint || selectedProtocol.chiefComplaint
      });

      setDraft({
        ...initialDraft,
        protocolId: draft.protocolId,
        callTakerName: draft.callTakerName
      });
      setMessage("Job created and sent to the dispatcher queue.");
    } catch (error) {
      const nextMessage =
        error instanceof Error ? error.message : "Unable to create the CAD job.";
      setMessage(nextMessage);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="view-grid">
      <SectionCard
        title="Call Taking"
        subtitle="Create a medical incident"
        actions={<StatusBadge label={selectedProtocol.determinantLevel} />}
      >
        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="auth-context">
            <p className="field-label">Signed in call taker</p>
            <p>{callTakerName}</p>
          </div>
          <label>
            <span>Caller name</span>
            <input
              required
              value={draft.callerName}
              onChange={(event) =>
                setDraft((current) => ({ ...current, callerName: event.target.value }))
              }
              placeholder="Caller full name"
            />
          </label>
          <label>
            <span>Callback number</span>
            <input
              required
              value={draft.callerPhone}
              onChange={(event) =>
                setDraft((current) => ({ ...current, callerPhone: event.target.value }))
              }
              placeholder="Best contact number"
            />
          </label>
          <label>
            <span>Patient name</span>
            <input
              value={draft.patientName}
              onChange={(event) =>
                setDraft((current) => ({ ...current, patientName: event.target.value }))
              }
              placeholder="Patient or unknown"
            />
          </label>
          <label>
            <span>Patient age</span>
            <input
              value={draft.patientAge}
              onChange={(event) =>
                setDraft((current) => ({ ...current, patientAge: event.target.value }))
              }
              placeholder="Age or approx."
            />
          </label>
          <label className="full-width">
            <span>Incident address</span>
            <input
              required
              value={draft.address}
              onChange={(event) =>
                setDraft((current) => ({ ...current, address: event.target.value }))
              }
              placeholder="Street address"
            />
          </label>
          <label>
            <span>Suburb / area</span>
            <input
              required
              value={draft.suburb}
              onChange={(event) =>
                setDraft((current) => ({ ...current, suburb: event.target.value }))
              }
              placeholder="Suburb"
            />
          </label>
          <label>
            <span>Determinant pathway</span>
            <select
              value={draft.protocolId}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  protocolId: event.target.value,
                  chiefComplaint: ""
                }))
              }
            >
              {protocols.map((protocol) => (
                <option key={protocol.id} value={protocol.id}>
                  {protocol.category}: {protocol.chiefComplaint}
                </option>
              ))}
            </select>
          </label>
          <label className="full-width">
            <span>Chief complaint summary</span>
            <input
              value={draft.chiefComplaint}
              onChange={(event) =>
                setDraft((current) => ({ ...current, chiefComplaint: event.target.value }))
              }
              placeholder={selectedProtocol.chiefComplaint}
            />
          </label>
          <label>
            <span>Latitude</span>
            <input
              value={draft.latitude}
              onChange={(event) =>
                setDraft((current) => ({ ...current, latitude: event.target.value }))
              }
              placeholder="-37.8136"
            />
          </label>
          <label>
            <span>Longitude</span>
            <input
              value={draft.longitude}
              onChange={(event) =>
                setDraft((current) => ({ ...current, longitude: event.target.value }))
              }
              placeholder="144.9631"
            />
          </label>
          <label className="full-width">
            <span>Triage notes</span>
            <textarea
              required
              value={draft.triageNotes}
              onChange={(event) =>
                setDraft((current) => ({ ...current, triageNotes: event.target.value }))
              }
              rows={4}
              placeholder="Symptoms, patient condition, timing, hazards, access."
            />
          </label>
          <label className="full-width">
            <span>Scene hazards / access info</span>
            <textarea
              value={draft.hazards}
              onChange={(event) =>
                setDraft((current) => ({ ...current, hazards: event.target.value }))
              }
              rows={3}
              placeholder="Security gates, scene safety, difficult access."
            />
          </label>
          <label className="checkbox-row full-width">
            <input
              type="checkbox"
              checked={draft.callbackConfirmed}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  callbackConfirmed: event.target.checked
                }))
              }
            />
            <span>Callback number re-confirmed with caller</span>
          </label>
          <div className="full-width form-footer">
            <button type="submit" disabled={saving}>
              {saving ? "Creating job..." : "Create dispatcher job"}
            </button>
            {message ? <p className="inline-message">{message}</p> : null}
          </div>
        </form>
      </SectionCard>

      <SectionCard
        title="Protocol Support"
        subtitle={`${selectedProtocol.determinantCode} response profile`}
      >
        <div className="protocol-card">
          <div className="protocol-metadata">
            <StatusBadge label={selectedProtocol.determinantLevel} />
            <p>{selectedProtocol.responseMode}</p>
          </div>
          <p className="supporting-text">{selectedProtocol.notes}</p>
          <div className="question-list">
            {selectedProtocol.scriptedQuestions.map((question) => (
              <article key={question} className="question-item">
                <span className="question-index">Q</span>
                <p>{question}</p>
              </article>
            ))}
          </div>
          <p className="small-print">
            This determinant library is sample content only. Replace it with your licensed
            AMPDS-approved pathways before live use.
          </p>
        </div>
      </SectionCard>
    </div>
  );
}
