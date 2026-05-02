<div align="center">

# @opentf/immutate

*Part of the 
<img src="https://open-tech-foundation.pages.dev/img/Logo.svg" width="18" height="18" align="center" />
<a href="https://github.com/Open-Tech-Foundation">Open Tech Foundation</a> ecosystem.*

</div>

> 🚀 A lightweight, high-performance immutability library for JavaScript objects.

## ✨ Features

- **Blazing Fast**: Fastest in class — wins all benchmarks against immer, mutative, structura, and craft.
- **Zero Dependencies**: No runtime dependencies. Pure structural-sharing engine.
- **Simple API**: Write mutable-like syntax, get immutable results.
- **Structural Sharing**: Only copies the changed spine — unchanged branches are reused by reference.
- **Map & Set Support**: Full draft support for `Map` and `Set` — deep modifications, iteration, and structural sharing.
- **TypeScript Support**: Full type safety with `Draft<T>` and `Immutable<T>` (deep readonly).
- **Async Support**: `immutateAsync` for async recipes.

## 🚀 Installation

```bash
# npm
npm install @opentf/immutate

# pnpm
pnpm add @opentf/immutate

# bun
bun add @opentf/immutate
```

## 📖 Usage

`immutate` allows you to write code that looks like you are mutating your data, but it actually returns a new immutable version of it.

### Basic Example

```javascript
import { immutate } from '@opentf/immutate';

const baseState = {
  todo: 'Learn Immutate',
  done: false
};

const nextState = immutate(baseState, (draft) => {
  draft.done = true;
});

console.log(baseState.done); // false
console.log(nextState.done); // true
```

### Complex Updates

```javascript
const users = [
  { id: 1, name: 'Alice', active: true },
  { id: 2, name: 'Bob', active: false }
];

const updatedUsers = immutate(users, (draft) => {
  draft[1].active = true;
  draft.push({ id: 3, name: 'Charlie', active: true });
});
```

### Resetting State (Return Pattern)

You can replace the entire state by returning a value from the recipe.

```javascript
const initialState = { count: 0 };
const state = { count: 100 };

const resetState = immutate(state, (draft) => {
  if (shouldReset) {
    return initialState;
  }
  draft.count++;
});
```

### Async Recipe

```javascript
const nextState = await immutateAsync(state, async (draft) => {
  const data = await fetchData();
  draft.items = data;
});
```

### TypeScript Support

Immutate provides full type safety out of the box. It uses `Draft<T>` to make the draft mutable inside the recipe, and `Immutable<T>` to make the returned state deep-readonly.

```typescript
import { immutate, type Immutable } from '@opentf/immutate';

interface State {
  user: { name: string };
}

const state: State = { user: { name: 'John' } };

const nextState = immutate(state, (draft) => {
  draft.user.name = 'Jane'; // ✅ Draft is mutable
});

// nextState is Immutable<State>
// nextState.user.name = 'Bob'; // ❌ TS Error: Cannot assign to 'name' because it is a read-only property.
```

## ⚡ Benchmarks

Compared against popular immutability libraries. All libraries pass correctness verification before benchmarking. Lower avg time is better.

> **Environment**: Bun v1.3.12 — 5,000 iterations per test (with warmup).

### Deep Nested Object

Mutating a single leaf 9 levels deep: `draft.a.b.c.d.e.f.g.h.i += 1`

| Library | Avg Time (ms) | Perf Score |
|---|---:|---:|
| **@opentf/immutate** 🥇 | **0.00606** | **1.9x** |
| craft | 0.00660 | 1.8x |
| structura | 0.00726 | 1.6x |
| immer | 0.00919 | 1.3x |
| mutative | 0.01164 | 1.0x |

### Array Push (100 items)

Pushing 100 elements to an array: `draft.list.push(i)`

| Library | Avg Time (ms) | Perf Score |
|---|---:|---:|
| **@opentf/immutate** 🥇 | **0.05592** | **16.9x** |
| mutative | 0.12875 | 7.3x |
| immer | 0.49668 | 1.9x |
| craft | 0.54753 | 1.7x |
| structura | 0.94442 | 1.0x |

### Wide Object (200 keys)

Mutating 200 properties on a flat object: `draft["key" + i] = i * 2`

| Library | Avg Time (ms) | Perf Score |
|---|---:|---:|
| **@opentf/immutate** 🥇 | **0.04569** | **4.8x** |
| structura | 0.11275 | 2.0x |
| mutative | 0.17016 | 1.3x |
| immer | 0.19419 | 1.1x |
| craft | 0.22150 | 1.0x |

Run benchmarks locally:

```bash
bun run benchmark
```

## 🔬 Feature Comparison

| Feature | immutate | immer | mutative | structura | craft |
|---|:---:|:---:|:---:|:---:|:---:|
| **Core** | | | | | |
| Proxy-based draft | ✅ | ✅ | ✅ | ✅ | ✅ |
| Structural sharing | ✅ | ✅ | ✅ | ✅ | ✅ |
| No-change referential equality | ✅ | ✅ | ✅ | ✅ | ✅ |
| Async recipe support | ✅ | ⚠️¹ | ❌ | ✅ | ❌ |
| Return value from recipe | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Patches** | | | | | |
| Patch generation | ❌ | ✅ | ✅ | ✅ | ✅ |
| Inverse patches (undo) | ❌ | ✅ | ✅ | ✅ | ❌ |
| JSON Patch (RFC 6902) | ❌ | ❌ | ✅ | ✅² | ✅ |
| Apply patches separately | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Safety & Dev Ergonomics** | | | | | |
| Freeze returned state | ❌ | ✅ | ✅³ | ⚠️⁴ | ❌ |
| Frozen input detection | ❌ | ✅ | ✅ | ❌ | ❌ |
| Draft revocation after use | ❌ | ✅ | ❌ | ❌ | ❌ |
| Circular reference detection | ❌ | ❌ | ⚠️⁵ | ✅ | ❌ |
| **Data Types** | | | | | |
| Plain objects & arrays | ✅ | ✅ | ✅ | ✅ | ✅ |
| Map & Set support | ✅ | ✅⁶ | ✅ | ✅ | ✅ |
| Class instances | ❌ | ❌ | ✅⁷ | ❌ | ❌ |
| Date objects | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Advanced** | | | | | |
| Curried producer | ❌ | ✅ | ✅ | ❌ | ✅ |
| Current snapshot in recipe | ❌ | ✅ | ✅ | ❌ | ❌ |
| Custom shallow copy / plugins | ❌ | ❌ | ✅ | ❌ | ❌ |
| TypeScript generics | ✅ | ✅ | ✅ | ✅ | ✅ |
| Zero runtime dependencies | ✅ | ✅ | ✅ | ✅ | ✅ |

<sup>¹ Immer discourages async inside `produce`; requires `createDraft`/`finishDraft` workaround.</sup>
<sup>² Structura supports standard patches via `enableStandardPatches(true)`.</sup>
<sup>³ Mutative auto-freeze is disabled by default for performance; opt-in via `enableAutoFreeze`.</sup>
<sup>⁴ Structura freezes at compile-time via TypeScript only, not at runtime.</sup>
<sup>⁵ Mutative detects circular references only when `enableAutoFreeze` is enabled in development mode.</sup>
<sup>⁶ Immer requires calling `enableMapSet()` to enable Map/Set support.</sup>
<sup>⁷ Mutative supports class instances via custom `mark` function.</sup>

## ⚖️ License

This project is licensed under the [MIT](./LICENSE) License.
