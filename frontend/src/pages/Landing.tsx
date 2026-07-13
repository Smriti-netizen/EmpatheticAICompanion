import { useNavigate } from "react-router-dom";

const TRUST = [
  { icon: "🔒", label: "Private & Secure" },
  { icon: "🤝", label: "Judgment-Free Conversations" },
  { icon: "🧠", label: "Personalized AI Therapy Sessions" },
  { icon: "📅", label: "Book 45-Minute Sessions" },
] as const;

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <section className="flex flex-1 flex-col items-center justify-center px-5 py-16 sm:py-20">
        <div className="flex w-full max-w-[44rem] flex-col items-center text-center">
          {/* Brand / logo */}
          <div
            className="flex flex-col items-center gap-3 animate-[heroIn_700ms_ease-out]"
            style={{ animationDelay: "0ms", animationFillMode: "both" }}
          >
            <div
              className="grid h-14 w-14 place-items-center rounded-2xl bg-accent text-lg font-semibold tracking-tight text-white shadow-[0_16px_40px_-18px_rgba(47,111,104,0.85)]"
              aria-hidden
            >
              EC
            </div>
            <p className="font-display text-xl font-semibold tracking-tight text-ink sm:text-2xl">
              Empathic Companion
            </p>
          </div>

          <h1
            className="mt-8 font-display text-[2.15rem] font-semibold leading-[1.15] tracking-tight text-ink sm:text-5xl animate-[heroIn_700ms_ease-out]"
            style={{ animationDelay: "80ms", animationFillMode: "both" }}
          >
            Your AI Therapist &amp; Counselor
          </h1>

          <p
            className="mt-4 text-lg font-medium text-accent sm:text-xl animate-[heroIn_700ms_ease-out]"
            style={{ animationDelay: "140ms", animationFillMode: "both" }}
          >
            Therapy made accessible to everyone.
          </p>

          <p
            className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted sm:text-base animate-[heroIn_700ms_ease-out]"
            style={{ animationDelay: "200ms", animationFillMode: "both" }}
          >
            Have thoughtful, private conversations with your AI therapist in a safe and
            judgment-free space. Start with a short onboarding conversation, then book
            focused 45-minute therapy sessions designed to help you reflect, navigate
            challenges, and build healthier habits.
          </p>

          <div
            className="mt-10 animate-[heroIn_700ms_ease-out]"
            style={{ animationDelay: "280ms", animationFillMode: "both" }}
          >
            <button
              type="button"
              onClick={() => navigate("/onboarding")}
              className="inline-flex min-w-[10.5rem] items-center justify-center rounded-2xl bg-accent px-8 py-3.5 text-sm font-semibold text-white shadow-[0_18px_40px_-20px_rgba(47,111,104,0.9)] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Let&apos;s Begin
            </button>
          </div>

          <ul
            className="mt-12 flex w-full max-w-lg flex-wrap items-center justify-center gap-x-5 gap-y-3 animate-[heroIn_700ms_ease-out]"
            style={{ animationDelay: "360ms", animationFillMode: "both" }}
          >
            {TRUST.map((item) => (
              <li
                key={item.label}
                className="flex items-center gap-1.5 text-xs text-muted sm:text-[13px]"
              >
                <span aria-hidden>{item.icon}</span>
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="border-t border-line/50 px-5 py-8">
        <div className="mx-auto max-w-[44rem] text-center">
          <p className="text-[11px] font-medium tracking-wide text-muted/80 uppercase">
            Emergency Information
          </p>
          <p className="mt-2 text-[12px] leading-relaxed text-muted/75">
            If you or someone else is in immediate danger or experiencing a mental health
            crisis, please contact local emergency services immediately.
          </p>
          <p className="mt-3 text-[12px] leading-relaxed text-muted/75">
            <span className="font-medium text-muted/90">India</span>
            {" · "}
            Emergency: <span className="font-medium text-muted/90">112</span>
            {" · "}
            Tele-MANAS: <span className="font-medium text-muted/90">14416</span>
            {" / "}
            <span className="font-medium text-muted/90">1-800-89-14416</span>
          </p>
          <p className="mt-3 text-[11px] leading-relaxed text-muted/65">
            This AI therapist is not a replacement for emergency medical or psychiatric care.
          </p>
        </div>
      </footer>
    </div>
  );
}
