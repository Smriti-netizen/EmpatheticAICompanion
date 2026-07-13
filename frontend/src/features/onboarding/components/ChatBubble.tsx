interface ChatBubbleProps {
  role: "assistant" | "user";
  text: string;
}

export function ChatBubble({ role, text }: ChatBubbleProps) {
  const isUser = role === "user";
  return (
    <div
      className={`flex w-full animate-[fadeSlide_280ms_ease-out] ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={[
          "max-w-[min(100%,34rem)] rounded-[1.35rem] px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap",
          isUser
            ? "rounded-br-md bg-accent text-white"
            : "rounded-bl-md border border-line/80 bg-surface text-ink shadow-[0_1px_0_rgba(28,43,42,0.04)]",
        ].join(" ")}
      >
        {text}
      </div>
    </div>
  );
}
