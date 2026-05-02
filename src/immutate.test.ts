import { describe, expect, it } from "bun:test";
import { immutate, immutateAsync } from "./index";

// ── Plain Objects ─────────────────────────────────────────────────────

describe("immutate - plain objects", () => {
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

	it("should handle deeply nested updates", () => {
		const original = { a: { b: { c: { d: { e: 1 } } } } };
		const updated = immutate(original, (draft) => {
			draft.a.b.c.d.e = 99;
		});

		expect(updated.a.b.c.d.e).toBe(99);
		expect(original.a.b.c.d.e).toBe(1);
		// Every node on the spine should be a new reference
		expect(updated.a).not.toBe(original.a);
		expect(updated.a.b).not.toBe(original.a.b);
		expect(updated.a.b.c).not.toBe(original.a.b.c);
		expect(updated.a.b.c.d).not.toBe(original.a.b.c.d);
	});

	it("should add new properties", () => {
		const original: any = { a: 1 };
		const updated = immutate(original, (draft) => {
			draft.b = 2;
		});

		expect(updated.b).toBe(2);
		expect(original.b).toBeUndefined();
	});

	it("should handle delete operations", () => {
		const original = { a: 1, b: 2, c: 3 };
		const updated = immutate(original, (draft) => {
			delete draft.b;
		});

		expect(updated).toEqual({ a: 1, c: 3 });
		expect(original).toEqual({ a: 1, b: 2, c: 3 });
	});

	it("should support 'in' operator after delete", () => {
		const original = { a: 1, b: 2 };
		const updated = immutate(original, (draft) => {
			delete draft.a;
			expect("a" in draft).toBe(false);
			expect("b" in draft).toBe(true);
		});

		expect("a" in updated).toBe(false);
	});

	it("should handle multiple operations on the same object", () => {
		const original = { x: 1, y: 2, z: 3 };
		const updated = immutate(original, (draft) => {
			draft.x = 10;
			draft.y = 20;
			delete draft.z;
		});

		expect(updated).toEqual({ x: 10, y: 20 });
		expect(original).toEqual({ x: 1, y: 2, z: 3 });
	});

	it("should handle overwriting a property multiple times", () => {
		const original = { value: 0 };
		const updated = immutate(original, (draft) => {
			draft.value = 1;
			draft.value = 2;
			draft.value = 3;
		});

		expect(updated.value).toBe(3);
		expect(original.value).toBe(0);
	});

	it("should return same reference when nothing changes", () => {
		const original = { a: 1, b: { c: 2 } };
		const updated = immutate(original, (_draft) => {
			// no-op
		});

		expect(updated).toBe(original);
	});

	it("should return same reference for read-only access", () => {
		const original = { a: { b: { c: 1 } } };
		const updated = immutate(original, (draft) => {
			const _x = draft.a.b.c; // read only
		});

		expect(updated).toBe(original);
	});

	it("should handle replacing a subtree then modifying it", () => {
		const original = { a: { b: 1 } };
		const updated = immutate(original, (draft) => {
			draft.a = { b: 10, extra: true };
			draft.a.b = 20;
		});

		expect(updated.a.b).toBe(20);
		expect((updated.a as any).extra).toBe(true);
		expect(original.a.b).toBe(1);
	});
});

// ── Arrays ────────────────────────────────────────────────────────────

