const isObject = (v: any): v is object =>
  typeof v === "object" && v !== null;

const shallowClone = (obj: any) => {
  if (Array.isArray(obj)) return obj.slice();
  if (obj instanceof Map) return new Map(obj);
  if (obj instanceof Set) return new Set(obj);
  return { ...obj };
};

type DraftNode = {
  children?: Map<any, DraftNode>;
  proxy?: any;
  target?: any;
};

function getChild(parent: DraftNode, key: any): DraftNode {
  if (!parent.children) parent.children = new Map();
  let child = parent.children.get(key);
  if (!child) {
    child = {};
    parent.children.set(key, child);
  }
  return child;
}

// ── Dispatch ──────────────────────────────────────────────────────────

function createDraft(
  target: any,
  node: DraftNode,
  copies: WeakMap<any, any>
): any {
  if (node.proxy && node.target === target) return node.proxy;

  let proxy: any;
  if (target instanceof Map) {
    proxy = createMapDraft(target, node, copies);
  } else if (target instanceof Set) {
    proxy = createSetDraft(target, node, copies);
  } else {
    proxy = createObjectDraft(target, node, copies);
  }

  node.proxy = proxy;
  node.target = target;
  return proxy;
}

// ── Object / Array draft ──────────────────────────────────────────────

function createObjectDraft(
  target: any,
  node: DraftNode,
  copies: WeakMap<any, any>
): any {
  return new Proxy(target, {
    get(obj, prop) {
      if (typeof prop === "symbol") return obj[prop];
      const source = copies.get(obj) ?? obj;
      const value = source[prop];
      if (!isObject(value)) return value;
      return createDraft(value, getChild(node, prop as string | number), copies);
    },

    set(obj, prop, value) {
      if (!copies.has(obj)) copies.set(obj, shallowClone(obj));
      copies.get(obj)![prop] = value;
      return true;
    },

    deleteProperty(obj, prop) {
      const source = copies.get(obj) ?? obj;
      if (!(prop in source)) return true;
      if (!copies.has(obj)) copies.set(obj, shallowClone(obj));
      delete copies.get(obj)![prop];
      return true;
    },

    has(obj, prop) {
      const source = copies.get(obj) ?? obj;
      return prop in source;
    },
  });
}

// ── Map draft ─────────────────────────────────────────────────────────

function createMapDraft(
  target: Map<any, any>,
  node: DraftNode,
  copies: WeakMap<any, any>
): any {
  const src = (): Map<any, any> => copies.get(target) ?? target;
  const cow = (): Map<any, any> => {
    if (!copies.has(target)) copies.set(target, new Map(target));
    return copies.get(target);
  };

  const draftVal = (key: any, value: any) =>
    isObject(value) ? createDraft(value, getChild(node, key), copies) : value;

  // Build an iterator that wraps object values in draft proxies
  const draftEntries = () => {
    const snap = [...src().entries()];
    let i = 0;
    return {
      [Symbol.iterator]() { return this; },
      next() {
        if (i >= snap.length) return { done: true as const, value: undefined };
        const [k, v] = snap[i++];
        return { done: false as const, value: [k, draftVal(k, v)] as [any, any] };
      },
    };
  };

  return new Proxy(target, {
    get(obj, prop) {
      if (prop === "get")     return (k: any) => draftVal(k, src().get(k));
      if (prop === "set")     return (k: any, v: any) => { cow().set(k, v); return obj; };
      if (prop === "delete")  return (k: any) => cow().delete(k);
      if (prop === "has")     return (k: any) => src().has(k);
      if (prop === "clear")   return () => cow().clear();
      if (prop === "forEach") {
        return (cb: Function, thisArg?: any) => {
          for (const [k, v] of src()) cb.call(thisArg, draftVal(k, v), k, obj);
        };
      }
      if (prop === "keys")    return () => src().keys();
      if (prop === "values") {
        return () => {
          const it = draftEntries();
          return {
            [Symbol.iterator]() { return this; },
            next() {
              const r = it.next();
              return r.done ? r : { done: false, value: r.value[1] };
            },
          };
        };
      }
      if (prop === "entries")        return draftEntries;
      if (prop === Symbol.iterator)  return draftEntries;
      if (prop === "size")           return src().size;
      if (prop === Symbol.toStringTag) return "Map";
      return undefined;
    },
  });
}

// ── Set draft ─────────────────────────────────────────────────────────

