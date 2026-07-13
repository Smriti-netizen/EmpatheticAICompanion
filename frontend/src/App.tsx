import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom";

import { AvatarPickerPage } from "./features/avatar/AvatarPickerPage";
import { OnboardingChatPage } from "./features/onboarding/OnboardingChatPage";
import { CallRoomPage } from "./features/session/CallRoomPage";
import { BookPage } from "./pages/Book";
import { CrisisPage } from "./pages/Crisis";
import { DashboardPage } from "./pages/Dashboard";
import { LandingPage } from "./pages/Landing";

/** Keep in-app routes in this tab (ignore target=_blank / modified clicks). */
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

      // Absolute URL to another origin — leave alone.
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

export default function App() {
  return (
    <BrowserRouter>
      <SameTabGuards>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          {/* Single conversational onboarding — no form pages */}
          <Route path="/onboarding" element={<OnboardingChatPage />} />
          <Route path="/consent" element={<Navigate to="/onboarding" replace />} />
          <Route path="/intake" element={<Navigate to="/onboarding" replace />} />
          <Route path="/screening" element={<Navigate to="/onboarding" replace />} />
          <Route path="/avatar" element={<AvatarPickerPage />} />
          <Route path="/book" element={<BookPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/session/:id" element={<CallRoomPage />} />
          <Route path="/crisis" element={<CrisisPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </SameTabGuards>
    </BrowserRouter>
  );
}
