import { readFileSync } from "fs";
import { AffixRule, AffixRules } from "./affix-rules";
import { Trie } from "./trie";

export class DictionaryLoader {
  static loadDictionary(dicPath: string, trie: Trie): number {
    const content = readFileSync(dicPath, "utf8");
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

  static loadAffixRules(affPath: string, affixRules: AffixRules): void {
    const content = readFileSync(affPath, "utf8");
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
