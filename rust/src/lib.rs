use rustc_hash::FxHashMap;
use lasso::{Rodeo, Spur};
use smallvec::{SmallVec, smallvec};
use rayon::prelude::*;
use std::num::NonZeroUsize;

mod trie;
mod affix_rules;
mod dictionary_loader;

pub use crate::trie::Trie;
pub use crate::affix_rules::{AffixRules, AffixRule, AffixEntry};
pub use crate::dictionary_loader::DictionaryLoader;

const CACHE_EVICTION_PERCENTAGE: usize = 10;
const TYPICAL_MAX_AFFIXES: usize = 4;

pub struct SpellChecker {
    trie: Trie,
    affix_rules: AffixRules,
    string_interner: Rodeo,
    word_check_cache: FxHashMap<Spur, bool>,
    word_check_cache_size: usize,
}

impl SpellChecker {
    pub fn new(dic_path: &str, aff_path: &str) -> Self {
        let mut trie = Trie::new();
        let mut affix_rules = AffixRules::new();

        // Load dictionary and rules in parallel
        rayon::join(
            || DictionaryLoader::load_dictionary(dic_path, &mut trie),
            || DictionaryLoader::load_affix_rules(aff_path, &mut affix_rules)
        );

        SpellChecker {
            trie,
            affix_rules,
            string_interner: Rodeo::default(),
            word_check_cache: FxHashMap::with_capacity_and_hasher(10_000, Default::default()),
            word_check_cache_size: 10000,
        }
    }

    #[inline]
    pub fn check(&mut self, word: &str) -> bool {
        // Convert to lowercase and intern the string
        let word_lower = word.to_lowercase();
        let word_id = self.string_interner.get_or_intern(&word_lower);

        // Fast path: check cache
        if let Some(&cached) = self.word_check_cache.get(&word_id) {
            return cached;
        }

        // Fast path: direct dictionary lookup
        if self.trie.search(&word_lower) {
            self.cache_word_check(word_id, true);
            return true;
        }

        // Slow path: check affixes
        let mut base_words: SmallVec<[String; TYPICAL_MAX_AFFIXES]> = smallvec![];
        self.affix_rules.find_base_words_into(&word_lower, &mut base_words);

        let result = base_words.par_iter().any(|base_word| self.trie.search(base_word));

        self.cache_word_check(word_id, result);
        result
    }

    #[inline]
    fn cache_word_check(&mut self, word_id: Spur, result: bool) {
        if self.word_check_cache.len() >= self.word_check_cache_size {
            let to_remove = self.word_check_cache_size * CACHE_EVICTION_PERCENTAGE / 100;
            let keys: SmallVec<[Spur; 1000]> = self.word_check_cache
                .keys()
                .take(to_remove)
                .copied()
                .collect();

            for key in keys {
                self.word_check_cache.remove(&key);
            }
        }
        self.word_check_cache.insert(word_id, result);
    }
}
