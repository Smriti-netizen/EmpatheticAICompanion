import { useEffect, useRef, useState } from "react";

import {
  amplitudeToMouthState,
  getAvatar,
  mouthAssetsForExpression,
  type AvatarExpression,
  type AvatarId,
  type AvatarPreset,
  type FaceRig,
  type MouthState,
} from "./avatarCatalog";

interface LiveCatAvatarProps {
  avatarId: AvatarId;
  expression?: AvatarExpression | string;
  amplitude: number;
  speaking?: boolean;
  listening?: boolean;
  greeting?: boolean;
  variant?: "fill" | "circle";
  size?: "md" | "lg";
}

function asExpression(value: string | undefined): AvatarExpression {
  if (
    value === "attentive" ||
    value === "concerned" ||
    value === "warm" ||
    value === "listening"
  ) {
    return value;
  }
  return "calm";
}

export function LiveCatAvatar({
  avatarId,
  expression = "calm",
  amplitude = 0,
  speaking = false,
  listening = false,
  greeting = false,
  variant = "circle",
  size = "lg",
}: LiveCatAvatarProps) {
  const preset = getAvatar(avatarId);
  const [blink, setBlink] = useState(false);
  const [earPulse, setEarPulse] = useState(false);
  const expr = asExpression(expression);
  // Fill always covers its tile — CallRoom keeps the tile ~4:3 so face stays full.
  const cover = variant === "fill";

  useEffect(() => {
    const timers: number[] = [];
    let living = true;
    const schedule = () => {
      const wait = 2400 + Math.random() * 3100;
      timers.push(
        window.setTimeout(() => {
          if (!living) return;
          setBlink(true);
          timers.push(
            window.setTimeout(() => {
              if (!living) return;
              setBlink(false);
              if (Math.random() < 0.18) {
                timers.push(
                  window.setTimeout(() => {
                    if (!living) return;
                    setBlink(true);
                    timers.push(
                      window.setTimeout(() => {
                        if (living) setBlink(false);
                        schedule();
                      }, 120),
                    );
                  }, 160),
                );
              } else {
                schedule();
              }
            }, 140),
          );
        }, wait),
      );
    };
    schedule();
    return () => {
      living = false;
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [avatarId]);

  useEffect(() => {
    if (speaking || greeting) {
      setEarPulse(true);
      return () => setEarPulse(false);
    }
    let t = 0;
    let living = true;
    const schedule = () => {
      t = window.setTimeout(() => {
        if (!living) return;
        setEarPulse(true);
        window.setTimeout(() => {
          if (living) setEarPulse(false);
        }, 700);
        schedule();
      }, 6000 + Math.random() * 5000);
    };
    schedule();
    return () => {
      living = false;
      window.clearTimeout(t);
      setEarPulse(false);
    };
  }, [speaking, greeting, avatarId]);

  // Mouth stays shut while listening / not speaking — only ears & eyes animate.
  const mouthClosed = listening || !speaking;
  const mouthState: MouthState = mouthClosed
    ? "closed"
    : amplitudeToMouthState(amplitude);

  const stage = (
    <Portrait
      preset={preset}
      cover={cover}
      blink={blink}
      earActive={earPulse}
      earLoop={speaking || greeting}
      mouthState={mouthState}
      expression={expr}
    />
  );

  if (variant === "fill") {
    const ring = speaking ? preset.accent : listening ? "#33452F" : "transparent";
    return (
      <div className="absolute inset-0 overflow-hidden bg-[#1C1815]">
        <div className="absolute inset-0">{stage}</div>
        <div
          className="pointer-events-none absolute inset-0 transition-shadow duration-500"
          style={{
            boxShadow:
              speaking || listening
                ? `inset 0 0 100px -28px ${ring}, inset 0 0 0 2px ${ring}33`
                : "inset 0 0 80px -36px rgba(0,0,0,0.28)",
          }}
        />
      </div>
    );
  }

  const dim = size === "lg" ? "h-56 w-56 sm:h-72 sm:w-72" : "h-40 w-40";
  const ringColor = speaking ? preset.accent : listening ? "#33452F" : "transparent";
  return (
    <div className="relative flex flex-col items-center">
      <div
        className={`relative overflow-hidden rounded-full ${dim}`}
        style={{
          background: preset.stageBg,
          boxShadow:
            speaking || listening
              ? `0 0 0 3px ${ringColor}55, 0 0 46px -6px ${ringColor}aa`
              : "none",
        }}
      >
        {stage}
      </div>
    </div>
  );
}

type CoverMap = {
  map: (x: number, y: number) => { x: number; y: number };
  mapSize: (w: number, h: number) => { w: number; h: number };
};

function buildCoverMap(
  imgNatural: { w: number; h: number } | null,
  box: { w: number; h: number },
  cover: boolean,
): CoverMap | null {
  if (!imgNatural || box.w < 2 || box.h < 2) return null;
  const { w: iw, h: ih } = imgNatural;
  const scale = cover ? Math.max(box.w / iw, box.h / ih) : Math.min(box.w / iw, box.h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const ox = (box.w - dw) / 2;
  const oy = (box.h - dh) / 2;
  return {
    map: (x, y) => ({
      x: ((ox + (x / 100) * dw) / box.w) * 100,
      y: ((oy + (y / 100) * dh) / box.h) * 100,
    }),
    mapSize: (w, h) => ({
      w: (((w / 100) * dw) / box.w) * 100,
      h: (((h / 100) * dh) / box.h) * 100,
    }),
  };
}

function Portrait({
  preset,
  cover,
  blink,
  earActive,
  earLoop,
  mouthState,
  expression,
}: {
  preset: AvatarPreset;
  cover: boolean;
  blink: boolean;
  earActive: boolean;
  earLoop: boolean;
  mouthState: MouthState;
  expression: AvatarExpression;
}) {
  const { imageSrc: src, name, face } = preset;
  const wrapRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const img = new Image();
    img.src = src;
    const done = () => {
      if (img.naturalWidth) setNatural({ w: img.naturalWidth, h: img.naturalHeight });
    };
    if (img.complete) done();
    else img.onload = done;
    return () => {
      img.onload = null;
    };
  }, [src]);

  // Preload mouth overlays so amplitude switches don't flash.
  useEffect(() => {
    const urls = new Set<string>();
    for (const set of Object.values(preset.mouthAssets)) {
      for (const path of Object.values(set)) {
        if (path) urls.add(path);
      }
    }
    const imgs = [...urls].map((url) => {
      const img = new Image();
      img.src = url;
      return img;
    });
    return () => {
      imgs.forEach((img) => {
        img.src = "";
      });
    };
  }, [preset]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const cmap = buildCoverMap(natural, box, cover);
  const fit = cover ? "object-cover object-center" : "object-contain object-center";
  const mouthAssets = mouthAssetsForExpression(preset, expression);

  return (
    <div ref={wrapRef} className="absolute inset-0">
      <img
        src={src}
        alt={name}
        draggable={false}
        className={`absolute inset-0 h-full w-full select-none ${fit}`}
      />
      {cmap && (
        <>
          <EarTwitch
            src={src}
            ear={face.leftEar}
            side="left"
            active={earActive}
            loop={earLoop}
            cmap={cmap}
            fit={fit}
          />
          <EarTwitch
            src={src}
            ear={face.rightEar}
            side="right"
            active={earActive}
            loop={earLoop}
            cmap={cmap}
            fit={fit}
          />
          <EyeBlink
            eye={face.leftEye}
            lidColor={face.lidColor}
            closed={blink}
            cmap={cmap}
            staggerMs={0}
          />
          <EyeBlink
            eye={face.rightEye}
            lidColor={face.lidColor}
            closed={blink}
            cmap={cmap}
            staggerMs={22}
          />
          <MouthShape
            mouth={face.mouth}
            assets={mouthAssets}
            state={mouthState}
            cmap={cmap}
          />
        </>
      )}
    </div>
  );
}

function MouthLayer({
  src,
  opacity,
  pos,
  size,
}: {
  src: string;
  opacity: number;
  pos: { x: number; y: number };
  size: { w: number; h: number };
}) {
  return (
    <img
      src={src}
      alt=""
      draggable={false}
      className="pointer-events-none absolute select-none"
      style={{
        left: `${pos.x}%`,
        top: `${pos.y}%`,
        width: `${size.w}%`,
        height: `${size.h}%`,
        transform: "translate(-50%, -50%)",
        opacity,
        transition: "opacity 55ms linear",
      }}
      aria-hidden
    />
  );
}

function MouthShape({
  mouth,
  assets,
  state,
  cmap,
}: {
  mouth: FaceRig["mouth"];
  assets: Record<MouthState, string | null>;
  state: MouthState;
  cmap: CoverMap;
}) {
  const pos = cmap.map(mouth.x, mouth.y);
  const size = cmap.mapSize(mouth.w, mouth.h);
  const closed = assets.closed;
  const half = assets.half;
  const open = assets.open;

  // Crossfade closed ↔ half ↔ open. Neutral closed has null → base PNG shows through.
  const closedOpacity = state === "closed" && closed ? 1 : 0;
  const halfOpacity = state === "half" ? 1 : state === "open" ? 0.2 : 0;
  const openOpacity = state === "open" ? 1 : 0;

  return (
    <>
      {closed && (
        <MouthLayer src={closed} opacity={closedOpacity} pos={pos} size={size} />
      )}
      {half && <MouthLayer src={half} opacity={halfOpacity} pos={pos} size={size} />}
      {open && <MouthLayer src={open} opacity={openOpacity} pos={pos} size={size} />}
    </>
  );
}

function EyeBlink({
  eye,
  lidColor,
  closed,
  cmap,
  staggerMs = 0,
}: {
  eye: FaceRig["leftEye"];
  lidColor: string;
  closed: boolean;
  cmap: CoverMap;
  staggerMs?: number;
}) {
  const top = cmap.map(eye.x, eye.y - eye.h / 2);
  const s = cmap.mapSize(eye.w * 1.06, eye.h * 1.08);
  return (
    <span
      className="pointer-events-none absolute"
      style={{
        left: `${top.x}%`,
        top: `${top.y}%`,
        width: `${s.w}%`,
        height: `${s.h}%`,
        transform: closed
          ? "translate(-50%, 0) scaleY(1)"
          : "translate(-50%, 0) scaleY(0)",
        transformOrigin: "50% 0%",
        borderRadius: "48% 48% 42% 42%",
        background: `linear-gradient(
          180deg,
          ${lidColor} 0%,
          ${lidColor} 62%,
          ${lidColor}d9 82%,
          ${lidColor}55 94%,
          transparent 100%
        )`,
        boxShadow: closed ? `inset 0 -1px 2px ${lidColor}88` : "none",
        opacity: closed ? 1 : 0,
        transition: closed
          ? `transform 95ms cubic-bezier(0.2, 0.7, 0.2, 1) ${staggerMs}ms, opacity 40ms linear ${staggerMs}ms`
          : `transform 150ms cubic-bezier(0.4, 0.0, 0.2, 1) ${staggerMs}ms, opacity 120ms ease ${staggerMs}ms`,
        willChange: "transform, opacity",
      }}
      aria-hidden
    />
  );
}

function EarTwitch({
  src,
  ear,
  side,
  active,
  loop,
  cmap,
  fit,
}: {
  src: string;
  ear: FaceRig["leftEar"];
  side: "left" | "right";
  active: boolean;
  loop: boolean;
  cmap: CoverMap;
  fit: string;
}) {
  if (!active) return null;
  const c = cmap.map(ear.x, ear.y);
  const s = cmap.mapSize(ear.w, ear.h);
  const origin = cmap.map(ear.originX, ear.originY);
  const reps = loop ? "infinite" : "1";
  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        clipPath: `ellipse(${s.w / 2}% ${s.h / 2}% at ${c.x}% ${c.y}%)`,
        transformOrigin: `${origin.x}% ${origin.y}%`,
        animation:
          side === "left"
            ? `earTwitchLeft 0.95s ease-in-out ${reps}`
            : `earTwitchRight 0.95s ease-in-out ${reps}`,
      }}
      aria-hidden
    >
      <img
        src={src}
        alt=""
        draggable={false}
        className={`absolute inset-0 h-full w-full select-none ${fit}`}
      />
    </div>
  );
}
