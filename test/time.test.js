import { describe, it, expect } from "vitest";
import { decideColor } from "../src/index";

describe("time range logic", () => {
  it("within normal range", () => {
    expect(decideColor(12 * 60 + 30, 12 * 60, 13 * 60)).toBe(true);
  });

  it("outside normal range", () => {
    expect(decideColor(11 * 60 + 59, 12 * 60, 13 * 60)).toBe(false);
  });

  it("cross midnight", () => {
    expect(decideColor(23 * 60 + 30, 23 * 60, 1 * 60)).toBe(true);
    expect(decideColor(0 * 60 + 30, 23 * 60, 1 * 60)).toBe(true);
    expect(decideColor(2 * 60, 23 * 60, 1 * 60)).toBe(false);
  });
});
