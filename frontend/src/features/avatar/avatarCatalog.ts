export type AvatarId = "hop" | "aura" | "spark";
export type AvatarExpression = "calm" | "attentive" | "concerned" | "warm" | "listening";

export interface AvatarPreset {
  id: AvatarId;
  name: string;
  vibe: string;
  blurb: string;
  accent: string;
  /** Soft pastel backdrop behind the portrait. */
  glow: string;
  /** Rendered character portrait under public/avatars/. */
  imageSrc: string;
}

/**
 * Three AI companion characters (Milo / Coco / Ziggy).
 * IDs stay hop|aura|spark for storage/API compatibility.
 * They are clearly friendly AI avatars — never presented as real people.
 */
export const AVATAR_PRESETS: AvatarPreset[] = [
  {
    id: "hop",
    name: "Milo",
    vibe: "Soft & soothing",
    blurb: "A cozy, unhurried presence — good when you just want gentle, calm company.",
    accent: "#e0a05a",
    glow: "#f7e6cf",
    imageSrc: "/avatars/milo/avatar.png",
  },
  {
    id: "aura",
    name: "Coco",
    vibe: "Warm & attentive",
    blurb: "Grounded and caring — a steady listener who stays right there with you.",
    accent: "#6f9bd1",
    glow: "#dbe8f7",
    imageSrc: "/avatars/coco/avatar.png",
  },
  {
    id: "spark",
    name: "Ziggy",
    vibe: "Kind & easygoing",
    blurb: "Light and reassuring — soft encouragement, never any pressure.",
    accent: "#7ea36a",
    glow: "#e2efd6",
    imageSrc: "/avatars/ziggy/avatar.png",
  },
];

export function getAvatar(id: string | null | undefined): AvatarPreset {
  return AVATAR_PRESETS.find((a) => a.id === id) ?? AVATAR_PRESETS[0]!;
}
