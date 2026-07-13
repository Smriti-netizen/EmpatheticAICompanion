import type { BotTurn, IntakeAnswers, QuickOption } from "./intakeScript";

export type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
  kind?: "ack" | "question" | "answer";
};

export type IntakePersistedState = {
  version: 1;
  answers: IntakeAnswers;
  turn: BotTurn;
  messages: ChatMessage[];
  turnIndex: number;
  completed: boolean;
};

const STORAGE_KEY = "empathic.intake.conversation.v1";

export function loadIntakeState(): IntakePersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as IntakePersistedState;
    if (parsed?.version !== 1 || !parsed.turn || !parsed.messages) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveIntakeState(state: IntakePersistedState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // private mode / quota
  }
}

export function clearIntakeState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function newMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Map chip label or natural language to the script’s expected value. */
export function normalizeUserValue(
  turn: BotTurn,
  raw: string,
  options?: QuickOption[],
): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;

  const opts = options ?? turn.options ?? [];
  const byValue = opts.find(
    (o) => o.value.toLowerCase() === trimmed.toLowerCase(),
  );
  if (byValue) return byValue.value;

  const byLabel = opts.find(
    (o) => o.label.toLowerCase() === trimmed.toLowerCase(),
  );
  if (byLabel) return byLabel.value;

  // Likert free-text → 0–3 for PHQ/GAD (same scores as chips)
  if (turn.id === "phq" || turn.id === "gad") {
    const n = Number(trimmed);
    if (Number.isInteger(n) && n >= 0 && n <= 3) return String(n);
    const lower = trimmed.toLowerCase();
    if (lower.includes("not at all") || lower === "never") return "0";
    if (lower.includes("nearly every") || lower.includes("every day")) return "3";
    if (lower.includes("more than half") || lower.includes("half the")) return "2";
    if (lower.includes("several")) return "1";
  }

  if (turn.id === "crisis" || turn.id === "prior_therapy") {
    const lower = trimmed.toLowerCase();
    if (/^(y|yes|yeah|yep)\b/.test(lower)) return "yes";
    if (/^(n|no|nope)\b/.test(lower)) return "no";
  }

  if (turn.id === "welcome" && /ready|yes|ok|sure|begin|start/i.test(trimmed)) {
    return "ready";
  }

  if (turn.id === "summary") {
    if (/crisis|help|hotline/i.test(trimmed)) return "crisis";
    if (/confirm|looks right|continue|yes|ok/i.test(trimmed)) return "confirm";
  }

  if (turn.id === "done" && /avatar|continue|yes|ok/i.test(trimmed)) {
    return "avatar";
  }

  return trimmed;
}

export function displayLabelForValue(
  value: string,
  options?: QuickOption[],
): string {
  const match = options?.find((o) => o.value === value);
  return match?.label ?? value;
}
