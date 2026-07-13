import { useEffect, useRef, type FormEvent, type KeyboardEvent } from "react";

interface ChatComposerProps {
  value: string;
  disabled?: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
  onSend: () => void;
}

export function ChatComposer({
  value,
  disabled,
  placeholder = "Message…",
  onChange,
  onSend,
}: ChatComposerProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!disabled) ref.current?.focus();
  }, [disabled]);

  function submit(event?: FormEvent) {
    event?.preventDefault();
    if (!value.trim() || disabled) return;
    onSend();
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <form
      onSubmit={submit}
      className="flex items-end gap-2 rounded-[1.5rem] border border-line bg-surface p-2 shadow-[0_12px_40px_-28px_rgba(28,43,42,0.55)]"
    >
      <label className="sr-only" htmlFor="intake-composer">
        Message
      </label>
      <textarea
        id="intake-composer"
        ref={ref}
        rows={1}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        className="max-h-32 min-h-[44px] flex-1 resize-none bg-transparent px-3 py-2.5 text-[15px] text-ink outline-none placeholder:text-muted/70 disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="shrink-0 rounded-[1.1rem] bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Send
      </button>
    </form>
  );
}
