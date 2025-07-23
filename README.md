# fast-spell

A fast and lightweight spell checker library optimized for performance. This library provides efficient spell checking and suggestion capabilities with support for affix rules.

## Features

- ⚡ High-performance spell checking (1M+ operations/sec)
- 🔍 Smart word suggestions
- 📚 Support for affix rules (prefixes and suffixes)
- 💾 Efficient memory usage with Trie-based dictionary
- 🔄 Intelligent caching system
- 🌐 **Multiple loading methods: files, URLs (beta), and imports (beta)**
- 📦 **Vite and modern bundler compatible**
- 🖥️ **Works in both Node.js and browser environments**
- 📊 Thoroughly benchmarked

## Installation

```bash
npm install fast-spell
# or
bun install fast-spell
```

## Usage

### Basic Usage (File Paths - Node.js only)

```typescript
import SpellChecker from "fast-spell";

// Initialize with dictionary and affix rules files
const spellChecker = new SpellChecker(
  "path/to/dictionary.dic",
  "path/to/rules.aff",
);

// Check if a word is spelled correctly
const isCorrect = spellChecker.check("hello"); // true
const isIncorrect = spellChecker.check("helllo"); // false

// Get spelling suggestions
const suggestions = spellChecker.suggest("helllo"); // ['hello', 'hell', ...]
```

### Modern Usage (URLs and Imports - Works everywhere)

> [!NOTE]
> URL and import loading is a beta feature. Please open an issue if you encounter any problems.

```typescript
import SpellChecker from "fast-spell";

// Load from URLs (great for CDNs)
const spellChecker = await SpellChecker.create(
  "https://cdn.example.com/dictionaries/en_US-web.dic",
  "https://cdn.example.com/dictionaries/en_US-web.aff",
);

// Load from imported content (perfect for Vite/Webpack)
import dictionaryContent from "./dictionaries/en_US-web.dic?raw";
import affixContent from "./dictionaries/en_US-web.aff?raw";

const spellChecker = await SpellChecker.create(
  () => dictionaryContent,
  () => affixContent,
);

// Load dynamically
const spellChecker = await SpellChecker.create(
  async () => await fetch("/api/dictionary").then((r) => r.text()),
  async () => await fetch("/api/affix-rules").then((r) => r.text()),
);
```

### Loading After Instantiation

```typescript
import SpellChecker from "fast-spell";

const spellChecker = new SpellChecker(); // Empty initially

// Load dictionaries later
await spellChecker.loadDictionaries(
  "https://example.com/dictionary.dic",
  () => myAffixRulesContent,
);
```

## Dictionary Sources

fast-spell supports multiple ways to load dictionaries and affix rules:

| Source Type        | Example                                  | Use Case                              |
| ------------------ | ---------------------------------------- | ------------------------------------- |
| **File Path**      | `"./dict.dic"`                           | Node.js applications                  |
| **URL String**     | `"https://cdn.com/dict.dic"`             | Loading from CDNs or APIs             |
| **URL Object**     | `new URL("./dict.dic", import.meta.url)` | Relative URLs in modules              |
| **Sync Function**  | `() => fileContent`                      | Bundled content (Vite `?raw` imports) |
| **Async Function** | `async () => await fetch(...)`           | Dynamic loading                       |

## Where to find Dictionaries and Affix Rules

The [GitHub repository](https://github.com/The-Best-Codes/fast-spell) contains dictionaries and affix rules for various languages.

- [English Dictionary](https://github.com/The-Best-Codes/fast-spell/blob/main/data/en_US-web.dic)
- [English Affix Rules](https://github.com/The-Best-Codes/fast-spell/blob/main/data/en_US-web.aff)

You can use these files in several ways:

### For Node.js Projects

Download the files and reference them by path:

```typescript
const spellChecker = new SpellChecker(
  "./data/en_US-web.dic",
  "./data/en_US-web.aff",
);
```

### For Vite/Modern Bundlers (Beta)

Import the content directly:

```typescript
import dictContent from "./data/en_US-web.dic?raw";
import affixContent from "./data/en_US-web.aff?raw";

const spellChecker = await SpellChecker.create(
  () => dictContent,
  () => affixContent,
);
```

### For CDN/URL Loading

Reference them directly from GitHub or your own CDN:

```typescript
const spellChecker = await SpellChecker.create(
  "https://raw.githubusercontent.com/The-Best-Codes/fast-spell/main/data/en_US-web.dic",
  "https://raw.githubusercontent.com/The-Best-Codes/fast-spell/main/data/en_US-web.aff",
);
```

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

- `dicPath`: Path to the dictionary file (optional, Node.js only)
- `affPath`: Path to the affix rules file (optional, Node.js only)

Creates a SpellChecker instance with synchronous file loading. Only works in Node.js environments.

#### Static Methods

##### `SpellChecker.create(dicSource?, affSource?): Promise<SpellChecker>`

```typescript
static async create(dicSource?: DictionarySource, affSource?: DictionarySource): Promise<SpellChecker>
```

Creates a SpellChecker instance with asynchronous loading support. Works in all environments.

- `dicSource`: Dictionary source (file path, URL, or content function)
- `affSource`: Affix rules source (file path, URL, or content function)

#### Instance Methods

##### `check(word: string): boolean`

Checks if a word is spelled correctly.

##### `suggest(word: string): string[]`

Returns an array of spelling suggestions for a given word.

##### `loadDictionaries(dicSource, affSource): Promise<void>`

```typescript
async loadDictionaries(dicSource: DictionarySource, affSource: DictionarySource): Promise<void>
```

Loads or reloads dictionary and affix rules. Clears existing data and caches.

### `DictionarySource` Type

```typescript
type DictionarySource = string | URL | (() => Promise<string>) | (() => string);
```

Represents the different ways to provide dictionary content:

- `string`: File path (Node.js) or URL (all environments)
- `URL`: URL object for fetching content
- `() => string`: Synchronous function returning content
- `() => Promise<string>`: Asynchronous function returning content

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
