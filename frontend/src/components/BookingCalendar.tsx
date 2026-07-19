import type { Slot } from "../shared/types/api";

interface BookingCalendarProps {
  slots: Slot[];
  loading?: boolean;
  onBook: (slotStart: string) => void;
}

export function BookingCalendar({ slots, loading, onBook }: BookingCalendarProps) {
  const available = slots.filter((slot) => slot.available).slice(0, 24);

  if (loading) {
    return <p className="text-sm text-muted">Loading slots…</p>;
  }

  if (available.length === 0) {
    return <p className="text-sm text-muted">No open slots in the next 14 days.</p>;
  }

  return (
    <div className="grid max-h-[min(55dvh,28rem)] gap-2 overflow-y-auto overscroll-contain pr-0.5 sm:max-h-none sm:grid-cols-2 lg:grid-cols-3">
      {available.map((slot) => {
        const start = new Date(slot.start);
        return (
          <button
            key={slot.start}
            type="button"
            onClick={() => onBook(slot.start)}
            className="rounded-2xl border border-line bg-surface px-3 py-3 text-left transition hover:border-accent hover:bg-accent-soft sm:px-4"
          >
            <p className="text-[13px] font-semibold text-ink sm:text-sm">
              {start.toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </p>
            <p className="text-[13px] text-muted sm:text-sm">
              {start.toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              · 45 min
            </p>
          </button>
        );
      })}
    </div>
  );
}
