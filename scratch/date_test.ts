import { immutate } from "../src";

const state = { date: new Date("2020-01-01") };
try {
  immutate(state, (draft: any) => {
    // This will throw: "Method Date.prototype.getTime called on incompatible receiver"
    console.log("Date year:", draft.date.getFullYear());
  });
} catch (e: any) {
  console.log("Caught expected error:", e.message);
}
