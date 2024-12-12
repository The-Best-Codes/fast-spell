use criterion::{black_box, criterion_group, criterion_main, Criterion};
use fast_spell::{SpellChecker};
use std::time::{Duration, Instant};

const ITERATIONS: usize = 1000;
const WARM_UP_ITERATIONS: usize = 1000;

fn format_duration(duration: Duration) -> String {
    let ns = duration.as_nanos();
    if ns < 1000 {
        format!("{}ns", ns)
    } else if ns < 1_000_000 {
        format!("{:.2}µs", ns as f64 / 1000.0)
    } else if ns < 1_000_000_000 {
        format!("{:.2}ms", ns as f64 / 1_000_000.0)
    } else {
        format!("{:.2}s", ns as f64 / 1_000_000_000.0)
    }
}

fn run_benchmark(name: &str, iterations: usize, mut f: impl FnMut()) -> Duration {
    // Warm-up phase
    for _ in 0..WARM_UP_ITERATIONS {
        f();
    }

    // Actual benchmark
    let start = Instant::now();
    for _ in 0..iterations {
        f();
    }
    let duration = start.elapsed();

    let avg_duration = duration / iterations as u32;
    println!(
        "{}: Total: {}, Avg: {} ({} iterations)",
        name,
        format_duration(duration),
        format_duration(avg_duration),
        iterations
    );

    duration
}

fn spell_checker_benchmark(c: &mut Criterion) {
    let correct_words = vec![
        "test", "hello", "world", "programming", "computer",
        "algorithm", "testing", "development", "software", "engineering",
    ];
    let incorrect_words = vec![
        "testt", "helo", "wrld", "programing", "compuper",
        "algoritm", "testting", "devlopment", "sofware", "enginering",
    ];
    let affixed_words = vec![
        "testing", "programmer", "development", "computational", "engineering",
        "algorithms", "developer", "tested", "programming", "engineered",
    ];

    let mut spell_checker = SpellChecker::new("data/en_US-web.dic", "data/en_US-web.aff");

    // Benchmark correct words
    c.bench_function("check_correct_words", |b| {
        b.iter(|| {
            for word in &correct_words {
                black_box(spell_checker.check(word));
            }
        })
    });

    // Benchmark incorrect words
    c.bench_function("check_incorrect_words", |b| {
        b.iter(|| {
            for word in &incorrect_words {
                black_box(spell_checker.check(word));
            }
        })
    });

    // Benchmark affixed words
    c.bench_function("check_affixed_words", |b| {
        b.iter(|| {
            for word in &affixed_words {
                black_box(spell_checker.check(word));
            }
        })
    });

    // Manual benchmarking for more detailed output
    println!("\nDetailed benchmarks:");

    // Benchmark initialization
    let start = Instant::now();
    let _spell_checker = SpellChecker::new("data/en_US-web.dic", "data/en_US-web.aff");
    let duration = start.elapsed();
    println!("Initialization: {}", format_duration(duration));

    // Benchmark word checking
    let check_correct = || {
        for word in &correct_words {
            black_box(spell_checker.check(word));
        }
    };
    run_benchmark("Correct words", ITERATIONS, check_correct);

    let check_incorrect = || {
        for word in &incorrect_words {
            black_box(spell_checker.check(word));
        }
    };
    run_benchmark("Incorrect words", ITERATIONS, check_incorrect);

    let check_affixed = || {
        for word in &affixed_words {
            black_box(spell_checker.check(word));
        }
    };
    run_benchmark("Affixed words", ITERATIONS, check_affixed);
}

criterion_group!(benches, spell_checker_benchmark);
criterion_main!(benches);
