const { patch } = require("@opentf/obj-diff");

const IS_DEV = process.env.NODE_ENV !== "production";

const isObject = (v) => typeof v === "object" && v !== null;
const shallowClone = (obj) => (Array.isArray(obj) ? obj.slice() : { ...obj });

// Reconstruct path array only when recording a patch (write-time, not read-time)
function buildPath(node) {
  const parts = [];
  while (node.parent !== null) {
    parts.push(node.key);
    node = node.parent;
  }
  return parts.reverse();
}

function createDraft(target, pathNode, copies, patchMap) {
  // ── Symbol fast-path: skip proxy machinery for internal JS symbols ──
  // Symbols are used by util.inspect, React DevTools, iterators, etc.
  // Wrapping them wastes cycles and can break invariants.

  const { proxy, revoke } = Proxy.revocable(target, {
    get(obj, prop) {
      if (typeof prop === "symbol") return Reflect.get(obj, prop);

      const source = copies.get(obj) ?? obj;
      const value = Reflect.get(source, prop);
      const key =
        typeof prop === "string" && !isNaN(prop) ? Number(prop) : prop;

      if (!isObject(value)) return value;

      // ── No proxy cache: same object at two paths needs two distinct proxies
      // with correct path context. Proxies are thin wrappers — creation is cheap.
      return createDraft(value, { parent: pathNode, key }, copies, patchMap)
        .proxy;
    },

    set(obj, prop, value) {
      const key =
        typeof prop === "string" && !isNaN(prop) ? Number(prop) : prop;

      if (!copies.has(obj)) copies.set(obj, shallowClone(obj));
      const copy = copies.get(obj);

      // ── Check copy (not original) to determine add vs update.
      // The original may be missing a key the copy already has (or vice versa).
      const type = Object.prototype.hasOwnProperty.call(copy, prop) ? 2 : 1;
      const pathKey = [...buildPath(pathNode), key].join("\0");

      // ── Patch deduplication: last write to a path wins, O(1) squash ──
      patchMap.set(pathKey, {
        type,
        path: [...buildPath(pathNode), key],
        value,
      });
      return Reflect.set(copy, prop, value);
    },

    deleteProperty(obj, prop) {
      if (!(prop in obj)) return true;

      if (!copies.has(obj)) copies.set(obj, shallowClone(obj));
      const copy = copies.get(obj);
      const key =
        typeof prop === "string" && !isNaN(prop) ? Number(prop) : prop;
      const pathKey = [...buildPath(pathNode), key].join("\0");

      patchMap.set(pathKey, { type: 0, path: [...buildPath(pathNode), key] });
      return Reflect.deleteProperty(copy, prop);
    },
  });

  return { proxy, revoke };
}

// ── Structural sharing: walk only modified nodes instead of replaying patches ──
// Nodes that were never touched reuse their original reference — no deep clone.
function finalize(root, copies) {
  if (!isObject(root)) return root;
  if (!copies.has(root)) return root; // untouched — reuse original

  const copy = copies.get(root);
  for (const key of Object.keys(copy)) {
    const child = copy[key];
    if (isObject(child)) {
      copy[key] = finalize(child, copies);
    }
  }

  if (IS_DEV) Object.freeze(copy); // catch mutations to returned state early
  return copy;
}

export function immutate(baseState, recipe) {
  const copies = new WeakMap();
  const patchMap = new Map(); // pathKey → patch (deduplicates repeated writes)

  const rootPathNode = { parent: null, key: null };
  const { proxy: draft, revoke } = createDraft(
    baseState,
    rootPathNode,
    copies,
    patchMap,
  );

  recipe(draft);

  // ── Revoke draft: any post-recipe access throws immediately ──
  // Prevents stale-draft bugs in async code that escapes the recipe.
  revoke();

  if (patchMap.size === 0) return baseState; // nothing changed — return original

  return finalize(baseState, copies);
}

// ── Async variant: awaits the recipe before finalizing ──
export async function immutateAsync(baseState, recipe) {
  const copies = new WeakMap();
  const patchMap = new Map();

  const rootPathNode = { parent: null, key: null };
  const { proxy: draft, revoke } = createDraft(
    baseState,
    rootPathNode,
    copies,
    patchMap,
  );

  await recipe(draft); // wait for all async mutations to settle

  revoke();

  if (patchMap.size === 0) return baseState;

  return finalize(baseState, copies);
}
