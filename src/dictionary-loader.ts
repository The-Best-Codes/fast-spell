import { AffixRule, AffixRules } from "./affix-rules";
import { Trie } from "./trie";

export type DictionarySource =
  | string
  | URL
  | (() => Promise<string>)
  | (() => string);

export class DictionaryLoader {
  /**
   * Load dictionary from various sources: file path, URL, or content provider function
   */
  static async loadDictionary(
    source: DictionarySource,
    trie: Trie,
  ): Promise<number> {
    const content = await this.getContent(source);
    return this.parseDictionaryContent(content, trie);
  }

  /**
   * Load affix rules from various sources: file path, URL, or content provider function
   */
  static async loadAffixRules(
    source: DictionarySource,
    affixRules: AffixRules,
  ): Promise<void> {
    const content = await this.getContent(source);
    this.parseAffixContent(content, affixRules);
  }

  /**
   * Synchronous version for backward compatibility with file paths
   */
  static loadDictionarySync(filePath: string, trie: Trie): number {
    if (typeof window !== "undefined") {
      throw new Error(
        "Synchronous file loading is not supported in browser environments. Use loadDictionary() instead.",
      );
    }

    // Use indirect require to avoid ESLint no-require-imports error
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nodeRequire = (global as any).require || require;
    const { readFileSync } = nodeRequire("fs");
    const content = readFileSync(filePath, "utf8");
    return this.parseDictionaryContent(content, trie);
  }

  /**
   * Synchronous version for backward compatibility with file paths
   */
  static loadAffixRulesSync(filePath: string, affixRules: AffixRules): void {
    if (typeof window !== "undefined") {
      throw new Error(
        "Synchronous file loading is not supported in browser environments. Use loadAffixRules() instead.",
      );
    }

    // Use indirect require to avoid ESLint no-require-imports error
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nodeRequire = (global as any).require || require;
    const { readFileSync } = nodeRequire("fs");
    const content = readFileSync(filePath, "utf8");
    this.parseAffixContent(content, affixRules);
  }

  private static async getContent(source: DictionarySource): Promise<string> {
    if (typeof source === "string") {
      // Check if it's a URL
      if (source.startsWith("http://") || source.startsWith("https://")) {
        const response = await fetch(source);
        if (!response.ok) {
          throw new Error(
            `Failed to fetch dictionary from ${source}: ${response.statusText}`,
          );
        }
        return response.text();
      }

      // Treat as file path - use dynamic import to avoid bundling fs in browser builds
      if (typeof window === "undefined") {
        const { readFileSync } = await import("fs");
        return readFileSync(source, "utf8");
      } else {
        throw new Error(
          "File path loading is not supported in browser environments. Use URL or content provider function instead.",
        );
      }
    }

    if (source instanceof URL) {
      const response = await fetch(source.toString());
      if (!response.ok) {
        throw new Error(
          `Failed to fetch dictionary from ${source}: ${response.statusText}`,
        );
      }
      return response.text();
    }

    if (typeof source === "function") {
      const result = source();
      return result instanceof Promise ? await result : result;
    }

    throw new Error(
      "Invalid dictionary source. Must be a file path, URL, or content provider function.",
    );
  }

  private static parseDictionaryContent(content: string, trie: Trie): number {
    const lines = content.split("\n");
    const wordCount = parseInt(lines[0], 10);

    for (let i = 1; i <= wordCount; i++) {
      if (lines[i]) {
        const [word] = lines[i].split("/");
        trie.insert(word.toLowerCase());
      }
    }

    return wordCount;
  }

  private static parseAffixContent(
    content: string,
    affixRules: AffixRules,
  ): void {
    const lines = content.split("\n");

    let currentRule: AffixRule | null = null;
    let expectedEntries = 0;

    for (const line of lines) {
      if (!line.trim() || line.startsWith("#")) continue;

      const parts = line.split(/\s+/);
      if (parts.length < 4) continue;

      if ((parts[0] === "PFX" || parts[0] === "SFX") && parts.length === 4) {
        const [type, flag, crossProduct, count] = parts;
        expectedEntries = parseInt(count, 10);
        currentRule = {
          type: type as "PFX" | "SFX",
          flag,
          crossProduct: crossProduct === "Y",
          entries: [],
        };
      } else if (
        currentRule &&
        parts[0] === currentRule.type &&
        parts[1] === currentRule.flag
      ) {
        const [, , strip, add, condition] = parts;
        currentRule.entries.push({
          strip: strip === "0" ? "" : strip,
          add,
          condition: condition === "." ? "" : condition,
        });

        if (currentRule.entries.length === expectedEntries) {
          affixRules.addRule(currentRule);
          currentRule = null;
          expectedEntries = 0;
        }
      }
    }
  }
}
