import {
  type AffixRule,
  type Dictionary,
  type ReplacementRule,
  type CompoundRule,
  type IConvRule,
} from "./types";

export function parseAff(content: string): Omit<Dictionary, "words"> {
  const rules = new Map<string, AffixRule>();
  const replacements: ReplacementRule[] = [];
  const compoundRules: CompoundRule[] = [];
  const iconvRules: IConvRule[] = [];
  let compoundMin = 1;
  let tryChars = "";
  let wordChars = "";

  let currentRule: AffixRule | null = null;
  let entriesLeft = 0;

  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("#")) continue;

    const parts = line.split(/\s+/);
    const command = parts[0];

    switch (command) {
      case "TRY":
        if (parts.length >= 2) {
          tryChars = parts[1];
        }
        break;
      case "WORDCHARS":
        if (parts.length >= 2) {
          wordChars = parts[1];
        }
        break;
      case "COMPOUNDMIN":
        if (parts.length >= 2) {
          compoundMin = parseInt(parts[1], 10) || 1;
        }
        break;
      case "COMPOUNDRULE":
        if (parts.length >= 2) {
          const pattern = parts[1];
          try {
            compoundRules.push({
              pattern,
              regex: new RegExp("^" + pattern + "$"),
            });
          } catch {
            console.warn(`Invalid compound rule pattern: ${pattern}`);
          }
        }
        break;
      case "REP":
        if (parts.length >= 3) {
          replacements.push({
            from: parts[1],
            to: parts[2],
          });
        }
        break;
      case "ICONV":
        if (parts.length >= 3) {
          iconvRules.push({
            from: parts[1],
            to: parts[2],
          });
        }
        break;
      case "PFX":
      case "SFX":
        if (parts.length === 4) {
          // Rule definition line
          currentRule = {
            type: command,
            flag: parts[1],
            crossProduct: parts[2] === "Y",
            entries: [],
          };
          entriesLeft = parseInt(parts[3], 10);
          rules.set(parts[1], currentRule);
        } else if (currentRule && entriesLeft > 0 && parts.length >= 4) {
          // Rule entry line
          currentRule.entries.push({
            strip: parts[2] === "0" ? "" : parts[2],
            add: parts[3],
            condition: parts[4] || ".",
          });
          entriesLeft--;
        }
        break;
    }
  }

  return {
    rules,
    replacements,
    compoundRules,
    compoundMin,
    tryChars,
    wordChars,
    iconvRules,
  };
}

export function parseDic(
  content: string,
  rules: Map<string, AffixRule>
): Set<string> {
  const words = new Set<string>();
  const lines = content.split("\n");

  // Skip the first line (word count)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("#")) continue;

    const [word, ...flags] = line.split("/");
    if (word) {
      const baseWord = word.toLowerCase();
      words.add(baseWord);

      // Handle flags (affixes) if present
      if (flags.length > 0) {
        const flagStr = flags[0];
        for (const flag of flagStr) {
          const rule = rules.get(flag);
          if (rule) {
            applyRule(baseWord, rule, words);
          }
        }
      }
    }
  }

  return words;
}

function applyRule(word: string, rule: AffixRule, words: Set<string>): void {
  for (const entry of rule.entries) {
    const { strip, add, condition } = entry;

    if (rule.type === "PFX") {
      if (strip && !word.startsWith(strip)) continue;
      if (condition !== "." && !word.match(new RegExp("^" + condition)))
        continue;

      const newWord = add + word.slice(strip.length);
      words.add(newWord);
    } else {
      // SFX
      if (strip && !word.endsWith(strip)) continue;
      if (condition !== "." && !word.match(new RegExp(condition + "$")))
        continue;

      const newWord = word.slice(0, -strip.length) + add;
      words.add(newWord);
    }
  }
}
