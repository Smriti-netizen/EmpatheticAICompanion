import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { api, ApiClientError } from "../api/client";
import { getUserId } from "../lib/storage";

const CONCERNS = ["anxiety", "sleep", "stress", "relationships", "mood", "work"];

export function IntakePage() {
  const navigate = useNavigate();
  const [concerns, setConcerns] = useState<string[]>([]);
  const [goal, setGoal] = useState("");
  const [crisis, setCrisis] = useState<"yes" | "no" | "">("");
  const [duration, setDuration] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function toggleConcern(concern: string) {
    setConcerns((prev) =>
      prev.includes(concern) ? prev.filter((c) => c !== concern) : [...prev, concern],
    );
  }

  async function submit() {
    const userId = getUserId();
    if (!userId) {
      navigate("/consent");
      return;
    }
    if (!goal.trim() || !crisis) {
      setError("Please complete goal and crisis screening.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const positive = crisis === "yes";
      await api.saveIntake(userId, {
        primary_concerns: concerns,
        session_goal: goal.trim(),
        crisis_screen_positive: positive,
        duration_problem: duration || undefined,
      });
      navigate(positive ? "/crisis" : "/screening");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Intake failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-xl px-4 py-10">
      <h1 className="font-display text-4xl font-semibold">Intake</h1>
      <p className="mt-2 text-sm text-muted">A few details help the counselor focus.</p>

      <p className="mt-6 text-sm font-medium">Primary concerns</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {CONCERNS.map((concern) => (
          <button
            key={concern}
            type="button"
            onClick={() => toggleConcern(concern)}
            className={`rounded-full px-3 py-1.5 text-sm ${
              concerns.includes(concern)
                ? "bg-accent text-white"
                : "border border-line bg-surface"
            }`}
          >
            {concern}
          </button>
        ))}
      </div>

      <label className="mt-6 block text-sm font-medium">
        Session goal
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2"
        />
      </label>

      <label className="mt-4 block text-sm font-medium">
        How long has this been going on?
        <input
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2"
        />
      </label>

      <fieldset className="mt-6">
        <legend className="text-sm font-medium">
          In the past two weeks, have you had thoughts of harming yourself or ending
          your life?
        </legend>
        <div className="mt-2 flex gap-3">
          {(["no", "yes"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setCrisis(value)}
              className={`rounded-xl px-4 py-2 text-sm capitalize ${
                crisis === value ? "bg-accent text-white" : "border border-line bg-surface"
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      </fieldset>

      {error && <p className="mt-4 text-sm text-crisis">{error}</p>}

      <button
        type="button"
        disabled={loading}
        onClick={() => void submit()}
        className="mt-8 rounded-full bg-rose px-9 py-4 font-sans text-[12px] font-medium text-cream not-italic transition hover:bg-rose-deep disabled:opacity-50"
      >
        {loading ? "Saving…" : "Continue"}
      </button>
    </div>
  );
}
