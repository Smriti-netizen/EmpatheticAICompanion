export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
  role: ChatRole;
  content: string;
  created_at?: string;
}

export interface ChatResponse {
  reply: string;
  crisis: boolean;
}

export interface ApiErrorBody {
  detail?: string | { msg: string }[];
}
