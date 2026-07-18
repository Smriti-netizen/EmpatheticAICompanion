import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api, ApiClientError } from "../api/client";
import { getAvatarId, getLocale, getUserId } from "../lib/storage";
import type { Booking } from "../types";

function withinJoinWindow(slotStart: string): boolean {
  const start = new Date(slotStart).getTime();
  const now = Date.now();
  return now >= start - 5 * 60 * 1000 && now <= start + 15 * 60 * 1000;
}

function dateStamp(iso: string): string {
  return new Date(iso)
    .toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
    .toUpperCase();
}

// A small line-art specimen per entry, so the list reads like a field guide.
function SpecimenIcon({ index }: { index: number }) {
  const icons = [
    <path
      key="leaf"
      d="M20 4C10 8 6 16 8 30c12-1 18-8 18-20a20 20 0 0 0-.4-4C22 8 16 12 13 20"
      stroke="currentColor"
      strokeWidth="1.4"
      fill="none"
      strokeLinecap="round"
    />,
    <g key="bud" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round">
      <path d="M16 30V15" />
      <path d="M16 15c-5 0-8-3-8-8 5 0 8 3 8 8Z" />
      <path d="M16 17c5 0 8-3 8-8-5 0-8 3-8 8Z" />
    </g>,
    <g key="moth" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round">
      <path d="M16 10v14" />
      <path d="M16 12C11 6 4 7 4 14c0 5 7 7 12 3" />
      <path d="M16 12c5-6 12-5 12 2 0 5-7 7-12 3" />
      <path d="M16 9c-.6-1.5-2-2-2-2M16 9c.6-1.5 2-2 2-2" />
    </g>,
  ];
  return (
    <svg viewBox="0 0 32 34" className="h-8 w-8 text-sage" aria-hidden="true">
      {icons[index % icons.length]}
    </svg>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = getUserId();
    if (!userId) {
      navigate("/consent");
      return;
    }
    void (async () => {
      try {
        const data = await api.listBookings(userId);
        setBookings(data.bookings);
      } catch (err) {
        setError(err instanceof ApiClientError ? err.message : "Could not load bookings");
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  async function startNow() {
    const userId = getUserId();
    if (!userId) return;
    try {
      const avatarId = getAvatarId();
      const locale = getLocale();
      // Keep DB voice prefs in sync with the companion shown in the UI.
      try {
        await api.setAvatar(userId, avatarId, locale);
      } catch {
        // Still start — startSession also syncs avatar_id.
      }
      const session = await api.createPracticeSession(userId, { avatarId, locale });
      navigate(`/session/${session.session_id}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not start");
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-5 py-12">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-[11px] font-semibold tracking-[0.28em] text-muted uppercase">
          Your field guide
        </p>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="text-[13px] font-medium text-ink/60 underline underline-offset-4 transition hover:text-ink"
        >
          Home
        </button>
      </div>
      <h1 className="mt-1 font-display text-4xl font-semibold text-ink">
        Your sessions
      </h1>
      <p className="mt-2 text-sm text-muted">
        Everything you've set aside time for, gathered in one quiet place.
      </p>

      <button
        type="button"
        onClick={() => void startNow()}
        className="mt-7 w-full rounded-full bg-accent px-6 py-4 text-sm font-semibold text-white shadow-warm transition hover:brightness-105 active:scale-[0.99]"
      >
        Start a session now · about 30 minutes
      </button>

      <button
        type="button"
        onClick={() => navigate("/book")}
        className="mt-3 w-full rounded-full border border-line bg-surface px-6 py-3.5 text-sm font-semibold text-ink transition hover:bg-accent-soft"
      >
        Schedule for later
      </button>

      {error && <p className="mt-4 text-sm text-crisis">{error}</p>}

      <div className="mt-8 space-y-3">
        {loading && (
          <div className="rounded-3xl border border-line bg-surface px-5 py-6 text-center text-sm text-muted">
            Gathering your sessions…
          </div>
        )}

        {!loading && bookings.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-3xl border border-line bg-surface px-5 py-10 text-center shadow-warm-sm">
            <SpecimenIcon index={1} />
            <p className="max-w-xs text-sm text-muted">
              Nothing scheduled yet. Your guide fills in as you go, so start
              whenever you're ready.
            </p>
          </div>
        )}

        {bookings.map((booking, i) => {
          const canJoin =
            booking.status === "booked" &&
            booking.session_id &&
            withinJoinWindow(booking.slot_start);
          return (
            <div
              key={booking.booking_id}
              className="flex items-center gap-4 rounded-3xl border border-line bg-surface px-5 py-4 shadow-warm-sm"
            >
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-sage/10">
                <SpecimenIcon index={i} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold tracking-[0.18em] text-muted uppercase">
                  {dateStamp(booking.slot_start)}
                </p>
                <p className="mt-0.5 text-sm text-ink">
                  {booking.status === "completed"
                    ? "A moment you made time for."
                    : canJoin
                      ? "Ready when you are."
                      : "Waiting quietly for you."}
                </p>
              </div>
              {canJoin ? (
                <button
                  type="button"
                  onClick={() => navigate(`/session/${booking.session_id}`)}
                  className="shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105"
                >
                  Join
                </button>
              ) : (
                <span className="shrink-0 text-[11px] tracking-wide text-muted">
                  Opens near start
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
