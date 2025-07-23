import { describe, expect, it } from "bun:test";
import { join } from "path";
import SpellChecker from "../src/index";

describe("Dictionary Loading", () => {
  const dicPath = join(__dirname, "../data/en_US-web.dic");
  const affPath = join(__dirname, "../data/en_US-web.aff");

  describe("Synchronous loading (backward compatibility)", () => {
    it("should load from file paths synchronously", () => {
      const spellChecker = new SpellChecker(dicPath, affPath);
      expect(spellChecker.check("test")).toBe(true);
      expect(spellChecker.check("hello")).toBe(true);
    });

    it("should work without parameters", () => {
      const spellChecker = new SpellChecker();
      // Should not throw, but won't have any words loaded
      expect(spellChecker.check("test")).toBe(false);
    });
  });

  describe("Asynchronous loading", () => {
    it("should create instance with async loading from file paths", async () => {
      const spellChecker = await SpellChecker.create(dicPath, affPath);
      expect(spellChecker.check("test")).toBe(true);
      expect(spellChecker.check("hello")).toBe(true);
    });

    it("should create empty instance without sources", async () => {
      const spellChecker = await SpellChecker.create();
      expect(spellChecker.check("test")).toBe(false);
    });

    it("should load dictionaries after instantiation", async () => {
      const spellChecker = new SpellChecker();
      expect(spellChecker.check("test")).toBe(false);

      await spellChecker.loadDictionaries(dicPath, affPath);
      expect(spellChecker.check("test")).toBe(true);
    });

    it("should reload dictionaries and clear caches", async () => {
      const spellChecker = await SpellChecker.create(dicPath, affPath);

      // Use the spell checker to populate caches
      expect(spellChecker.check("test")).toBe(true);
      const suggestions = spellChecker.suggest("tset");
      expect(suggestions.length).toBeGreaterThan(0);

      // Reload should clear caches and still work
      await spellChecker.loadDictionaries(dicPath, affPath);
      expect(spellChecker.check("test")).toBe(true);
    });
  });

  describe("Content provider functions", () => {
    it("should load from synchronous content provider", async () => {
      const dicContent = await Bun.file(dicPath).text();
      const affContent = await Bun.file(affPath).text();

      const dicProvider = () => dicContent;
      const affProvider = () => affContent;

      const spellChecker = await SpellChecker.create(dicProvider, affProvider);
      expect(spellChecker.check("test")).toBe(true);
      expect(spellChecker.check("hello")).toBe(true);
    });

    it("should load from async content provider", async () => {
      const dicProvider = async () => await Bun.file(dicPath).text();
      const affProvider = async () => await Bun.file(affPath).text();

      const spellChecker = await SpellChecker.create(dicProvider, affProvider);
      expect(spellChecker.check("test")).toBe(true);
      expect(spellChecker.check("hello")).toBe(true);
    });
  });

  describe("URL loading", () => {
    it("should handle URL objects", async () => {
      // Create a mock URL (this would work with real URLs in practice)
      const mockUrl = new URL("https://example.com/dictionary.dic");

      // Mock fetch for testing
      const originalFetch = globalThis.fetch;
      globalThis.fetch = Object.assign(
        async (url: URL | RequestInfo) => {
          if (url.toString() === mockUrl.toString()) {
            const content = await Bun.file(dicPath).text();
            return new Response(content, { status: 200 });
          }
          return new Response("Not found", { status: 404 });
        },
        {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          preconnect: (_input: URL | RequestInfo) => {
            // Mock implementation – do nothing
          },
        },
      );

      try {
        const affContent = await Bun.file(affPath).text();
        const spellChecker = await SpellChecker.create(
          mockUrl,
          () => affContent,
        );
        expect(spellChecker.check("test")).toBe(true);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("should handle URL strings", async () => {
      const mockUrl = "https://example.com/dictionary.dic";

      // Mock fetch for testing
      const originalFetch = globalThis.fetch;
      globalThis.fetch = Object.assign(
        async (url: URL | RequestInfo) => {
          if (url.toString() === mockUrl) {
            const content = await Bun.file(dicPath).text();
            return new Response(content, { status: 200 });
          }
          return new Response("Not found", { status: 404 });
        },
        {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          preconnect: (_input: URL | RequestInfo) => {
            // Mock implementation – do nothing
          },
        },
      );

      try {
        const affContent = await Bun.file(affPath).text();
        const spellChecker = await SpellChecker.create(
          mockUrl,
          () => affContent,
        );
        expect(spellChecker.check("test")).toBe(true);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("should handle fetch errors gracefully", async () => {
      const mockUrl = "https://example.com/nonexistent.dic";

      // Mock fetch to return 404
      const originalFetch = globalThis.fetch;
      globalThis.fetch = Object.assign(
        async () => new Response("Not found", { status: 404 }),
        {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          preconnect: (_input: URL | RequestInfo) => {
            // Mock implementation – do nothing
          },
        },
      );

      try {
        expect(SpellChecker.create(mockUrl, () => "")).rejects.toThrow();
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe("Error handling", () => {
    it("should throw error for invalid source type", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(SpellChecker.create(123 as any, affPath)).rejects.toThrow(
        "Invalid dictionary source",
      );
    });

    it("should throw error for sync loading in browser environment", () => {
      // Mock browser environment
      const originalWindow = globalThis.window;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).window = {};

      try {
        expect(() => new SpellChecker(dicPath, affPath)).toThrow(
          "Synchronous file loading is not supported in browser environments",
        );
      } finally {
        if (originalWindow) {
          globalThis.window = originalWindow;
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          delete (globalThis as any).window;
        }
      }
    });

    it("should throw error for file path loading in browser environment", async () => {
      // Mock browser environment
      const originalWindow = globalThis.window;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).window = {};

      try {
        expect(SpellChecker.create(dicPath, affPath)).rejects.toThrow(
          "File path loading is not supported in browser environments",
        );
      } finally {
        if (originalWindow) {
          globalThis.window = originalWindow;
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          delete (globalThis as any).window;
        }
      }
    });
  });
});
