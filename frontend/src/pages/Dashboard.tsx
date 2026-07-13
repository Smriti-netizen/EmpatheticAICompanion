import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api, ApiClientError } from "../api/client";
import { getUserId } from "../lib/storage";
import type { Booking } from "../types";

function withinJoinWindow(slotStart: string): boolean {
  const start = new Date(slotStart).getTime();
  const now = Date.now();
  return now >= start - 5 * 60 * 1000 && now <= start + 15 * 60 * 1000;
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
      const session = await api.createPracticeSession(userId);
      navigate(`/session/${session.session_id}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not start");
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold">Dashboard</h1>
          <p className="mt-2 text-sm text-muted">Your upcoming sessions.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/book")}
          className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white"
        >
          Book
        </button>
      </div>

      <button
        type="button"
        onClick={() => void startNow()}
        className="mt-6 w-full rounded-2xl border border-accent bg-accent-soft px-5 py-4 text-sm font-semibold text-ink"
      >
        Start a session now
      </button>

      {error && <p className="mt-4 text-sm text-crisis">{error}</p>}

      <div className="mt-6 space-y-3">
        {loading && <p className="text-sm text-muted">Loading…</p>}
        {!loading && bookings.length === 0 && (
          <p className="text-sm text-muted">No scheduled bookings yet.</p>
        )}
        {bookings.map((booking) => {
          const canJoin =
            booking.status === "booked" &&
            booking.session_id &&
            withinJoinWindow(booking.slot_start);
          return (
            <div
              key={booking.booking_id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold">
                  {new Date(booking.slot_start).toLocaleString()}
                </p>
                <p className="text-xs uppercase tracking-wide text-muted">{booking.status}</p>
              </div>
              {canJoin ? (
                <button
                  type="button"
                  onClick={() => navigate(`/session/${booking.session_id}`)}
                  className="rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-white"
                >
                  Join
                </button>
              ) : (
                <span className="text-xs text-muted">Join opens near start time</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
