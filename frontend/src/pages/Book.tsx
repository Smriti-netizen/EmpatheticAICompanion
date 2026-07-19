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
    <div className="mx-auto min-h-[100dvh] w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-10 lg:max-w-3xl lg:px-8 lg:py-12 xl:max-w-4xl">
      <h1 className="font-display text-[1.75rem] leading-tight font-semibold sm:text-4xl">
        Your session
      </h1>
      <p className="mt-2 text-sm text-muted sm:text-[15px]">
        Talk now, or set aside time that works for you.
      </p>

      {error && <p className="mt-4 text-sm text-crisis">{error}</p>}

      <div className="mt-6 grid gap-3 sm:mt-8 sm:grid-cols-2 sm:gap-4">
        <button
          type="button"
          disabled={booking}
          onClick={() => void startNow()}
          className="flex min-h-[5.5rem] flex-col items-start rounded-3xl bg-accent px-4 py-4 text-left text-white shadow-warm transition hover:brightness-105 active:scale-[0.99] disabled:opacity-50 sm:px-5 sm:py-5"
        >
          <span className="text-[15px] font-semibold sm:text-base">
            Start a session now
          </span>
          <span className="mt-1 text-[13px] text-white/85 sm:text-sm">
            Begin right away · about 30 minutes
          </span>
        </button>

        <button
          type="button"
          disabled={booking}
          onClick={() => setShowSchedule((v) => !v)}
          aria-expanded={showSchedule}
          className="flex min-h-[5.5rem] flex-col items-start rounded-2xl border border-accent/25 bg-accent-soft/60 px-4 py-4 text-left text-ink transition hover:border-accent hover:bg-accent-soft disabled:opacity-50 sm:px-5 sm:py-5"
        >
          <span className="text-[15px] font-semibold sm:text-base">
            Schedule for later
          </span>
          <span className="mt-1 text-[13px] text-muted sm:text-sm">
            Pick a time · 09:00–21:00 IST
          </span>
        </button>
      </div>

      {showSchedule && (
        <div className="mt-6 sm:mt-8">
          <p className="text-sm font-medium text-ink">Choose a time that suits you</p>
          <div className="mt-3 sm:mt-4">
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
