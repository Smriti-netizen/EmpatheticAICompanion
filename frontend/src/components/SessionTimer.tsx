interface SessionTimerProps {
  remainingSec: number;
}

export function SessionTimer({ remainingSec }: SessionTimerProps) {
  const minutes = Math.floor(remainingSec / 60);
  const seconds = remainingSec % 60;
  const urgent = remainingSec <= 300;

  return (
    <div
      className={`rounded-full px-4 py-1.5 text-sm font-semibold tracking-wide ${
        urgent ? "bg-crisis-bg text-crisis" : "bg-accent-soft text-accent"
      }`}
    >
      {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
    </div>
  );
}
