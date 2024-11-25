import { SpellChecker } from "./src/spellchecker";

// Example usage
async function main() {
  const spellChecker = new SpellChecker();
  await spellChecker.loadDictionary(
    "./data/en_US-web.aff",
    "./data/en_US-web.dic"
  );

  // Test the spell checker
  const testWords = ["hello", "shun", "speling", "computer", "wrld"];
  for (const word of testWords) {
    console.log(`\nChecking word: ${word}`);
    console.log(`Is correct: ${spellChecker.isCorrect(word)}`);
    const suggestions = spellChecker.getSuggestions(word);
    if (suggestions.length > 0) {
      console.log(`Suggestions: ${suggestions.join(", ")}`);
    }
  }
}

main().catch(console.error);
