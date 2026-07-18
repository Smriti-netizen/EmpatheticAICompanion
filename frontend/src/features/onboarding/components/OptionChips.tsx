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
      className="flex flex-wrap gap-2.5"
      role="group"
      aria-label="Suggested replies"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(option)}
          className="rounded-full border border-line bg-cream px-6 py-3 font-sans text-[12px] leading-none font-medium text-ink not-italic transition hover:border-rose hover:text-rose focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose disabled:opacity-50 sm:px-7 sm:py-3.5"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
