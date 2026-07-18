import { describe, expect, it } from "vitest";

import { gad7Band, phq9Band, sumItems } from "./scoring";

describe("sumItems", () => {
  it("sums likert responses", () => {
    expect(sumItems([0, 1, 2, 3])).toBe(6);
  });
});

describe("phq9Band", () => {
  it("maps score bands", () => {
    expect(phq9Band(3)).toBe("minimal");
    expect(phq9Band(8)).toBe("mild");
    expect(phq9Band(12)).toBe("moderate");
    expect(phq9Band(18)).toBe("moderately severe");
    expect(phq9Band(22)).toBe("severe");
  });
});

describe("gad7Band", () => {
  it("maps score bands", () => {
    expect(gad7Band(2)).toBe("minimal");
    expect(gad7Band(7)).toBe("mild");
    expect(gad7Band(12)).toBe("moderate");
    expect(gad7Band(18)).toBe("severe");
  });
});
