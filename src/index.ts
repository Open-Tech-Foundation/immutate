const { patch } = require("@opentf/obj-diff");

type PathNode = {
  parent: PathNode | null;
  key: string | number | null;
  _pathStr?: string;   // memoized
  _pathArr?: (string | number)[]; // memoized
  _children?: Map<string | number, PathNode>; // child cache
};

function getPathStr(node: PathNode): string {
  if (node._pathStr !== undefined) return node._pathStr;
  const parts: (string | number)[] = [];
  let cur: PathNode | null = node;
  while (cur.parent !== null) {
    parts.push(cur.key!);
    cur = cur.parent;
  }
  node._pathStr = parts.reverse().join("\0");
  return node._pathStr;
}

function getPathArr(node: PathNode): (string | number)[] {
  if (node._pathArr !== undefined) return node._pathArr;
  const parts: (string | number)[] = [];
  let cur: PathNode | null = node;
  while (cur.parent !== null) {
    parts.push(cur.key!);
    cur = cur.parent;
  }
  node._pathArr = parts.reverse();
  return node._pathArr;
}

function getChildNode(parent: PathNode, key: string | symbol): PathNode {
  const normalized = typeof key === "string" && !isNaN(key as any) ? Number(key) : key as string | number;
  if (!parent._children) parent._children = new Map();
  let child = parent._children.get(normalized);
  if (!child) {
    child = { parent, key: normalized };
    parent._children.set(normalized, child);
  }
  return child;
}

export function immutate(baseState, recipe) {
  const patches = [];
  const cache = new WeakMap(); // target -> proxy
  const copies = new WeakMap(); // target -> cloned version

  const normalizeKey = (prop) =>
    typeof prop === "string" && !isNaN(prop) ? Number(prop) : prop;

  const isObject = (v) => typeof v === "object" && v !== null;

  const shallowClone = (obj) => (Array.isArray(obj) ? obj.slice() : { ...obj });

  function getCopy(target) {
    if (!copies.has(target)) {
      copies.set(target, shallowClone(target));
    }
    return copies.get(target);
  }

  function wrap(target, path = []) {
    if (!isObject(target)) return target;
    if (cache.has(target)) return cache.get(target);

    const proxy = new Proxy(target, {
      get(obj, prop, receiver) {
        const source = copies.get(obj) || obj;
        const value = Reflect.get(source, prop, receiver);

        return wrap(value, [...path, normalizeKey(prop)]);
      },

      set(obj, prop, value, receiver) {
        if (prop === "length" && Array.isArray(obj)) {
          const copy = copies.get(obj) ?? (copies.set(obj, shallowClone(obj)), copies.get(obj)!);
          return Reflect.set(copy, prop, value);
        }

        const key = normalizeKey(prop);
        const targetCopy = getCopy(obj);

        const exists = Object.prototype.hasOwnProperty.call(obj, prop);

        patches.push({
          type: exists ? 2 : 1,
          path: [...path, key],
          value,
        });

        return Reflect.set(targetCopy, prop, value);
      },

      deleteProperty(obj, prop) {
        if (prop in obj) {
          const targetCopy = getCopy(obj);

          patches.push({
            type: 0,
            path: [...path, normalizeKey(prop)],
          });

          return Reflect.deleteProperty(targetCopy, prop);
        }
        return true;
      },
    });

    cache.set(target, proxy);
    return proxy;
  }

  const draft = wrap(baseState);

  recipe(draft);

  // 🔥 if nothing changed, return original
  if (patches.length === 0) return baseState;

  // 🔥 build final state using patch (immutable)
  return patch(baseState, patches);
}
