import { useNavigate } from "react-router-dom";

import { Diamond } from "../components/Diamond";

const TRUST = [
  {
    label: "Private",
    body: "Nothing you say here is shared. Conversations stay between you and your companion.",
  },
  {
    label: "Judgement\u2011free",
    body: "Say it messily, say it half formed. Your companion is here to listen, not to correct you.",
  },
  {
    label: "Available 24/7",
    body: "3am or 3pm, there are no office hours. Start whenever you need to.",
  },
];

const STEPS = [
  {
    num: "01",
    title: "Let's Start With You",
    body: "Take a moment to share what's on your mind. We'll better understand how you're feeling.",
  },
  {
    num: "02",
    title: "Choose your companion",
    body: "Pick the presence that feels safest to sit with.",
  },
  {
    num: "03",
    title: "Talk it through",
    body: "A calm, one on one session, at your pace.",
  },
];

/** Soft cream light behind copy — not a card; feathered edges only. */
function TextScrim() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-[-1.25rem_-1rem] -z-10 rounded-[2rem]"
      style={{
        background:
          "radial-gradient(ellipse 85% 75% at 40% 40%, rgba(245,239,227,0.94) 0%, rgba(245,239,227,0.78) 45%, rgba(245,239,227,0) 78%)",
        filter: "blur(10px)",
      }}
    />
  );
}

/**
 * Text corridor: clear of left-edge flower and right/bottom-right cluster.
 * Shared by headline, body, CTA.
 */
const corridor =
  "relative z-20 ml-[clamp(1.25rem,15vw,11rem)] mr-[clamp(1.5rem,40vw,30rem)] w-auto max-w-[32rem]";

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-cream text-ink">
      <section className="relative overflow-hidden pb-0">
        {/* Left edge vine — starts below the logo row */}
        <img
          src="/landing_left_cut.png?v=21"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute top-[7.5rem] left-[-5%] z-0 h-[46%] w-auto max-w-[min(240px,18vw)] select-none object-contain object-left-top sm:left-[-4%] sm:max-w-[min(280px,17vw)]"
          draggable={false}
        />
        {/*
          Main right flower — same top anchor, scaled larger so the stem
          reaches the green boundary (no vertical reposition).
        */}
        <img
          src="/landing_main_flush.png?v=24"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute top-[2.75rem] right-0 bottom-0 z-0 h-[calc(100%-2.75rem)] w-auto max-w-[min(52vw,720px)] origin-top-right scale-110 select-none object-contain object-right-top"
          draggable={false}
        />

        {/* Nav scrim — logo / links stay legible */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[90px]"
          style={{
            background:
              "linear-gradient(to bottom, rgba(245,239,227,0.92) 0%, rgba(245,239,227,0.88) 55%, rgba(245,239,227,0) 100%)",
          }}
        />

        <header className="relative z-20 flex flex-wrap items-center justify-between gap-x-8 gap-y-3 px-6 pt-8 sm:px-12 sm:pt-10 lg:px-16">
          <div className="font-display text-[18px] font-normal tracking-[0.01em] text-rose sm:text-[20px]">
            Empathic AI Companion
          </div>
          <nav className="ml-auto flex items-baseline justify-end gap-8 font-display text-[15px] font-normal tracking-[0.01em] text-ink/75 sm:text-[16px]">
            <a href="#how" className="transition hover:text-ink">
              How it Works
            </a>
            <a href="#trust" className="transition hover:text-ink">
              Privacy
            </a>
          </nav>
        </header>

        {/* Text corridor: headline → body → CTA */}
        <div className={`${corridor} mt-12 px-0 pt-4 pb-6 text-left sm:mt-16`}>
          <TextScrim />
          <h1 className="relative font-display text-[2.15rem] leading-[1.22] font-normal tracking-[-0.015em] text-ink sm:text-[2.9rem]">
            <span className="block">A safe</span>
            <span className="block pl-7 sm:pl-11">space to</span>
            <span className="block">
              <em className="font-script text-rose italic">untangle</em>
            </span>
            <span className="block pl-9 sm:pl-14">your thoughts.</span>
          </h1>

          <div className="relative mt-8 space-y-5 font-display text-[15px] leading-[1.75] font-normal tracking-[0.01em] text-ink/85 sm:text-[16px]">
            <p>
              Talk freely, reflect deeply, and find clarity in a calm, private
              space where you can express yourself without fear of judgment.
            </p>
            <p>
              Whether you&apos;re feeling overwhelmed, anxious, or simply need
              someone to listen, your AI companion is here, anytime you need it.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/onboarding")}
            className="relative z-30 mt-9 rounded-full bg-rose px-8 py-3.5 font-sans text-[14px] font-medium tracking-[0.02em] text-cream transition hover:bg-rose-deep"
          >
            Start Talking
          </button>
        </div>

        {/*
          Feature tabs — full-width row like the reference: three even columns,
          diamond + label on one line, body underneath.
        */}
        <div
          id="trust"
          className="relative z-20 mx-auto mt-6 w-full max-w-[1200px] px-6 pt-12 pb-16 text-left sm:px-12 lg:px-16"
        >
          <div className="grid gap-10 sm:grid-cols-3 sm:gap-12 lg:gap-16">
            {TRUST.map((item) => (
              <div key={item.label} className="min-w-0">
                <div className="mb-2.5 flex items-center gap-2 font-display text-[15px] font-normal whitespace-nowrap text-rose sm:text-[16px]">
                  <Diamond size={6} />
                  <span className="whitespace-nowrap">{item.label}</span>
                </div>
                <p className="max-w-[20rem] font-display text-[14px] leading-[1.65] font-normal tracking-[0.01em] text-ink/75 sm:text-[15px]">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div id="how" className="relative z-10 bg-forest py-16 text-cream sm:py-20">
        <div className="mx-auto max-w-[1120px] px-6 sm:px-12 lg:px-16">
          <h2 className="mb-12 font-display text-[28px] font-normal tracking-[-0.01em] sm:text-[34px]">
            Three steps, no waiting{" "}
            <em className="font-script italic" style={{ color: "#D98BA0" }}>
              room.
            </em>
          </h2>
          <div className="grid gap-10 sm:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.num}>
                <div
                  className="mb-3 font-display text-[14px] font-normal"
                  style={{ color: "#D98BA0" }}
                >
                  {step.num}
                </div>
                <h3 className="mb-2 font-display text-[20px] font-normal">
                  {step.title}
                </h3>
                <p className="font-display text-[15px] leading-[1.65] font-normal text-cream/85">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-14 flex justify-center">
            <button
              type="button"
              onClick={() => navigate("/onboarding")}
              className="rounded-full bg-blush px-10 py-4 font-sans text-[14px] font-medium text-forest transition hover:brightness-105"
            >
              Start talking
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
