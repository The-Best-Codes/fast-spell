import { test, describe } from "bun:test";
import { SpellChecker } from "../dist";

describe("SpellChecker Performance", () => {
  let spellChecker: SpellChecker;

  // Helper function to format time
  const formatTime = (ms: number): string => {
    if (ms < 1) return `${(ms * 1000).toFixed(2)}µs`;
    if (ms < 1000) return `${ms.toFixed(2)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  // Helper function to measure execution time
  const measure = async (
    name: string,
    fn: () => Promise<void> | void,
    units?: number
  ) => {
    const start = performance.now();
    await fn();
    const end = performance.now();
    const time = end - start;

    const formattedTime = formatTime(time);
    if (units) {
      const avgTime = formatTime(time / units);
      console.log(
        `\x1b[36m${name}:\x1b[0m Total: \x1b[33m${formattedTime}\x1b[0m, Avg/unit: \x1b[33m${avgTime}\x1b[0m`
      );
    } else {
      console.log(`\x1b[36m${name}:\x1b[0m \x1b[33m${formattedTime}\x1b[0m`);
    }
  };

  // Helper to generate random strings
  const generateRandomString = (length: number): string => {
    const chars = "abcdefghijklmnopqrstuvwxyz";
    return Array.from(
      { length },
      () => chars[Math.floor(Math.random() * chars.length)]
    ).join("");
  };

  test("dictionary loading performance", async () => {
    console.log("\n\x1b[1m=== Dictionary Loading ===\x1b[0m");
    spellChecker = new SpellChecker();

    await measure("First load (cold start)", async () => {
      await spellChecker.loadDictionary();
    });

    await measure("Dictionary reload", async () => {
      await spellChecker.loadDictionary();
    });
  });

  test("word checking performance", async () => {
    console.log("\n\x1b[1m=== Word Checking ===\x1b[0m");
    const correctWords = [
      "hello",
      "world",
      "computer",
      "programming",
      "language",
    ];
    const incorrectWords = [
      "helo",
      "wrld",
      "compuper",
      "programing",
      "languag",
    ];
    const specialCases = ["123", "0xFF", "100GB", "0b1010", "a5f3e2d1"];

    // Test small set without cache
    await measure(
      "Check 5 correct words (no cache)",
      () => {
        correctWords.forEach((word) => spellChecker.isCorrect(word));
      },
      5
    );

    // Warm up cache and test small set with cache
    correctWords.forEach((word) => spellChecker.isCorrect(word));
    await measure(
      "Check 5 correct words (cache)",
      () => {
        correctWords.forEach((word) => spellChecker.isCorrect(word));
      },
      5
    );

    // Test incorrect words without cache
    await measure(
      "Check 5 incorrect words (no cache)",
      () => {
        incorrectWords.forEach((word) => spellChecker.isCorrect(word));
      },
      5
    );

    // Warm up cache and test incorrect words with cache
    incorrectWords.forEach((word) => spellChecker.isCorrect(word));
    await measure(
      "Check 5 incorrect words (cache)",
      () => {
        incorrectWords.forEach((word) => spellChecker.isCorrect(word));
      },
      5
    );

    // Test large set with cache
    await measure(
      "Check 1000 words (cache)",
      () => {
        for (let i = 0; i < 200; i++) {
          correctWords.forEach((word) => spellChecker.isCorrect(word));
        }
      },
      1000
    );

    // Test unique words
    await measure(
      "Check 1000 unique correct words (uncached)",
      () => {
        for (let i = 0; i < 1000; i++) {
          spellChecker.isCorrect(correctWords[i % correctWords.length] + i);
        }
      },
      1000
    );

    // Test special cases
    console.log("\n\x1b[1m=== Special Cases ===\x1b[0m");
    specialCases.forEach((word) => {
      const isCorrect = spellChecker.isCorrect(word);
      console.log(
        `\x1b[36m${word}:\x1b[0m \x1b[${
          isCorrect ? "32" : "31"
        }m${isCorrect}\x1b[0m`
      );
    });

    await measure(
      "Check 1000 special cases",
      () => {
        for (let i = 0; i < 200; i++) {
          specialCases.forEach((word) => spellChecker.isCorrect(word));
        }
      },
      1000
    );
  });

  test("suggestion generation performance", async () => {
    console.log("\n\x1b[1m=== Suggestion Generation ===\x1b[0m");
    const testWords = ["helo", "wrld", "computr", "progrming", "speling"];

    // Warm up cache
    testWords.forEach((word) => spellChecker.getSuggestions(word));

    await measure(
      "Generate suggestions for 100 words (cached)",
      () => {
        for (let i = 0; i < 20; i++) {
          testWords.forEach((word) => spellChecker.getSuggestions(word));
        }
      },
      100
    );

    await measure(
      "Generate suggestions for 100 unique words (uncached)",
      () => {
        const uniqueWords = Array.from({ length: 100 }, (_, i) =>
          generateRandomString(5 + (i % 5))
        );
        uniqueWords.forEach((word) => spellChecker.getSuggestions(word));
      },
      100
    );
  });

  test("cache performance", async () => {
    console.log("\n\x1b[1m=== Cache Performance ===\x1b[0m");
    const testWord = "helo";

    await measure("First suggestion generation (uncached)", () => {
      spellChecker.getSuggestions(testWord);
    });

    await measure("Second suggestion generation (cached)", () => {
      spellChecker.getSuggestions(testWord);
    });

    await spellChecker.loadDictionary();

    await measure("Third suggestion generation (after cache clear)", () => {
      spellChecker.getSuggestions(testWord);
    });
  });

  test("stress test", async () => {
    console.log("\n\x1b[1m=== Stress Test ===\x1b[0m");
    const words = [
      ...Array.from({ length: 100 }, () => generateRandomString(5)),
      ...Array.from({ length: 100 }, (_, i) => i.toString()),
      ...Array.from({ length: 100 }, (_, i) => `0x${i.toString(16)}`),
    ];

    await measure(
      "Process 1000 mixed words",
      () => {
        for (let i = 0; i < 1000; i++) {
          const word = words[i % words.length];
          if (spellChecker.isCorrect(word)) {
            spellChecker.getSuggestions(word + "x");
          } else {
            spellChecker.getSuggestions(word);
          }
        }
      },
      1000
    );
  });
});
