---
name: cel-tui
description: Build terminal user interfaces with cel-tui, a TypeScript TUI framework. Use when the user wants to create a TUI app, build a terminal UI, render text in the terminal, create a CLI with interactive elements, build a chat interface, text editor, or any interactive terminal application. Triggers include "build a TUI", "terminal UI", "interactive CLI", "text-based interface", "render to terminal", or any task requiring a programmatic terminal user interface.
license: MIT
compatibility: Requires Bun runtime and a terminal with SGR mouse mode support.
metadata:
  author: sacenox
  version: "0.1.0"
---

# Building TUIs with cel-tui

cel-tui is a TypeScript TUI framework with a declarative functional API, flexbox layout, cell-buffer rendering, and style inheritance. It has 4 primitives and external state management.

## Install

```bash
bun add @cel-tui/core
# Optional pre-made components
bun add @cel-tui/components
```

## Core Pattern

Every cel-tui app follows this structure:

```ts
import {
  cel,
  VStack,
  HStack,
  Text,
  TextInput,
  ProcessTerminal,
} from "@cel-tui/core";

let value = "";

cel.init(new ProcessTerminal());
cel.viewport(() =>
  VStack(
    {
      height: "100%",
      fgColor: "white",
      onKeyPress: (key) => {
        if (key === "ctrl+q") {
          cel.stop();
          process.exit();
        }
      },
    },
    [
      Text("My App", { bold: true, fgColor: "cyan" }),
      Text("─", { repeat: "fill" }),
      TextInput({
        flex: 1,
        value,
        onChange: (v) => {
          value = v;
          cel.render();
        },
      }),
    ],
  ),
);
```

The steps: `cel.init(terminal)` → `cel.viewport(() => tree)` → mutate state + `cel.render()`.

## 4 Primitives

| Primitive                 | Type                    | Description                               |
| ------------------------- | ----------------------- | ----------------------------------------- |
| `VStack(props, children)` | Container               | Vertical stack — children top to bottom   |
| `HStack(props, children)` | Container               | Horizontal stack — children left to right |
| `Text(content, props?)`   | Leaf                    | Styled text, no children                  |
| `TextInput(props)`        | Container (no children) | Multi-line editable text                  |

Containers accept sizing (`width`, `height`, `flex`, `"50%"`, `minWidth`/`maxWidth`), layout (`padding`, `gap`, `justifyContent`, `alignItems`), scroll (`overflow: "scroll"`, `scrollbar`), styling (`fgColor`, `bgColor`, `bold`, `focusStyle`), and interaction (`onClick`, `focusable`, `focused`, `onKeyPress`).

Read [references/api.md](references/api.md) for the full props listing, sizing strategies, text props, and component reference.

## Common Patterns

### Spacer, divider, button

```ts
HStack({ height: 1 }, [Text("left"), VStack({ flex: 1 }, []), Text("right")]);
Text("─", { repeat: "fill", fgColor: "brightBlack" });
HStack(
  { onClick: handleClick, focusStyle: { bgColor: "cyan", fgColor: "black" } },
  [Text(" Send ", { bold: true })],
);
```

### Scrollable list

```ts
VStack({ overflow: "scroll", scrollbar: true }, [...items]);
```

### Layers (modals)

Return an array from the render function — layers composite bottom-to-top:

```ts
cel.viewport(() => [
  VStack({ height: "100%" }, [...mainUI]),
  ...(showModal
    ? [
        VStack(
          { height: "100%", justifyContent: "center", alignItems: "center" },
          [
            VStack({ width: 40, height: 10, bgColor: "black" }, [
              ...modalContent,
            ]),
          ],
        ),
      ]
    : []),
]);
```

### Focus

Focus is **uncontrolled by default** — Tab/Shift+Tab/Escape/click just work. Provide `focused` prop to opt into controlled mode:

```ts
// Uncontrolled — framework manages focus
HStack({ onClick: handleAction }, [Text("[ OK ]")]);

// Controlled — app owns focus state
TextInput({
  value,
  onChange,
  focused: isFocused,
  onFocus: () => {
    isFocused = true;
    cel.render();
  },
});
```

### Style inheritance

Containers propagate styles to descendants. Explicit props always win:

```ts
VStack({ fgColor: "white", bgColor: "blue" }, [
  Text("inherits white on blue"),
  Text("explicit green on blue", { fgColor: "green" }),
]);
```

### Select component

```ts
import { Select } from "@cel-tui/components";

const mySelect = Select({
  items: ["apple", "banana", "cherry"],
  onSelect: (value) => {
    chosen = value;
    cel.render();
  },
  onKeyPress: (key) => {
    if (key === "ctrl+q") {
      cel.stop();
      process.exit();
    }
  },
});

cel.viewport(() => VStack({ height: "100%" }, [mySelect()]));
mySelect.reset(); // clear filter/highlight programmatically
```

## Gotchas

- **State is external** — the framework has no state. Mutate variables then call `cel.render()`.
- **Text is a pure leaf** — no sizing props, no children. Parent controls the box.
- **TextInput consumes editing keys** when focused (printable chars, arrows, backspace). Modifier combos (`ctrl+s`) bubble up through ancestors via `onKeyPress`.
- **Escape unfocuses** the current element. Tab/Shift+Tab traverses focusable elements (wraps around). After Escape, traversal continues from where focus was lost.
- **Enter activates** a focused container's `onClick`. If no `onClick`, Enter reaches `onKeyPress`.
- **`focusable: true`** without `onClick` makes a container keyboard-focusable (receives `onKeyPress` events via Tab). Used by stateful components like `Select`.
- **Innermost handler wins** — for `onClick`, `onScroll`, and `onKeyPress`. Unhandled keys in a component's `onKeyPress` don't automatically bubble to parent handlers — forward them manually via an `onKeyPress` prop.
- **Container `bgColor`** fills the rect with opaque background before painting children.
- **`repeat: "fill"` in HStack** gets width 0 (intrinsic width is 0). Workaround: wrap in `VStack({ flex: 1 }, [Text(" ", { repeat: "fill" })])`.
- **Crash cleanup** — terminal state is restored on SIGINT, SIGTERM, uncaughtException.
- **Always call `cel.stop()` before `process.exit()`** — restores raw mode, mouse tracking, and alternate screen.
- **Alt key combos** (`alt+x`, `alt+up`) are not yet implemented in key parsing. Use `ctrl+` modifiers instead.
- **Button limitations** — `Button` from `@cel-tui/components` does not forward `focusStyle`, container sizing, or all style props. Use `HStack` + `Text` directly when you need full control.

## Composing Components

Stateless components are plain functions returning `Node` trees — prefer this pattern. When a component needs internal state across renders, use a factory function that returns a callable instance. Read [references/composing-components.md](references/composing-components.md) for full patterns and examples.

For the full framework specification, see the [cel-tui spec](https://raw.githubusercontent.com/sacenox/cel-tui/main/spec.md).
