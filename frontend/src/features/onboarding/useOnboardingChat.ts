import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api, ApiClientError } from "../../api/client";
import {
  setConsentAccepted,
  setDisplayName,
  setUserId,
} from "../../lib/storage";
import { pickAcknowledgement } from "./acknowledgements";
import {
  emptyConsent,
  firstConsentTurn,
  nextConsentTurn,
  type ConsentDraft,
  type ConsentTurn,
} from "./consentScript";
import {
  clearIntakeState,
  displayLabelForValue,
  loadIntakeState,
  newMessageId,
  normalizeUserValue,
  type ChatMessage,
} from "./intakePersistence";
import {
  emptyAnswers,
  firstTurn,
  nextTurn,
  type BotTurn,
  type IntakeAnswers,
  type QuickOption,
} from "./intakeScript";
import {
  isFreeWordStep,
  isUnrecognizedOption,
  looksLikeGibberish,
} from "./onboardingValidation";

/** Gentle nudges when we can't parse the answer. */
function clarifyMessage(
  turn: BotTurn,
  kind: "option" | "gibberish",
  attempt: number,
): string {
  if (kind === "option") {
    return attempt === 0
      ? "I didn't quite catch that — could you tap one of the options below, or say it in a word?"
      : "No worries — just pick the closest option below so I record it correctly.";
  }
  if (attempt === 0) {
    return "I want to make sure I understand you — that came through a little jumbled on my end. Could you say it again in a few plain words?";
  }
  const example =
    turn.id === "concerns"
      ? ' For example, "work stress" or "trouble sleeping".'
      : turn.id === "goal"
        ? ' For example, "feel calmer" or "sleep better".'
        : "";
  return `Even a word or two helps.${example} What feels closest to what you mean?`;
}

type Phase = "consent" | "intake";

const ONBOARDING_KEY = "empathic.onboarding.full.v2";