describe("immutate - arrays", () => {
	it("should push to arrays", () => {
		const original = { list: [1, 2, 3] };
		const updated = immutate(original, (draft) => {
			draft.list.push(4);
		});

		expect(updated.list).toEqual([1, 2, 3, 4]);
		expect(original.list).toEqual([1, 2, 3]);
		expect(updated.list).not.toBe(original.list);
	});

	it("should push multiple times", () => {
		const original = { items: [] as number[] };
		const updated = immutate(original, (draft) => {
			draft.items.push(1);
			draft.items.push(2);
			draft.items.push(3);
		});

		expect(updated.items).toEqual([1, 2, 3]);
		expect(original.items).toEqual([]);
	});

	it("should update array elements by index", () => {
		const original = { list: [10, 20, 30] };
		const updated = immutate(original, (draft) => {
			draft.list[1] = 99;
		});

		expect(updated.list).toEqual([10, 99, 30]);
		expect(original.list).toEqual([10, 20, 30]);
	});

	it("should handle pop", () => {
		const original = { list: [1, 2, 3] };
		const updated = immutate(original, (draft) => {
			draft.list.pop();
		});

		expect(updated.list).toEqual([1, 2]);
		expect(original.list).toEqual([1, 2, 3]);
	});

	it("should handle splice", () => {
		const original = { list: [1, 2, 3, 4, 5] };
		const updated = immutate(original, (draft) => {
			draft.list.splice(1, 2, 99);
		});

		expect(updated.list).toEqual([1, 99, 4, 5]);
		expect(original.list).toEqual([1, 2, 3, 4, 5]);
	});

	it("should handle unshift", () => {
		const original = { list: [2, 3] };
		const updated = immutate(original, (draft) => {
			draft.list.unshift(1);
		});

		expect(updated.list).toEqual([1, 2, 3]);
		expect(original.list).toEqual([2, 3]);
	});

	it("should modify objects inside arrays", () => {
		const original = {
			users: [
				{ id: 1, name: "Alice" },
				{ id: 2, name: "Bob" },
			],
		};
		const updated = immutate(original, (draft) => {
			draft.users[0].name = "Alicia";
		});

		expect(updated.users[0].name).toBe("Alicia");
		expect(original.users[0].name).toBe("Alice");
		// Structural sharing: unmodified items keep identity
		expect(updated.users[1]).toBe(original.users[1]);
	});

	it("should handle nested arrays", () => {
		const original = {
			matrix: [
				[1, 2],
				[3, 4],
			],
		};
		const updated = immutate(original, (draft) => {
			draft.matrix[0][1] = 99;
		});

		expect(updated.matrix[0]).toEqual([1, 99]);
		expect(original.matrix[0]).toEqual([1, 2]);
		// Row 1 untouched
		expect(updated.matrix[1]).toBe(original.matrix[1]);
	});

	it("should handle nested structures with mixed operations", () => {
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
		expect(original.a.b.c.length).toBe(3);
	});
});

// ── Structural Sharing ───────────────────────────────────────────────

describe("immutate - structural sharing", () => {
	it("should share unmodified sibling branches", () => {
		const original = {
			left: { value: 1, deep: { x: true } },
			right: { value: 2, deep: { y: true } },
		};
		const updated = immutate(original, (draft) => {
			draft.left.value = 10;
		});

		expect(updated.left).not.toBe(original.left);
		expect(updated.right).toBe(original.right); // untouched
		expect(updated.right.deep).toBe(original.right.deep);
	});

	it("should share unchanged array elements (objects)", () => {
		const a = { id: 1 };
		const b = { id: 2 };
		const c = { id: 3 };
		const original = { items: [a, b, c] };
		const updated = immutate(original, (draft) => {
			draft.items[1].id = 99;
		});

		expect(updated.items[0]).toBe(a);
		expect(updated.items[1]).not.toBe(b);
		expect(updated.items[2]).toBe(c);
	});
});

// ── Map Support ───────────────────────────────────────────────────────

