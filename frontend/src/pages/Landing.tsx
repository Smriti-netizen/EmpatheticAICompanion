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

export function LandingPage() {
  const navigate = useNavigate();

  const heroInner = (variant: "app" | "web") => (
    <>
      <TextScrim />
      <h1
        className={
          variant === "web"
            ? "relative font-display text-[clamp(2rem,3.2vw,3.35rem)] leading-[1.18] font-normal tracking-[-0.015em] text-ink"
            : "relative font-display text-[clamp(1.7rem,7.5vw,2.75rem)] leading-[1.2] font-normal tracking-[-0.015em] text-ink"
        }
      >
        <span className="block">A safe space to</span>
        <span className="block">
          <em className="font-script text-rose italic">untangle</em> your
          thoughts.
        </span>
      </h1>

      <div className="relative mt-6 space-y-4 font-display text-[clamp(14px,3.6vw,16px)] leading-[1.75] font-normal tracking-[0.01em] text-ink/85 sm:mt-8 sm:space-y-5 lg:mt-10 lg:max-w-[36rem] lg:text-[17px] lg:leading-[1.8]">
        <p>
          Talk freely, reflect deeply, and find clarity in a calm, private space
          where you can express yourself without fear of judgment.
        </p>
        <p>
          Whether you&apos;re feeling overwhelmed, anxious, or simply need
          someone to listen, your AI companion is here, anytime you need it.
        </p>
      </div>

      <button
        type="button"
        onClick={() => navigate("/onboarding")}
        className="relative z-30 mt-7 rounded-full bg-rose px-7 py-3 font-sans text-[13px] font-medium tracking-[0.02em] text-cream transition hover:bg-rose-deep sm:mt-9 sm:px-8 sm:py-3.5 sm:text-[14px] lg:mt-11"
      >
        Start Talking
      </button>
    </>
  );

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-cream text-ink">
      <section className="relative overflow-hidden pb-0">
        {/* App botanicals: object-contain / object-fill — do not hard-crop. */}
        <img
          src="/landing_left_cut.png?v=21"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute top-[7.5rem] left-[-5%] z-0 h-[46%] w-auto max-w-[min(240px,18vw)] select-none object-contain object-left-top sm:left-[-4%] sm:max-w-[min(280px,17vw)] lg:hidden"
          draggable={false}
        />
        <img
          src="/landing_app_right_tallfull.png?v=1"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute top-[2.75rem] right-0 bottom-0 z-0 h-[calc(100%-2.75rem)] w-[min(42vw,270px)] max-w-[42vw] select-none object-fill object-right sm:w-[min(38vw,300px)] lg:hidden"
          draggable={false}
        />

        <img
          src="/landing_botanical_left.png?v=1"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute top-[5.5rem] left-[-2%] z-0 hidden h-[min(72%,820px)] w-auto max-w-[clamp(180px,15vw,290px)] select-none object-contain object-left-top lg:block"
          draggable={false}
        />
        <img
          src="/landing_botanical_midright.png?v=1"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute top-[3.5rem] right-[6%] z-[1] hidden h-auto w-[clamp(260px,42vw,620px)] origin-top-right select-none object-contain object-right-top xl:right-[8%] lg:block"
          draggable={false}
        />
        <img
          src="/landing_botanical_right.png?v=1"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute top-[7rem] right-0 bottom-0 z-0 hidden h-[calc(100%-7rem)] w-auto max-w-[clamp(240px,34vw,480px)] origin-top-right select-none object-contain object-right-top lg:block"
          draggable={false}
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[80px] sm:h-[90px]"
          style={{
            background:
              "linear-gradient(to bottom, rgba(245,239,227,0.92) 0%, rgba(245,239,227,0.88) 55%, rgba(245,239,227,0) 100%)",
          }}
        />

        <header className="relative z-20 mx-auto flex w-full max-w-[1400px] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 pt-4 sm:gap-x-8 sm:px-8 sm:pt-6 md:px-12 md:pt-8 lg:px-[clamp(2rem,5vw,5rem)] lg:pt-10">
          <div className="min-w-0 font-display text-[15px] font-normal tracking-[0.01em] text-rose sm:text-[18px] md:text-[20px]">
            Empathic AI Companion
          </div>
          <nav className="ml-auto flex shrink-0 items-baseline justify-end gap-4 font-display text-[13px] font-normal tracking-[0.01em] text-ink/75 sm:gap-8 sm:text-[15px] md:text-[16px]">
            <a href="#how" className="transition hover:text-ink">
              How it Works
            </a>
            <a href="#trust" className="transition hover:text-ink">
              Privacy
            </a>
          </nav>
        </header>

        <div className="relative z-20 mt-3 ml-[clamp(0.75rem,8vw,5rem)] mr-[clamp(4rem,34vw,12rem)] w-auto max-w-[min(28rem,58vw)] pt-0 pb-4 text-left sm:mt-5 sm:ml-[clamp(1.25rem,10vw,7rem)] sm:mr-[clamp(6rem,34vw,14rem)] sm:max-w-[30rem] sm:pb-5 md:mt-6 lg:hidden">
          {heroInner("app")}
        </div>

        <div className="relative z-20 mx-auto mt-10 hidden w-full max-w-[1400px] px-[clamp(2rem,5vw,5rem)] lg:mt-14 lg:block xl:mt-16">
          <div className="relative max-w-[min(38rem,46vw)] pb-8 text-left xl:max-w-[40rem]">
            {heroInner("web")}
          </div>
        </div>

        <div
          id="trust"
          className="relative z-20 mx-auto mt-4 w-full max-w-[1400px] px-4 pt-8 pb-12 text-left sm:mt-6 sm:px-8 sm:pt-12 sm:pb-16 md:px-12 lg:mt-4 lg:px-[clamp(2rem,5vw,5rem)] lg:pt-6 lg:pb-20 lg:pr-[clamp(6rem,22vw,18rem)] max-lg:pr-[min(44vw,12rem)]"
        >
          <div className="grid gap-8 max-lg:grid-cols-1 lg:grid-cols-3 lg:gap-12">
            {TRUST.map((item) => (
              <div key={item.label} className="min-w-0 max-lg:max-w-[min(20rem,calc(100%-0.5rem))]">
                <div className="mb-2 flex items-center gap-2 font-display text-[14px] font-normal text-rose sm:mb-2.5 sm:text-[15px] md:text-[16px]">
                  <Diamond size={6} className="shrink-0" />
                  <span className="min-w-0">{item.label}</span>
                </div>
                <p className="font-display text-[13px] leading-[1.65] font-normal tracking-[0.01em] text-ink/75 sm:text-[14px] md:text-[15px] lg:max-w-[18rem]">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div id="how" className="relative z-10 bg-forest py-12 text-cream sm:py-16 md:py-20">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-8 md:px-12 lg:px-[clamp(2rem,5vw,5rem)]">
          <h2 className="mb-8 font-display text-[clamp(1.4rem,4vw,2.15rem)] font-normal tracking-[-0.01em] sm:mb-12">
            Three steps, no waiting{" "}
            <em className="font-script italic" style={{ color: "#D98BA0" }}>
              room.
            </em>
          </h2>
          <div className="grid gap-8 sm:grid-cols-3 sm:gap-8 md:gap-10">
            {STEPS.map((step) => (
              <div key={step.num} className="min-w-0">
                <div
                  className="mb-2 font-display text-[13px] font-normal sm:mb-3 sm:text-[14px]"
                  style={{ color: "#D98BA0" }}
                >
                  {step.num}
                </div>
                <h3 className="mb-2 font-display text-[18px] font-normal sm:text-[20px]">
                  {step.title}
                </h3>
                <p className="font-display text-[14px] leading-[1.65] font-normal text-cream/85 sm:text-[15px]">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex justify-center sm:mt-14">
            <button
              type="button"
              onClick={() => navigate("/onboarding")}
              className="rounded-full bg-blush px-8 py-3.5 font-sans text-[13px] font-medium text-forest transition hover:brightness-105 sm:px-10 sm:py-4 sm:text-[14px]"
            >
              Start talking
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
