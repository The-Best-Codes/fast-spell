import { describe, expect, it } from "bun:test";
import { join } from "path";
import SpellChecker from "../dist/index.js";

describe("SpellChecker", () => {
  const spellChecker = new SpellChecker(
    join(__dirname, "../data/en_US-web.dic"),
    join(__dirname, "../data/en_US-web.aff"),
  );

  it("should check correct words", () => {
    expect(spellChecker.check("test")).toBe(true);
    expect(spellChecker.check("hello")).toBe(true);
    expect(spellChecker.check("world")).toBe(true);
  });

  it("should check incorrect words", () => {
    expect(spellChecker.check("testt")).toBe(false);
    expect(spellChecker.check("helo")).toBe(false);
    expect(spellChecker.check("wrld")).toBe(false);
  });

  it("should handle affixed words", () => {
    expect(spellChecker.check("testing")).toBe(true);
    expect(spellChecker.check("tested")).toBe(true);
    expect(spellChecker.check("tests")).toBe(true);
  });

  it("should suggest corrections", () => {
    const suggestions = spellChecker.suggest("helo");
    expect(suggestions).toContain("hello");

    // Test more cases
    const misspellings = {
      tset: "test",
      wrld: "world",
      programing: "programming",
      recieve: "receive",
      seperate: "separate",
    };

    for (const [misspelled, correct] of Object.entries(misspellings)) {
      const suggs = spellChecker.suggest(misspelled);
      expect(suggs).toContain(correct);
    }
  });
});
