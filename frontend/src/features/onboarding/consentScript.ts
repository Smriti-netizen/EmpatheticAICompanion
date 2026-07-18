/**
 * Consent collected conversationally — same fields as ConsentPage API createUser.
 */
export type ConsentDraft = {
  displayName: string;
  age: number | null;
  agreed: boolean;
};

export type ConsentStepId = "hello" | "name" | "age" | "consent" | "done";

export type ConsentTurn = {
  id: ConsentStepId;
  text: string;
  options?: { label: string; value: string }[];
  freeText?: boolean;
};

export function emptyConsent(): ConsentDraft {
  return { displayName: "", age: null, agreed: false };
}

export function firstConsentTurn(): ConsentTurn {
  return {
    id: "hello",
    text: "Hi, I’m your Empathic Companion guide. I’ll ask a few quick things in chat so we can set up your profile. Ready?",
    options: [{ label: "Yes, let’s chat", value: "ready" }],
  };
}

export function nextConsentTurn(
  current: ConsentTurn,
  raw: string,
  draft: ConsentDraft,
): { draft: ConsentDraft; turn: ConsentTurn | null; createUser: boolean } {
  const value = raw.trim();
  const next = { ...draft };

  switch (current.id) {
    case "hello":
      return {
        draft: next,
        createUser: false,
        turn: {
          id: "name",
          text: "Great. What should I call you?",
          freeText: true,
        },
      };
    case "name":
      next.displayName = value;
      return {
        draft: next,
        createUser: false,
        turn: {
          id: "age",
          text: `Nice to meet you, ${value}. How old are you?`,
          freeText: true,
        },
      };
    case "age": {
      const age = Number(value.replace(/\D/g, ""));
      next.age = Number.isFinite(age) && age >= 13 && age <= 120 ? age : null;
      return {
        draft: next,
        createUser: false,
        turn: {
          id: "consent",
          text: "One important note before we continue: I’m an AI support companion, not a licensed therapist, and I don’t diagnose or prescribe. Reply “I agree” if you’re okay continuing.",
          options: [{ label: "I agree", value: "agree" }],
          freeText: true,
        },
      };
    }
    case "consent": {
      const lower = value.toLowerCase();
      next.agreed =
        lower.includes("agree") || lower === "yes" || lower === "ok" || lower === "ready";
      if (!next.agreed || !next.displayName) {
        return {
          draft: next,
          createUser: false,
          turn: {
            id: "consent",
            text: "Whenever you’re ready, reply “I agree” to continue.",
            options: [{ label: "I agree", value: "agree" }],
            freeText: true,
          },
        };
      }
      return { draft: next, createUser: true, turn: null };
    }
    default:
      return { draft: next, createUser: false, turn: null };
  }
}
