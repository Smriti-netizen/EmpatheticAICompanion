import type { BotTurn } from "./intakeScript";

/** Catch keyboard-mashing without flagging short/misspelled/real words. */

function hasRepeatingUnit(s: string): boolean {
  for (let size = 1; size <= 3; size += 1) {
    if (s.length >= size * 3) {
      const unit = s.slice(0, size);
      const repeated = unit.repeat(Math.ceil(s.length / size)).slice(0, s.length);
      if (repeated === s) return true;
    }
  }
  return false;
}

function isPlausibleWord(word: string): boolean {
  const s = word.toLowerCase().replace(/[^a-z]/g, "");
  if (s.length <= 3) return true; // short tokens (ok, no, sad, job) — trust them
  const vowels = (s.match(/[aeiou]/g) ?? []).length;
  const uniqueRatio = new Set(s).size / s.length;

  if (vowels === 0) return false; // long token with no vowel → mash
  if (uniqueRatio < 0.4) return false; // "ihiuhiuhui", "hahaha" → mash
  if (/[bcdfghjklmnpqrstvwxyz]{5,}/.test(s)) return false; // long consonant run
  if (hasRepeatingUnit(s)) return false; // "abababab"
  return true;
}

export function looksLikeGibberish(raw: string): boolean {
  const text = raw.trim().toLowerCase();
  if (text.length < 6) return false; // too short to judge — don't over-flag
  const letters = text.replace(/[^a-z]/g, "");
  if (letters.length < 5) return false; // mostly numbers/punctuation — allow

  const words = text.split(/\s+/).filter(Boolean);
  const hasRealWord = words.some(isPlausibleWord);
  return !hasRealWord;
}

export function isFreeWordStep(turn: BotTurn): boolean {
  return turn.id === "concerns" || turn.id === "goal";
}

export function needsOptionMatch(turn: BotTurn): boolean {
  return (
    turn.id === "welcome" ||
    turn.id === "crisis" ||
    turn.id === "prior_therapy" ||
    turn.id === "phq_intro" ||
    turn.id === "gad_intro" ||
    turn.id === "phq" ||
    turn.id === "gad" ||
    turn.id === "summary" ||
    turn.id === "done"
  );
}

export function optionValues(turn: BotTurn): string[] {
  if (turn.id === "phq" || turn.id === "gad") return ["0", "1", "2", "3"];
  return (turn.options ?? []).map((o) => o.value);
}

export function isUnrecognizedOption(turn: BotTurn, normalized: string): boolean {
  if (!needsOptionMatch(turn)) return false;
  return !optionValues(turn).includes(normalized);
}
