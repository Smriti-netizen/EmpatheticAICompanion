interface ChatBubbleProps {
  role: "assistant" | "user";
  text: string;
}

export function ChatBubble({ role, text }: ChatBubbleProps) {
  const isUser = role === "user";
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
        {text}
      </div>
    </div>
  );
}
