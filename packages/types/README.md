# @cel-tui/types

Canonical public TypeScript contracts for
[cel-tui](https://github.com/sacenox/cel-tui), a declarative terminal UI
framework.

Most applications receive these types through `@cel-tui/core`. Install this
package directly when defining libraries or components that depend only on the
shared node, prop, color, theme, focus, keyboard, and scrolling contracts.

```bash
bun add @cel-tui/types
```

```ts
import type { ContainerProps, Node, TextInputProps } from "@cel-tui/types";
```

The package ships TypeScript source and has no runtime side effects.
