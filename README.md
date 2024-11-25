# fast-spell

A fast and lightweight spell checker library for Node.js and Bun, with zero dependencies. Comes with built-in English dictionary.

## Installation

```bash
# Using bun
bun add fast-spell

# Using npm
npm install fast-spell
```

## Usage

```typescript
import { SpellChecker } from "fast-spell";

// Initialize with default English dictionary
const spellChecker = new SpellChecker();
await spellChecker.loadDictionary();

// Or use custom dictionary files
// await spellChecker.loadDictionary("./path/to/dictionary.aff", "./path/to/dictionary.dic");

// Check if a word is spelled correctly
const isCorrect = spellChecker.isCorrect("hello"); // true

// Get suggestions for misspelled words
const suggestions = spellChecker.getSuggestions("speling"); // ["spelling", ...]
```

## Development

```bash
# Install dependencies
bun install

# Run tests
bun test

# Build the library
bun run build
```

## License

MIT
