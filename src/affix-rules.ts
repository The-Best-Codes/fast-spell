export interface AffixEntry {
  strip: string;
  add: string;
  condition: string;
}

export interface AffixRule {
  type: "PFX" | "SFX";
  flag: string;
  crossProduct: boolean;
  entries: AffixEntry[];
}

export class AffixRules {
  private rules: Map<string, AffixRule[]>;
  private cache: Map<string, Set<string>>;
  private readonly CACHE_SIZE = 10000;

  constructor() {
    this.rules = new Map();
    this.cache = new Map();
  }

  addRule(rule: AffixRule): void {
    const existing = this.rules.get(rule.flag) || [];
    existing.push(rule);
    this.rules.set(rule.flag, existing);
  }

  private getCachedVariations(word: string): Set<string> | undefined {
    return this.cache.get(word);
  }

  private cacheVariations(word: string, variations: Set<string>): void {
    if (this.cache.size >= this.CACHE_SIZE) {
      // Remove oldest entries when cache is full
      const entriesToRemove = Math.floor(this.CACHE_SIZE * 0.1);
      const keys = Array.from(this.cache.keys()).slice(0, entriesToRemove);
      for (const key of keys) {
        this.cache.delete(key);
      }
    }
    this.cache.set(word, variations);
  }

  findBaseWords(word: string): Set<string> {
    // Check cache first
    const cached = this.getCachedVariations(word);
    if (cached) return cached;

    const baseWords = new Set<string>();

    // Try removing prefixes
    for (const [, rules] of this.rules) {
      for (const rule of rules) {
        if (rule.type === "PFX") {
          for (const entry of rule.entries) {
            if (
              word.startsWith(entry.add) &&
              this.matchesCondition(word, entry.condition)
            ) {
              const base = entry.strip + word.slice(entry.add.length);
              baseWords.add(base);
            }
          }
        }
      }
    }

    // Try removing suffixes
    for (const [, rules] of this.rules) {
      for (const rule of rules) {
        if (rule.type === "SFX") {
          for (const entry of rule.entries) {
            if (
              word.endsWith(entry.add) &&
              this.matchesCondition(word, entry.condition)
            ) {
              const base = word.slice(0, -entry.add.length) + entry.strip;
              baseWords.add(base);
            }
          }
        }
      }
    }

    // Cache results
    this.cacheVariations(word, baseWords);

    return baseWords;
  }

  private matchesCondition(word: string, condition: string): boolean {
    if (!condition) return true;
    try {
      return new RegExp(condition).test(word);
    } catch {
      return false;
    }
  }

  generateVariations(word: string): Set<string> {
    const variations = new Set<string>();
    variations.add(word);

    // Apply prefixes
    for (const [, rules] of this.rules) {
      for (const rule of rules) {
        if (rule.type === "PFX") {
          for (const entry of rule.entries) {
            if (this.matchesCondition(word, entry.condition)) {
              if (entry.strip) {
                if (word.startsWith(entry.strip)) {
                  variations.add(entry.add + word.slice(entry.strip.length));
                }
              } else {
                variations.add(entry.add + word);
              }
            }
          }
        }
      }
    }

    // Apply suffixes
    for (const [, rules] of this.rules) {
      for (const rule of rules) {
        if (rule.type === "SFX") {
          for (const entry of rule.entries) {
            if (this.matchesCondition(word, entry.condition)) {
              if (entry.strip) {
                if (word.endsWith(entry.strip)) {
                  variations.add(
                    word.slice(0, -entry.strip.length) + entry.add
                  );
                }
              } else {
                variations.add(word + entry.add);
              }
            }
          }
        }
      }
    }

    return variations;
  }
}
