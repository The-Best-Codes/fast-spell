export type AffixRule = {
  type: "PFX" | "SFX";
  flag: string;
  crossProduct: boolean;
  entries: Array<{
    strip: string;
    add: string;
    condition: string;
  }>;
};

export type ReplacementRule = {
  from: string;
  to: string;
};

export interface CompoundRule {
  pattern: string;
  regex: RegExp;
}

export interface IConvRule {
  from: string;
  to: string;
}

export interface Dictionary {
  words: Set<string>;
  rules: Map<string, AffixRule>;
  replacements: ReplacementRule[];
  compoundRules: CompoundRule[];
  compoundMin: number;
  tryChars: string;
  wordChars: string;
  iconvRules: IConvRule[];
}
