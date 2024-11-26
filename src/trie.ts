export class TrieNode {
  children: Map<string, TrieNode>;
  isEndOfWord: boolean;
  
  constructor() {
    this.children = new Map();
    this.isEndOfWord = false;
  }
}

export class Trie {
  private root: TrieNode;
  
  constructor() {
    this.root = new TrieNode();
  }
  
  insert(word: string): void {
    let current = this.root;
    for (const char of word.toLowerCase()) {
      let node = current.children.get(char);
      if (!node) {
        node = new TrieNode();
        current.children.set(char, node);
      }
      current = node;
    }
    current.isEndOfWord = true;
  }
  
  search(word: string): boolean {
    const node = this.findNode(word.toLowerCase());
    return node !== null && node.isEndOfWord;
  }
  
  findNode(prefix: string): TrieNode | null {
    let current = this.root;
    for (const char of prefix) {
      const node = current.children.get(char);
      if (!node) return null;
      current = node;
    }
    return current;
  }
  
  findWordsWithPrefix(prefix: string, limit: number = 5): string[] {
    const results: string[] = [];
    const node = this.findNode(prefix);
    
    if (node) {
      this.dfs(node, prefix, results, limit);
    }
    
    return results;
  }
  
  private dfs(node: TrieNode, prefix: string, results: string[], limit: number): void {
    if (results.length >= limit) return;
    
    if (node.isEndOfWord) {
      results.push(prefix);
    }
    
    for (const [char, child] of node.children) {
      this.dfs(child, prefix + char, results, limit);
    }
  }
}
