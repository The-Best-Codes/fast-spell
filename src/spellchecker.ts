import { readFileSync } from "fs";
import { type Dictionary } from "./types";
import { parseAff, parseDic } from "./parser";

export class SpellChecker {
  private dictionary: Dictionary;

  constructor() {
    this.dictionary = {
      words: new Set(),
      rules: new Map(),
      replacements: [],
      compoundRules: [],
      compoundMin: 1,
      tryChars: "",
      wordChars: "",
      iconvRules: [],
    };
  }

  loadDictionary(affPath: string, dicPath: string): void {
    const affContent = readFileSync(affPath, "utf-8");
    const dicContent = readFileSync(dicPath, "utf-8");

    const affixData = parseAff(affContent);
    this.dictionary = {
      ...affixData,
      words: parseDic(dicContent, affixData.rules),
    };
  }

  private isSpecialCase(word: string): boolean {
    // Check if it's a number (decimal, hex, or binary)
    if (/^[0-9]+$/.test(word)) return true;
    if (/^0x[0-9A-Fa-f]+$/.test(word)) return true;
    if (/^0b[01]+$/.test(word)) return true;

    // Check if it's a hash (like git commit hash)
    if (/^[0-9A-Fa-f]{7,40}$/.test(word)) return true;

    // Check if it's a number with units (e.g., 100GB)
    const match = word.match(/^([0-9]+)([A-Za-z]+)$/);
    if (match) {
      const units = match[2];
      // Check if the units part is a valid word
      if (this.dictionary.words.has(units.toLowerCase())) return true;
    }

    return false;
  }

  private applyIConvRules(word: string): string {
    let result = word;
    for (const rule of this.dictionary.iconvRules) {
      result = result.replace(new RegExp(rule.from, "g"), rule.to);
    }
    return result;
  }

  private checkCompoundRules(word: string): boolean {
    return this.dictionary.compoundRules.some((rule) => rule.regex.test(word));
  }

  public isCorrect(word: string): boolean {
    // First apply any character conversions
    word = this.applyIConvRules(word);

    // Check if it's in dictionary as-is
    if (this.dictionary.words.has(word)) return true;

    // Check lowercase version
    if (this.dictionary.words.has(word.toLowerCase())) return true;

    // Check special cases
    if (this.isSpecialCase(word)) return true;

    // Check compound rules
    if (this.checkCompoundRules(word)) return true;

    return false;
  }

  public getSuggestions(word: string): string[] {
    const suggestions = new Set<string>();
    const lowWord = word.toLowerCase();

    // If the word is correct, no need for suggestions
    if (this.isCorrect(lowWord)) return [];

    // Try common replacements first (REP rules)
    this.addReplacementSuggestions(lowWord, suggestions);

    // Also try edit distance based suggestions
    this.addEditDistanceSuggestions(lowWord, suggestions);

    // Return all unique suggestions
    return Array.from(suggestions);
  }

  private addReplacementSuggestions(
    word: string,
    suggestions: Set<string>
  ): void {
    // Try each replacement rule
    for (const rule of this.dictionary.replacements) {
      const { from, to } = rule;

      // Check if the word contains the 'from' pattern
      const regex = new RegExp(from, "g");
      if (regex.test(word)) {
        // Try replacing each occurrence
        const suggestion = word.replace(regex, to);
        if (this.isCorrect(suggestion)) {
          suggestions.add(suggestion);
        }
      }
    }
  }

  private addEditDistanceSuggestions(
    word: string,
    suggestions: Set<string>
  ): void {
    const commonChars =
      "abcdefghijklmnopqrstuvwxyz" + this.dictionary.tryChars.toLowerCase();

    // Deletions
    for (let i = 0; i < word.length; i++) {
      const suggestion = word.slice(0, i) + word.slice(i + 1);
      if (this.isCorrect(suggestion)) suggestions.add(suggestion);
    }

    // Substitutions
    for (let i = 0; i < word.length; i++) {
      for (const c of commonChars) {
        const suggestion = word.slice(0, i) + c + word.slice(i + 1);
        if (this.isCorrect(suggestion)) suggestions.add(suggestion);
      }
    }

    // Insertions
    for (let i = 0; i <= word.length; i++) {
      for (const c of commonChars) {
        const suggestion = word.slice(0, i) + c + word.slice(i);
        if (this.isCorrect(suggestion)) suggestions.add(suggestion);
      }
    }

    // Transpositions
    for (let i = 0; i < word.length - 1; i++) {
      const suggestion =
        word.slice(0, i) + word[i + 1] + word[i] + word.slice(i + 2);
      if (this.isCorrect(suggestion)) suggestions.add(suggestion);
    }
  }
}
