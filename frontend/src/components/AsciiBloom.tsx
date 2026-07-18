interface AsciiBloomProps {
  /** Warm microcopy shown under the bloom (e.g. "Let me gather my thoughts…"). */
  label?: string;
  size?: "sm" | "lg";
  className?: string;
}

// A soft pixel-flower that pulses and glows — the AI's "presence" motif.
const BLOOM = ["  .  *  .", " * °   ° *", ".  °  +  °  .", " * °   ° *", "  .  *  ."];

/**
 * ASCII-bloom: the signature loading / thinking indicator.
 * A cluster of soft monospace characters that pulse and glow like an
 * opening bloom — used instead of spinners or three grey dots, and as the
 * graceful fallback whenever an AI reply isn't ready yet.
 */
export function AsciiBloom({ label, size = "sm", className = "" }: AsciiBloomProps) {
  const textCls = size === "lg" ? "text-sm sm:text-base" : "text-[11px]";
  return (
    <div
      className={`flex flex-col items-center gap-2 ${className}`}
      role="status"
      aria-label={label ?? "Thinking"}
    >
      <div
        className={`font-mono ${textCls} leading-[1.2] tracking-[0.15em] text-accent select-none`}
        style={{ animation: "bloomGlow 3s ease-in-out infinite" }}
        aria-hidden="true"
      >
        {BLOOM.map((row, i) => (
          <div
            key={i}
            className="whitespace-pre text-center"
            style={{ animation: `bloomPulse 1.9s ease-in-out ${i * 0.14}s infinite` }}
          >
            {row}
          </div>
        ))}
      </div>
      {label && (
        <span className="text-[11px] tracking-wide text-muted italic">{label}</span>
      )}
    </div>
  );
}
