import type { ChatMessage } from "../shared/types/chat";

interface ChatPanelProps {
  messages: ChatMessage[];
  loading?: boolean;
}

export function ChatPanel({ messages, loading }: ChatPanelProps) {
  return (
    <div className="flex max-h-72 flex-col gap-3 overflow-y-auto rounded-2xl border border-line bg-surface/80 p-4">
      {messages.length === 0 && !loading && (
        <p className="text-center text-sm text-muted">Transcript will appear here.</p>
      )}
      {messages.map((message, index) => (
        <div
          key={`${message.role}-${index}`}
          className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
            message.role === "user"
              ? "ml-auto bg-user"
              : "border border-line bg-paper"
          }`}
        >
          {message.content}
        </div>
      ))}
      {loading && <p className="text-sm text-muted italic">Counselor is thinking…</p>}
    </div>
  );
}
