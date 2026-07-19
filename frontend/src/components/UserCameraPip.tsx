interface UserCameraPipProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  enabled: boolean;
  onToggle: () => void;
}

export function UserCameraPip({ videoRef, enabled, onToggle }: UserCameraPipProps) {
  return (
    <div className="absolute right-[clamp(0.5rem,1.5vw,0.85rem)] bottom-[clamp(0.5rem,1.5vw,0.85rem)] z-20">
      <div className="relative h-[clamp(5.25rem,18vw,8.5rem)] w-[clamp(4rem,14vw,6.75rem)] overflow-hidden rounded-[clamp(10px,1.2vw,14px)] border border-white/15 bg-[#1a3d2e] shadow-lg">
        <video
          ref={videoRef}
          muted
          playsInline
          autoPlay
          className={`h-full w-full object-cover ${enabled ? "" : "hidden"}`}
        />
        {!enabled && (
          <div className="grid h-full place-items-center bg-[#1a3d2e] px-1.5 text-center font-mono text-[clamp(8px,1.6vw,11px)] tracking-[0.04em] text-cream/60 uppercase">
            Camera off
          </div>
        )}
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={enabled}
          aria-label={enabled ? "Turn camera off" : "Turn camera on"}
          title={enabled ? "Turn camera off" : "Turn camera on"}
          className="absolute bottom-1 left-1 rounded bg-ink/70 px-1.5 py-0.5 font-mono text-[clamp(8px,1.4vw,10px)] tracking-[0.05em] text-cream uppercase backdrop-blur sm:bottom-1.5 sm:left-1.5 sm:px-2"
        >
          {enabled ? "On" : "Off"}
        </button>
      </div>
    </div>
  );
}
