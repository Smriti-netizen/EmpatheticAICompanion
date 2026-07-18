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
    <div className="grid gap-2 sm:grid-cols-2">
      {available.map((slot) => {
        const start = new Date(slot.start);
        return (
          <button
            key={slot.start}
            type="button"
            onClick={() => onBook(slot.start)}
            className="rounded-2xl border border-line bg-surface px-4 py-3 text-left transition hover:border-accent hover:bg-accent-soft"
          >
            <p className="text-sm font-semibold text-ink">
              {start.toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </p>
            <p className="text-sm text-muted">
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
