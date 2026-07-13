import { appConfig } from "../../core/config/env";
import type { ApiErrorBody, ChatMessage, ChatResponse } from "../types/chat";

export class ApiClientError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
  }
}

function formatDetail(body: ApiErrorBody | null): string | null {
  if (!body?.detail) return null;
  if (typeof body.detail === "string") return body.detail;
  if (Array.isArray(body.detail) && body.detail[0]?.msg) {
    return body.detail[0].msg;
  }
  return null;
}

export async function sendChat(messages: ChatMessage[]): Promise<ChatResponse> {
  let response: Response;
  try {
    response = await fetch(`${appConfig.apiBaseUrl}/api/v1/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });
  } catch {
    throw new ApiClientError(
      "Cannot reach the counselor API. Is the backend running on port 8000?",
    );
  }

  if (!response.ok) {
    let body: ApiErrorBody | null = null;
    try {
      body = (await response.json()) as ApiErrorBody;
    } catch {
      body = null;
    }
    throw new ApiClientError(
      formatDetail(body) ?? `Request failed (${response.status})`,
      response.status,
    );
  }

  return (await response.json()) as ChatResponse;
}
