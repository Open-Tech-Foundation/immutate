<div align="center">

# @opentf/immutate

<span>*Part of the <img src="https://open-tech-foundation.pages.dev/img/Logo.svg" width="18" height="18" style="vertical-align: middle;" /> [Open Tech Foundation](https://github.com/Open-Tech-Foundation) ecosystem.*</span>

</div>

> 🚀 A lightweight, high-performance immutability library for JavaScript objects.

## ✨ Features

- **Blazing Fast**: Fastest in class — wins all benchmarks against immer, mutative, structura, and craft.
- **Zero Dependencies**: No runtime dependencies. Pure structural-sharing engine.
- **Simple API**: Write mutable-like syntax, get immutable results.
- **Structural Sharing**: Only copies the changed spine — unchanged branches are reused by reference.
- **Map & Set Support**: Full draft support for `Map` and `Set` — deep modifications, iteration, and structural sharing.
- **TypeScript Support**: Full type safety for your state and recipes.
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

### Async Recipe

```javascript
const nextState = await immutateAsync(state, async (draft) => {
  const data = await fetchData();
  draft.items = data;
});
```

## ⚡ Benchmarks

Compared against popular immutability libraries. All libraries pass correctness verification before benchmarking. Lower avg time is better.

> **Environment**: Bun v1.3.12 — 5,000 iterations per test (with warmup).

### Deep Nested Object

Mutating a single leaf 9 levels deep: `draft.a.b.c.d.e.f.g.h.i += 1`

| Library | Avg Time (ms) | Perf Score |
|---|---:|---:|
| **@opentf/immutate** 🥇 | **0.00469** | **2.8x** |
| craft | 0.00701 | 1.9x |
| structura | 0.00753 | 1.8x |
| immer | 0.00906 | 1.5x |
| mutative | 0.01322 | 1.0x |

### Array Push (100 items)

Pushing 100 elements to an array: `draft.list.push(i)`

| Library | Avg Time (ms) | Perf Score |
|---|---:|---:|
| **@opentf/immutate** 🥇 | **0.05843** | **16.3x** |
| mutative | 0.12981 | 7.3x |
| immer | 0.50700 | 1.9x |
| craft | 0.55126 | 1.7x |
| structura | 0.95276 | 1.0x |

### Wide Object (200 keys)

Mutating 200 properties on a flat object: `draft["key" + i] = i * 2`

| Library | Avg Time (ms) | Perf Score |
|---|---:|---:|
| **@opentf/immutate** 🥇 | **0.04536** | **4.8x** |
| structura | 0.11106 | 2.0x |
| mutative | 0.16845 | 1.3x |
| immer | 0.19428 | 1.1x |
| craft | 0.21770 | 1.0x |

Run benchmarks locally:

```bash
bun run benchmark
```

## ⚖️ License

This project is licensed under the [MIT](./LICENSE) License.
