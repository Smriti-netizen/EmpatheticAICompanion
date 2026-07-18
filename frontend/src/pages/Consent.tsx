import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { api, ApiClientError } from "../api/client";
import {
  setConsentAccepted,
  setDisplayName,
  setUserId,
} from "../lib/storage";

export function ConsentPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [age, setAge] = useState("24");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function continueIntake() {
    if (!accepted || !name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const user = await api.createUser({
        display_name: name.trim(),
        age: Number(age) || undefined,
        consent_version: "2026-07-01",
      });
      setUserId(user.user_id);
      setDisplayName(name.trim());
      setConsentAccepted();
      navigate("/intake");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not create profile");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-xl px-4 py-10">
      <h1 className="font-display text-4xl font-semibold text-ink">Consent</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        This is an AI companion for support. It doesn't provide medical diagnosis
        or prescriptions.
      </p>

      <label className="mt-6 block text-sm font-medium">
        Display name
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2"
        />
      </label>
      <label className="mt-4 block text-sm font-medium">
        Age
        <input
          value={age}
          onChange={(e) => setAge(e.target.value)}
          type="number"
          min={13}
          className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2"
        />
      </label>

      <label className="mt-6 flex items-start gap-3 text-sm text-ink">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-1"
        />
        <span>
          I understand this is AI support, not emergency care or a licensed clinician,
          and I consent to store my session chart locally on the server.
        </span>
      </label>

      {error && <p className="mt-4 text-sm text-crisis">{error}</p>}

      <button
        type="button"
        disabled={!accepted || !name.trim() || loading}
        onClick={() => void continueIntake()}
        className="mt-8 rounded-full bg-rose px-9 py-4 font-sans text-[12px] font-medium text-cream not-italic transition hover:bg-rose-deep disabled:opacity-50"
      >
        {loading ? "Saving…" : "Continue to intake"}
      </button>
    </div>
  );
}
