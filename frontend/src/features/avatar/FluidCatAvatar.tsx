import { useEffect, useState } from "react";

import type { AvatarExpression, AvatarId } from "./avatarCatalog";
import { getAvatar } from "./avatarCatalog";

interface FluidCatAvatarProps {
  avatarId: AvatarId;
  expression?: AvatarExpression;
  /** 0–1 mouth open from live TTS audio (or synthetic while speaking). */
  amplitude?: number;
  speaking?: boolean;
  listening?: boolean;
  size?: "md" | "lg";
}

/**
 * Original counselor cats (Milo / Coco / Ziggy) — SVG layers with blink,
 * breath, head sway, gesture poses, and voice-reactive mouth.
 * Used until Live2D .moc3 bundles are dropped into public/avatars/.
 */
export function FluidCatAvatar({
  avatarId,
  expression = "calm",
  amplitude = 0,
  speaking = false,
  listening = false,
  size = "lg",
}: FluidCatAvatarProps) {
  const preset = getAvatar(avatarId);
  const dim = size === "lg" ? "h-[min(56vh,400px)] w-[min(56vh,400px)]" : "h-40 w-40";
  const [blink, setBlink] = useState(false);
  const [sway, setSway] = useState(0);
  const [synthMouth, setSynthMouth] = useState(0);

  useEffect(() => {
    let timeout = 0;
    const blinkGap = avatarId === "hop" ? 5200 : avatarId === "spark" ? 2800 : 4000;
    const schedule = () => {
      timeout = window.setTimeout(() => {
        setBlink(true);
        timeout = window.setTimeout(() => {
          setBlink(false);
          schedule();
        }, 130);
      }, blinkGap + Math.random() * 1800);
    };
    schedule();
    return () => window.clearTimeout(timeout);
  }, [avatarId]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setSway(Math.sin(Date.now() / 1800) * 2.4);
    }, 50);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!speaking || amplitude > 0.05) {
      setSynthMouth(0);
      return;
    }
    const id = window.setInterval(() => {
      setSynthMouth(0.25 + Math.random() * 0.55);
    }, 110);
    return () => window.clearInterval(id);
  }, [speaking, amplitude]);

  const mouthOpen = speaking ? Math.max(amplitude, synthMouth) : listening ? 0.08 : 0;
  const pose = poseFor(expression);

  const ring = speaking
    ? "ring-4 ring-[#9dccc5]/50"
    : listening
      ? "ring-4 ring-white/25"
      : "";

  return (
    <div
      className={`relative ${dim} ${ring} rounded-full`}
      style={{ ["--accent" as string]: preset.accent }}
    >
      <div
        className="h-full w-full origin-center animate-[avatarBreath_3.4s_ease-in-out_infinite]"
        style={{
          transform: `rotate(${sway + pose.headTilt}deg) translateY(${pose.lift}px) scale(${pose.scale})`,
          transition: "transform 480ms ease",
        }}
      >
        {avatarId === "hop" && (
          <MiloSvg mouth={mouthOpen} blink={blink} expression={expression} earBounce={speaking} />
        )}
        {avatarId === "aura" && (
          <CocoSvg mouth={mouthOpen} blink={blink} expression={expression} />
        )}
        {avatarId === "spark" && (
          <ZiggySvg mouth={mouthOpen} blink={blink} expression={expression} earBounce />
        )}
      </div>
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

function poseFor(expression: AvatarExpression) {
  if (expression === "warm") return { headTilt: 3, lift: 2, scale: 1.02 };
  if (expression === "concerned") return { headTilt: -4, lift: 4, scale: 0.98 };
  if (expression === "attentive") return { headTilt: 1, lift: -2, scale: 1.04 };
  return { headTilt: 0, lift: 0, scale: 1 };
}

function MiloSvg({
  mouth,
  blink,
  expression,
  earBounce,
}: {
  mouth: number;
  blink: boolean;
  expression: AvatarExpression;
  earBounce?: boolean;
}) {
  const brow = expression === "concerned" ? 4 : expression === "warm" ? -2 : 0;
  const eyeH = blink ? 2 : 10;
  const mouthH = 4 + mouth * 16;
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full drop-shadow-xl" aria-hidden>
      <defs>
        <radialGradient id="miloFur" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#f4efe6" />
          <stop offset="100%" stopColor="#d8e0d4" />
        </radialGradient>
      </defs>
      {/* body */}
      <ellipse cx="100" cy="148" rx="48" ry="28" fill="#c5d4c8" opacity="0.85" />
      {/* head */}
      <circle cx="100" cy="108" r="58" fill="url(#miloFur)" />
      {/* ears */}
      <g className={earBounce ? "origin-[70px_55px] animate-[earWiggle_1.2s_ease-in-out_infinite]" : ""}>
        <path d="M58 70 L48 28 L78 58 Z" fill="#e8efe6" />
        <path d="M58 68 L52 38 L72 58 Z" fill="#f0c4b8" opacity="0.7" />
      </g>
      <g className={earBounce ? "origin-[130px_55px] animate-[earWiggle_1.2s_ease-in-out_infinite_reverse]" : ""}>
        <path d="M142 70 L152 28 L122 58 Z" fill="#e8efe6" />
        <path d="M142 68 L148 38 L128 58 Z" fill="#f0c4b8" opacity="0.7" />
      </g>
      {/* eyes */}
      <ellipse cx="78" cy="105" rx="7" ry={eyeH / 2} fill="#2a3b34" />
      <ellipse cx="122" cy="105" rx="7" ry={eyeH / 2} fill="#2a3b34" />
      {!blink && (
        <>
          <circle cx="80" cy="102" r="2" fill="#fff" />
          <circle cx="124" cy="102" r="2" fill="#fff" />
        </>
      )}
      {/* brows */}
      <path
        d={`M68 ${88 + brow} Q78 ${84 + brow} 88 ${88 + brow}`}
        stroke="#5a6b62"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d={`M112 ${88 + brow} Q122 ${84 + brow} 132 ${88 + brow}`}
        stroke="#5a6b62"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      {/* nose / mouth */}
      <ellipse cx="100" cy="118" rx="5" ry="3.5" fill="#c47b6a" />
      <ellipse cx="100" cy={128 + mouth * 2} rx={10 + mouth * 4} ry={mouthH / 2} fill="#a85f52" />
      {/* cheeks */}
      <ellipse cx="68" cy="118" rx="8" ry="5" fill="#f0c4b8" opacity="0.45" />
      <ellipse cx="132" cy="118" rx="8" ry="5" fill="#f0c4b8" opacity="0.45" />
      {/* paws gesture */}
      <ellipse
        cx={68 - (expression === "attentive" ? 6 : 0)}
        cy="168"
        rx="14"
        ry="9"
        fill="#e8efe6"
        style={{ transition: "cx 400ms ease" }}
      />
      <ellipse
        cx={132 + (expression === "warm" ? 4 : 0)}
        cy="168"
        rx="14"
        ry="9"
        fill="#e8efe6"
      />
    </svg>
  );
}

