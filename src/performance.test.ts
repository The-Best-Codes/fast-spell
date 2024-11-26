import { describe, expect, it } from "bun:test";
import SpellChecker from "./index";
import { join } from "path";
import { performance } from "perf_hooks";

describe("SpellChecker Performance", () => {
  const ITERATIONS = 10000;
  const WARM_UP_ITERATIONS = 1000;
  let spellChecker: SpellChecker;
  
  // Test data
  const correctWords = ["test", "hello", "world", "programming", "computer", "algorithm", "testing", "development", "software", "engineering"];
  const incorrectWords = ["testt", "helo", "wrld", "programing", "compuper", "algoritm", "testting", "devlopment", "sofware", "enginering"];
  const affixedWords = ["testing", "programmer", "development", "computational", "engineering", "algorithms", "developer", "tested", "programming", "engineered"];
  
  function formatTime(ns: number): string {
    if (ns < 1000) return `${ns.toFixed(2)}ns`;
    const us = ns / 1000;
    if (us < 1000) return `${us.toFixed(2)}µs`;
    const ms = us / 1000;
    if (ms < 1000) return `${ms.toFixed(2)}ms`;
    const s = ms / 1000;
    return `${s.toFixed(2)}s`;
  }

  function runBenchmark(name: string, fn: () => void, iterations: number = ITERATIONS) {
    // Warm up
    console.log(`\nWarming up ${name}...`);
    for (let i = 0; i < WARM_UP_ITERATIONS; i++) {
      fn();
    }

    const times: number[] = [];
    let totalTime = 0;

    // Actual benchmark
    console.log(`Running ${iterations} iterations...`);
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      fn();
      const end = performance.now();
      const duration = (end - start) * 1000000; // Convert to nanoseconds
      times.push(duration);
      totalTime += duration;
      
      // Progress indicator
      if (i % Math.floor(iterations / 10) === 0) {
        process.stdout.write('.');
      }
    }
    console.log('\n');

    times.sort((a, b) => a - b);
    const avg = totalTime / iterations;
    const median = iterations % 2 === 0 
      ? (times[iterations/2 - 1] + times[iterations/2]) / 2 
      : times[Math.floor(iterations/2)];
    const p95 = times[Math.floor(iterations * 0.95)];
    const p99 = times[Math.floor(iterations * 0.99)];
    const min = times[0];
    const max = times[times.length - 1];

    console.log(`\nBenchmark Results: ${name}`);
    console.log(`Total time: ${formatTime(totalTime)}`);
    console.log(`Iterations: ${iterations}`);
    console.log(`Min: ${formatTime(min)}`);
    console.log(`Max: ${formatTime(max)}`);
    console.log(`Average: ${formatTime(avg)}`);
    console.log(`Median: ${formatTime(median)}`);
    console.log(`P95: ${formatTime(p95)}`);
    console.log(`P99: ${formatTime(p99)}`);
    console.log(`Operations/sec: ${Math.floor(1000000000 / avg)}`);
    
    return {
      totalTime,
      iterations,
      min,
      max,
      avg,
      median,
      p95,
      p99,
      opsPerSec: Math.floor(1000000000 / avg)
    };
  }

  it("should measure initialization performance", () => {
    console.log('\nMeasuring initialization performance...');
    const start = performance.now();
    spellChecker = new SpellChecker(
      join(__dirname, "../data/en_US-web.dic"),
      join(__dirname, "../data/en_US-web.aff")
    );
    const end = performance.now();
    const loadTime = (end - start) * 1000000;
    console.log(`Dictionary and Rules Load Time: ${formatTime(loadTime)}`);
  });

  it("should measure single word check performance", () => {
    console.log('\nMeasuring single word check performance...');
    const word = "test";
    
    // Warm up
    for (let i = 0; i < 100; i++) {
      spellChecker.check(word);
    }
    
    // Measure single check
    const start = performance.now();
    spellChecker.check(word);
    const end = performance.now();
    const duration = (end - start) * 1000000; // Convert to nanoseconds
    
    console.log(`Single word check time: ${formatTime(duration)}`);
    expect(duration).toBeLessThan(100000); // Should be less than 100µs
  });

  it("should benchmark cached vs uncached operations", () => {
    // First run - uncached
    console.log('\nBenchmarking uncached operations...');
    const uncachedResults = runBenchmark("Uncached Word Check", () => {
      for (const word of correctWords) {
        spellChecker.check(word);
      }
    });

    // Second run - cached
    console.log('\nBenchmarking cached operations...');
    const cachedResults = runBenchmark("Cached Word Check", () => {
      for (const word of correctWords) {
        spellChecker.check(word);
      }
    });

    // Compare results
    console.log('\nCache Performance Improvement:');
    const improvement = (uncachedResults.avg - cachedResults.avg) / uncachedResults.avg * 100;
    console.log(`Average time improvement: ${improvement.toFixed(2)}%`);
    console.log(`Operations/sec improvement: ${cachedResults.opsPerSec - uncachedResults.opsPerSec}`);
  });

  it("should benchmark correct word checking", () => {
    runBenchmark("Correct Word Check", () => {
      for (const word of correctWords) {
        spellChecker.check(word);
      }
    });
  });

  it("should benchmark incorrect word checking", () => {
    runBenchmark("Incorrect Word Check", () => {
      for (const word of incorrectWords) {
        spellChecker.check(word);
      }
    });
  });

  it("should benchmark affixed word checking", () => {
    runBenchmark("Affixed Word Check", () => {
      for (const word of affixedWords) {
        spellChecker.check(word);
      }
    });
  });

  it("should benchmark spell suggestions", () => {
    runBenchmark("Spell Suggestions", () => {
      for (const word of incorrectWords) {
        spellChecker.suggest(word);
      }
    }, 1000); // Fewer iterations for suggestions as they're more expensive
  });

  it("should benchmark mixed operations", () => {
    const operations = [
      ...correctWords.map(word => ({ type: 'check' as const, word })),
      ...incorrectWords.map(word => ({ type: 'check' as const, word })),
      ...affixedWords.map(word => ({ type: 'check' as const, word })),
      ...incorrectWords.slice(0, 3).map(word => ({ type: 'suggest' as const, word }))
    ];

    runBenchmark("Mixed Operations", () => {
      for (const op of operations) {
        if (op.type === 'check') {
          spellChecker.check(op.word);
        } else {
          spellChecker.suggest(op.word);
        }
      }
    }, 1000);
  });

  it("should benchmark stress test", () => {
    // Generate a larger dataset for stress testing
    const words = [
      ...Array(100).fill(0).map(() => correctWords[Math.floor(Math.random() * correctWords.length)]),
      ...Array(100).fill(0).map(() => incorrectWords[Math.floor(Math.random() * incorrectWords.length)]),
      ...Array(100).fill(0).map(() => affixedWords[Math.floor(Math.random() * affixedWords.length)])
    ];

    runBenchmark("Stress Test - 300 Words", () => {
      for (const word of words) {
        spellChecker.check(word);
      }
    }, 100);

    // Memory usage
    const used = process.memoryUsage();
    console.log('\nMemory Usage:');
    for (const [key, value] of Object.entries(used)) {
      console.log(`${key}: ${Math.round(value / 1024 / 1024 * 100) / 100} MB`);
    }
  });
});