describe("immutate - Map", () => {
	it("should set and get values", () => {
		const original = {
			data: new Map([
				["a", 1],
				["b", 2],
			]),
		};
		const updated = immutate(original, (draft) => {
			draft.data.set("c", 3);
		});

		expect(updated.data.get("c")).toBe(3);
		expect(updated.data.size).toBe(3);
		expect(original.data.size).toBe(2);
		expect(original.data.has("c")).toBe(false);
		expect(updated.data).not.toBe(original.data);
	});

	it("should overwrite existing Map entries", () => {
		const original = { data: new Map([["a", 1]]) };
		const updated = immutate(original, (draft) => {
			draft.data.set("a", 99);
		});

		expect(updated.data.get("a")).toBe(99);
		expect(original.data.get("a")).toBe(1);
	});

	it("should delete entries", () => {
		const original = {
			data: new Map([
				["a", 1],
				["b", 2],
			]),
		};
		const updated = immutate(original, (draft) => {
			draft.data.delete("a");
		});

		expect(updated.data.has("a")).toBe(false);
		expect(updated.data.size).toBe(1);
		expect(original.data.has("a")).toBe(true);
	});

	it("should clear a Map", () => {
		const original = { data: new Map([["a", 1]]) };
		const updated = immutate(original, (draft) => {
			draft.data.clear();
		});

		expect(updated.data.size).toBe(0);
		expect(original.data.size).toBe(1);
	});

	it("should deeply modify object values via .get()", () => {
		const original = {
			users: new Map([
				["u1", { name: "Alice", age: 30 }],
				["u2", { name: "Bob", age: 25 }],
			]),
		};
		const updated = immutate(original, (draft) => {
			draft.users.get("u1").name = "Alicia";
		});

		expect(updated.users.get("u1").name).toBe("Alicia");
		expect(original.users.get("u1")!.name).toBe("Alice");
		// Structural sharing
		expect(updated.users.get("u2")).toBe(original.users.get("u2"));
	});

	it("should check has() correctly", () => {
		const original = { data: new Map([["x", 1]]) };
		immutate(original, (draft) => {
			expect(draft.data.has("x")).toBe(true);
			expect(draft.data.has("y")).toBe(false);
			draft.data.set("y", 2);
			expect(draft.data.has("y")).toBe(true);
		});
	});

	it("should iterate with forEach", () => {
		const original = {
			data: new Map([
				["a", 1],
				["b", 2],
			]),
		};
		const keys: string[] = [];
		const updated = immutate(original, (draft) => {
			draft.data.forEach((_val: number, key: string) => keys.push(key));
			draft.data.set("c", 3);
		});

		expect(keys).toEqual(["a", "b"]);
		expect(updated.data.size).toBe(3);
	});

	it("should iterate with for..of and modify values", () => {
		const original = {
			data: new Map<string, { v: number }>([
				["x", { v: 1 }],
				["y", { v: 2 }],
			]),
		};
		const updated = immutate(original, (draft) => {
			for (const [key, val] of draft.data) {
				if (key === "x") val.v = 10;
			}
		});

		expect(updated.data.get("x").v).toBe(10);
		expect(original.data.get("x")!.v).toBe(1);
		expect(updated.data.get("y")).toBe(original.data.get("y"));
	});

	it("should iterate with .keys()", () => {
		const original = {
			data: new Map([
				["a", 1],
				["b", 2],
			]),
		};
		const keys: string[] = [];
		immutate(original, (draft) => {
			for (const k of draft.data.keys()) keys.push(k);
		});

		expect(keys).toEqual(["a", "b"]);
	});

	it("should iterate with .values() and proxy objects", () => {
		const original = {
			data: new Map([["a", { n: 1 }]]),
		};
		const updated = immutate(original, (draft) => {
			for (const val of draft.data.values()) {
				val.n = 99;
			}
		});

		expect(updated.data.get("a").n).toBe(99);
		expect(original.data.get("a")!.n).toBe(1);
	});

	it("should return same reference when Map is read-only", () => {
		const original = { data: new Map([["a", 1]]) };
		const updated = immutate(original, (draft) => {
			draft.data.get("a");
		});

		expect(updated).toBe(original);
	});

	it("should handle Map with object keys", () => {
		const key1 = { id: 1 };
		const key2 = { id: 2 };
		const original = {
			data: new Map([
				[key1, "one"],
				[key2, "two"],
			]),
		};
		const updated = immutate(original, (draft) => {
			draft.data.set(key1, "ONE");
		});

		expect(updated.data.get(key1)).toBe("ONE");
		expect(original.data.get(key1)).toBe("one");
		expect(updated.data.get(key2)).toBe("two");
	});
});

// ── Set Support ───────────────────────────────────────────────────────

describe("immutate - Set", () => {
	it("should add to a Set", () => {
		const original = { tags: new Set(["a", "b"]) };
		const updated = immutate(original, (draft) => {
			draft.tags.add("c");
		});

		expect(updated.tags.has("c")).toBe(true);
		expect(updated.tags.size).toBe(3);
		expect(original.tags.size).toBe(2);
	});

	it("should delete from a Set", () => {
		const original = { tags: new Set(["a", "b", "c"]) };
		const updated = immutate(original, (draft) => {
			draft.tags.delete("b");
		});

		expect(updated.tags.has("b")).toBe(false);
		expect(updated.tags.size).toBe(2);
		expect(original.tags.has("b")).toBe(true);
	});

	it("should clear a Set", () => {
		const original = { tags: new Set([1, 2, 3]) };
		const updated = immutate(original, (draft) => {
			draft.tags.clear();
		});

		expect(updated.tags.size).toBe(0);
		expect(original.tags.size).toBe(3);
	});

	it("should check has() correctly", () => {
		const original = { tags: new Set(["x"]) };
		immutate(original, (draft) => {
			expect(draft.tags.has("x")).toBe(true);
			expect(draft.tags.has("y")).toBe(false);
			draft.tags.add("y");
			expect(draft.tags.has("y")).toBe(true);
		});
	});

	it("should modify objects inside a Set via iteration", () => {
		const obj1 = { id: 1, name: "a" };
		const obj2 = { id: 2, name: "b" };
		const original = { items: new Set([obj1, obj2]) };

		const updated = immutate(original, (draft) => {
			for (const item of draft.items) {
				if (item.id === 1) item.name = "updated";
			}
		});

		const updatedArr = [...updated.items];
		expect(updatedArr.find((i: any) => i.id === 1).name).toBe("updated");
		expect(obj1.name).toBe("a");
	});

	it("should iterate with forEach", () => {
		const original = { data: new Set([10, 20, 30]) };
		const values: number[] = [];
		immutate(original, (draft) => {
			draft.data.forEach((v: number) => values.push(v));
		});

		expect(values).toEqual([10, 20, 30]);
	});

	it("should iterate with .entries()", () => {
		const original = { data: new Set(["a", "b"]) };
		const pairs: [string, string][] = [];
		immutate(original, (draft) => {
			for (const [k, v] of draft.data.entries()) {
				pairs.push([k, v]);
			}
		});

		expect(pairs).toEqual([
			["a", "a"],
			["b", "b"],
		]);
	});

	it("should return same reference when Set is read-only", () => {
		const original = { tags: new Set(["a"]) };
		const updated = immutate(original, (draft) => {
			draft.tags.has("a");
		});

		expect(updated).toBe(original);
	});
});

