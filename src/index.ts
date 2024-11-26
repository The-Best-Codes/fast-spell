import { AffixRules } from './affix-rules';
import { Trie } from './trie';
import { DictionaryLoader } from './dictionary-loader';

export class SpellChecker {
  private trie: Trie;
  private affixRules: AffixRules;
  private suggestionCache: Map<string, string[]>;
  private readonly SUGGESTION_CACHE_SIZE = 1000;
  
  constructor(dicPath?: string, affPath?: string) {
    this.trie = new Trie();
    this.affixRules = new AffixRules();
    this.suggestionCache = new Map();
    
    if (dicPath && affPath) {
      DictionaryLoader.loadDictionary(dicPath, this.trie);
      DictionaryLoader.loadAffixRules(affPath, this.affixRules);
    }
  }
  
  public check(word: string): boolean {
    word = word.toLowerCase();
    
    // Direct dictionary lookup using trie
    if (this.trie.search(word)) {
      return true;
    }
    
    // Check base words by removing affixes
    const baseWords = this.affixRules.findBaseWords(word);
    for (const baseWord of baseWords) {
      if (this.trie.search(baseWord)) {
        return true;
      }
    }
    
    return false;
  }
  
  public suggest(word: string): string[] {
    word = word.toLowerCase();
    
    // Check cache first
    const cached = this.suggestionCache.get(word);
    if (cached) return cached;
    
    const suggestions = new Set<string>();
    const maxDistance = Math.ceil(word.length * 0.7); // More lenient distance
    
    // Try more prefix lengths and transpositions
    for (let i = 1; i <= word.length + 1; i++) {
      const prefix = word.slice(0, i);
      suggestions.add(...this.trie.findWordsWithPrefix(prefix));
      
      // Try transposing adjacent characters in prefix
      if (i > 1) {
        const transposed = prefix.slice(0, -2) + prefix.slice(-1) + prefix.slice(-2, -1);
        suggestions.add(...this.trie.findWordsWithPrefix(transposed));
      }
    }
    
    // Try all possible transpositions
    for (let i = 0; i < word.length - 1; i++) {
      const transposed = word.slice(0, i) + word[i + 1] + word[i] + word.slice(i + 2);
      suggestions.add(...this.trie.findWordsWithPrefix(transposed));
    }
    
    // Add common character substitutions
    const substitutions = this.generateSubstitutions(word);
    for (const sub of substitutions) {
      suggestions.add(...this.trie.findWordsWithPrefix(sub));
      
      // Try adding characters after substitutions
      for (let i = 0; i <= sub.length; i++) {
        for (const letter of 'abcdefghijklmnopqrstuvwxyz') {
          const variation = sub.slice(0, i) + letter + sub.slice(i);
          suggestions.add(...this.trie.findWordsWithPrefix(variation));
        }
      }
    }
    
    // Add variations with missing characters
    for (let i = 0; i <= word.length; i++) {
      // Try inserting each letter of the alphabet at position i
      for (const letter of 'abcdefghijklmnopqrstuvwxyz') {
        const variation = word.slice(0, i) + letter + word.slice(i);
        suggestions.add(...this.trie.findWordsWithPrefix(variation));
        
        // Try adding one more character
        for (let j = 0; j <= variation.length; j++) {
          for (const letter2 of 'abcdefghijklmnopqrstuvwxyz') {
            const variation2 = variation.slice(0, j) + letter2 + variation.slice(j);
            suggestions.add(...this.trie.findWordsWithPrefix(variation2));
          }
        }
      }
    }
    
    // Add variations of the word
    const variations = this.affixRules.generateVariations(word);
    for (const variation of variations) {
      suggestions.add(...this.trie.findWordsWithPrefix(variation));
    }
    
    // Sort by Levenshtein distance with more lenient filtering
    const result = Array.from(suggestions)
      .filter(suggestion => 
        suggestion && 
        typeof suggestion === 'string' && 
        suggestion.length >= word.length - 2 && // Allow shorter words
        suggestion.length <= word.length + 3 && // Allow longer words
        (
          suggestion.slice(0, 2).includes(word[0]) || // First letter appears in first two letters
          (word.length > 1 && suggestion.slice(0, 2).includes(word[1])) || // Second letter appears in first two letters
          (suggestion.length > 1 && word.startsWith(suggestion[1])) // Second letter of suggestion matches first letter of word
        )
      )
      .map(suggestion => ({
        word: suggestion,
        distance: this.levenshteinDistance(word, suggestion)
      }))
      .filter(({ distance }) => distance <= maxDistance)
      .sort((a, b) => {
        // Prioritize words with similar length and same first letter
        const aLengthDiff = Math.abs(a.word.length - word.length);
        const bLengthDiff = Math.abs(b.word.length - word.length);
        const aStartsWithSame = a.word[0] === word[0] ? 0 : 1;
        const bStartsWithSame = b.word[0] === word[0] ? 0 : 1;
        
        if (a.distance === b.distance) {
          if (aStartsWithSame === bStartsWithSame) {
            return aLengthDiff - bLengthDiff;
          }
          return aStartsWithSame - bStartsWithSame;
        }
        return a.distance - b.distance;
      })
      .map(({ word }) => word)
      .slice(0, 10); // Return more suggestions
    
    // Cache the result
    this.cacheResult(word, result);
    
    return result;
  }
  
  private cacheResult(word: string, suggestions: string[]): void {
    if (this.suggestionCache.size >= this.SUGGESTION_CACHE_SIZE) {
      // Remove oldest entries when cache is full
      const entriesToRemove = Math.floor(this.SUGGESTION_CACHE_SIZE * 0.1);
      const keys = Array.from(this.suggestionCache.keys()).slice(0, entriesToRemove);
      for (const key of keys) {
        this.suggestionCache.delete(key);
      }
    }
    this.suggestionCache.set(word, suggestions);
  }
  
  private generateSubstitutions(word: string): string[] {
    const substitutions = new Set<string>();
    const commonSubs = new Map([
      ['a', ['e']], 
      ['e', ['a', 'i']], 
      ['i', ['e', 'y']], 
      ['o', ['a', 'u']], 
      ['u', ['o']],
      ['y', ['i']],
      ['s', ['z']],
      ['z', ['s']],
      ['c', ['k', 's']],
      ['k', ['c']],
      ['f', ['ph']],
      ['ph', ['f']]
    ]);
    
    // Generate substitutions for each character
    for (let i = 0; i < word.length; i++) {
      const char = word[i];
      const possibleSubs = commonSubs.get(char) || [];
      for (const sub of possibleSubs) {
        substitutions.add(word.slice(0, i) + sub + word.slice(i + 1));
      }
    }
    
    return Array.from(substitutions);
  }
  
  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[b.length][a.length];
  }
}

export default SpellChecker;
