import { promises as fs } from "fs";
import { type Dictionary } from "./types";
import { parseAff, parseDic } from "./parser";

export class SpellChecker {
  private dictionary: Dictionary;
  private wordCache: Map<string, boolean>;
  private suggestionCache: Map<string, string[]>;
  private readonly MAX_SUGGESTIONS = 10;

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
    this.wordCache = new Map();
    this.suggestionCache = new Map();
  }

  async loadDictionary(affPath: string, dicPath: string): Promise<void> {
    const [affContent, dicContent] = await Promise.all([
      fs.readFile(affPath, "utf-8"),
      fs.readFile(dicPath, "utf-8"),
    ]);

    const affixData = parseAff(affContent);
    this.dictionary = {
      ...affixData,
      words: parseDic(dicContent, affixData.rules),
    };
    // Clear caches when dictionary is reloaded
    this.wordCache.clear();
    this.suggestionCache.clear();
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
    // Check cache first
    const cached = this.wordCache.get(word);
    if (cached !== undefined) return cached;

    // First apply any character conversions
    word = this.applyIConvRules(word);

    let result = false;

    // Check if it's in dictionary as-is
    if (this.dictionary.words.has(word)) result = true;
    // Check lowercase version
    else if (this.dictionary.words.has(word.toLowerCase())) result = true;
    // Check special cases
    else if (this.isSpecialCase(word)) result = true;
    // Check compound rules
    else if (this.checkCompoundRules(word)) result = true;

    // Cache the result
    this.wordCache.set(word, result);
    return result;
  }

  public getSuggestions(word: string): string[] {
    // Check cache first
    const cached = this.suggestionCache.get(word);
    if (cached !== undefined) return cached;

    const suggestions = new Set<string>();
    const lowWord = word.toLowerCase();

    // If the word is correct, no need for suggestions
    if (this.isCorrect(lowWord)) return [];

    // Try common replacements first (REP rules) as they're usually more accurate
    this.addReplacementSuggestions(lowWord, suggestions);

    // If we already have enough suggestions, return them
    if (suggestions.size >= this.MAX_SUGGESTIONS) {
      const result = Array.from(suggestions).slice(0, this.MAX_SUGGESTIONS);
      this.suggestionCache.set(word, result);
      return result;
    }

    // Otherwise try edit distance based suggestions
    this.addEditDistanceSuggestions(lowWord, suggestions);

    // Cache and return results
    const result = Array.from(suggestions).slice(0, this.MAX_SUGGESTIONS);
    this.suggestionCache.set(word, result);
    return result;
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
