import { useEffect, useRef } from "react";

import { ChatBubble } from "../../components/ChatBubble";
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
    <div className="mx-auto flex h-[100dvh] max-h-[100dvh] w-full max-w-2xl flex-col overflow-hidden px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] sm:max-w-3xl sm:px-6 sm:pt-8 lg:px-8">
      <header className="mb-4 shrink-0 sm:mb-6">
        <p className="text-[11px] font-medium tracking-[0.16em] text-accent uppercase sm:text-xs">
          Empathic Companion
        </p>
        <h1 className="mt-1.5 font-display text-[1.5rem] font-semibold tracking-tight text-ink sm:mt-2 sm:text-3xl lg:text-4xl">
          A short conversation to begin
        </h1>
        <p className="mt-1.5 max-w-lg text-[13px] leading-relaxed text-muted sm:mt-2 sm:text-sm">
          I’ll ask one thing at a time — like chatting with an assistant, not filling a form.
        </p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col rounded-[1.5rem] border border-line/70 bg-surface/70 backdrop-blur-sm sm:rounded-[1.75rem]">
        <div
          className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 py-4 sm:px-5 sm:py-5"
          role="log"
          aria-live="polite"
          aria-relevant="additions"
        >
          {messages.map((message) => (
            <ChatBubble
              key={message.id}
              message={{ role: message.role, content: message.text }}
            />
          ))}
          {typing && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        <div className="shrink-0 border-t border-line/60 px-3 py-3 sm:px-5 sm:py-4">
          {error && (
            <p className="mb-2 text-sm text-crisis sm:mb-3" role="alert">
              {error}
            </p>
          )}

          {chips.length > 0 && (
            <div className="mb-2.5 max-h-[26dvh] overflow-y-auto overscroll-contain sm:mb-3 sm:max-h-none">
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
          <p className="mt-2 text-center text-[10px] text-muted/80 sm:text-[11px]">
            Press Enter to send · Shift+Enter for a new line
          </p>
        </div>
      </div>
    </div>
  );
}
