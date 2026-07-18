import { useNavigate } from "react-router-dom";

import { AsciiBloom } from "../components/AsciiBloom";
import { Reveal } from "../components/Reveal";

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-paper">
      {/* Hero image — soft-focus meadow, warm film tones */}
      <img
        src="/hero_meadow.png"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover [animation:kenBurns_28s_ease-out_forwards]"
      />
      {/* Cream scrims for legibility, kept gentle */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#f7f2e9]/88 via-[#f7f2e9]/38 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#f7f2e9]/85 to-transparent" />

      {/* Brand mark */}
      <span className="absolute top-6 left-6 text-[11px] font-semibold tracking-[0.3em] text-ink/70 uppercase sm:top-8 sm:left-10">
        Empathic Companion
      </span>

      {/* Quiet ASCII-bloom — the AI's presence, breathing in the corner */}
      <div className="absolute top-6 right-6 hidden opacity-70 [animation:floatSoft_6s_ease-in-out_infinite] sm:top-10 sm:right-12 sm:block">
        <AsciiBloom />
      </div>

      {/* Hero copy */}
      <div className="relative z-10 flex min-h-[100dvh] flex-col justify-center px-6 sm:px-16">
        <div className="max-w-xl">
          <Reveal>
            <h1 className="font-display text-[2.9rem] leading-[1.02] font-semibold tracking-tight text-ink sm:text-[5rem]">
              A quiet place
              <br />
              to think out loud.
            </h1>
          </Reveal>

          <Reveal delay={140}>
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-ink/70 sm:text-lg">
              A private space to talk — and be heard.
            </p>
          </Reveal>

          <Reveal delay={260}>
            <button
              type="button"
              onClick={() => navigate("/onboarding")}
              className="group mt-10 inline-flex items-center gap-2 rounded-full bg-accent px-9 py-4 text-xs font-semibold tracking-[0.2em] text-white uppercase shadow-warm transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98]"
            >
              Start talking
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </button>
          </Reveal>

          <Reveal delay={380}>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[10px] tracking-[0.2em] text-ink/50 uppercase">
              <span>Private</span>
              <span>Judgment-free</span>
              <span>Here whenever you need</span>
            </div>
          </Reveal>
        </div>
      </div>

      {/* Minimal safety line */}
      <p className="absolute inset-x-0 bottom-5 z-10 px-6 text-center text-[10px] tracking-[0.16em] text-ink/45 uppercase">
        In crisis · call 112 or Tele-MANAS 14416
      </p>
    </div>
  );
}
