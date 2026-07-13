import { useEffect, useRef } from "react";

import { ChatBubble } from "./components/ChatBubble";
import { ChatComposer } from "./components/ChatComposer";
import { OptionChips } from "./components/OptionChips";
import { TypingIndicator } from "./components/TypingIndicator";
import { useIntakeConversation } from "./useIntakeConversation";

/**
 * Cerebral Valley–style conversational onboarding shell.
 * Questionnaire logic stays in intakeScript; payloads unchanged.
 */
export function IntakeChatPage() {
  const {
    messages,
    draft,
    setDraft,
    typing,
    busy,
    error,
    chips,
    sendText,
    selectChip,
  } = useIntakeConversation();

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, typing, chips]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 pb-6 pt-8 sm:px-6">
      <header className="mb-6">
        <p className="text-xs font-medium tracking-[0.16em] text-accent uppercase">
          Empathic Companion
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          A short conversation to begin
        </h1>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted">
          I’ll ask one thing at a time — like chatting with an assistant, not filling a form.
        </p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col rounded-[1.75rem] border border-line/70 bg-surface/70 backdrop-blur-sm">
        <div
          className="flex-1 space-y-3 overflow-y-auto px-4 py-5 sm:px-5"
          role="log"
          aria-live="polite"
          aria-relevant="additions"
        >
          {messages.map((message) => (
            <ChatBubble key={message.id} role={message.role} text={message.text} />
          ))}
          {typing && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-line/60 px-4 py-4 sm:px-5">
          {error && (
            <p className="mb-3 text-sm text-crisis" role="alert">
              {error}
            </p>
          )}

          {chips.length > 0 && (
            <div className="mb-3">
              <OptionChips
                options={chips}
                disabled={busy || typing}
                onSelect={selectChip}
              />
            </div>
          )}

          <ChatComposer
            value={draft}
            disabled={busy || typing}
            placeholder="Reply in your own words…"
            onChange={setDraft}
            onSend={sendText}
          />
          <p className="mt-2 text-center text-[11px] text-muted/80">
            Press Enter to send · Shift+Enter for a new line
          </p>
        </div>
      </div>
    </div>
  );
}
