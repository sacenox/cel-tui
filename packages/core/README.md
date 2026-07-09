# @cel-tui/core

The rendering, layout, terminal, focus, input, and primitive layer of
[cel-tui](https://github.com/sacenox/cel-tui).

```bash
bun add @cel-tui/core
```

```ts
import { cel, ProcessTerminal, Text, VStack } from "@cel-tui/core";

cel.init(new ProcessTerminal());
cel.viewport(() =>
  VStack({ width: "100%", height: "100%" }, [
    Text("Hello from cel-tui", { bold: true }),
  ]),
);
```

The framework exposes four primitives: `VStack`, `HStack`, `Text`, and
`TextInput`. Application state stays external; update it and call
`cel.render()`. Focus and scrolling are framework-managed unless their
controlled props are supplied.

The package ships TypeScript source for Bun and TypeScript-aware bundlers.
See the repository
[README](https://github.com/sacenox/cel-tui#readme) and
[specification](https://github.com/sacenox/cel-tui/blob/main/spec.md) for the
complete contract.
