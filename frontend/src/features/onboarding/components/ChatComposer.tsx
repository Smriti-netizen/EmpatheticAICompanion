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
      className="flex items-end gap-2 rounded-full border border-line bg-surface py-1.5 pr-1.5 pl-5"
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
        className="max-h-32 min-h-[48px] flex-1 resize-none bg-transparent py-2.5 font-sans text-[16px] font-medium text-ink outline-none placeholder:text-ink/40 disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="shrink-0 rounded-full bg-rose px-6 py-3 font-sans text-[12px] font-medium text-cream not-italic transition hover:bg-rose-deep disabled:cursor-not-allowed disabled:opacity-40"
      >
        Send
      </button>
    </form>
  );
}
