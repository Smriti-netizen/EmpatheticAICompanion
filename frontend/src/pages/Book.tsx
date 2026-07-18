import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api, ApiClientError } from "../shared/api/client";
import { BookingCalendar } from "../components/BookingCalendar";
import { getUserId } from "../lib/storage";
import type { Slot } from "../shared/types/api";

export function BookPage() {
  const navigate = useNavigate();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const data = await api.listSlots();
        setSlots(data.slots);
      } catch (err) {
        setError(err instanceof ApiClientError ? err.message : "Could not load slots");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function onBook(slotStart: string) {
    const userId = getUserId();
    if (!userId) {
      navigate("/consent");
      return;
    }
    setBooking(true);
    setError(null);
    try {
      await api.createBooking(userId, slotStart);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Booking failed");
    } finally {
      setBooking(false);
    }
  }

  async function startNow() {
    const userId = getUserId();
    if (!userId) {
      navigate("/consent");
      return;
    }
    setBooking(true);
    setError(null);
    try {
      const session = await api.createPracticeSession(userId);
      navigate(`/session/${session.session_id}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not start session");
    } finally {
      setBooking(false);
    }
  }

  const [showSchedule, setShowSchedule] = useState(false);

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-10">
      <h1 className="font-display text-4xl font-semibold">Your session</h1>
      <p className="mt-2 text-sm text-muted">
        Talk now, or set aside time that works for you.
      </p>

      {error && <p className="mt-4 text-sm text-crisis">{error}</p>}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          disabled={booking}
          onClick={() => void startNow()}
          className="flex flex-col items-start rounded-3xl bg-accent px-5 py-5 text-left text-white shadow-warm transition hover:brightness-105 active:scale-[0.99] disabled:opacity-50"
        >
          <span className="text-base font-semibold">Start a session now</span>
          <span className="mt-1 text-sm text-white/85">
            Begin right away · about 30 minutes
          </span>
        </button>

        <button
          type="button"
          disabled={booking}
          onClick={() => setShowSchedule((v) => !v)}
          aria-expanded={showSchedule}
          className="flex flex-col items-start rounded-2xl border border-accent/25 bg-accent-soft/60 px-5 py-5 text-left text-ink transition hover:border-accent hover:bg-accent-soft disabled:opacity-50"
        >
          <span className="text-base font-semibold">Schedule for later</span>
          <span className="mt-1 text-sm text-muted">
            Pick a time · 09:00–21:00 IST
          </span>
        </button>
      </div>

      {showSchedule && (
        <div className="mt-8">
          <p className="text-sm font-medium text-ink">Choose a time that suits you</p>
          <div className="mt-4">
            {!error && (
              <BookingCalendar
                slots={slots}
                loading={loading || booking}
                onBook={(start) => void onBook(start)}
              />
            )}
            {error && !loading && (
              <button
                type="button"
                className="mt-2 text-sm font-semibold text-accent underline"
                onClick={() => window.location.reload()}
              >
                Retry loading slots
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
