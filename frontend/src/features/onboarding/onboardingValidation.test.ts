import { describe, expect, it } from "vitest";

import { looksLikeGibberish, needsOptionMatch } from "./onboardingValidation";
import type { BotTurn } from "./intakeScript";

describe("looksLikeGibberish", () => {
  it("flags keyboard mash", () => {
    expect(looksLikeGibberish("ihiuhiuhui")).toBe(true);
    expect(looksLikeGibberish("bcdfghjklmnp")).toBe(true);
  });

  it("allows real short answers", () => {
    expect(looksLikeGibberish("sleep")).toBe(false);
    expect(looksLikeGibberish("I feel anxious at work")).toBe(false);
  });
});

describe("needsOptionMatch", () => {
  it("requires chips for crisis / likert steps", () => {
    const crisis = { id: "crisis" } as BotTurn;
    const concerns = { id: "concerns" } as BotTurn;
    expect(needsOptionMatch(crisis)).toBe(true);
    expect(needsOptionMatch(concerns)).toBe(false);
  });
});
