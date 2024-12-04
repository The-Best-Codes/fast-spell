use std::fs;
use std::io::{self, BufRead};
use std::path::Path;

use crate::affix_rules::{AffixEntry, AffixRule, AffixRules};
use crate::trie::Trie;

pub struct DictionaryLoader;

impl DictionaryLoader {
    pub fn load_dictionary<P: AsRef<Path>>(dic_path: P, trie: &mut Trie) -> io::Result<usize> {
        let file = fs::File::open(dic_path)?;
        let reader = io::BufReader::new(file);
        let mut lines = reader.lines();

        let word_count: usize = lines
            .next()
            .ok_or(io::Error::new(io::ErrorKind::InvalidData, "Missing word count"))??
            .parse()
            .map_err(|_| io::Error::new(io::ErrorKind::InvalidData, "Invalid word count"))?;

        for line in lines.take(word_count) {
            if let Ok(word_line) = line {
                let word = word_line.split('/').next().unwrap_or("");
                trie.insert(word);
            }
        }

        Ok(word_count)
    }

    pub fn load_affix_rules<P: AsRef<Path>>(aff_path: P, affix_rules: &mut AffixRules) -> io::Result<()> {
        let file = fs::File::open(aff_path)?;
        let reader = io::BufReader::new(file);

        let mut current_rule: Option<AffixRule> = None;
        let mut expected_entries = 0;

        for line in reader.lines() {
            let line = line?;
            if line.trim().is_empty() || line.starts_with('#') {
                continue;
            }

            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() < 4 {
                continue;
            }

            if (parts[0] == "PFX" || parts[0] == "SFX") && parts.len() == 4 {
                let (rule_type, flag, cross_product, count) = (parts[0], parts[1], parts[2], parts[3]);
                expected_entries = count.parse().unwrap_or(0);
                current_rule = Some(AffixRule {
                    rule_type: rule_type.to_string(),
                    flag: flag.to_string(),
                    cross_product: cross_product == "Y",
                    entries: Vec::new(),
                });
            } else if let Some(ref mut rule) = current_rule {
                if parts[0] == rule.rule_type && parts[1] == rule.flag {
                    let strip = if parts[2] == "0" { "" } else { parts[2] };
                    let add = parts[3];
                    let condition = parts.get(4).unwrap_or(&"").to_string();
                    rule.entries.push(AffixEntry {
                        strip: strip.to_string(),
                        add: add.to_string(),
                        condition,
                    });
                    expected_entries -= 1;

                    if expected_entries == 0 {
                        affix_rules.add_rule(rule.clone());
                        current_rule = None;
                    }
                }
            }
        }

        Ok(())
    }
}
