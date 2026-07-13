/**
 * Conversational intake script — one turn at a time.
 * Answers map to clinical intake + PHQ-9 / GAD-7 without MCQ forms.
 */

export type QuickOption = { label: string; value: string };

export type IntakeAnswers = {
  concerns: string[];
  duration: string;
  goal: string;
  crisis: boolean;
  priorTherapy: boolean | null;
  phq9: number[];
  gad7: number[];
};

export type IntakeStepId =
  | "welcome"
  | "concerns"
  | "duration"
  | "goal"
  | "crisis"
  | "prior_therapy"
  | "phq_intro"
  | "phq"
  | "gad_intro"
  | "gad"
  | "summary"
  | "done";

export type BotTurn = {
  id: IntakeStepId;
  text: string;
  options?: QuickOption[];
  freeText?: boolean;
  phqIndex?: number;
  gadIndex?: number;
};

const LIKERT: QuickOption[] = [
  { label: "Not at all", value: "0" },
  { label: "Several days", value: "1" },
  { label: "More than half the days", value: "2" },
  { label: "Nearly every day", value: "3" },
];

const PHQ9_PROMPTS = [
  "Little interest or pleasure in doing things?",
  "Feeling down, depressed, or hopeless?",
  "Trouble falling or staying asleep, or sleeping too much?",
  "Feeling tired or having little energy?",
  "Poor appetite or overeating?",
  "Feeling bad about yourself — or that you are a failure?",
  "Trouble concentrating on things?",
  "Moving or speaking slowly, or being fidgety/restless?",
  "Thoughts that you would be better off dead, or of hurting yourself?",
];

const GAD7_PROMPTS = [
  "Feeling nervous, anxious, or on edge?",
  "Not being able to stop or control worrying?",
  "Worrying too much about different things?",
  "Trouble relaxing?",
  "Being so restless that it is hard to sit still?",
  "Becoming easily annoyed or irritable?",
  "Feeling afraid as if something awful might happen?",
];

export function emptyAnswers(): IntakeAnswers {
  return {
    concerns: [],
    duration: "",
    goal: "",
    crisis: false,
    priorTherapy: null,
    phq9: [],
    gad7: [],
  };
}

export function firstTurn(name: string): BotTurn {
  return {
    id: "welcome",
    text: `Hi${name ? ` ${name}` : ""}. I’ll ask a few short questions in chat so I understand what you need — then you can pick a counselor avatar and book a 45‑minute session. Ready?`,
    options: [{ label: "Yes, let’s begin", value: "ready" }],
  };
}

