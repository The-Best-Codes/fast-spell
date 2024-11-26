# fast-spell

A fast and lightweight spell checker library optimized for performance. This library provides efficient spell checking and suggestion capabilities with support for affix rules.

## Features

- ⚡ High-performance spell checking (1M+ operations/sec)
- 🔍 Smart word suggestions
- 📚 Support for affix rules (prefixes and suffixes)
- 💾 Efficient memory usage with Trie-based dictionary
- 🔄 Intelligent caching system
- 📊 Thoroughly benchmarked

## Installation

```bash
npm install fast-spell
# or
bun install fast-spell
```

## Usage

```typescript
import SpellChecker from "fast-spell";

// Initialize with dictionary and affix rules files
const spellChecker = new SpellChecker(
  "path/to/dictionary.dic",
  "path/to/rules.aff"
);

// Check if a word is spelled correctly
const isCorrect = spellChecker.check("hello"); // true
const isIncorrect = spellChecker.check("helllo"); // false

// Get spelling suggestions
const suggestions = spellChecker.suggest("helllo"); // ['hello', 'hell', ...]
```

## Where to find Dictionaries and Affix Rules

The [GitHub repository](https://github.com/The-Best-Codes/fast-spell) contains dictionaries and affix rules for various languages.

- [English Dictionary](https://github.com/The-Best-Codes/fast-spell/blob/main/data/en_US-web.dic)
- [English Affix Rules](https://github.com/The-Best-Codes/fast-spell/blob/main/data/en_US-web.aff)

Download the files above (or your custom dictionaries and affix rules) and put them where you want. Then, you can pass the file paths to the `SpellChecker` constructor.

## Performance

Based on our benchmark tests, fast-spell achieves impressive performance metrics:

- Dictionary load time: ~130ms
- Single word check: ~1µs
- Cached operations: 1M+ ops/sec
- Suggestion generation: ~630K ops/sec
- Memory usage: ~75MB heap for typical dictionary

### Detailed Benchmarks

| Operation            | Time (Average) | Operations/sec |
| -------------------- | -------------- | -------------- |
| Cached Word Check    | 920ns          | 1,086,031      |
| Uncached Word Check  | 1.07µs         | 938,457        |
| Correct Word Check   | 960ns          | 1,041,043      |
| Incorrect Word Check | 832ns          | 1,201,789      |
| Affixed Word Check   | 866ns          | 1,153,526      |
| Spell Suggestions    | 1.10µs         | 909,406        |

## API Reference

### `SpellChecker`

#### Constructor

```typescript
constructor(dicPath?: string, affPath?: string)
```

- `dicPath`: Path to the dictionary file (optional)
- `affPath`: Path to the affix rules file (optional)

#### Methods

##### `check(word: string): boolean`

Checks if a word is spelled correctly.

##### `suggest(word: string): string[]`

Returns an array of spelling suggestions for a given word.

## Development

```bash
# Install dependencies
bun install

# Run tests
bun test

# Build
bun run build

# Lint
bun run lint
```

## License

MIT

## Author

[BestCodes](https://bestcodes.dev)