function CocoSvg({
  mouth,
  blink,
  expression,
}: {
  mouth: number;
  blink: boolean;
  expression: AvatarExpression;
}) {
  const soft = expression === "warm" || expression === "concerned";
  const eyeH = blink ? 2 : 9;
  const mouthH = 3.5 + mouth * 14;
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full drop-shadow-xl" aria-hidden>
      <defs>
        <radialGradient id="cocoFur" cx="50%" cy="38%" r="62%">
          <stop offset="0%" stopColor="#f3e8df" />
          <stop offset="100%" stopColor="#d4c4b8" />
        </radialGradient>
      </defs>
      <ellipse cx="100" cy="150" rx="46" ry="30" fill="#b8a8c4" opacity="0.55" />
      <circle cx="100" cy="100" r="60" fill="url(#cocoFur)" />
      <path d="M55 72 L42 22 L82 58 Z" fill="#6b5a7a" />
      <path d="M145 72 L158 22 L118 58 Z" fill="#6b5a7a" />
      <path d="M55 70 L48 34 L76 58 Z" fill="#c9a8b8" opacity="0.75" />
      <path d="M145 70 L152 34 L124 58 Z" fill="#c9a8b8" opacity="0.75" />
      <ellipse cx="78" cy="98" rx="6.5" ry={eyeH / 2} fill="#2a2433" />
      <ellipse cx="122" cy="98" rx="6.5" ry={eyeH / 2} fill="#2a2433" />
      {!blink && (
        <>
          <circle cx="80" cy="96" r="1.8" fill="#fff" />
          <circle cx="124" cy="96" r="1.8" fill="#fff" />
        </>
      )}
      <path
        d={soft ? "M70 84 Q78 80 86 84" : "M70 84 Q78 84 86 84"}
        stroke="#2a2433"
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d={soft ? "M114 84 Q122 80 130 84" : "M114 84 Q122 84 130 84"}
        stroke="#2a2433"
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
      />
      <ellipse cx="100" cy="112" rx="4.5" ry="3" fill="#b56b6b" />
      <ellipse cx="100" cy={122 + mouth * 2} rx={9 + mouth * 5} ry={mouthH / 2} fill="#8f4e4e" />
      <path
        d={
          expression === "warm"
            ? "M86 118 Q100 128 114 118"
            : expression === "concerned"
              ? "M88 124 Q100 118 112 124"
              : "M90 120 Q100 124 110 120"
        }
        stroke="#8f4e4e"
        strokeWidth="1.5"
        fill="none"
        opacity={mouth < 0.15 ? 1 : 0}
      />
      <ellipse cx="64" cy="112" rx="9" ry="5" fill="#e8b8b0" opacity="0.4" />
      <ellipse cx="136" cy="112" rx="9" ry="5" fill="#e8b8b0" opacity="0.4" />
      <ellipse cx="72" cy="170" rx="13" ry="8" fill="#e8ddd4" />
      <ellipse cx="128" cy="170" rx="13" ry="8" fill="#e8ddd4" />
    </svg>
  );
}

