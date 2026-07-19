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
    <div className="relative flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-cream text-ink pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <header className="relative flex shrink-0 items-center gap-2.5 border-b border-line px-3 pt-4 pb-3 sm:gap-3 sm:px-6 sm:pt-5 sm:pb-4 lg:px-8">
        <Diamond size={12} className="mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="truncate font-display text-[16px] font-normal text-ink sm:text-[17px]">
            Empathic Companion
          </p>
          <p className="mt-0.5 font-script text-[13px] font-medium text-ink/55 not-italic sm:text-[14px]">
            Settling in
          </p>
        </div>
      </header>

      <div className="relative shrink-0 px-3 pt-2.5 sm:px-6 sm:pt-3 lg:px-8" aria-hidden="true">
        <div className="relative h-[3px] w-full bg-line">
          <div
            className="absolute inset-y-0 left-0 bg-rose transition-[width] duration-700 ease-out"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="mx-auto flex w-full min-h-0 max-w-2xl flex-1 flex-col overflow-y-auto overscroll-contain px-3 py-4 sm:max-w-3xl sm:px-6 sm:py-5 lg:max-w-3xl lg:px-8"
        role="log"
        aria-live="polite"
      >
        <div className="mt-auto space-y-3 pb-3 sm:pb-4">
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

      <div className="shrink-0 border-t border-line bg-cream px-3 py-3 sm:px-6 sm:py-4 lg:px-8">
        <div className="mx-auto w-full max-w-2xl sm:max-w-3xl">
          {error && (
            <p className="mb-2 text-sm text-crisis" role="alert">
              {error}
            </p>
          )}
          {chips.length > 0 && (
            <div className="mb-2.5 max-h-[28dvh] overflow-y-auto overscroll-contain sm:mb-3 sm:max-h-none">
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
