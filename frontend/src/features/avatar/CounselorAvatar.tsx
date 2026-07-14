import { useEffect, useState } from "react";

import type { AvatarExpression, AvatarId } from "./avatarCatalog";

interface CounselorAvatarProps {
  avatarId: AvatarId;
  expression?: AvatarExpression;
  speaking?: boolean;
  listening?: boolean;
  size?: "md" | "lg";
}

/** Original stylized counselors — blink, breath, and lip motion for presence (P5). */
export function CounselorAvatar({
  avatarId,
  expression = "calm",
  speaking = false,
  listening = false,
  size = "lg",
}: CounselorAvatarProps) {
  const dim = size === "lg" ? "h-[min(56vh,400px)] w-[min(56vh,400px)]" : "h-40 w-40";
  const [blink, setBlink] = useState(false);
  const [mouthPhase, setMouthPhase] = useState(1);

  useEffect(() => {
    let timeout = 0;
    const schedule = () => {
      timeout = window.setTimeout(() => {
        setBlink(true);
        timeout = window.setTimeout(() => {
          setBlink(false);
          schedule();
        }, 140);
      }, 3200 + Math.random() * 2800);
    };
    schedule();
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!speaking) {
      setMouthPhase(listening ? 1.12 : 1);
      return;
    }
    const id = window.setInterval(() => {
      setMouthPhase(0.85 + Math.random() * 0.9);
    }, 120);
    return () => window.clearInterval(id);
  }, [speaking, listening]);

  const ring = speaking
    ? "ring-4 ring-[#9dccc5]/50"
    : listening
      ? "ring-4 ring-white/25"
      : "";

  return (
    <div
      className={`relative ${dim} ${ring} rounded-full animate-[avatarBreath_3.2s_ease-in-out_infinite]`}
    >
      {avatarId === "hop" && (
        <HopSvg mouth={mouthPhase} expression={expression} blink={blink} />
      )}
      {avatarId === "aura" && (
        <AuraSvg mouth={mouthPhase} expression={expression} blink={blink} />
      )}
      {avatarId === "spark" && (
        <SparkSvg mouth={mouthPhase} expression={expression} blink={blink} />
      )}
      <p className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/45 px-3 py-1 text-xs font-medium text-white backdrop-blur">
        {listening ? "Listening" : speaking ? "Speaking" : label(expression)}
      </p>
    </div>
  );
}

function label(expression: AvatarExpression): string {
  if (expression === "concerned") return "With you";
  if (expression === "warm") return "Warm";
  if (expression === "attentive") return "Attentive";
  if (expression === "listening") return "Listening";
  return "Present";
}

function HopSvg({
  mouth,
  expression,
  blink,
}: {
  mouth: number;
  expression: AvatarExpression;
  blink: boolean;
}) {
  const brow = expression === "concerned" ? -6 : expression === "warm" ? 2 : 0;
  const eyeRy = blink ? 1.2 : 6;
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full drop-shadow-xl" aria-hidden>
      <circle cx="100" cy="110" r="70" fill="#f4efe6" />
      <ellipse cx="55" cy="40" rx="18" ry="36" fill="#e8dcc8" transform="rotate(-18 55 40)" />
      <ellipse cx="145" cy="40" rx="18" ry="36" fill="#e8dcc8" transform="rotate(18 145 40)" />
      <ellipse cx="55" cy="42" rx="8" ry="20" fill="#f7c9b8" transform="rotate(-18 55 42)" />
      <ellipse cx="145" cy="42" rx="8" ry="20" fill="#f7c9b8" transform="rotate(18 145 42)" />
      <ellipse cx="78" cy="105" rx="6" ry={eyeRy} fill="#2a3b34" />
      <ellipse cx="122" cy="105" rx="6" ry={eyeRy} fill="#2a3b34" />
      <path
        d={`M70 ${88 + brow} Q78 ${84 + brow} 86 ${88 + brow}`}
        stroke="#2a3b34"
        strokeWidth="3"
        fill="none"
      />
      <path
        d={`M114 ${88 + brow} Q122 ${84 + brow} 130 ${88 + brow}`}
        stroke="#2a3b34"
        strokeWidth="3"
        fill="none"
      />
      <ellipse cx="100" cy="128" rx="14" ry={7 * mouth} fill="#c47b6a" />
      <ellipse cx="100" cy="155" rx="28" ry="10" fill="#6b8f71" opacity="0.35" />
    </svg>
  );
}

function AuraSvg({
  mouth,
  expression,
  blink,
}: {
  mouth: number;
  expression: AvatarExpression;
  blink: boolean;
}) {
  const soft = expression === "warm" || expression === "concerned";
  const eyeRy = blink ? 1 : 5;
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full drop-shadow-xl" aria-hidden>
      <circle cx="100" cy="100" r="72" fill="#f0e6dc" />
      <path d="M40 95 Q60 30 100 35 Q140 30 160 95" fill="#5c4a6e" />
      <ellipse cx="78" cy="100" rx="5" ry={eyeRy} fill="#2a2433" />
      <ellipse cx="122" cy="100" rx="5" ry={eyeRy} fill="#2a2433" />
      <path
        d={soft ? "M72 88 Q78 84 84 88" : "M72 86 Q78 86 84 86"}
        stroke="#2a2433"
        strokeWidth="2.5"
        fill="none"
      />
      <path
        d={soft ? "M116 88 Q122 84 128 88" : "M116 86 Q122 86 128 86"}
        stroke="#2a2433"
        strokeWidth="2.5"
        fill="none"
      />
      <ellipse cx="100" cy="122" rx="16" ry={6.5 * mouth} fill="#b56b6b" />
      <path d="M70 150 Q100 170 130 150" stroke="#7a6b8f" strokeWidth="6" fill="none" />
    </svg>
  );
}

function SparkSvg({
  mouth,
  expression,
  blink,
}: {
  mouth: number;
  expression: AvatarExpression;
  blink: boolean;
}) {
  const glow = expression === "warm" ? "#ffe08a" : "#f5d76e";
  const eyeRy = blink ? 1.4 : 7;
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full drop-shadow-xl" aria-hidden>
      <circle cx="100" cy="105" r="62" fill={glow} />
      <ellipse cx="100" cy="48" rx="14" ry="22" fill="#f0c94d" />
      <ellipse cx="78" cy="100" rx="7" ry={eyeRy} fill="#3b2f14" />
      <ellipse cx="122" cy="100" rx="7" ry={eyeRy} fill="#3b2f14" />
      {!blink && (
        <>
          <circle cx="80" cy="98" r="2" fill="#fff" />
          <circle cx="124" cy="98" r="2" fill="#fff" />
        </>
      )}
      <ellipse cx="100" cy="125" rx="12" ry={6 * mouth} fill="#3b2f14" />
      <path d="M55 130 L40 160" stroke="#f0c94d" strokeWidth="8" strokeLinecap="round" />
      <path d="M145 130 L160 160" stroke="#f0c94d" strokeWidth="8" strokeLinecap="round" />
    </svg>
  );
}
