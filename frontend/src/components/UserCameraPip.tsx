interface UserCameraPipProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  enabled: boolean;
  onToggle: () => void;
}

/** Meet-style self-view — bottom-right on every screen size. */
export function UserCameraPip({ videoRef, enabled, onToggle }: UserCameraPipProps) {
  return (
    <div className="absolute right-2 bottom-2 z-20 sm:right-4 sm:bottom-4 md:right-5 md:bottom-5">
      <div className="relative h-20 w-[7.25rem] overflow-hidden rounded-[4px] border border-cream/20 bg-[#2b2622] sm:h-28 sm:w-40 md:h-32 md:w-44">
        <video
          ref={videoRef}
          muted
          playsInline
          autoPlay
          className={`h-full w-full object-cover ${enabled ? "" : "hidden"}`}
        />
        {!enabled && (
          <div className="grid h-full place-items-center bg-[#2b2622] px-2 text-center font-mono text-[10px] tracking-[0.05em] text-cream/55 uppercase sm:px-3 sm:text-[11px]">
            Camera off
          </div>
        )}
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={enabled}
          aria-label={enabled ? "Turn camera off" : "Turn camera on"}
          title={enabled ? "Turn camera off" : "Turn camera on"}
          className="absolute bottom-1.5 left-1.5 bg-ink/70 px-2 py-0.5 font-mono text-[9px] tracking-[0.05em] text-cream uppercase backdrop-blur sm:bottom-2 sm:left-2 sm:px-2.5 sm:py-1 sm:text-[10px]"
        >
          {enabled ? "On" : "Off"}
        </button>
      </div>
    </div>
  );
}