function ZiggySvg({
  mouth,
  blink,
  expression,
  earBounce,
}: {
  mouth: number;
  blink: boolean;
  expression: AvatarExpression;
  earBounce?: boolean;
}) {
  const eyeH = blink ? 2 : 11;
  const mouthH = 4 + mouth * 18;
  const glow = expression === "warm" ? "#ffe08a" : "#f5d76e";
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full drop-shadow-xl" aria-hidden>
      <ellipse cx="100" cy="152" rx="42" ry="26" fill="#e8c85a" opacity="0.55" />
      <circle cx="100" cy="108" r="54" fill={glow} />
      <g className={earBounce ? "animate-[earWiggle_0.9s_ease-in-out_infinite]" : ""}>
        <path d="M62 72 L50 26 L84 58 Z" fill="#f0c94d" />
        <path d="M138 72 L150 26 L116 58 Z" fill="#f0c94d" />
        <path d="M62 70 L54 36 L78 58 Z" fill="#fff3c0" opacity="0.8" />
        <path d="M138 70 L146 36 L122 58 Z" fill="#fff3c0" opacity="0.8" />
      </g>
      <ellipse cx="78" cy="104" rx="7.5" ry={eyeH / 2} fill="#3b2f14" />
      <ellipse cx="122" cy="104" rx="7.5" ry={eyeH / 2} fill="#3b2f14" />
      {!blink && (
        <>
          <circle cx="80" cy="101" r="2.2" fill="#fff" />
          <circle cx="124" cy="101" r="2.2" fill="#fff" />
        </>
      )}
      <ellipse cx="100" cy="116" rx="5" ry="3.5" fill="#3b2f14" />
      <ellipse cx="100" cy={126 + mouth * 2} rx={11 + mouth * 5} ry={mouthH / 2} fill="#3b2f14" />
      <ellipse cx="66" cy="116" rx="8" ry="5" fill="#ffb070" opacity="0.35" />
      <ellipse cx="134" cy="116" rx="8" ry="5" fill="#ffb070" opacity="0.35" />
      <ellipse
        cx={70 + (expression === "attentive" ? -8 : 0)}
        cy="168"
        rx="12"
        ry="8"
        fill="#f0c94d"
      />
      <ellipse
        cx={130 + (expression === "warm" ? 8 : 0)}
        cy="168"
        rx="12"
        ry="8"
        fill="#f0c94d"
      />
    </svg>
  );
}
