interface SessionTimerProps {
  remainingSec: number;
}

export function SessionTimer({ remainingSec }: SessionTimerProps) {
  const minutes = Math.floor(remainingSec / 60);
  const seconds = remainingSec % 60;
  const urgent = remainingSec <= 300;

  return (
    <span
      className={`font-mono text-[13px] tracking-[0.06em] ${
        urgent ? "text-rose" : "text-cream/60"
      }`}
    >
      {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
    </span>
  );
}
