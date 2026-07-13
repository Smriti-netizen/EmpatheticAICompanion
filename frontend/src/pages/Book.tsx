import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api, ApiClientError } from "../api/client";
import { BookingCalendar } from "../components/BookingCalendar";
import { getUserId } from "../lib/storage";
import type { Slot } from "../types";

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

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-10">
      <h1 className="font-display text-4xl font-semibold">Book a session</h1>
      <p className="mt-2 text-sm text-muted">
        45-minute slots, 09:00–21:00 IST, with a 10-minute buffer — or start one now.
      </p>

      <button
        type="button"
        disabled={booking}
        onClick={() => void startNow()}
        className="mt-6 w-full rounded-2xl bg-accent px-5 py-4 text-sm font-semibold text-white disabled:opacity-50"
      >
        Start a session now
      </button>

      <p className="mt-8 text-sm font-medium text-ink">Or pick a later slot</p>
      {error && <p className="mt-4 text-sm text-crisis">{error}</p>}
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
  );
}
