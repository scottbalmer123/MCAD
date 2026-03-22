import { FormEvent, useState } from "react";
import { UserProfile } from "../types/cad";
import SectionCard from "./SectionCard";
import StatusBadge from "./StatusBadge";

interface AuthPanelProps {
  loading: boolean;
  authenticating: boolean;
  error: string | null;
  authEmail?: string;
  profile: UserProfile | null;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignOut: () => Promise<void>;
}

export default function AuthPanel({
  loading,
  authenticating,
  error,
  authEmail,
  profile,
  onSignIn,
  onSignOut
}: AuthPanelProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSignIn(email, password);
  }

  const canSignOut = Boolean(authEmail);

  return (
    <div className="auth-shell">
      <SectionCard
        title="Secure Access"
        subtitle="Sign in to MedDispatch CAD"
        actions={<StatusBadge label="Role required" />}
      >
        <div className="auth-layout">
          <div className="auth-copy">
            <p>
              Dispatchers, call takers, and unit iPads now authenticate with Firebase Auth.
              Access is granted by the matching Firestore profile in <code>users/{"{uid}"}</code>.
            </p>
            <div className="question-list">
              <article className="question-item">
                <span className="question-index">1</span>
                <p>Create the email/password user in Firebase Authentication.</p>
              </article>
              <article className="question-item">
                <span className="question-index">2</span>
                <p>
                  Create <code>users/uid</code> with <code>displayName</code>, <code>role</code>,{" "}
                  <code>active</code>, and <code>allowedUnitId</code> for unit accounts.
                </p>
              </article>
              <article className="question-item">
                <span className="question-index">3</span>
                <p>Sign in here. Firestore rules will enforce the role automatically.</p>
              </article>
            </div>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label>
              <span>Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="dispatcher@example.com"
              />
            </label>
            <label>
              <span>Password</span>
              <input
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
              />
            </label>
            <div className="form-footer">
              <button type="submit" disabled={loading || authenticating}>
                {authenticating ? "Signing in..." : "Sign in"}
              </button>
              {canSignOut ? (
                <button type="button" className="secondary" onClick={() => void onSignOut()}>
                  Sign out
                </button>
              ) : null}
            </div>
            {error ? <p className="inline-message error-text">{error}</p> : null}
            {authEmail ? <p className="supporting-text">Authenticated email: {authEmail}</p> : null}
          </form>
        </div>
      </SectionCard>
    </div>
  );
}
