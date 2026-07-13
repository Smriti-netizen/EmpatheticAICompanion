interface UserCameraPipProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  enabled: boolean;
  onToggle: () => void;
}

/** Zoom-style self-view — bottom-right of the call stage. */
export function UserCameraPip({ videoRef, enabled, onToggle }: UserCameraPipProps) {
  return (
    <div className="absolute right-3 bottom-3 z-20 sm:right-5 sm:bottom-5">
      <div className="relative h-28 w-40 overflow-hidden rounded-2xl border-2 border-white/80 bg-ink shadow-[0_12px_40px_-12px_rgba(0,0,0,0.55)] sm:h-36 sm:w-52">
        <video
          ref={videoRef}
          muted
          playsInline
          autoPlay
          className={`h-full w-full object-cover ${enabled ? "" : "hidden"}`}
        />
        {!enabled && (
          <div className="grid h-full place-items-center bg-[#1c2b2a]/90 px-3 text-center text-xs text-white/80">
            Camera off
          </div>
        )}
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={enabled}
          aria-label={enabled ? "Turn camera off" : "Turn camera on"}
          className="absolute bottom-2 left-2 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur"
        >
          {enabled ? "Turn off" : "Turn on"}
        </button>
      </div>
    </div>
  );
}
