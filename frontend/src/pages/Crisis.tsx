import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../api/client";

export function CrisisPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState(
    "If you are in immediate danger, call 112 now.",
  );
  const [helplines, setHelplines] = useState([
    { name: "Tele-MANAS", phone: "14416" },
    { name: "iCall", phone: "9152987821" },
    { name: "Emergency", phone: "112" },
  ]);

  useEffect(() => {
    void api.crisisResources().then((data) => {
      setMessage(data.message);
      setHelplines(data.helplines);
    }).catch(() => {
      // keep defaults
    });
  }, []);

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-4 py-10">
      <h1 className="font-display text-4xl font-semibold text-crisis">You are not alone</h1>
      <p className="mt-3 text-base leading-relaxed text-ink">{message}</p>
      <ul className="mt-6 space-y-3 rounded-2xl border border-[#e4b4ae] bg-crisis-bg p-5 text-crisis">
        {helplines.map((line) => (
          <li key={line.phone} className="text-lg font-semibold">
            {line.name}: {line.phone}
          </li>
        ))}
      </ul>
      <p className="mt-6 text-sm text-muted">
        Counseling chat is paused. Please reach a human helper if you feel unsafe.
      </p>
      <button
        type="button"
        onClick={() => navigate("/")}
        className="mt-8 text-left text-sm font-semibold text-accent underline"
      >
        Return home
      </button>
    </div>
  );
}
