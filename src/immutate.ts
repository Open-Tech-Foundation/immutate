const isObject = (v: any): v is object =>
  typeof v === "object" && v !== null;

const shallowClone = (obj: any) =>
  Array.isArray(obj) ? obj.slice() : { ...obj };

type DraftNode = {
  children?: Map<string | number, DraftNode>;
  proxy?: any;
  target?: any;
};

function getChild(parent: DraftNode, key: string | number): DraftNode {
  if (!parent.children) parent.children = new Map();
  let child = parent.children.get(key);
  if (!child) {
    child = {};
    parent.children.set(key, child);
  }
  return child;
}

function createDraft(
  target: any,
  node: DraftNode,
  copies: WeakMap<any, any>
): any {
  if (node.proxy && node.target === target) return node.proxy;

  // P1: plain Proxy instead of Proxy.revocable
  const proxy = new Proxy(target, {
    get(obj, prop) {
      if (typeof prop === "symbol") return obj[prop];
      const source = copies.get(obj) ?? obj;
      const value = source[prop];
      if (!isObject(value)) return value;
      return createDraft(
        value,
        getChild(node, prop as string | number),
        copies
      );
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

    // P5: has trap for correctness after delete
    has(obj, prop) {
      const source = copies.get(obj) ?? obj;
      return prop in source;
    },
  });

  node.proxy = proxy;
  node.target = target;
  return proxy;
}

// P0: Structural-sharing finalizer — copies only the changed spine,
// reuses all unchanged subtrees by reference. O(changed) not O(total).
function finalize(
  node: DraftNode,
  original: any,
  copies: WeakMap<any, any>
): any {
  const copy = copies.get(original);
  let result = copy ?? original;
  let cloned = !!copy;

  if (node.children) {
    for (const [key, childNode] of node.children) {
      // Use effective source: copy may have replaced children
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
