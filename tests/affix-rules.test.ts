import { expect, test, describe, beforeAll } from "bun:test";
import { SpellChecker } from "../src";

describe("Affix Rules", () => {
  let spellChecker: SpellChecker;

  beforeAll(async () => {
    spellChecker = new SpellChecker();
    await spellChecker.loadDictionary();
  });

  describe("Plural Rules", () => {
    test("regular plurals (add 's')", () => {
      // Words that just add 's'
      expect(spellChecker.isCorrect("cat")).toBe(true);
      expect(spellChecker.isCorrect("cats")).toBe(true);
      expect(spellChecker.isCorrect("dog")).toBe(true);
      expect(spellChecker.isCorrect("dogs")).toBe(true);
    });

    test("words ending in 's', 'x', 'z', 'h' (add 'es')", () => {
      // Words that add 'es'
      expect(spellChecker.isCorrect("box")).toBe(true);
      expect(spellChecker.isCorrect("boxes")).toBe(true);
      expect(spellChecker.isCorrect("dish")).toBe(true);
      expect(spellChecker.isCorrect("dishes")).toBe(true);
      expect(spellChecker.isCorrect("buzz")).toBe(true);
      expect(spellChecker.isCorrect("buzzes")).toBe(true);
    });

    test("words ending in consonant + 'y' (y -> ies)", () => {
      // Words ending in consonant + y
      expect(spellChecker.isCorrect("city")).toBe(true);
      expect(spellChecker.isCorrect("cities")).toBe(true);
      expect(spellChecker.isCorrect("baby")).toBe(true);
      expect(spellChecker.isCorrect("babies")).toBe(true);
    });

    test("words ending in vowel + 'y' (add 's')", () => {
      // Words ending in vowel + y
      expect(spellChecker.isCorrect("boy")).toBe(true);
      expect(spellChecker.isCorrect("boys")).toBe(true);
      expect(spellChecker.isCorrect("day")).toBe(true);
      expect(spellChecker.isCorrect("days")).toBe(true);
    });

    test("irregular plurals", () => {
      // Some common irregular plurals should be in dictionary
      expect(spellChecker.isCorrect("child")).toBe(true);
      expect(spellChecker.isCorrect("children")).toBe(true);
      expect(spellChecker.isCorrect("mouse")).toBe(true);
      expect(spellChecker.isCorrect("mice")).toBe(true);
    });
  });

  describe("Possessive Rules", () => {
    test("regular possessives (add 's)", () => {
      expect(spellChecker.isCorrect("cat")).toBe(true);
      expect(spellChecker.isCorrect("cat's")).toBe(true);
      expect(spellChecker.isCorrect("dog")).toBe(true);
      expect(spellChecker.isCorrect("dog's")).toBe(true);
    });
  });

  describe("Suggestions for Plural Forms", () => {
    test("suggests correct plural forms", () => {
      // Test that misspelled plurals get correct suggestions
      expect(spellChecker.getSuggestions("catz")).toContain("cats");
      expect(spellChecker.getSuggestions("citys")).toContain("cities");
      expect(spellChecker.getSuggestions("boxs")).toContain("boxes");
    });
  });
});
