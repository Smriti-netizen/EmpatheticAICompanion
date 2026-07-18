import type { ChatMessage } from "../shared/types/chat";

interface ChatBubbleProps {
  message: Pick<ChatMessage, "role" | "content">;
  /** Optional label above assistant bubbles (chat feature). */
  showCounselorLabel?: boolean;
}

/** Shared chat bubble used by onboarding and freeform chat. */
export function ChatBubble({ message, showCounselorLabel = false }: ChatBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={[
          "max-w-[82%] px-[18px] py-3.5 font-sans text-[15px] leading-[1.55] font-medium whitespace-pre-wrap not-italic",
          isUser
            ? "rounded-[14px] rounded-bl-[2px] bg-forest text-cream"
            : "rounded-[14px] rounded-br-[2px] bg-blush text-ink",
        ].join(" ")}
      >
        {showCounselorLabel && !isUser && (
          <p className="mb-1 text-xs font-medium tracking-wide text-accent uppercase">
            Counselor
          </p>
        )}
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}
