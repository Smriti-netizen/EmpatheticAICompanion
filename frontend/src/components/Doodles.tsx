import type { CSSProperties } from "react";

type DoodleProps = {
  className?: string;
  style?: CSSProperties;
};

export function Butterfly({ className = "", style }: DoodleProps) {
  return (
    <svg viewBox="0 0 40 36" className={className} style={style} fill="none" aria-hidden="true">
      <g className="origin-center" style={{ animation: "wingFlutter 2.6s ease-in-out infinite" }}>
        <path
          d="M20 6c-3-4-9-5-13-2C2 7 3 15 9 18c4 2 9 0 11-4M20 6c3-4 9-5 13-2 5 3 4 11-2 14-4 2-9 0-11-4"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M20 6v22M20 28c-2 0-4 1-5 3M20 28c2 0 4 1 5 3"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path d="M20 6c-1-2-2-3-4-4M20 6c1-2 2-3 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function Heart({ className = "", style }: DoodleProps) {
  return (
    <svg viewBox="0 0 24 22" className={className} style={style} fill="none" aria-hidden="true">
      <path
        d="M12 20C6 15.5 2 12 2 7.5 2 4.4 4.4 2 7.5 2 9.6 2 11.2 3.2 12 5c.8-1.8 2.4-3 4.5-3C19.6 2 22 4.4 22 7.5 22 12 18 15.5 12 20Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Star({ className = "", style }: DoodleProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="none" aria-hidden="true">
      <path
        d="M12 2l2.6 6.3L21 9l-4.8 4.3L17.6 21 12 17.2 6.4 21l1.4-7.7L3 9l6.4-.7L12 2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Sparkle({ className = "", style }: DoodleProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} aria-hidden="true">
      <path
        d="M12 0c.6 6.2 5.2 10.8 12 12-6.8 1.2-11.4 5.8-12 12-.6-6.2-5.2-10.8-12-12C6.8 10.8 11.4 6.2 12 0Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function Sprig({ className = "", style }: DoodleProps) {
  return (
    <svg viewBox="0 0 40 60" className={className} style={style} fill="none" aria-hidden="true">
      <path d="M20 58V8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M20 20c-8 0-13-4-14-12 8 0 13 4 14 12ZM20 20c8 0 13-4 14-12-8 0-13 4-14 12ZM20 34c-7 0-11-3-12-10 7 0 11 3 12 10ZM20 34c7 0 11-3 12-10-7 0-11 3-12 10Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Lavender({ className = "", style }: DoodleProps) {
  return (
    <svg viewBox="0 0 36 64" className={className} style={style} fill="none" aria-hidden="true">
      <path d="M18 62V26" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M18 26c-4 0-6-3-6-7M18 26c4 0 6-3 6-7M18 20c-3.5 0-5-3-5-6M18 20c3.5 0 5-3 5-6M18 14c-3 0-4-2-4-5M18 14c3 0 4-2 4-5M18 9c-2.5 0-3-2-3-4M18 9c2.5 0 3-2 3-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M18 44c-6 0-9-3-10-8M18 52c6 0 9-3 10-8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
