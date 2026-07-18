import { AsciiBloom } from "../../../components/AsciiBloom";

export function TypingIndicator() {
  return (
    <div
      className="flex justify-start animate-[fadeSlide_200ms_ease-out]"
      aria-live="polite"
      aria-label="Companion is gathering their thoughts"
    >
      <div className="rounded-[1.35rem] rounded-bl-md border border-line/80 bg-surface px-5 py-3.5 shadow-warm-sm">
        <AsciiBloom />
      </div>
    </div>
  );
}
