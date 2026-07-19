import { ChatBubble } from "../../components/ChatBubble";
import { ChatInput } from "./components/ChatInput";
import { CrisisBanner } from "./components/CrisisBanner";
import { useChatSession } from "./hooks/useChatSession";

export function ChatScreen() {
  const { messages, loading, crisis, error, sendMessage, clearError } =
    useChatSession();

  return (
    <div className="mx-auto flex h-[100dvh] max-h-[100dvh] w-full max-w-2xl flex-col overflow-hidden px-3 py-4 sm:max-w-3xl sm:px-6 sm:py-6 lg:max-w-3xl lg:px-8 lg:py-8">
      <header className="mb-3 shrink-0 sm:mb-5">
        <p className="text-[11px] font-medium tracking-[0.14em] text-accent uppercase sm:text-sm">
          Empathic Companion
        </p>
        <h1 className="mt-1.5 font-display text-[1.5rem] font-semibold text-ink sm:mt-2 sm:text-3xl lg:text-4xl">
          A quiet space to talk
        </h1>
        <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-muted sm:mt-2 sm:text-sm">
          AI counseling support — not a replacement for professional mental
          health care. First replies may take 15–30 seconds on CPU.
        </p>
      </header>

      {crisis && (
        <div className="mb-3 shrink-0 sm:mb-4">
          <CrisisBanner />
        </div>
      )}

      <section className="flex min-h-0 flex-1 flex-col rounded-[1.5rem] border border-line bg-surface/90 p-3 shadow-[0_20px_60px_-40px_rgba(28,43,42,0.45)] sm:rounded-[28px] sm:p-5">
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain pr-0.5">
          {messages.length === 0 && !loading && (
            <p className="m-auto max-w-sm px-2 text-center text-sm text-muted">
              Whenever you’re ready, share what’s been hardest lately. I’m here
              to listen.
            </p>
          )}
          {messages.map((message, index) => (
            <ChatBubble
              key={`${message.role}-${index}`}
              message={message}
              showCounselorLabel
            />
          ))}
          {loading && (
            <p className="text-sm text-muted italic">Counselor is thinking…</p>
          )}
        </div>

        {error && (
          <div className="mt-3 flex shrink-0 items-start justify-between gap-3 rounded-xl border border-[#e4b4ae] bg-crisis-bg px-3 py-2 text-sm text-crisis">
            <p>{error}</p>
            <button
              type="button"
              onClick={clearError}
              className="shrink-0 font-medium underline"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="mt-3 shrink-0 border-t border-line pt-3 sm:mt-4 sm:pt-4">
          <ChatInput disabled={loading || crisis} onSend={sendMessage} />
        </div>
      </section>
    </div>
  );
}
