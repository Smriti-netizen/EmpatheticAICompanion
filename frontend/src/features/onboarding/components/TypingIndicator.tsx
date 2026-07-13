export function TypingIndicator() {
  return (
    <div
      className="flex justify-start animate-[fadeSlide_200ms_ease-out]"
      aria-live="polite"
      aria-label="Assistant is typing"
    >
      <div className="flex items-center gap-1.5 rounded-[1.35rem] rounded-bl-md border border-line/80 bg-surface px-4 py-3">
        <span className="h-2 w-2 animate-bounce rounded-full bg-muted/70 [animation-delay:-0.2s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-muted/70 [animation-delay:-0.1s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-muted/70" />
      </div>
    </div>
  );
}
