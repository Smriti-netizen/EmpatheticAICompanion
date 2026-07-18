import { useEffect, useRef } from "react";

import { Diamond } from "../../components/Diamond";
import { ChatBubble } from "../../components/ChatBubble";
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
    <div className="relative flex h-[100dvh] flex-col bg-cream text-ink">
      <header className="relative flex items-center gap-3 border-b border-line px-4 pt-5 pb-4 sm:px-6">
        <Diamond size={12} className="mt-0.5" />
        <div>
          <p className="font-display text-[17px] font-normal text-ink">Empathic Companion</p>
          <p className="mt-0.5 font-script text-[14px] font-medium text-ink/55 not-italic">
            Settling in
          </p>
        </div>
      </header>

      {/* Thin progress bar (a feeling of momentum, not a step counter). */}
      <div className="relative px-4 pt-3 sm:px-6" aria-hidden="true">
        <div className="relative h-[3px] w-full bg-line">
          <div
            className="absolute inset-y-0 left-0 bg-rose transition-[width] duration-700 ease-out"
            style={{ width: `${progress * 100}%` }}
          />
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
            <ChatBubble
              key={message.id}
              message={{ role: message.role, content: message.text }}
            />
          ))}
          {typing && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="border-t border-line bg-cream px-4 py-4 sm:px-6">
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
