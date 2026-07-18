import { getAvatar, type AvatarExpression, type AvatarId } from "./avatarCatalog";

interface LiveCatAvatarProps {
  avatarId: AvatarId;
  expression?: AvatarExpression;
  amplitude: number;
  speaking?: boolean;
  listening?: boolean;
  size?: "md" | "lg";
}

/**
 * Rendered AI companion portrait with lightweight, life-like motion:
 * gentle idle breathing, a soft speaking bob driven by audio amplitude,
 * and a listening halo. No heavy runtime — just CSS + a transform.
 */
export function LiveCatAvatar({
  avatarId,
  amplitude,
  speaking = false,
  listening = false,
  size = "lg",
}: LiveCatAvatarProps) {
  const preset = getAvatar(avatarId);
  const dim = size === "lg" ? "h-56 w-56 sm:h-72 sm:w-72" : "h-40 w-40";

  // Speaking bob: subtle scale + lift that tracks the voice envelope.
  const talk = speaking ? Math.min(0.06, amplitude * 0.08) : 0;
  const lift = speaking ? Math.min(6, amplitude * 10) : 0;

  const ringColor = speaking ? preset.accent : listening ? "#8fb7a8" : "transparent";

  return (
    <div className="relative flex flex-col items-center">
      <div
        className="relative grid place-items-center rounded-full transition-shadow duration-300"
        style={{
          background: `radial-gradient(circle at 50% 38%, ${preset.glow} 0%, ${preset.glow}00 70%)`,
          boxShadow:
            speaking || listening
              ? `0 0 0 3px ${ringColor}55, 0 0 46px -6px ${ringColor}aa`
              : "none",
        }}
      >
        {/* soft pulsing halo when listening */}
        {listening && !speaking && (
          <span
            className="absolute inset-0 rounded-full"
            style={{
              boxShadow: `0 0 0 2px ${ringColor}66`,
              animation: "avatarBreath 2.4s ease-in-out infinite",
            }}
          />
        )}
        <img
          src={preset.imageSrc}
          alt={preset.name}
          draggable={false}
          className={`${dim} rounded-full object-cover select-none`}
          style={{
            transform: `scale(${1 + talk}) translateY(${-lift}px)`,
            transition: speaking
              ? "transform 90ms linear"
              : "transform 500ms ease-out",
            animation: speaking ? undefined : "avatarBreath 5s ease-in-out infinite",
          }}
        />
      </div>
    </div>
  );
}
