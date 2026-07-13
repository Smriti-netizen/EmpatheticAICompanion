interface AvatarStageProps {
  expression: string;
  speaking?: boolean;
  listening?: boolean;
  fill?: boolean;
}

const EXPRESSION_LABEL: Record<string, string> = {
  calm: "Calm",
  attentive: "Listening",
  concerned: "Concerned",
  warm: "Warm",
};

/** SVG fallback until counselor.riv — same props interface for Rive drop-in. */
export function AvatarStage({
  expression,
  speaking = false,
  listening = false,
  fill = false,
}: AvatarStageProps) {
  const mouthScale = speaking ? 1.45 : 1;
  const status = speaking ? "Speaking" : listening ? "Listening" : EXPRESSION_LABEL[expression] ?? "Calm";

  return (
    <div
      className={
        fill
          ? "flex h-full w-full items-center justify-center"
          : "mx-auto flex w-full max-w-sm flex-col items-center"
      }
    >
      <div
        className={[
          "relative rounded-full bg-accent-soft/80 shadow-[0_30px_80px_-30px_rgba(47,111,104,0.9)]",
          fill ? "h-[min(58vh,420px)] w-[min(58vh,420px)]" : "aspect-square w-56",
          speaking ? "ring-4 ring-accent/40" : "",
          listening ? "ring-4 ring-white/30" : "",
        ].join(" ")}
      >
        <svg viewBox="0 0 200 200" className="h-full w-full p-8" aria-hidden>
          <circle cx="100" cy="100" r="78" fill="#fffcf7" stroke="#2f6f68" strokeWidth="3" />
          <circle cx="72" cy="88" r="6" fill="#1c2b2a" />
          <circle cx="128" cy="88" r="6" fill="#1c2b2a" />
          <ellipse
            cx="100"
            cy="128"
            rx={18}
            ry={8 * mouthScale}
            fill="#2f6f68"
            opacity={0.85}
          />
        </svg>
        <p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-surface/90 px-3 py-1 text-xs font-medium text-accent">
          {status}
        </p>
      </div>
    </div>
  );
}
