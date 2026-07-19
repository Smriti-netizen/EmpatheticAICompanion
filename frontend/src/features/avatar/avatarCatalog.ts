export type AvatarId = "hop" | "aura" | "spark";
export type AvatarExpression = "calm" | "attentive" | "concerned" | "warm" | "listening";

export type MouthShapeSet = "neutral" | "smile" | "flat";
export type MouthState = "closed" | "half" | "open";

/** Face landmarks as % of the square portrait PNG (object-contain / cover-mapped). */
export interface FaceRig {
  leftEye: { x: number; y: number; w: number; h: number };
  rightEye: { x: number; y: number; w: number; h: number };
  lidColor: string;
  leftEar: { x: number; y: number; w: number; h: number; originX: number; originY: number };
  rightEar: { x: number; y: number; w: number; h: number; originX: number; originY: number };
  /** Mouth region — overlay crops are centered here. */
  mouth: { x: number; y: number; w: number; h: number };
}

export interface AvatarPreset {
  id: AvatarId;
  name: string;
  vibe: string;
  blurb: string;
  voiceLabel: string;
  accent: string;
  glow: string;
  /** Matches the PNG backdrop so contain mode fills the tile cleanly. */
  stageBg: string;
  imageSrc: string;
  face: FaceRig;
  /**
   * Mouth overlays per shape set / state.
   * `closed: null` = show the base PNG mouth (no overlay).
   * Phase 1: smile/flat reuse neutral half/open until dedicated art exists.
   */
  mouthAssets: Record<MouthShapeSet, Record<MouthState, string | null>>;
}

function mouthSet(
  folder: string,
  shape: MouthShapeSet,
  /** Neutral closed uses the base PNG; smile/flat need their own closed crop. */
  closed: string | null,
): Record<MouthState, string | null> {
  return {
    closed,
    half: `/avatars/${folder}/mouth_${shape}_half.png`,
    open: `/avatars/${folder}/mouth_${shape}_open.png`,
  };
}

function mouthPack(folder: string): AvatarPreset["mouthAssets"] {
  return {
    neutral: mouthSet(folder, "neutral", null),
    smile: mouthSet(folder, "smile", `/avatars/${folder}/mouth_smile_closed.png`),
    flat: mouthSet(folder, "flat", `/avatars/${folder}/mouth_flat_closed.png`),
  };
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  {
    id: "hop",
    name: "Milo",
    vibe: "Soft & soothing",
    blurb: "A cozy, unhurried presence — good when you just want gentle, calm company.",
    voiceLabel: "Calm US male voice (Andrew)",
    accent: "#c98fae",
    glow: "#f1e6ee",
    stageBg: "#f0dcc8",
    imageSrc: "/avatars/milo/avatar.png",
    face: {
      leftEye: { x: 35.4, y: 48.5, w: 11.2, h: 10.6 },
      rightEye: { x: 69.2, y: 47.0, w: 10.8, h: 10.2 },
      lidColor: "#c49a7e",
      leftEar: { x: 30, y: 17, w: 13, h: 15, originX: 35, originY: 28 },
      rightEar: { x: 70, y: 17, w: 13, h: 15, originX: 65, originY: 28 },
      mouth: { x: 52.5, y: 63.2, w: 14.6, h: 10.6 },
    },
    mouthAssets: mouthPack("milo"),
  },
  {
    id: "aura",
    name: "Coco",
    vibe: "Warm & attentive",
    blurb: "Grounded and caring — a steady listener who stays right there with you.",
    voiceLabel: "Warm Indian female voice (Neerja)",
    accent: "#6f9bd1",
    glow: "#dbe8f7",
    stageBg: "#c5d8ef",
    imageSrc: "/avatars/coco/avatar.png",
    face: {
      leftEye: { x: 39.6, y: 51.4, w: 9.8, h: 9.2 },
      rightEye: { x: 63.4, y: 49.8, w: 9.4, h: 9.0 },
      lidColor: "#3a3332",
      leftEar: { x: 27, y: 13, w: 15, h: 18, originX: 33, originY: 28 },
      rightEar: { x: 73, y: 13, w: 15, h: 18, originX: 67, originY: 28 },
      mouth: { x: 52.5, y: 62.8, w: 13.7, h: 10.3 },
    },
    mouthAssets: mouthPack("coco"),
  },
  {
    id: "spark",
    name: "Ziggy",
    vibe: "Kind & easygoing",
    blurb: "Light and reassuring — soft encouragement, never any pressure.",
    voiceLabel: "Easygoing British male voice (Ryan)",
    accent: "#7ea36a",
    glow: "#e2efd6",
    stageBg: "#8a9270",
    imageSrc: "/avatars/ziggy/avatar.png",
    face: {
      leftEye: { x: 38.8, y: 47.5, w: 8.4, h: 8.6 },
      rightEye: { x: 62.4, y: 47.5, w: 8.4, h: 8.6 },
      lidColor: "#141210",
      leftEar: { x: 26, y: 18, w: 12, h: 12, originX: 31, originY: 26 },
      rightEar: { x: 74, y: 18, w: 12, h: 12, originX: 69, originY: 26 },
      mouth: { x: 50.5, y: 59.5, w: 13.2, h: 9.7 },
    },
    mouthAssets: mouthPack("ziggy"),
  },
];

export function getAvatar(id: string | null | undefined): AvatarPreset {
  return AVATAR_PRESETS.find((a) => a.id === id) ?? AVATAR_PRESETS[0]!;
}

export function mouthAssetsForExpression(
  preset: AvatarPreset,
  expression: AvatarExpression,
): Record<MouthState, string | null> {
  if (expression === "warm") return preset.mouthAssets.smile;
  if (expression === "concerned") return preset.mouthAssets.flat;
  return preset.mouthAssets.neutral;
}

export function amplitudeToMouthState(amplitude: number): MouthState {
  if (amplitude > 0.35) return "open";
  if (amplitude > 0.08) return "half";
  return "closed";
}
