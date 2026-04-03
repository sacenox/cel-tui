# cel-tui

A TypeScript TUI framework built around a declarative functional API and ultra-fast rendering.

<p align="center">
  <img src="assets/demo.gif" alt="cel-tui demo" width="539" />
</p>

## Why "cel"?

A **cel** is the smallest unit of a terminal display — a single character cell. Start from the smallest meaningful unit and build up, with nothing wasted.

## Quick Example

```ts
import { cel, VStack, Text, TextInput, ProcessTerminal } from "@cel-tui/core";

let input = "";

cel.init(new ProcessTerminal());
cel.viewport(() =>
  VStack(
    {
      height: "100%",
      onKeyPress: (key) => {
        if (key === "ctrl+q") process.exit();
      },
    },
    [
      Text("Hello, cel-tui!", { bold: true, fgColor: "cyan" }),
      Text("─", { repeat: "fill", fgColor: "brightBlack" }),
      TextInput({
        flex: 1,
        value: input,
        focused: true,
        onChange: (v) => {
          input = v;
          cel.render();
        },
      }),
    ],
  ),
);
```

## Primitives

| Primitive                 | Description                        |
| ------------------------- | ---------------------------------- |
| `VStack(props, children)` | Vertical stack — top to bottom     |
| `HStack(props, children)` | Horizontal stack — left to right   |
| `Text(content, props?)`   | Styled text leaf                   |
| `TextInput(props)`        | Multi-line editable text container |

## Key Concepts

- **State is external** — the framework renders what you give it. Use any state approach.
- **`cel.viewport(() => tree)`** sets the render function, **`cel.render()`** triggers re-renders.
- **Flexbox layout** — fixed, flex, percentage, and intrinsic sizing with gap, padding, alignment.
- **Layers** — return an array for multi-layer compositing (modals, overlays).
- **Controlled props** — focus, scroll, and text value are app-owned.
- **Cell buffer rendering** — styled cells, differential updates, synchronized output.

## Packages

| Package               | Description                                   |
| --------------------- | --------------------------------------------- |
| `@cel-tui/types`      | Shared type definitions                       |
| `@cel-tui/core`       | Framework engine and primitives               |
| `@cel-tui/components` | Pre-made components (Button, Spacer, Divider) |

## Development

```bash
bun install           # install dependencies
bun test              # run tests (170+)
bun run check         # biome lint
bun run format        # prettier check
bun run typecheck     # tsc --noEmit
bun run docs          # generate API docs
```

## License

MIT
