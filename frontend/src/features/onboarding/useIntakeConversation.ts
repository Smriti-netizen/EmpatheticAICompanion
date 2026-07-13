import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api, ApiClientError } from "../../api/client";
import { getDisplayName, getUserId } from "../../lib/storage";
import { pickAcknowledgement } from "./acknowledgements";
import {
  clearIntakeState,
  displayLabelForValue,
  loadIntakeState,
  newMessageId,
  normalizeUserValue,
  saveIntakeState,
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

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useIntakeConversation() {
  const navigate = useNavigate();
  const name = getDisplayName();
  const bootstrapped = useRef(false);

  const [answers, setAnswers] = useState<IntakeAnswers>(emptyAnswers);
  const [turn, setTurn] = useState<BotTurn>(() => firstTurn(name));
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turnIndex, setTurnIndex] = useState(0);
  const [showChips, setShowChips] = useState(true);

  const persist = useCallback(
    (
      nextAnswers: IntakeAnswers,
      nextTurnState: BotTurn,
      nextMessages: ChatMessage[],
      nextIndex: number,
    ) => {
      saveIntakeState({
        version: 1,
        answers: nextAnswers,
        turn: nextTurnState,
        messages: nextMessages,
        turnIndex: nextIndex,
        completed: false,
      });
    },
    [],
  );

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    const saved = loadIntakeState();
    if (saved && !saved.completed && saved.messages.length > 0) {
      setAnswers(saved.answers);
      setTurn(saved.turn);
      setMessages(saved.messages);
      setTurnIndex(saved.turnIndex);
      setShowChips(true);
      return;
    }

    const opening = firstTurn(name);
    const intro: ChatMessage = {
      id: newMessageId(),
      role: "assistant",
      text: opening.text,
      kind: "question",
    };
    setTurn(opening);
    setMessages([intro]);
    persist(emptyAnswers(), opening, [intro], 0);
  }, [name, persist]);

  async function persistAndContinue(finalAnswers: IntakeAnswers) {
    const userId = getUserId();
    if (!userId) {
      navigate("/consent");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const summary = [
        `Concerns: ${finalAnswers.concerns.join(", ")}`,
        `Duration: ${finalAnswers.duration}`,
        `Goal: ${finalAnswers.goal}`,
        `PHQ9: ${finalAnswers.phq9.reduce((a, b) => a + b, 0)}`,
        `GAD7: ${finalAnswers.gad7.reduce((a, b) => a + b, 0)}`,
      ].join(". ");

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
      clearIntakeState();
      navigate("/avatar");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not save intake");
    } finally {
      setSaving(false);
    }
  }

  async function submitAnswer(raw: string, option?: QuickOption) {
    if (busy || saving || typing) return;
    const display = option?.label ?? raw.trim();
    if (!display) return;

    const value = normalizeUserValue(turn, option?.value ?? raw, turn.options);

    if (turn.id === "done") {
      await persistAndContinue(answers);
      return;
    }

    setBusy(true);
    setShowChips(false);
    setDraft("");
    setError(null);

    const userMsg: ChatMessage = {
      id: newMessageId(),
      role: "user",
      text: display,
      kind: "answer",
    };
    let nextMessages = [...messages, userMsg];
    setMessages(nextMessages);

    const result = nextTurn(turn, value, answers);
    setAnswers(result.answers);

    if (result.crisisExit) {
      try {
        const userId = getUserId();
        if (userId) {
          await api.saveIntake(userId, {
            primary_concerns: result.answers.concerns,
            session_goal: result.answers.goal || "safety first",
            crisis_screen_positive: true,
            duration_problem: result.answers.duration || undefined,
          });
        }
      } catch {
        // still route to crisis
      }
      clearIntakeState();
      navigate("/crisis");
      setBusy(false);
      return;
    }

    if (!result.turn) {
      await persistAndContinue(result.answers);
      setBusy(false);
      return;
    }

    // Acknowledgement (skip when next turn is itself a thank-you intro)
    const skipAck =
      result.turn.id === "phq_intro" ||
      result.turn.id === "gad_intro" ||
      result.turn.id === "summary" ||
      result.turn.id === "done";

    setTyping(true);
    await wait(450 + Math.min(600, display.length * 8));

    if (!skipAck) {
      const ack: ChatMessage = {
        id: newMessageId(),
        role: "assistant",
        text: pickAcknowledgement(turnIndex),
        kind: "ack",
      };
      nextMessages = [...nextMessages, ack];
      setMessages(nextMessages);
      setTyping(false);
      await wait(380);
      setTyping(true);
      await wait(520);
    }

    const question: ChatMessage = {
      id: newMessageId(),
      role: "assistant",
      text: result.turn.text,
      kind: "question",
    };
    nextMessages = [...nextMessages, question];
    const nextIndex = turnIndex + 1;
    setTurn(result.turn);
    setTurnIndex(nextIndex);
    setMessages(nextMessages);
    setTyping(false);
    setShowChips(true);
    persist(result.answers, result.turn, nextMessages, nextIndex);
    setBusy(false);

    if (result.turn.id === "done") {
      // leave chips for "Choose avatar"
    }
  }

  return {
    messages,
    turn,
    draft,
    setDraft,
    typing,
    busy: busy || saving,
    error,
    showChips,
    chips: showChips && !typing && !busy ? (turn.options ?? []) : [],
    allowFreeText: true,
    sendText: () =>
      void submitAnswer(draft, undefined),
    selectChip: (option: QuickOption) =>
      void submitAnswer(
        displayLabelForValue(option.value, turn.options),
        option,
      ),
  };
}
