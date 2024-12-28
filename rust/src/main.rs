mod affix_rules;
mod dictionary_loader;
mod trie;

use crate::affix_rules::AffixRules;
use crate::dictionary_loader::DictionaryLoader;
use crate::trie::Trie;
use std::collections::HashMap;

pub struct SpellChecker {
    trie: Trie,
    affix_rules: AffixRules,
    #[allow(dead_code)]
    suggestion_cache: HashMap<String, Vec<String>>,
    word_check_cache: HashMap<String, bool>,
    #[allow(dead_code)]
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
            let keys: Vec<_> = self.word_check_cache.keys().cloned().collect();
            for key in keys.iter().take(self.word_check_cache_size / 10) {
                self.word_check_cache.remove(key);
            }
        }
        self.word_check_cache.insert(word.to_string(), result);
    }
}

fn main() {
    let dic_path = "data/en_US-web.dic";
    let aff_path = "data/en_US-web.aff";
    let mut spell_checker = SpellChecker::new(dic_path, aff_path);

    let test_words = vec!["example", "running", "jumping", "xyz123"];
    for word in test_words {
        if spell_checker.check(word) {
            println!("'{}' is a valid word.", word);
        } else {
            println!("'{}' is not a valid word.", word);
        }
    }
}
