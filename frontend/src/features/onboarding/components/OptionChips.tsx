import type { QuickOption } from "../intakeScript";

interface OptionChipsProps {
  options: QuickOption[];
  disabled?: boolean;
  onSelect: (option: QuickOption) => void;
}

export function OptionChips({ options, disabled, onSelect }: OptionChipsProps) {
  if (!options.length) return null;

  return (
    <div
      className="flex flex-wrap gap-2 animate-[fadeSlide_250ms_ease-out]"
      role="group"
      aria-label="Suggested replies"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(option)}
          className="rounded-full border border-accent/25 bg-accent-soft/80 px-3.5 py-2 text-sm font-medium text-ink transition hover:border-accent hover:bg-accent-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
