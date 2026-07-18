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

  // Approximate "how far along" for the growing-vine progress (a feeling,
  // not a strict step counter — no job-application progress bar).
  const answered = messages.filter((m) => m.role === "assistant").length;
  const progress = Math.min(0.97, answered / 26);

  return (
    <div className="flex h-[100dvh] flex-col bg-paper">
      <header className="flex items-center gap-3 px-4 pt-4 pb-2 sm:px-6">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-accent text-xs font-bold text-white shadow-warm-sm">
          EC
        </div>
        <div>
          <p className="text-sm font-semibold text-ink">Empathic Companion</p>
          <p className="text-[11px] tracking-[0.18em] text-muted uppercase">
            Settling in
          </p>
        </div>
      </header>

      {/* Botanical vine that grows left → right instead of a percentage bar. */}
      <div className="px-4 pb-3 sm:px-6" aria-hidden="true">
        <div className="relative h-[3px] w-full rounded-full bg-line/60">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-sage/80 transition-[width] duration-700 ease-out"
            style={{ width: `${progress * 100}%` }}
          />
          <span
            className="absolute -top-[7px] text-[13px] leading-none text-sage transition-[left] duration-700 ease-out"
            style={{ left: `calc(${progress * 100}% - 6px)` }}
          >
            ❧
          </span>
        </div>
      </div>

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
            placeholder="Say whatever's on your mind…"
            onChange={setDraft}
            onSend={sendText}
          />
        </div>
      </div>
    </div>
  );
}
