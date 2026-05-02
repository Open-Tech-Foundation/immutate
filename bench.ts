import { immutate } from "./src";
import { produce } from "immer";
import { create } from "mutative";
import { produce as structura } from "structurajs";
import { craft } from "@sylphx/craft";

const ITERATIONS = 5000; // lower because heavier tests

// --- Styling Utils ---
const BOLD = "\x1b[1m";
const GREEN = "\x1b[32m";
const BLUE = "\x1b[34m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";
const DIM = "\x1b[2m";

interface BenchResult {
  lib: string;
  test: string;
  totalTime: number;
  avgTime: number;
}

function runBenchmark(
  lib: string,
  test: string,
  fn: () => void
): BenchResult {
  const start = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    fn();
  }
  const end = performance.now();
  const totalTime = end - start;
  const avgTime = totalTime / ITERATIONS;

  return { lib, test, totalTime, avgTime };
}

// 🔹 1. Deep nested object
const deepState = {
  a: { b: { c: { d: { e: { f: { g: { h: { i: 0 } } } } } } } },
};

// 🔹 2. Large array
const arrayState = {
  list: Array.from({ length: 1000 }, (_, i) => i),
};

// 🔹 3. Wide object (many keys)
const wideState: any = {};
for (let i = 0; i < 500; i++) {
  wideState["key" + i] = i;
}

console.log(`${BOLD}${BLUE}🚀 Running Immutate Benchmarks${RESET}`);
console.log(`${DIM}(${ITERATIONS} iterations per test)${RESET}\n`);

function runAll(libName: string, fn: any): BenchResult[] {
  return [
    runBenchmark(libName, "Deep Object", () => {
      fn(deepState, (draft: any) => {
        draft.a.b.c.d.e.f.g.h.i += 1;
      });
    }),

    runBenchmark(libName, "Array (Push)", () => {
      fn(arrayState, (draft: any) => {
        for (let i = 0; i < 100; i++) {
          draft.list.push(i);
        }
      });
    }),

    runBenchmark(libName, "Wide Object", () => {
      fn(wideState, (draft: any) => {
        for (let i = 0; i < 200; i++) {
          draft["key" + i] = i * 2;
        }
      });
    }),
  ];
}

const libs = [
  { name: "immutate", fn: immutate },
  { name: "immer", fn: produce },
  { name: "mutative", fn: create },
  { name: "structura", fn: structura },
  { name: "craft", fn: craft },
];

const allResults: BenchResult[] = [];
for (const lib of libs) {
  process.stdout.write(`${DIM}  Benchmarking ${lib.name}...${RESET}\r`);
  allResults.push(...runAll(lib.name, lib.fn));
}
process.stdout.write(" ".repeat(50) + "\r"); // Clear line

const testTypes = ["Deep Object", "Array (Push)", "Wide Object"];

testTypes.forEach((testType) => {
  console.log(`${BOLD}${YELLOW}📊 ${testType}${RESET}`);

  const testResults = allResults
    .filter((r) => r.test === testType)
    .sort((a, b) => a.avgTime - b.avgTime);

  const maxAvg = Math.max(...testResults.map((r) => r.avgTime));

  console.log(`${DIM}┌────────────────┬─────────────┬─────────────┐${RESET}`);
  console.log(`${DIM}│${RESET} ${BOLD}Library       ${RESET} ${DIM}│${RESET} ${BOLD}Avg Time   ${RESET} ${DIM}│${RESET} ${BOLD}Perf Score ${RESET} ${DIM}│${RESET}`);
  console.log(`${DIM}├────────────────┼─────────────┼─────────────┤${RESET}`);

  testResults.forEach((r, i) => {
    const isWinner = i === 0;
    const libName = isWinner ? `${GREEN}${r.lib.padEnd(14)}${RESET}` : r.lib.padEnd(14);
    const avgTime = r.avgTime.toFixed(5).padEnd(11);

    // Performance score relative to the slowest
    const score = (maxAvg / r.avgTime).toFixed(1) + "x";
    const scoreStr = isWinner ? `${BOLD}${GREEN}${score.padEnd(11)}${RESET}` : score.padEnd(11);

    console.log(`${DIM}│${RESET} ${libName} ${DIM}│${RESET} ${avgTime} ${DIM}│${RESET} ${scoreStr} ${DIM}│${RESET}`);
  });

  console.log(`${DIM}└────────────────┴─────────────┴─────────────┘${RESET}\n`);
});