function createSetDraft(
  target: Set<any>,
  node: DraftNode,
  copies: WeakMap<any, any>
): any {
  const src = (): Set<any> => copies.get(target) ?? target;
  const cow = (): Set<any> => {
    if (!copies.has(target)) copies.set(target, new Set(target));
    return copies.get(target);
  };

  // For iteration: wrap object values in draft proxies, keyed by original ref
  const draftVal = (value: any) =>
    isObject(value) ? createDraft(value, getChild(node, value), copies) : value;

  const draftValues = () => {
    const snap = [...src()];
    let i = 0;
    return {
      [Symbol.iterator]() { return this; },
      next() {
        if (i >= snap.length) return { done: true as const, value: undefined };
        return { done: false as const, value: draftVal(snap[i++]) };
      },
    };
  };

  return new Proxy(target, {
    get(obj, prop) {
      if (prop === "add")     return (v: any) => { cow().add(v); return obj; };
      if (prop === "delete")  return (v: any) => cow().delete(v);
      if (prop === "has")     return (v: any) => src().has(v);
      if (prop === "clear")   return () => cow().clear();
      if (prop === "forEach") {
        return (cb: Function, thisArg?: any) => {
          for (const v of src()) cb.call(thisArg, draftVal(v), draftVal(v), obj);
        };
      }
      if (prop === "keys" || prop === "values") return draftValues;
      if (prop === "entries") {
        return () => {
          const it = draftValues();
          return {
            [Symbol.iterator]() { return this; },
            next() {
              const r = it.next();
              return r.done ? r : { done: false, value: [r.value, r.value] };
            },
          };
        };
      }
      if (prop === Symbol.iterator) return draftValues;
      if (prop === "size")             return src().size;
      if (prop === Symbol.toStringTag) return "Set";
      return undefined;
    },
  });
}

// ── Structural-sharing finalizer ──────────────────────────────────────

function finalize(
  node: DraftNode,
  original: any,
  copies: WeakMap<any, any>
): any {
  if (original instanceof Map) return finalizeMap(node, original, copies);
  if (original instanceof Set) return finalizeSet(node, original, copies);

  const copy = copies.get(original);
  let result = copy ?? original;
  let cloned = !!copy;

  if (node.children) {
    for (const [key, childNode] of node.children) {
      const childSource = (copy ?? original)[key];
      if (isObject(childSource)) {
        const childResult = finalize(childNode, childSource, copies);
        if (childResult !== childSource) {
          if (!cloned) {
            result = shallowClone(original);
            cloned = true;
          }
          result[key] = childResult;
        }
      }
    }
  }

  return result;
}

function finalizeMap(
  node: DraftNode,
  original: Map<any, any>,
  copies: WeakMap<any, any>
): any {
  const copy = copies.get(original) as Map<any, any> | undefined;
  const source = copy ?? original;
  let result = source;
  let cloned = !!copy;

  if (node.children) {
    for (const [key, childNode] of node.children) {
      const childSource = source.get(key);
      if (isObject(childSource)) {
        const childResult = finalize(childNode, childSource, copies);
        if (childResult !== childSource) {
          if (!cloned) {
            result = new Map(original);
            cloned = true;
          }
          result.set(key, childResult);
        }
      }
    }
  }

  return result;
}

function finalizeSet(
  node: DraftNode,
  original: Set<any>,
  copies: WeakMap<any, any>
): any {
  const copy = copies.get(original) as Set<any> | undefined;
  const source = copy ?? original;

  if (!node.children || node.children.size === 0) return source;

  // Check if any iterated object values were modified through draft proxies
  let modified = !!copy;
  const values: any[] = [];

  for (const value of source) {
    const childNode = node.children.get(value);
    if (childNode && isObject(value)) {
      const result = finalize(childNode, value, copies);
      if (result !== value) modified = true;
      values.push(result);
    } else {
      values.push(value);
    }
  }

  return modified ? new Set(values) : original;
}

// ── Public API ────────────────────────────────────────────────────────

export function immutate(baseState: any, recipe: (draft: any) => void) {
  const copies = new WeakMap<any, any>();
  const root: DraftNode = {};
  const draft = createDraft(baseState, root, copies);
  recipe(draft);
  return finalize(root, baseState, copies);
}

export async function immutateAsync(
  baseState: any,
  recipe: (draft: any) => Promise<void>
) {
  const copies = new WeakMap<any, any>();
  const root: DraftNode = {};
  const draft = createDraft(baseState, root, copies);
  await recipe(draft);
  return finalize(root, baseState, copies);
}
