import { appConfig } from "../core/config/env";
import type {
  Booking,
  CloseSessionResponse,
  SessionChatResponse,
  SessionStartResponse,
  SessionVoiceResponse,
  Slot,
} from "../types";

export class ApiClientError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${appConfig.apiBaseUrl}${path}`, {
      ...init,
      headers: {
        ...(init?.body instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiClientError(
      `Cannot reach the API at ${appConfig.apiBaseUrl}. Is the backend running?`,
    );
  }

  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      const body = (await response.json()) as { detail?: string };
      if (typeof body.detail === "string") detail = body.detail;
    } catch {
      // ignore parse errors
    }
    throw new ApiClientError(detail, response.status);
  }

  return (await response.json()) as T;
}

export const api = {
  createUser: (payload: {
    display_name: string;
    age?: number;
    locale?: string;
    consent_version?: string;
  }) =>
    request<{ user_id: string }>("/api/v1/users", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  saveIntake: (
    userId: string,
    payload: {
      primary_concerns: string[];
      session_goal: string;
      crisis_screen_positive: boolean;
      duration_problem?: string;
      prior_therapy?: boolean;
      support_person?: string;
      clinical_summary?: string;
      avatar_id?: string;
    },
  ) =>
    request(`/api/v1/users/${userId}/intake`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  setAvatar: (userId: string, avatarId: string) =>
    request(`/api/v1/users/${userId}/avatar`, {
      method: "PUT",
      body: JSON.stringify({ avatar_id: avatarId }),
    }),

  saveScreening: (
    userId: string,
    payload: { instrument: "PHQ9" | "GAD7"; items: number[] },
  ) =>
    request(`/api/v1/users/${userId}/screenings`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  listSlots: (from?: string) =>
    request<{ slots: Slot[] }>(
      `/api/v1/bookings/slots?timezone=Asia/Kolkata${from ? `&from=${from}` : ""}`,
    ),

  createBooking: (userId: string, slotStart: string) =>
    request<{
      booking_id: string;
      session_id: string;
      slot_start: string;
      slot_end: string;
      status: string;
    }>("/api/v1/bookings", {
      method: "POST",
      body: JSON.stringify({ user_id: userId, slot_start: slotStart }),
    }),

  listBookings: (userId: string) =>
    request<{ bookings: Booking[] }>(`/api/v1/bookings?user_id=${userId}`),

  createPracticeSession: (userId: string) =>
    request<{ session_id: string }>("/api/v1/sessions/practice", {
      method: "POST",
      body: JSON.stringify({ user_id: userId }),
    }),

  startSession: (sessionId: string) =>
    request<SessionStartResponse>(`/api/v1/sessions/${sessionId}/start`, {
      method: "POST",
    }),

  getSession: (sessionId: string) =>
    request<{
      session_id: string;
      status: string;
      remaining_sec: number;
      messages: { role: string; content: string }[];
    }>(`/api/v1/sessions/${sessionId}`),

  sessionChat: (sessionId: string, content: string) =>
    request<SessionChatResponse>(`/api/v1/sessions/${sessionId}/chat`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),

  sessionVoice: (sessionId: string, audio: Blob) => {
    const form = new FormData();
    const name = audio.type.includes("wav") ? "utterance.wav" : "utterance.webm";
    form.append("audio", audio, name);
    return request<SessionVoiceResponse>(`/api/v1/sessions/${sessionId}/voice`, {
      method: "POST",
      body: form,
    });
  },

  closeSession: (sessionId: string, moodEnd?: number) =>
    request<CloseSessionResponse>(`/api/v1/sessions/${sessionId}/close`, {
      method: "POST",
      body: JSON.stringify({ mood_end: moodEnd ?? null }),
    }),

  crisisResources: () =>
    request<{
      helplines: { name: string; phone: string }[];
      message: string;
    }>("/api/v1/crisis/resources"),

  health: () =>
    request<{
      api: string;
      model_loaded: boolean;
      whisper: string;
      whisper_error?: string | null;
      piper: string;
      tts?: string;
      tts_engine?: string;
    }>("/api/v1/health"),
};
