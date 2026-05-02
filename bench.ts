import { immutate } from "./src";
import { produce } from "immer";
import { create } from "mutative";
import { produce as structura } from "structurajs";
import { craft } from "@sylphx/craft";

const ITERATIONS = 5000;

// ── Styling ───────────────────────────────────────────────────────────

const BOLD = "\x1b[1m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const BLUE = "\x1b[34m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";
const DIM = "\x1b[2m";

// ── Types ─────────────────────────────────────────────────────────────

interface BenchResult {
  lib: string;
  test: string;
  totalTime: number;
  avgTime: number;
}

interface CorrectnessResult {
  lib: string;
  test: string;
  passed: boolean;
  error?: string;
}

// ── Runner ────────────────────────────────────────────────────────────

function runBenchmark(lib: string, test: string, fn: () => void): BenchResult {
  // Warmup
  for (let i = 0; i < 100; i++) fn();

  const start = performance.now();
  for (let i = 0; i < ITERATIONS; i++) fn();
  const totalTime = performance.now() - start;

  return { lib, test, totalTime, avgTime: totalTime / ITERATIONS };
}

// ── Test States ───────────────────────────────────────────────────────

const deepState = {
  a: { b: { c: { d: { e: { f: { g: { h: { i: 0 } } } } } } } },
};

const arrayState = {
  list: Array.from({ length: 1000 }, (_, i) => i),
};

const wideState: any = {};
for (let i = 0; i < 500; i++) wideState["key" + i] = i;

// ── Correctness Checks ───────────────────────────────────────────────

function assertEqual(actual: any, expected: any, msg: string) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${msg}: expected ${e}, got ${a}`);
}

function checkCorrectness(libName: string, fn: any): CorrectnessResult[] {
  const results: CorrectnessResult[] = [];

  // 1. Deep nested update — immutability + value correctness
  try {
    const base = { a: { b: { c: 1 } }, other: { x: 10 } };
    const next = fn(base, (draft: any) => {
      draft.a.b.c = 99;
    });

    assertEqual(next.a.b.c, 99, "updated value");
    assertEqual(base.a.b.c, 1, "original unchanged");
    if (next === base) throw new Error("should return new root");
    if (next.a === base.a) throw new Error("changed branch should be new ref");
    if (next.other !== base.other)
      throw new Error("unchanged branch should share ref");

    results.push({ lib: libName, test: "Deep update", passed: true });
  } catch (e: any) {
    results.push({
      lib: libName,
      test: "Deep update",
      passed: false,
      error: e.message,
    });
  }

  // 2. Array push
  try {
    const base = { list: [1, 2, 3] };
    const next = fn(base, (draft: any) => {
      draft.list.push(4);
    });

    assertEqual(next.list.length, 4, "new length");
    assertEqual(next.list[3], 4, "pushed value");
    assertEqual(base.list.length, 3, "original unchanged");

    results.push({ lib: libName, test: "Array push", passed: true });
  } catch (e: any) {
    results.push({
      lib: libName,
      test: "Array push",
      passed: false,
      error: e.message,
    });
  }

  // 3. Delete property
  try {
    const base = { a: 1, b: 2, c: 3 };
    const next = fn(base, (draft: any) => {
      delete draft.b;
    });

    if ("b" in next) throw new Error("b should be deleted");
    assertEqual(next.a, 1, "a preserved");
    assertEqual(next.c, 3, "c preserved");
    assertEqual(base.b, 2, "original unchanged");

    results.push({ lib: libName, test: "Delete prop", passed: true });
  } catch (e: any) {
    results.push({
      lib: libName,
      test: "Delete prop",
      passed: false,
      error: e.message,
    });
  }

  // 4. No-op returns same reference
  try {
    const base = { x: 1 };
    const next = fn(base, (_draft: any) => {});

    // Some libs may or may not guarantee identity on no-op — check but don't fail
    const shares = next === base;
    results.push({
      lib: libName,
      test: "No-op identity",
      passed: true,
      error: shares ? undefined : "(returns new ref on no-op)",
    });
  } catch (e: any) {
    results.push({
      lib: libName,
      test: "No-op identity",
      passed: false,
      error: e.message,
    });
  }

  // 5. Structural sharing — sibling branches
  try {
    const base = { left: { v: 1 }, right: { v: 2 } };
    const next = fn(base, (draft: any) => {
      draft.left.v = 10;
    });

    assertEqual(next.left.v, 10, "left updated");
    assertEqual(next.right.v, 2, "right value");
    if (next.right !== base.right)
      throw new Error("right should share reference");

    results.push({ lib: libName, test: "Structural sharing", passed: true });
  } catch (e: any) {
    results.push({
      lib: libName,
      test: "Structural sharing",
      passed: false,
      error: e.message,
    });
  }

  // 6. Wide object mutation
  try {
    const base: any = { a: 1, b: 2, c: 3 };
    const next = fn(base, (draft: any) => {
      draft.a = 10;
      draft.b = 20;
    });

    assertEqual(next.a, 10, "a updated");
    assertEqual(next.b, 20, "b updated");
    assertEqual(next.c, 3, "c unchanged");
    assertEqual(base.a, 1, "original a");

    results.push({ lib: libName, test: "Wide mutation", passed: true });
  } catch (e: any) {
    results.push({
      lib: libName,
      test: "Wide mutation",
      passed: false,
      error: e.message,
    });
  }

  return results;
}

// ── Benchmark suites ──────────────────────────────────────────────────

function runAll(libName: string, fn: any): BenchResult[] {
  return [
    runBenchmark(libName, "Deep Object", () => {
      fn(deepState, (draft: any) => {
        draft.a.b.c.d.e.f.g.h.i += 1;
      });
    }),

    runBenchmark(libName, "Array (Push)", () => {
      fn(arrayState, (draft: any) => {
        for (let i = 0; i < 100; i++) draft.list.push(i);
      });
    }),

    runBenchmark(libName, "Wide Object", () => {
      fn(wideState, (draft: any) => {
        for (let i = 0; i < 200; i++) draft["key" + i] = i * 2;
      });
    }),
  ];
}

// ── Main ──────────────────────────────────────────────────────────────

const libs = [
  { name: "immutate", fn: immutate },
  { name: "immer", fn: produce },
  { name: "mutative", fn: create },
  { name: "structura", fn: structura },
  { name: "craft", fn: craft },
];

// ── Phase 1: Correctness ─────────────────────────────────────────────

console.log(`${BOLD}${BLUE}🔍 Correctness Checks${RESET}\n`);

let allCorrect = true;
const allCorrectnessResults: CorrectnessResult[] = [];

for (const lib of libs) {
  const results = checkCorrectness(lib.name, lib.fn);
  allCorrectnessResults.push(...results);
}

// Group by test
const tests = [...new Set(allCorrectnessResults.map((r) => r.test))];

for (const test of tests) {
  const testResults = allCorrectnessResults.filter((r) => r.test === test);
  const allPass = testResults.every((r) => r.passed);
  const icon = allPass ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`;

  console.log(`  ${icon} ${test}`);

  for (const r of testResults) {
    if (!r.passed) {
      console.log(`      ${RED}✗ ${r.lib}: ${r.error}${RESET}`);
      allCorrect = false;
    } else if (r.error) {
      console.log(`      ${DIM}⚠ ${r.lib}: ${r.error}${RESET}`);
    }
  }
}

