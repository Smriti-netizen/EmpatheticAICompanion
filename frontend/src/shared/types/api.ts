export interface Helpline {
  name: string;
  phone: string;
}

export interface Slot {
  start: string;
  end: string;
  available: boolean;
}

export interface Booking {
  booking_id: string;
  session_id?: string;
  slot_start: string;
  slot_end: string;
  status: string;
}

export interface SessionChatResponse {
  reply: string;
  crisis: boolean;
  expression: string;
  remaining_sec: number;
  audio_base64?: string | null;
  audio_mime?: string;
  avatar_id?: string | null;
  locale?: string | null;
  tts_voice?: string | null;
}

export interface SessionVoiceResponse extends SessionChatResponse {
  transcript: string;
  audio_base64: string | null;
  audio_mime: string;
  /** True when mic caught silence — UI should stay on Listening. */
  empty?: boolean;
}

export interface SessionStartResponse {
  session_id: string;
  opening_message: string;
  duration_target_sec: number;
  clinical_context_loaded?: boolean;
  /** True when /start was called again on an already-live session (no fresh TTS). */
  already_active?: boolean;
  audio_base64?: string | null;
  audio_mime?: string;
  avatar_id?: string | null;
  locale?: string | null;
  tts_voice?: string | null;
}

export interface CloseSessionResponse {
  session_id: string;
  summary: string;
  homework: string;
  techniques_used: string;
  status: string;
}
