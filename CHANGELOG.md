# @opentf/immutate

## 0.1.0

### Minor Changes

- c8845f8: Initial release of `@opentf/immutate`, a lightweight, high-performance immutability library for JavaScript/TypeScript.

  ### Key Features

  - **Maximum Performance**: Outperforms Immer, Mutative, and others in standard benchmarks.
  - **Structural Sharing**: Efficiently copies only the modified "spine" of your object tree.
  - **Full Map & Set Support**: Deeply modify and iterate over Maps and Sets inside your recipes.
  - **Async Recipes**: Native support for async/await via `immutateAsync`.
  - **TypeScript Safety**: Deeply typed `Draft<T>` and `Immutable<T>` ensure compile-time safety with zero runtime overhead.
  - **State Replacement**: Support for returning values from recipes to completely replace the state.
  - **Zero Dependencies**: Zero runtime dependencies for a minimal footprint.
