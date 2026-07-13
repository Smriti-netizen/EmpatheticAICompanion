import { useState, type FormEvent, type KeyboardEvent } from "react";

interface ChatInputProps {
  disabled: boolean;
  onSend: (content: string) => Promise<void>;
}

export function ChatInput({ disabled, onSend }: ChatInputProps) {
  const [value, setValue] = useState("");

  async function submit() {
    if (!value.trim() || disabled) return;
    const next = value;
    setValue("");
    await onSend(next);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void submit();
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex items-end gap-3">
      <label className="sr-only" htmlFor="chat-input">
        Message
      </label>
      <textarea
        id="chat-input"
        rows={2}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Share what’s on your mind…"
        disabled={disabled}
        className="min-h-[52px] flex-1 resize-none rounded-2xl border border-line bg-surface px-4 py-3 text-[15px] text-ink outline-none transition focus:border-accent disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Send
      </button>
    </form>
  );
}
