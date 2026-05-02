# @opentf/immutate 🧊

> A lightweight, high-performance immutability library for JavaScript objects.

## ✨ Features

- **Simple API**: Work with mutable-like syntax while producing immutable data.
- **TypeScript Support**: Full type safety for your state and recipes.
- **Fast**: Optimized for performance using Proxy-based tracking.

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

## ⚖️ License

This project is licensed under the [MIT](./LICENSE) License.