console.log();
if (!allCorrect) {
  console.log(
    `${RED}${BOLD}⚠ Some correctness checks failed! Benchmark results may not be comparable.${RESET}\n`
  );
}

// ── Phase 2: Benchmarks ──────────────────────────────────────────────

console.log(`${BOLD}${BLUE}🚀 Performance Benchmarks${RESET}`);
console.log(`${DIM}(${ITERATIONS} iterations per test, with warmup)${RESET}\n`);

const allResults: BenchResult[] = [];
for (const lib of libs) {
  process.stdout.write(`${DIM}  Benchmarking ${lib.name}...${RESET}\r`);
  allResults.push(...runAll(lib.name, lib.fn));
}
process.stdout.write(" ".repeat(50) + "\r");

const testTypes = ["Deep Object", "Array (Push)", "Wide Object"];

testTypes.forEach((testType) => {
  console.log(`${BOLD}${YELLOW}📊 ${testType}${RESET}`);

  const testResults = allResults
    .filter((r) => r.test === testType)
    .sort((a, b) => a.avgTime - b.avgTime);

  const maxAvg = Math.max(...testResults.map((r) => r.avgTime));

  console.log(
    `${DIM}┌────────────────┬─────────────┬─────────────┐${RESET}`
  );
  console.log(
    `${DIM}│${RESET} ${BOLD}Library       ${RESET} ${DIM}│${RESET} ${BOLD}Avg Time   ${RESET} ${DIM}│${RESET} ${BOLD}Perf Score ${RESET} ${DIM}│${RESET}`
  );
  console.log(
    `${DIM}├────────────────┼─────────────┼─────────────┤${RESET}`
  );

  testResults.forEach((r, i) => {
    const isWinner = i === 0;
    const libName = isWinner
      ? `${GREEN}${r.lib.padEnd(14)}${RESET}`
      : r.lib.padEnd(14);
    const avgTime = r.avgTime.toFixed(5).padEnd(11);

    const score = (maxAvg / r.avgTime).toFixed(1) + "x";
    const scoreStr = isWinner
      ? `${BOLD}${GREEN}${score.padEnd(11)}${RESET}`
      : score.padEnd(11);

    console.log(
      `${DIM}│${RESET} ${libName} ${DIM}│${RESET} ${avgTime} ${DIM}│${RESET} ${scoreStr} ${DIM}│${RESET}`
    );
  });

  console.log(
    `${DIM}└────────────────┴─────────────┴─────────────┘${RESET}\n`
  );
});
