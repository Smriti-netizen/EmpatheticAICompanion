export type AvatarId = "hop" | "aura" | "spark";
export type AvatarExpression = "calm" | "attentive" | "concerned" | "warm" | "listening";

export interface AvatarPreset {
  id: AvatarId;
  name: string;
  vibe: string;
  blurb: string;
  accent: string;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  {
    id: "hop",
    name: "Hop",
    vibe: "Gentle rabbit guide",
    blurb: "Soft, patient, and steady — good if you want a calm companion energy.",
    accent: "#6b8f71",
  },
  {
    id: "aura",
    name: "Aura",
    vibe: "Warm human counselor",
    blurb: "Clear and caring — closer to a classic therapy-room presence.",
    accent: "#7a6b8f",
  },
  {
    id: "spark",
    name: "Spark",
    vibe: "Bright little companion",
    blurb: "Light and encouraging — helpful when you need a softer, playful tone.",
    accent: "#8f7a3b",
  },
];

export function getAvatar(id: string | null | undefined): AvatarPreset {
  return AVATAR_PRESETS.find((a) => a.id === id) ?? AVATAR_PRESETS[0];
}
