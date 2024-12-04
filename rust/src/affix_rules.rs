use std::collections::{HashMap, HashSet};

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
    rules: HashMap<String, Vec<AffixRule>>,
    cache: HashMap<String, HashSet<String>>,
    cache_size: usize,
}

impl AffixRules {
    pub fn new() -> Self {
        AffixRules {
            rules: HashMap::new(),
            cache: HashMap::new(),
            cache_size: 10000,
        }
    }

    pub fn add_rule(&mut self, rule: AffixRule) {
        self.rules.entry(rule.flag.clone()).or_default().push(rule);
    }

    pub fn find_base_words(&mut self, word: &str) -> HashSet<String> {
        if let Some(cached) = self.cache.get(word) {
            return cached.clone();
        }

        let mut base_words = HashSet::new();
        
        // Try prefix rules
        for rules in self.rules.values() {
            for rule in rules {
                if rule.rule_type == "PFX" {
                    for entry in &rule.entries {
                        if word.starts_with(&entry.add) {
                            let potential_base = if entry.strip == "0" {
                                word[entry.add.len()..].to_string()
                            } else {
                                if word.len() > entry.add.len() {
                                    word[entry.add.len()..].to_string()
                                } else {
                                    continue;
                                }
                            };
                            base_words.insert(potential_base);
                        }
                    }
                }
                // Try suffix rules
                else if rule.rule_type == "SFX" {
                    for entry in &rule.entries {
                        if word.ends_with(&entry.add) {
                            let potential_base = if entry.strip == "0" {
                                word[..word.len() - entry.add.len()].to_string()
                            } else {
                                if word.len() > entry.add.len() {
                                    word[..word.len() - entry.add.len()].to_string()
                                } else {
                                    continue;
                                }
                            };
                            base_words.insert(potential_base);
                        }
                    }
                }
            }
        }

        // If no base words found, the word might be a base word itself
        if base_words.is_empty() {
            base_words.insert(word.to_string());
        }

        self.cache_variations(word, base_words.clone());
        base_words
    }

    fn cache_variations(&mut self, word: &str, variations: HashSet<String>) {
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
