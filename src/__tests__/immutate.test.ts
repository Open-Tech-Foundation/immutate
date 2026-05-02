import { describe, it, expect } from "bun:test";
import { immutate } from "../index";

describe("immutate", () => {
  it("should update nested object properties", () => {
    const original = { user: { name: "John" } };
    const updated = immutate(original, (draft) => {
      draft.user.name = "Alice";
    });

    expect(updated.user.name).toBe("Alice");
    expect(original.user.name).toBe("John");
    expect(updated).not.toBe(original);
    expect(updated.user).not.toBe(original.user);
  });

  it("should push to arrays", () => {
    const original = { list: [1, 2, 3] };
    const updated = immutate(original, (draft) => {
      draft.list.push(4);
    });

    expect(updated.list).toEqual([1, 2, 3, 4]);
    expect(original.list).toEqual([1, 2, 3]);
    expect(updated.list).not.toBe(original.list);
  });

  it("should update array elements", () => {
    const original = { list: [10, 20, 30] };
    const updated = immutate(original, (draft) => {
      draft.list[1] = 99;
    });

    expect(updated.list).toEqual([10, 99, 30]);
    expect(original.list).toEqual([10, 20, 30]);
  });

  it("should handle nested structures", () => {
    const original = {
      a: { b: { c: [1, 2, { d: "hello" }] } },
    };
    const updated = immutate(original, (draft) => {
      draft.a.b.c[2].d = "world";
      draft.a.b.c.push(3);
    });

    expect(updated.a.b.c[2].d).toBe("world");
    expect(updated.a.b.c[3]).toBe(3);
    expect(original.a.b.c[2].d).toBe("hello");
  });

  it("should handle delete operations", () => {
    const original = { a: 1, b: 2, c: 3 };
    const updated = immutate(original, (draft) => {
      delete draft.b;
    });

    expect(updated).toEqual({ a: 1, c: 3 });
    expect(original).toEqual({ a: 1, b: 2, c: 3 });
  });

  it("should not mutate original on multiple operations", () => {
    const original = { count: 0, items: [] as number[] };
    const updated = immutate(original, (draft) => {
      draft.count += 1;
      draft.items.push(1);
      draft.items.push(2);
    });

    expect(updated.count).toBe(1);
    expect(updated.items).toEqual([1, 2]);
    expect(original.count).toBe(0);
    expect(original.items).toEqual([]);
  });
});
