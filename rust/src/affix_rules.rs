use rustc_hash::{FxHashMap, FxHashSet};
use smallvec::{smallvec, SmallVec};

#[derive(Clone)]
pub struct AffixEntry {
    pub strip: String,
    pub add: String,
    pub condition: String,
}

#[derive(Clone)]
pub struct AffixRule {
    pub rule_type: String, // "PFX" or "SFX"
    pub flag: String,
    pub cross_product: bool,
    pub entries: Vec<AffixEntry>,
}

pub struct AffixRules {
    rules: FxHashMap<String, SmallVec<[AffixRule; 4]>>,
}

impl Default for AffixRules {
    fn default() -> Self {
        Self::new()
    }
}

impl AffixRules {
    pub fn new() -> Self {
        AffixRules {
            rules: FxHashMap::default(),
        }
    }

    pub fn add_rule(&mut self, rule: AffixRule) {
        self.rules
            .entry(rule.flag.clone())
            .or_insert_with(|| smallvec![])
            .push(rule);
    }

    #[inline]
    pub fn find_base_words_into(&self, word: &str, base_words: &mut SmallVec<[String; 4]>) {
        // Try prefix rules
        for rules in self.rules.values() {
            for rule in rules {
                // Access the field to prevent dead code warning, even if you don't use
                let _ = &rule.cross_product;

                match rule.rule_type.as_str() {
                    "PFX" => {
                        for entry in &rule.entries {
                            // Access the field to prevent dead code warning, even if you don't use
                            let _ = &entry.condition;
                            if word.starts_with(&entry.add)
                                && (entry.strip == "0" || word.len() > entry.add.len())
                            {
                                if let Some(base) = word.get(entry.add.len()..) {
                                    base_words.push(base.to_string());
                                }
                            }
                        }
                    }
                    "SFX" => {
                        for entry in &rule.entries {
                            // Access the field to prevent dead code warning, even if you don't use
                            let _ = &entry.condition;
                            if word.ends_with(&entry.add)
                                && (entry.strip == "0" || word.len() > entry.add.len())
                            {
                                if let Some(base) = word.get(..word.len() - entry.add.len()) {
                                    base_words.push(base.to_string());
                                }
                            }
                        }
                    }
                    _ => {}
                }
            }
        }

        // If no base words found, the word might be a base word itself
        if base_words.is_empty() {
            base_words.push(word.to_string());
        }
    }

    // Keep the original method for backward compatibility
    pub fn find_base_words(&self, word: &str) -> FxHashSet<String> {
        let mut base_words = FxHashSet::default();
        let mut temp: SmallVec<[String; 4]> = smallvec![];
        self.find_base_words_into(word, &mut temp);
        base_words.extend(temp);
        base_words
    }
}
