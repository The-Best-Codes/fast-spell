mod trie;
mod affix_rules;
mod dictionary_loader;

pub use crate::trie::Trie;
pub use crate::affix_rules::{AffixRules, AffixRule, AffixEntry};
pub use crate::dictionary_loader::DictionaryLoader;

use std::collections::HashMap;

pub struct SpellChecker {
    trie: Trie,
    affix_rules: AffixRules,
    suggestion_cache: HashMap<String, Vec<String>>,
    word_check_cache: HashMap<String, bool>,
    suggestion_cache_size: usize,
    word_check_cache_size: usize,
}

impl SpellChecker {
    pub fn new(dic_path: &str, aff_path: &str) -> Self {
        let mut trie = Trie::new();
        let mut affix_rules = AffixRules::new();
        DictionaryLoader::load_dictionary(dic_path, &mut trie).unwrap();
        DictionaryLoader::load_affix_rules(aff_path, &mut affix_rules).unwrap();

        SpellChecker {
            trie,
            affix_rules,
            suggestion_cache: HashMap::new(),
            word_check_cache: HashMap::new(),
            suggestion_cache_size: 1000,
            word_check_cache_size: 10000,
        }
    }

    pub fn check(&mut self, word: &str) -> bool {
        let word = word.to_lowercase();

        if let Some(&cached) = self.word_check_cache.get(&word) {
            return cached;
        }

        if self.trie.search(&word) {
            self.cache_word_check(&word, true);
            return true;
        }

        let base_words = self.affix_rules.find_base_words(&word);
        for base_word in base_words {
            if self.trie.search(&base_word) {
                self.cache_word_check(&word, true);
                return true;
            }
        }

        self.cache_word_check(&word, false);
        false
    }

    fn cache_word_check(&mut self, word: &str, result: bool) {
        if self.word_check_cache.len() >= self.word_check_cache_size {
            self.word_check_cache.clear();
        }
        self.word_check_cache.insert(word.to_string(), result);
    }
}
