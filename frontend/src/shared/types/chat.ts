export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatResponse {
  reply: string;
  crisis: boolean;
}

export interface ApiErrorBody {
  detail?: string | { msg: string }[];
}