type Persisted = {
  version: 2;
  phase: Phase;
  consent: ConsentDraft;
  consentTurn: ConsentTurn;
  answers: IntakeAnswers;
  intakeTurn: BotTurn;
  messages: ChatMessage[];
  turnIndex: number;
};

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function loadFull(): Persisted | null {
  try {
    const raw = localStorage.getItem(ONBOARDING_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Persisted;
    return p?.version === 2 ? p : null;
  } catch {
    return null;
  }
}

function saveFull(p: Persisted) {
  try {
    localStorage.setItem(ONBOARDING_KEY, JSON.stringify(p));
  } catch {
    // ignore
  }
}

function clearFull() {
  try {
    localStorage.removeItem(ONBOARDING_KEY);
    clearIntakeState();
  } catch {
    // ignore
  }
}

/**
 * Single Cerebral Valley–style chat: consent → clinical intake → avatar.
 * Same APIs as before (createUser, saveIntake, saveScreening).
 */
export function useOnboardingChat() {
  const navigate = useNavigate();
  const booted = useRef(false);
  const clarifyRef = useRef<Record<string, number>>({});

  const [phase, setPhase] = useState<Phase>("consent");
  const [consent, setConsent] = useState<ConsentDraft>(emptyConsent);
  const [consentTurn, setConsentTurn] = useState<ConsentTurn>(firstConsentTurn);
  const [answers, setAnswers] = useState<IntakeAnswers>(emptyAnswers);
  const [intakeTurn, setIntakeTurn] = useState<BotTurn>(() => firstTurn(""));
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turnIndex, setTurnIndex] = useState(0);
  const [showChips, setShowChips] = useState(true);

  const currentOptions =
    phase === "consent" ? consentTurn.options : intakeTurn.options;

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;

    const saved = loadFull();
    if (saved && saved.messages.length > 0) {
      setPhase(saved.phase);
      setConsent(saved.consent);
      setConsentTurn(saved.consentTurn);
      setAnswers(saved.answers);
      setIntakeTurn(saved.intakeTurn);
      setMessages(saved.messages);
      setTurnIndex(saved.turnIndex);
      return;
    }

    // Drop legacy intake-only resume so users aren't stuck mid-form vibe
    clearIntakeState();
    void loadIntakeState();

    const opening = firstConsentTurn();
    const intro: ChatMessage = {
      id: newMessageId(),
      role: "assistant",
      text: opening.text,
      kind: "question",
    };
    setConsentTurn(opening);
    setMessages([intro]);
    saveFull({
      version: 2,
      phase: "consent",
      consent: emptyConsent(),
      consentTurn: opening,
      answers: emptyAnswers(),
      intakeTurn: firstTurn(""),
      messages: [intro],
      turnIndex: 0,
    });
  }, []);

  async function finishIntake(finalAnswers: IntakeAnswers) {
    setBusy(true);
    setError(null);
    try {
      const summary = [
        `Concerns: ${finalAnswers.concerns.join(", ")}`,
        `Duration: ${finalAnswers.duration}`,
        `Goal: ${finalAnswers.goal}`,
        `PHQ9: ${finalAnswers.phq9.reduce((a, b) => a + b, 0)}`,
        `GAD7: ${finalAnswers.gad7.reduce((a, b) => a + b, 0)}`,
      ].join(". ");

      const userId = localStorage.getItem("empathic.user_id");
      if (!userId) {
        navigate("/");
        return;
      }

      await api.saveIntake(userId, {
        primary_concerns: finalAnswers.concerns,
        session_goal: finalAnswers.goal,
        crisis_screen_positive: finalAnswers.crisis,
        duration_problem: finalAnswers.duration || undefined,
        prior_therapy: finalAnswers.priorTherapy ?? undefined,
        clinical_summary: summary,
      });
      await api.saveScreening(userId, {
        instrument: "PHQ9",
        items: finalAnswers.phq9,
      });
      await api.saveScreening(userId, {
        instrument: "GAD7",
        items: finalAnswers.gad7,
      });
      clearFull();
      navigate("/avatar");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not save intake");
    } finally {
      setBusy(false);
    }
  }

  async function pushAssistant(
    text: string,
    nextMessages: ChatMessage[],
    kind: "ack" | "question" = "question",
  ) {
    setTyping(true);
    await wait(kind === "ack" ? 420 : 560);
    const msg: ChatMessage = {
      id: newMessageId(),
      role: "assistant",
      text,
      kind,
    };
    const out = [...nextMessages, msg];
    setMessages(out);
    setTyping(false);
    return out;
  }

  async function submit(raw: string, option?: QuickOption) {
    if (busy || typing) return;
    const display = option?.label ?? raw.trim();
    if (!display) return;

    setBusy(true);
    setShowChips(false);
    setDraft("");
    setError(null);

    let nextMessages: ChatMessage[] = [
      ...messages,
      {
        id: newMessageId(),
        role: "user",
        text: display,
        kind: "answer",
      },
    ];
    setMessages(nextMessages);

    if (phase === "consent") {
      const value =
        option?.value ??
        (consentTurn.id === "consent" && /agree/i.test(display)
          ? "agree"
          : display);

      const result = nextConsentTurn(consentTurn, value, consent);
      setConsent(result.draft);

      if (result.createUser) {
        try {
          const user = await api.createUser({
            display_name: result.draft.displayName,
            age: result.draft.age ?? undefined,
            consent_version: "2026-07-01",
          });
          setUserId(user.user_id);
          setDisplayName(result.draft.displayName);
          setConsentAccepted();
        } catch (err) {
          setError(
            err instanceof ApiClientError ? err.message : "Could not create profile",
          );
          setBusy(false);
          setShowChips(true);
          return;
        }

        nextMessages = await pushAssistant(
          pickAcknowledgement(turnIndex),
          nextMessages,
          "ack",
        );
        const intakeOpening = firstTurn(result.draft.displayName);
        nextMessages = await pushAssistant(intakeOpening.text, nextMessages, "question");
        setPhase("intake");
        setIntakeTurn(intakeOpening);
        setTurnIndex(turnIndex + 1);
        setShowChips(true);
        saveFull({
          version: 2,
          phase: "intake",
          consent: result.draft,
          consentTurn,
          answers: emptyAnswers(),
          intakeTurn: intakeOpening,
          messages: nextMessages,
          turnIndex: turnIndex + 1,
        });
        setBusy(false);
        return;
      }

      if (!result.turn) {
        setBusy(false);
        setShowChips(true);
        return;
      }

      nextMessages = await pushAssistant(
        pickAcknowledgement(turnIndex),
        nextMessages,
        "ack",
      );
      nextMessages = await pushAssistant(result.turn.text, nextMessages, "question");
      setConsentTurn(result.turn);
      setTurnIndex(turnIndex + 1);
      setShowChips(true);
      saveFull({
        version: 2,
        phase: "consent",
        consent: result.draft,
        consentTurn: result.turn,
        answers,
        intakeTurn,
        messages: nextMessages,
        turnIndex: turnIndex + 1,
      });
      setBusy(false);
      return;
    }

    // —— intake phase ——
    if (intakeTurn.id === "done") {
      await finishIntake(answers);
      return;
    }

    const typedRaw = option?.value ?? raw;
    const normalized = normalizeUserValue(intakeTurn, typedRaw, intakeTurn.options);

    // Validate only what the user typed — chip taps are always valid.
    if (!option) {
      const stepId = intakeTurn.id;
      const attempt = clarifyRef.current[stepId] ?? 0;
      const unrecognized = isUnrecognizedOption(intakeTurn, normalized);
      const gibberish = isFreeWordStep(intakeTurn) && looksLikeGibberish(typedRaw);
      // After a couple of nudges on a free-word step, accept what they wrote.
      const giveUp = gibberish && attempt >= 2;

      if ((unrecognized || gibberish) && !giveUp) {
        clarifyRef.current[stepId] = attempt + 1;
        const out = await pushAssistant(
          clarifyMessage(intakeTurn, unrecognized ? "option" : "gibberish", attempt),
          nextMessages,
          "question",
        );
        setShowChips(true);
        saveFull({
          version: 2,
          phase: "intake",
          consent,
          consentTurn,
          answers,
          intakeTurn,
          messages: out,
          turnIndex,
        });
        setBusy(false);
        return;
      }
      clarifyRef.current[stepId] = 0;
    }

    const result = nextTurn(intakeTurn, normalized, answers);
    setAnswers(result.answers);

    if (!result.turn) {
      await finishIntake(result.answers);
      return;
    }

    const skipAck =
      result.turn.id === "phq_intro" ||
      result.turn.id === "gad_intro" ||
      result.turn.id === "summary" ||
      result.turn.id === "done";

    if (!skipAck) {
      nextMessages = await pushAssistant(
        pickAcknowledgement(turnIndex),
        nextMessages,
        "ack",
      );
    }
    nextMessages = await pushAssistant(result.turn.text, nextMessages, "question");
    setIntakeTurn(result.turn);
    setTurnIndex(turnIndex + 1);
    setShowChips(true);
    saveFull({
      version: 2,
      phase: "intake",
      consent,
      consentTurn,
      answers: result.answers,
      intakeTurn: result.turn,
      messages: nextMessages,
      turnIndex: turnIndex + 1,
    });
    setBusy(false);
  }

  return {
    messages,
    draft,
    setDraft,
    typing,
    busy,
    error,
    chips: showChips && !typing && !busy ? (currentOptions ?? []) : [],
    sendText: () => void submit(draft),
    selectChip: (option: QuickOption) =>
      void submit(displayLabelForValue(option.value, currentOptions), option),
  };
}
