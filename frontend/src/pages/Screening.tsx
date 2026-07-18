import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api, ApiClientError } from "../api/client";
import {
  GAD7_ITEMS,
  LIKERT,
  PHQ9_ITEMS,
  gad7Band,
  phq9Band,
  sumItems,
} from "../lib/scoring";
import { getUserId } from "../lib/storage";

export function ScreeningPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"PHQ9" | "GAD7">("PHQ9");
  const [phq, setPhq] = useState<number[]>(Array(9).fill(-1));
  const [gad, setGad] = useState<number[]>(Array(7).fill(-1));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [phq9Flag, setPhq9Flag] = useState(false);

  const items = step === "PHQ9" ? PHQ9_ITEMS : GAD7_ITEMS;
  const values = step === "PHQ9" ? phq : gad;
  const setValues = step === "PHQ9" ? setPhq : setGad;
  const complete = values.every((v) => v >= 0);
  const score = useMemo(
    () => (complete ? sumItems(values) : null),
    [complete, values],
  );

  function setItem(index: number, value: number) {
    setValues((prev) => prev.map((v, i) => (i === index ? value : v)));
  }

  async function next() {
    const userId = getUserId();
    if (!userId) {
      navigate("/consent");
      return;
    }
    if (!complete) {
      setError("Please answer every item.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await api.saveScreening(userId, {
        instrument: step,
        items: values,
      });
      if (step === "PHQ9") {
        setPhq9Flag(Boolean((result as { phq9_item9_flag?: boolean }).phq9_item9_flag));
        setStep("GAD7");
      } else {
        navigate("/book");
      }
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Screening failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-10">
      <h1 className="font-display text-4xl font-semibold">
        {step === "PHQ9" ? "PHQ-9" : "GAD-7"}
      </h1>
      <p className="mt-2 text-sm text-muted">
        Over the last 2 weeks, how often have you been bothered by the following?
      </p>

      <div className="mt-6 space-y-5">
        {items.map((label, index) => (
          <div key={label} className="rounded-2xl border border-line bg-surface p-4">
            <p className="text-sm font-medium text-ink">
              {index + 1}. {label}
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {LIKERT.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setItem(index, option.value)}
                  className={`rounded-xl px-3 py-2 text-left text-xs ${
                    values[index] === option.value
                      ? "bg-accent text-white"
                      : "border border-line"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {score !== null && (
        <p className="mt-4 text-sm text-muted">
          Score: {score} (
          {step === "PHQ9" ? phq9Band(score) : gad7Band(score)})
        </p>
      )}

      {phq9Flag && step === "GAD7" && (
        <p className="mt-4 rounded-xl bg-crisis-bg px-3 py-2 text-sm text-crisis">
          You marked thoughts of self-harm on PHQ-9. Help is available anytime at{" "}
          <button type="button" className="underline" onClick={() => navigate("/crisis")}>
            crisis resources
          </button>
          .
        </p>
      )}

      {error && <p className="mt-4 text-sm text-crisis">{error}</p>}

      <button
        type="button"
        disabled={loading}
        onClick={() => void next()}
        className="mt-8 rounded-full bg-rose px-9 py-4 font-sans text-[12px] font-medium text-cream not-italic transition hover:bg-rose-deep disabled:opacity-50"
      >
        {loading ? "Saving…" : step === "PHQ9" ? "Continue to GAD-7" : "Continue to booking"}
      </button>
    </div>
  );
}
