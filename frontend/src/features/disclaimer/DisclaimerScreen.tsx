import { HELPLINES } from "../../shared/constants/helplines";

interface DisclaimerScreenProps {
  onAccept: () => void;
}

export function DisclaimerScreen({ onAccept }: DisclaimerScreenProps) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-4 py-10 sm:px-6">
      <p className="text-sm font-medium tracking-[0.14em] text-accent uppercase">
        Empathic Companion
      </p>
      <h1 className="mt-3 font-display text-4xl font-semibold leading-tight text-ink">
        Before we begin
      </h1>
      <p className="mt-4 text-base leading-relaxed text-muted">
        This is an AI counselor for supportive conversation. It does not diagnose
        conditions, prescribe medication, or replace a licensed therapist or
        emergency services.
      </p>

      <ul className="mt-6 space-y-3 rounded-[24px] border border-line bg-surface/90 p-5 text-sm leading-relaxed text-ink">
        <li>Use this space for reflection, coping ideas, and being heard.</li>
        <li>
          If you feel unsafe or think about harming yourself, contact a helpline
          or emergency services immediately.
        </li>
        <li>
          Helplines:{" "}
          {HELPLINES.map((line, index) => (
            <span key={line.value}>
              {index > 0 ? " · " : ""}
              {line.label} {line.value}
            </span>
          ))}
        </li>
      </ul>

      <button
        type="button"
        onClick={onAccept}
        className="mt-8 rounded-2xl bg-accent px-5 py-3.5 text-sm font-semibold text-white transition hover:brightness-110"
      >
        I understand — continue to chat
      </button>
    </div>
  );
}
