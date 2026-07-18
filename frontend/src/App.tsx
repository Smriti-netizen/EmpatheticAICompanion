import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { AsciiBloom } from "./components/AsciiBloom";
import { AvatarPickerPage } from "./features/avatar/AvatarPickerPage";
import { OnboardingChatPage } from "./features/onboarding/OnboardingChatPage";
import { BookPage } from "./pages/Book";
import { CrisisPage } from "./pages/Crisis";
import { DashboardPage } from "./pages/Dashboard";
import { LandingPage } from "./pages/Landing";

/** Session room loads separately so onnx/vad never blanks the whole app. */
const CallRoomPage = lazy(() =>
  import("./features/session/CallRoomPage").then((m) => ({ default: m.CallRoomPage })),
);

function SameTabGuards({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;

      const anchor = (event.target as HTMLElement | null)?.closest?.("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      if (
        href.startsWith("http://") ||
        href.startsWith("https://") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:")
      ) {
        return;
      }

      try {
        const url = new URL(href, window.location.origin);
        if (url.origin !== window.location.origin) return;
        event.preventDefault();
        event.stopPropagation();
        navigate(`${url.pathname}${url.search}${url.hash}`);
      } catch {
        event.preventDefault();
        navigate(href);
      }
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [navigate]);

  return children;
}

function SessionFallback() {
  return (
    <div className="grid min-h-screen place-items-center bg-paper">
      <AsciiBloom label="Getting your space ready…" size="lg" />
    </div>
  );
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * ASCII-bloom wipe: briefly blooms across the screen on each route change,
 * masking the swap so flows feel connected instead of hard-cutting (§5).
 * Skipped on the heavy /session route and when reduced-motion is set.
 */
function BloomWipe() {
  const location = useLocation();
  const [active, setActive] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (prefersReducedMotion() || location.pathname.startsWith("/session/")) return;
    setActive(true);
    const t = window.setTimeout(() => setActive(false), 620);
    return () => window.clearTimeout(t);
  }, [location.pathname]);

  if (!active) return null;
  return (
    <div
      className="pointer-events-none fixed inset-0 z-[70] grid place-items-center bg-paper [animation:bloomWipe_620ms_ease-in-out_both]"
      aria-hidden="true"
    >
      <AsciiBloom size="lg" />
    </div>
  );
}

/** Cross-fades + gently scales the routed page in on each navigation. */
function RoutedPages() {
  const location = useLocation();
  return (
    <div key={location.pathname}>
      <Routes location={location}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/onboarding" element={<OnboardingChatPage />} />
        <Route path="/consent" element={<Navigate to="/onboarding" replace />} />
        <Route path="/intake" element={<Navigate to="/onboarding" replace />} />
        <Route path="/screening" element={<Navigate to="/onboarding" replace />} />
        <Route path="/avatar" element={<AvatarPickerPage />} />
        <Route path="/book" element={<BookPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route
          path="/session/:id"
          element={
            <Suspense fallback={<SessionFallback />}>
              <CallRoomPage />
            </Suspense>
          }
        />
        <Route path="/crisis" element={<CrisisPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <SameTabGuards>
        <BloomWipe />
        <RoutedPages />
      </SameTabGuards>
    </BrowserRouter>
  );
}
