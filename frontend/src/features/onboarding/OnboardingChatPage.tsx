import { useEffect, useRef } from "react";

import { ChatBubble } from "./components/ChatBubble";
import { ChatComposer } from "./components/ChatComposer";
import { OptionChips } from "./components/OptionChips";
import { TypingIndicator } from "./components/TypingIndicator";
import { useOnboardingChat } from "./useOnboardingChat";

/**
 * Full onboarding = one continuous chat (consent + clinical intake).
 * No multi-field forms — Cerebral Valley register pattern.
 */
export function OnboardingChatPage() {
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
  } = useOnboardingChat();

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, typing, chips]);

  return (
    <div className="flex h-[100dvh] flex-col bg-paper">
      <header className="flex items-center gap-3 border-b border-line/60 px-4 py-3 sm:px-6">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-accent text-xs font-bold text-white">
          EC
        </div>
        <div>
          <p className="text-sm font-semibold text-ink">Empathic Companion</p>
          <p className="text-xs text-muted">Online · onboarding chat</p>
        </div>
      </header>

      <div
        ref={scrollerRef}
        className="mx-auto flex w-full max-w-2xl flex-1 flex-col overflow-y-auto px-4 py-5 sm:px-6"
        role="log"
        aria-live="polite"
      >
        <div className="mt-auto space-y-3 pb-4">
          {messages.map((message) => (
            <ChatBubble key={message.id} role={message.role} text={message.text} />
          ))}
          {typing && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="border-t border-line/60 bg-surface/90 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto w-full max-w-2xl">
          {error && (
            <p className="mb-2 text-sm text-crisis" role="alert">
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
            placeholder="Type a message…"
            onChange={setDraft}
            onSend={sendText}
          />
        </div>
      </div>
    </div>
  );
}
