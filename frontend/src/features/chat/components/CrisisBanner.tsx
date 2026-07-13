import { HELPLINES } from "../../../shared/constants/helplines";

export function CrisisBanner() {
  return (
    <section
      role="alert"
      className="rounded-2xl border border-[#e4b4ae] bg-crisis-bg px-4 py-4 text-crisis"
    >
      <h2 className="font-display text-lg font-semibold">Crisis support</h2>
      <p className="mt-1 text-sm leading-relaxed">
        If you are in danger or thinking about harming yourself, please reach out
        now. This chat is paused so you can get real help.
      </p>
      <ul className="mt-3 space-y-1 text-sm font-medium">
        {HELPLINES.map((line) => (
          <li key={line.value}>
            {line.label}: {line.value}
          </li>
        ))}
      </ul>
    </section>
  );
}