export function nextTurn(
  current: BotTurn,
  rawAnswer: string,
  answers: IntakeAnswers,
): { answers: IntakeAnswers; turn: BotTurn | null; crisisExit: boolean } {
  const value = rawAnswer.trim();
  const next = { ...answers, phq9: [...answers.phq9], gad7: [...answers.gad7] };

  switch (current.id) {
    case "welcome":
      return {
        answers: next,
        crisisExit: false,
        turn: {
          id: "concerns",
          text: "What’s been weighing on you most lately? You can name a few themes (e.g. anxiety, sleep, work, relationships).",
          freeText: true,
          options: [
            { label: "Anxiety", value: "anxiety" },
            { label: "Sleep", value: "sleep" },
            { label: "Stress / work", value: "stress" },
            { label: "Mood", value: "mood" },
            { label: "Relationships", value: "relationships" },
          ],
        },
      };

    case "concerns": {
      const parts = value
        .split(/[,/]| and /i)
        .map((p) => p.trim().toLowerCase())
        .filter(Boolean);
      next.concerns = parts.length ? parts : [value.toLowerCase()];
      return {
        answers: next,
        crisisExit: false,
        turn: {
          id: "duration",
          text: "About how long has this been going on?",
          freeText: true,
          options: [
            { label: "A few weeks", value: "a few weeks" },
            { label: "A few months", value: "a few months" },
            { label: "Over a year", value: "over a year" },
          ],
        },
      };
    }

    case "duration":
      next.duration = value;
      return {
        answers: next,
        crisisExit: false,
        turn: {
          id: "goal",
          text: "If our first session goes well, what would you hope feels a little lighter afterward?",
          freeText: true,
        },
      };

    case "goal":
      next.goal = value;
      return {
        answers: next,
        crisisExit: false,
        turn: {
          id: "crisis",
          text: "In the past two weeks, have you had thoughts of harming yourself or ending your life?",
          options: [
            { label: "No", value: "no" },
            { label: "Yes", value: "yes" },
          ],
        },
      };

    case "crisis": {
      next.crisis = value.toLowerCase().startsWith("y");
      if (next.crisis) {
        return { answers: next, crisisExit: true, turn: null };
      }
      return {
        answers: next,
        crisisExit: false,
        turn: {
          id: "prior_therapy",
          text: "Have you worked with a therapist or counselor before?",
          options: [
            { label: "Yes", value: "yes" },
            { label: "No", value: "no" },
          ],
        },
      };
    }

    case "prior_therapy":
      next.priorTherapy = value.toLowerCase().startsWith("y");
      return {
        answers: next,
        crisisExit: false,
        turn: {
          id: "phq_intro",
          text: "Next are brief check-in questions used in counseling (PHQ‑9). Over the last 2 weeks, how often have you been bothered by the following?",
          options: [{ label: "Continue", value: "ok" }],
        },
      };

    case "phq_intro":
      return {
        answers: next,
        crisisExit: false,
        turn: {
          id: "phq",
          text: PHQ9_PROMPTS[0],
          options: LIKERT,
          phqIndex: 0,
        },
      };

    case "phq": {
      const idx = current.phqIndex ?? 0;
      next.phq9[idx] = Number(value);
      const following = idx + 1;
      if (following < PHQ9_PROMPTS.length) {
        return {
          answers: next,
          crisisExit: false,
          turn: {
            id: "phq",
            text: PHQ9_PROMPTS[following],
            options: LIKERT,
            phqIndex: following,
          },
        };
      }
      return {
        answers: next,
        crisisExit: false,
        turn: {
          id: "gad_intro",
          text: "Thanks. A few anxiety check-ins next (GAD‑7).",
          options: [{ label: "Continue", value: "ok" }],
        },
      };
    }

    case "gad_intro":
      return {
        answers: next,
        crisisExit: false,
        turn: {
          id: "gad",
          text: GAD7_PROMPTS[0],
          options: LIKERT,
          gadIndex: 0,
        },
      };

    case "gad": {
      const idx = current.gadIndex ?? 0;
      next.gad7[idx] = Number(value);
      const following = idx + 1;
      if (following < GAD7_PROMPTS.length) {
        return {
          answers: next,
          crisisExit: false,
          turn: {
            id: "gad",
            text: GAD7_PROMPTS[following],
            options: LIKERT,
            gadIndex: following,
          },
        };
      }
      const phq = next.phq9.reduce((a, b) => a + b, 0);
      const gad = next.gad7.reduce((a, b) => a + b, 0);
      return {
        answers: next,
        crisisExit: false,
        turn: {
          id: "summary",
          text: buildSummary(next, phq, gad),
          options: [
            { label: "Looks right — continue", value: "confirm" },
            { label: "I need crisis help", value: "crisis" },
          ],
        },
      };
    }

    case "summary":
      if (value === "crisis") {
        next.crisis = true;
        return { answers: next, crisisExit: true, turn: null };
      }
      return {
        answers: next,
        crisisExit: false,
        turn: {
          id: "done",
          text: "Thank you for sharing that. Next, choose who you’d like to sit with in session.",
          options: [{ label: "Choose avatar", value: "avatar" }],
        },
      };

    default:
      return { answers: next, crisisExit: false, turn: null };
  }
}

function buildSummary(answers: IntakeAnswers, phq: number, gad: number): string {
  return [
    "Here’s what I’m hearing — tell me if I missed anything:",
    `• Focus: ${answers.concerns.join(", ") || "not specified"}`,
    `• Duration: ${answers.duration || "not specified"}`,
    `• Hope for session: ${answers.goal || "not specified"}`,
    `• Prior therapy: ${answers.priorTherapy ? "yes" : "no"}`,
    `• PHQ‑9 score: ${phq} · GAD‑7 score: ${gad}`,
    "",
    "This is support from an AI counselor — not a licensed therapist, diagnosis, or prescription.",
  ].join("\n");
}
