import { useCallback, useState } from "react";

import { ApiClientError, sendChat } from "../../../shared/api/client";
import type { ChatMessage } from "../../../shared/types/chat";

interface UseChatSessionResult {
  messages: ChatMessage[];
  loading: boolean;
  crisis: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  clearError: () => void;
}

export function useChatSession(): UseChatSessionResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [crisis, setCrisis] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || loading || crisis) return;

      const nextMessages: ChatMessage[] = [
        ...messages,
        { role: "user", content: trimmed },
      ];
      setMessages(nextMessages);
      setLoading(true);
      setError(null);

      try {
        const data = await sendChat(nextMessages);
        if (data.crisis) setCrisis(true);
        setMessages([
          ...nextMessages,
          { role: "assistant", content: data.reply },
        ]);
      } catch (err) {
        const message =
          err instanceof ApiClientError
            ? err.message
            : "Something went wrong. Please try again.";
        setError(message);
        setMessages(messages);
      } finally {
        setLoading(false);
      }
    },
    [crisis, loading, messages],
  );

  return { messages, loading, crisis, error, sendMessage, clearError };
}