// ── Edge Cases ────────────────────────────────────────────────────────

describe("immutate - edge cases", () => {
	it("should handle null values in state", () => {
		const original = { a: null as any, b: 1 };
		const updated = immutate(original, (draft) => {
			draft.a = { nested: true };
		});

		expect(updated.a).toEqual({ nested: true });
		expect(original.a).toBeNull();
	});

	it("should handle setting value to null", () => {
		const original = { a: { b: 1 } };
		const updated = immutate(original, (draft) => {
			draft.a = null;
		});

		expect(updated.a).toBeNull();
		expect(original.a).toEqual({ b: 1 });
	});

	it("should handle setting value to undefined", () => {
		const original = { a: 1 };
		const updated = immutate(original, (draft) => {
			draft.a = undefined;
		});

		expect(updated.a).toBeUndefined();
		expect(original.a).toBe(1);
	});

	it("should handle empty objects", () => {
		const original = {};
		const updated = immutate(original, (_draft) => {});

		expect(updated).toBe(original);
	});

	it("should handle array as root state", () => {
		const original = [1, 2, 3];
		const updated = immutate(original, (draft) => {
			draft.push(4);
		});

		expect(updated).toEqual([1, 2, 3, 4]);
		expect(original).toEqual([1, 2, 3]);
	});

	it("should handle mixed nested types", () => {
		const original = {
			arr: [{ map: new Map([["k", new Set([1, 2])]]) }],
		};
		const updated = immutate(original, (draft) => {
			draft.arr[0].map.get("k").add(3);
		});

		expect(updated.arr[0].map.get("k").has(3)).toBe(true);
		expect(original.arr[0].map.get("k")!.has(3)).toBe(false);
	});
});

// ── Async ─────────────────────────────────────────────────────────────

describe("immutateAsync", () => {
	it("should handle async recipes", async () => {
		const original = { value: 1 };
		const updated = await immutateAsync(original, async (draft) => {
			await new Promise((r) => setTimeout(r, 1));
			draft.value = 42;
		});

		expect(updated.value).toBe(42);
		expect(original.value).toBe(1);
	});

	it("should handle async with structural sharing", async () => {
		const original = { a: { x: 1 }, b: { y: 2 } };
		const updated = await immutateAsync(original, async (draft) => {
			draft.a.x = 10;
		});

		expect(updated.a.x).toBe(10);
		expect(updated.b).toBe(original.b);
	});
});

describe("immutate - return from recipe", () => {
	it("should replace state when a value is returned", () => {
		const original = { a: 1 };
		const updated = immutate(original, (_draft) => {
			return { a: 100 };
		});
		expect(updated).toEqual({ a: 100 });
		expect(original).toEqual({ a: 1 });
	});

	it("should replace state with a primitive value", () => {
		const original = { a: 1 };
		const updated = immutate(original, (_draft) => {
			return 42 as any;
		});
		expect(updated).toBe(42 as any);
	});

	it("should replace state with null", () => {
		const original = { a: 1 };
		const updated = immutate(original, (_draft) => {
			return null as any;
		});
		expect(updated).toBeNull();
	});

	it("should prioritize return value over draft mutations", () => {
		const original = { a: 1 };
		const updated = immutate(original, (draft) => {
			draft.a = 2;
			return { a: 3 };
		});
		expect(updated).toEqual({ a: 3 });
	});

	it("should handle async return replacement", async () => {
		const original = { a: 1 };
		const updated = await immutateAsync(original, async (_draft) => {
			await Promise.resolve();
			return { a: 100 };
		});
		expect(updated).toEqual({ a: 100 });
	});
});
