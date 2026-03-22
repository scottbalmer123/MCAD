import { useEffect, useState } from "react";
import AuthPanel from "./components/AuthPanel";
import CallTakingForm from "./components/CallTakingForm";
import DispatcherView from "./components/DispatcherView";
import StatusBadge from "./components/StatusBadge";
import UnitConsole from "./components/UnitConsole";
import { useAuthSession } from "./hooks/useAuthSession";
import { useCadData } from "./hooks/useCadData";
import { isTelemetryStale } from "./lib/time";
import { RoleView } from "./types/cad";

const roleTabs: Array<{ id: RoleView; label: string; description: string }> = [
  {
    id: "call-taker",
    label: "Call Taker",
    description: "Create incidents from incoming medical calls"
  },
  {
    id: "dispatcher",
    label: "Dispatcher",
    description: "Watch the queue, assign units, and monitor telemetry"
  },
  {
    id: "unit",
    label: "Unit iPad",
    description: "Crew login, status changes, and live GPS tracking"
  }
];

export default function App() {
  const authState = useAuthSession();
  const [activeRole, setActiveRole] = useState<RoleView>("dispatcher");
  const cad = useCadData(authState.session);
  const openIncidents = cad.incidents.filter((incident) => incident.status !== "Closed");
  const availableUnits = cad.units.filter((unit) => unit.status === "Available").length;
  const assignedUnits = cad.units.filter((unit) => Boolean(unit.activeIncidentId)).length;
  const staleTelemetry = cad.units.filter((unit) => isTelemetryStale(unit.lastUpdate)).length;
  const availableTabs =
    authState.mode === "firebase" && authState.session
      ? roleTabs.filter((tab) => tab.id === authState.session?.role)
      : roleTabs;
  const currentRole = availableTabs.some((tab) => tab.id === activeRole)
    ? activeRole
    : availableTabs[0]?.id ?? "dispatcher";

  useEffect(() => {
    if (currentRole !== activeRole) {
      setActiveRole(currentRole);
    }
  }, [activeRole, currentRole]);

  const needsUnitAssignment =
    authState.mode === "firebase" &&
    authState.session?.role === "unit" &&
    !authState.session.allowedUnitId;

  if (authState.mode === "firebase" && !authState.session) {
    return (
      <div className="app-shell">
        <header className="hero-card">
          <div>
            <p className="eyebrow">MedDispatch CAD</p>
            <h1>Role-secured medical dispatch web app</h1>
            <p className="hero-copy">
              Browser-based dispatch, call taking, and unit iPad workflows secured with Firebase
              Authentication and Firestore role checks.
            </p>
          </div>
          <div className="hero-side">
            <span className="sync-pill sync-firebase">firebase mode</span>
            <p>
              {authState.loading
                ? "Checking Firebase session and role profile..."
                : "Sign in with an account that has a matching profile in Firestore users/{uid}."}
            </p>
          </div>
        </header>

        <AuthPanel
          loading={authState.loading}
          authenticating={authState.authenticating}
          error={authState.error}
          authEmail={authState.authUser?.email ?? undefined}
          profile={authState.profile}
          onSignIn={authState.signInWithPassword}
          onSignOut={authState.signOutUser}
        />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="hero-card">
        <div>
          <p className="eyebrow">MedDispatch CAD</p>
          <h1>Firebase-first medical computer aided dispatch</h1>
          <p className="hero-copy">
            Real-time call taking, dispatcher queue management, and iPad unit tracking in one
            responsive console.
          </p>
        </div>

        <div className="hero-side">
          <span className={`sync-pill sync-${cad.syncMode}`}>{cad.syncMode} mode</span>
          {authState.session ? <StatusBadge label={authState.session.role} /> : null}
          <p>{authState.session?.displayName ?? "Demo supervisor"}</p>
          {authState.session?.allowedUnitId ? (
            <p>Assigned unit: {authState.session.allowedUnitId}</p>
          ) : (
            <p>
              {cad.syncMode === "firebase"
                ? "Live Firestore subscriptions are enabled."
                : "Running with seeded demo data until Firebase credentials are added."}
            </p>
          )}
          {authState.mode === "firebase" ? (
            <button type="button" className="secondary" onClick={() => void authState.signOutUser()}>
              Sign out
            </button>
          ) : null}
        </div>
      </header>

      <section className="notice-strip">
        <strong>Protocol warning:</strong> the included determinant pathways are AMPDS-inspired
        examples only. Replace them with your licensed and clinically approved protocol content
        before operational deployment.
      </section>

      <section className="metric-grid">
        <article className="metric-card">
          <span>Open incidents</span>
          <strong>{openIncidents.length}</strong>
        </article>
        <article className="metric-card">
          <span>Available units</span>
          <strong>{availableUnits}</strong>
        </article>
        <article className="metric-card">
          <span>Assigned units</span>
          <strong>{assignedUnits}</strong>
        </article>
        <article className="metric-card">
          <span>Stale telemetry</span>
          <strong>{staleTelemetry}</strong>
        </article>
      </section>

      {availableTabs.length > 1 ? (
        <nav className="role-tabs" aria-label="Role views">
          {availableTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={tab.id === currentRole ? "role-tab active-tab" : "role-tab"}
              onClick={() => setActiveRole(tab.id)}
            >
              <span>{tab.label}</span>
              <small>{tab.description}</small>
            </button>
          ))}
        </nav>
      ) : null}

      {authState.loading ? <p className="loading-banner">Checking user role and permissions...</p> : null}
      {authState.error ? <p className="error-banner">{authState.error}</p> : null}
      {cad.loading ? <p className="loading-banner">Connecting to Firebase...</p> : null}
      {cad.error ? <p className="error-banner">{cad.error}</p> : null}

      {needsUnitAssignment ? (
        <section className="notice-strip">
          <strong>Unit account setup required:</strong> add <code>allowedUnitId</code> to this
          user in <code>users/{"{uid}"}</code> before the iPad can control a unit.
        </section>
      ) : null}

      <main>
        {currentRole === "call-taker" ? (
          <CallTakingForm
            callTakerName={authState.session?.displayName ?? "Demo Call Taker"}
            onCreateIncident={cad.createIncident}
          />
        ) : null}

        {currentRole === "dispatcher" ? (
          <DispatcherView
            incidents={cad.incidents}
            units={cad.units}
            statusEvents={cad.statusEvents}
            onAssignUnit={cad.assignUnitToIncident}
            onSetIncidentStatus={cad.setIncidentStatus}
          />
        ) : null}

        {currentRole === "unit" && !needsUnitAssignment ? (
          <UnitConsole
            units={cad.units}
            incidents={cad.incidents}
            operatorName={authState.session?.displayName ?? "Unit operator"}
            lockedCallsign={authState.session?.allowedUnitId ?? null}
            onUpsertUnitSession={cad.upsertUnitSession}
            onUpdateUnitStatus={cad.updateUnitStatus}
            onUpdateUnitTelemetry={cad.updateUnitTelemetry}
          />
        ) : null}
      </main>
    </div>
  );
}
