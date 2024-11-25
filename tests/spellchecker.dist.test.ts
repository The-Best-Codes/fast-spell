import { expect, test, describe } from "bun:test";
import { SpellChecker } from "../dist";

describe("SpellChecker", () => {
  let spellChecker: SpellChecker;

  test("initialization with default dictionary", async () => {
    spellChecker = new SpellChecker();
    await spellChecker.loadDictionary();
    expect(spellChecker).toBeDefined();
    expect(spellChecker.isCorrect("hello")).toBe(true);
  });

  test("initialization with custom dictionary", async () => {
    spellChecker = new SpellChecker();
    await spellChecker.loadDictionary(
      "./data/en_US-web.aff",
      "./data/en_US-web.dic"
    );
    expect(spellChecker).toBeDefined();
  });

  test("correct word detection", () => {
    expect(spellChecker.isCorrect("hello")).toBe(true);
    expect(spellChecker.isCorrect("computer")).toBe(true);
    expect(spellChecker.isCorrect("speling")).toBe(false);
  });

  test("suggestions for misspelled words", () => {
    const suggestions = spellChecker.getSuggestions("speling");
    expect(suggestions).toBeArray();
    expect(suggestions).toContain("spelling");
  });
});
