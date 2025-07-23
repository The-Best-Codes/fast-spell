use std::collections::HashMap;

pub struct TrieNode {
    children: HashMap<char, TrieNode>,
    is_end_of_word: bool,
}

impl TrieNode {
    pub fn new() -> Self {
        TrieNode {
            children: HashMap::new(),
            is_end_of_word: false,
        }
    }
}

pub struct Trie {
    root: TrieNode,
}

impl Default for Trie {
    fn default() -> Self {
        Self::new()
    }
}

impl Trie {
    pub fn new() -> Self {
        Trie {
            root: TrieNode::new(),
        }
    }

    pub fn insert(&mut self, word: &str) {
        let mut current = &mut self.root;
        for char in word.chars() {
            current = current.children.entry(char).or_insert_with(TrieNode::new);
        }
        current.is_end_of_word = true;
    }

    pub fn search(&self, word: &str) -> bool {
        let mut current = &self.root;
        for char in word.chars() {
            match current.children.get(&char) {
                Some(node) => current = node,
                None => return false,
            }
        }
        current.is_end_of_word
    }
}
