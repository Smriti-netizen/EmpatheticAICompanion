const ACKS = [
  "Thanks for sharing.",
  "Got it.",
  "That makes sense.",
  "I appreciate that.",
  "Thank you, that helps.",
  "Noted.",
  "We're making good progress.",
  "I just have a few more questions.",
  "Thanks, that gives me a clearer picture.",
] as const;

export function pickAcknowledgement(turnIndex: number): string {
  return ACKS[turnIndex % ACKS.length];
}
