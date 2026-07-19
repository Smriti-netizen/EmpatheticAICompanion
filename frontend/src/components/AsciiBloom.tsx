interface AsciiBloomProps {
  label?: string;
  size?: "sm" | "lg";
  tone?: "rose" | "cream";
  className?: string;
}

const BLOOM = ["  .  *  .", " * °   ° *", ".  °  +  °  .", " * °   ° *", "  .  *  ."];

export function AsciiBloom({ label, size = "sm", tone = "rose", className = "" }: AsciiBloomProps) {
  const textCls = size === "lg" ? "text-sm sm:text-base" : "text-[11px]";
  const bloomColor = tone === "cream" ? "text-cream/80" : "text-rose";
  const labelColor = tone === "cream" ? "text-cream/55" : "text-ink/55";
  return (
    <div
      className={`flex flex-col items-center gap-2 ${className}`}
      role="status"
      aria-label={label ?? "Thinking"}
    >
      <div
        className={`font-mono ${textCls} leading-[1.2] tracking-[0.15em] ${bloomColor} select-none`}
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
      {label && <span className={`font-mono text-[11px] tracking-[0.04em] ${labelColor}`}>{label}</span>}
    </div>
  );
}
