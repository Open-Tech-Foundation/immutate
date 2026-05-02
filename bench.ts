import { immutate } from "../immutate";
import { produce } from "immer";
import { create } from "mutative";
import { produce as structura } from "structurajs";
import { craft } from "@sylphx/craft";

const ITERATIONS = 5000; // lower because heavier tests

function runBenchmark(
  name: string,
  fn: () => void,
): { name: string; totalTime: number; avgTime: number } {
  const start = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    fn();
  }
  const end = performance.now();
  const totalTime = end - start;
  const avgTime = totalTime / ITERATIONS;

  return { name, totalTime, avgTime };
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

console.log(`Running REAL benchmarks (${ITERATIONS} iterations)...\n`);

function runAll(name: string, fn: any) {
  return [
    runBenchmark(`${name}-deep`, () => {
      fn(deepState, (draft: any) => {
        draft.a.b.c.d.e.f.g.h.i += 1;
      });
    }),

    runBenchmark(`${name}-array`, () => {
      fn(arrayState, (draft: any) => {
        for (let i = 0; i < 100; i++) {
          draft.list.push(i);
        }
      });
    }),

    runBenchmark(`${name}-wide`, () => {
      fn(wideState, (draft: any) => {
        for (let i = 0; i < 200; i++) {
          draft["key" + i] = i * 2;
        }
      });
    }),
  ];
}

const results = [
  ...runAll("immutate", immutate),
  ...runAll("immer", produce),
  ...runAll("mutative", create),
  ...runAll("structura", structura),
  ...runAll("craft", craft),
];

results.sort((a, b) => a.avgTime - b.avgTime);

console.log(`Benchmark Results:\n`);
results.forEach((r, i) => {
  console.log(`${r.name.padEnd(20)} ${r.avgTime.toFixed(4)} ms`);
});
