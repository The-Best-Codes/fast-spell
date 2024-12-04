use rustc_hash::{FxHashMap, FxHashSet};
use smallvec::{SmallVec, smallvec};

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
    cache: FxHashMap<String, FxHashSet<String>>,
    cache_size: usize,
}

impl AffixRules {
    pub fn new() -> Self {
        AffixRules {
            rules: FxHashMap::default(),
            cache: FxHashMap::default(),
            cache_size: 10000,
        }
    }

    pub fn add_rule(&mut self, rule: AffixRule) {
        self.rules.entry(rule.flag.clone())
            .or_insert_with(|| smallvec![])
            .push(rule);
    }

    #[inline]
    pub fn find_base_words_into(&self, word: &str, base_words: &mut SmallVec<[String; 4]>) {
        // Try prefix rules
        for rules in self.rules.values() {
            for rule in rules {
                match rule.rule_type.as_str() {
                    "PFX" => {
                        for entry in &rule.entries {
                            if word.starts_with(&entry.add) {
                                if entry.strip == "0" {
                                    if let Some(base) = word.get(entry.add.len()..) {
                                        base_words.push(base.to_string());
                                    }
                                } else if word.len() > entry.add.len() {
                                    if let Some(base) = word.get(entry.add.len()..) {
                                        base_words.push(base.to_string());
                                    }
                                }
                            }
                        }
                    }
                    "SFX" => {
                        for entry in &rule.entries {
                            if word.ends_with(&entry.add) {
                                if entry.strip == "0" {
                                    if let Some(base) = word.get(..word.len() - entry.add.len()) {
                                        base_words.push(base.to_string());
                                    }
                                } else if word.len() > entry.add.len() {
                                    if let Some(base) = word.get(..word.len() - entry.add.len()) {
                                        base_words.push(base.to_string());
                                    }
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

    fn cache_variations(&mut self, word: &str, variations: FxHashSet<String>) {
        if self.cache.len() >= self.cache_size {
            // Remove oldest entries when cache is full
            let keys: Vec<_> = self.cache.keys().cloned().collect();
            for key in keys.iter().take(self.cache_size / 10) {
                self.cache.remove(key);
            }
        }
        self.cache.insert(word.to_string(), variations);
    }
}
