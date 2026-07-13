import type { ChatMessage as ChatMessageType } from "../../../shared/types/chat";

interface ChatBubbleProps {
  message: ChatMessageType;
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={[
          "max-w-[85%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed",
          isUser
            ? "bg-user text-ink"
            : "border border-line bg-surface text-ink",
        ].join(" ")}
      >
        {!isUser && (
          <p className="mb-1 text-xs font-medium tracking-wide text-accent uppercase">
            Counselor
          </p>
        )}
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}
