# @cel-tui/components

Reusable components and managed view utilities for
[cel-tui](https://github.com/sacenox/cel-tui).

```bash
bun add @cel-tui/components @cel-tui/core
```

The package includes:

- `Button`, `Divider`, `VDivider`, and `Spacer`
- TextInput-backed `Select`
- variable-height `VirtualList`
- lifecycle-managed `Spinner` and `createTicker`
- `Markdown` and streaming-capable `SyntaxHighlight`

```ts
import { Select } from "@cel-tui/components";

const fruitSelect = Select({
  items: ["apple", "banana", "cherry"],
  onSelect: (value) => console.log(value),
});

// Call inside cel.viewport().
fruitSelect();
```

Stateful factories return callable instances with explicit lifecycle or state
methods. The package ships TypeScript source and composes only public cel-tui
primitives.
