import { ChatBubble } from "./components/ChatBubble";
import { ChatInput } from "./components/ChatInput";
import { CrisisBanner } from "./components/CrisisBanner";
import { useChatSession } from "./hooks/useChatSession";

export function ChatScreen() {
  const { messages, loading, crisis, error, sendMessage, clearError } =
    useChatSession();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 py-8 sm:px-6">
      <header className="mb-6">
        <p className="text-sm font-medium tracking-[0.14em] text-accent uppercase">
          Empathic Companion
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-ink sm:text-4xl">
          A quiet space to talk
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
          AI counseling support — not a replacement for professional mental
          health care. First replies may take 15–30 seconds on CPU.
        </p>
      </header>

      {crisis && (
        <div className="mb-4">
          <CrisisBanner />
        </div>
      )}

      <section className="flex min-h-[420px] flex-1 flex-col rounded-[28px] border border-line bg-surface/90 p-4 shadow-[0_20px_60px_-40px_rgba(28,43,42,0.45)] sm:p-5">
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto pr-1">
          {messages.length === 0 && !loading && (
            <p className="m-auto max-w-sm text-center text-sm text-muted">
              Whenever you’re ready, share what’s been hardest lately. I’m here
              to listen.
            </p>
          )}
          {messages.map((message, index) => (
            <ChatBubble key={`${message.role}-${index}`} message={message} />
          ))}
          {loading && (
            <p className="text-sm text-muted italic">Counselor is thinking…</p>
          )}
        </div>

        {error && (
          <div className="mt-3 flex items-start justify-between gap-3 rounded-xl border border-[#e4b4ae] bg-crisis-bg px-3 py-2 text-sm text-crisis">
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

        <div className="mt-4 border-t border-line pt-4">
          <ChatInput disabled={loading || crisis} onSend={sendMessage} />
        </div>
      </section>
    </div>
  );
}
