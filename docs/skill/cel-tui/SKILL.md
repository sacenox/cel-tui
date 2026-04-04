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

Every cel-tui app follows this pattern:

1. Import primitives and `ProcessTerminal`
2. Initialize with `cel.init(new ProcessTerminal())`
3. Define state as plain variables (or any state approach)
4. Set render function with `cel.viewport(() => tree)`
5. Call `cel.render()` after state changes

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

## 4 Primitives

| Primitive                 | Type                    | Description                                    |
| ------------------------- | ----------------------- | ---------------------------------------------- |
| `VStack(props, children)` | Container               | Vertical stack — children top to bottom        |
| `HStack(props, children)` | Container               | Horizontal stack — children left to right      |
| `Text(content, props?)`   | Leaf                    | Styled text, no children, fills parent width   |
| `TextInput(props)`        | Container (no children) | Multi-line editable text, accepts sizing props |

## Sizing

Containers accept 4 sizing strategies:

```ts
VStack({}, []); // Intrinsic — size to fit content (default)
VStack({ width: 30, height: 10 }, []); // Fixed — exact cell count
VStack({ flex: 1 }, []); // Flex — proportional to siblings
VStack({ width: "50%", height: "100%" }, []); // Percentage — relative to parent
```

Constraints: `minWidth`, `maxWidth`, `minHeight`, `maxHeight`.

Text has no sizing props — parent controls the box, height is intrinsic (content + wrapping).

TextInput accepts container sizing props (`flex`, `width`, `height`, `padding`, `maxHeight`, etc.).

## Container Props

```ts
{
  // Sizing
  width, height,          // SizeValue (number | "50%")
  flex,                   // number
  minWidth, maxWidth,     // number
  minHeight, maxHeight,   // number
  padding,                // { x?: number, y?: number }
  gap,                    // number (cells between children)
  justifyContent,         // "start" | "end" | "center" | "space-between"
  alignItems,             // "start" | "end" | "center" | "stretch"
  overflow,               // "hidden" (default) | "scroll"
  scrollbar,              // boolean
  scrollOffset,           // number (controlled scroll)
  onScroll,               // (offset: number) => void

  // Styling (inherited by descendants)
  bold, italic, underline,// boolean
  fgColor, bgColor,       // Color (ANSI 16)
  focusStyle,             // StyleProps — overrides when focused

  // Interaction
  onClick,                // () => void
  focusable,              // boolean (default true if onClick set)
  focused,                // boolean (controlled — omit for uncontrolled)
  onFocus,                // () => void
  onBlur,                 // () => void
  onKeyPress,             // (key: string) => void
}
```

## Text Props

```ts
Text("content", {
  repeat: "fill" | number, // Repeat to fill width or N times
  wrap: "none" | "word", // Default "none", hard-clips at edge
  bold,
  italic,
  underline, // boolean
  fgColor,
  bgColor, // ANSI 16 Color
});
```

Colors: `"black"`, `"red"`, `"green"`, `"yellow"`, `"blue"`, `"magenta"`, `"cyan"`, `"white"`, and bright variants (`"brightRed"`, etc.).

## TextInput Props

```ts
TextInput({
  value, // string (controlled)
  onChange, // (value: string) => void
  onSubmit, // () => void
  submitKey, // string (default "enter")
  placeholder, // Text() node shown when empty
  // + all container props (sizing, styling, focus, etc.)
});
```

## Common Patterns

### Spacer (push items apart)

```ts
HStack({ height: 1 }, [
  Text("left"),
  VStack({ flex: 1 }, []), // spacer
  Text("right"),
]);
```

### Horizontal divider

```ts
Text("─", { repeat: "fill", fgColor: "brightBlack" });
```

### Button with focus style

```ts
HStack(
  {
    onClick: handleClick,
    fgColor: "cyan",
    focusStyle: { bgColor: "cyan", fgColor: "black" },
  },
  [Text(" Send ", { bold: true })],
);
```

### Growing text input (caps at maxHeight, then scrolls)

```ts
TextInput({
  flex: 1,
  maxHeight: 10,
  value,
  onChange: (v) => {
    value = v;
    cel.render();
  },
  submitKey: "ctrl+enter",
});
```

### Scrollable list

```ts
// Uncontrolled (framework manages scroll)
VStack({ overflow: "scroll", scrollbar: true }, [...items]);

// Controlled (app manages scroll)
VStack(
  {
    overflow: "scroll",
    scrollOffset: offset,
    onScroll: (o) => {
      offset = o;
      cel.render();
    },
  },
  [...items],
);
```

### Layers (modals)

Return an array from the render function. Layers composite bottom-to-top. Use `bgColor` for opaque modal backgrounds:

```ts
cel.viewport(() => [
  VStack({ height: "100%" }, [...mainUI]),
  ...(showModal
    ? [
        VStack(
          {
            height: "100%",
            justifyContent: "center",
            alignItems: "center",
            onClick: () => {
              showModal = false;
              cel.render();
            },
          },
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

### Global key bindings

Put `onKeyPress` on the root container — it catches all keys not consumed by focused elements:

```ts
VStack({
  height: "100%",
  onKeyPress: (key) => {
    if (key === "ctrl+q") { cel.stop(); process.exit(); }
    if (key === "ctrl+s") saveFile();
  },
}, [...])
```

### Focus

Focus is **uncontrolled by default** — Tab/Shift+Tab/Escape/click just work:

```ts
// Uncontrolled (default) — framework manages focus
HStack({ onClick: handleAction }, [Text("[ OK ]")]);

// Controlled — app owns focus state (provide `focused` prop)
TextInput({
  value: text,
  onChange: handleChange,
  focused: isFocused,
  onFocus: () => {
    isFocused = true;
    cel.render();
  },
  onBlur: () => {
    isFocused = false;
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

## Key Format

All lowercase, modifiers joined by `+`: `"ctrl+s"`, `"ctrl+shift+n"`, `"escape"`, `"enter"`, `"alt+up"`, `"f1"`. Framework normalizes modifier order.

## Key Rules

- **State is external** — framework has no state. Call `cel.render()` after changes.
- **Text is a leaf** — no sizing props, no children. Parent controls the box.
- **TextInput is a container** — accepts sizing props but no children.
- **Style inheritance** — containers propagate styles (fgColor, bgColor, bold, etc.) to descendants. Explicit props on a node always override. Container `bgColor` fills the rect with opaque background.
- **focusStyle** — `focusStyle: { bgColor, fgColor, ... }` on containers overrides styles when focused. Participates in inheritance.
- **Uncontrolled focus by default** — Tab/Shift+Tab/Escape/click just work. Provide `focused` prop to opt into controlled mode.
- **Escape unfocuses** the current element.
- **Tab/Shift+Tab** traverses focusable elements in document order (wraps around). After Escape, traversal continues from the element that lost focus (not from the start).
- **Enter** activates a focused clickable container (fires onClick).
- **TextInput consumes editing keys** when focused (printable chars, arrows, backspace, delete). Modifier combos (ctrl+s) bubble up through ancestors via onKeyPress.
- **Mouse click** on a focusable element fires onFocus (and onBlur on previous).
- **Innermost wins** — for click, scroll, and key handlers.
- **Differential rendering** — only changed cells are emitted after the first render.
- **Crash cleanup** — terminal state is restored on SIGINT, SIGTERM, uncaughtException.

## Pre-made Components

```ts
import { Spacer, Divider, Button, Select } from "@cel-tui/components";

Spacer(); // VStack({ flex: 1 }, [])
Divider(); // Text("─", { repeat: "fill" })
Divider({ char: "═", fgColor: "brightBlack" });
Button("[OK]", { onClick: handleOk });
Button("✕", { onClick: handleClose, focusable: false });
```

### Select (filterable list)

```ts
import { Select } from "@cel-tui/components";

const mySelect = Select({
  items: ["apple", "banana", "cherry"],
  onSelect: (value) => {
    chosen = value;
    cel.render();
  },
  placeholder: "search fruits...",
  maxVisible: 8,
  onKeyPress: (key) => {
    // Receives keys the Select doesn't handle (modifiers, etc.)
    if (key === "ctrl+q") {
      cel.stop();
      process.exit();
    }
  },
});

// Inside cel.viewport — call each render to get the current node tree
cel.viewport(() =>
  VStack({ height: "100%" }, [Text("Pick a fruit:"), mySelect()]),
);

// Reset state programmatically
mySelect.reset();
```

Rich items with separate display label, return value, and filter text:

```ts
const modelSelect = Select({
  items: [
    {
      label: "claude-sonnet-4  (free)",
      value: "anthropic/claude-sonnet-4",
      filterText: "claude-sonnet-4",
    },
    { label: "gpt-4o", value: "openai/gpt-4o", filterText: "gpt-4o" },
  ],
  onSelect: (value) => {
    model = value;
    cel.render();
  },
});
```

## Composing Components

cel-tui components are plain functions that return `Node` trees. There are two patterns depending on whether the component needs internal state.

### Stateless components

Stateless components are simple functions that take props and return a `Node`. They're called every render cycle inside `cel.viewport()`. All existing state is external — passed in as props.

```ts
import type { ContainerNode } from "@cel-tui/types";
import { HStack, Text } from "@cel-tui/core";

function StatusBar(left: string, right: string): ContainerNode {
  return HStack({ fgColor: "black", bgColor: "white" }, [
    Text(` ${left}`),
    VStack({ flex: 1 }, []), // spacer
    Text(`${right} `),
  ]);
}

// Usage — called fresh each render
cel.viewport(() =>
  VStack({ height: "100%" }, [
    mainContent(),
    StatusBar(filename, `${lines} lines`),
  ]),
);
```

This is the pattern used by `Button`, `Divider`, and `Spacer`. Prefer it whenever possible — it's simple, testable, and composable.

### Stateful components (factory pattern)

When a component needs internal state that persists across renders (e.g., a search query, cursor position, scroll offset), use a **factory function** that returns a callable instance. State lives in the closure. The user calls the instance each render to get a fresh `Node` tree.

```ts
import type { ContainerNode, Color } from "@cel-tui/types";
import { cel, VStack, HStack, Text } from "@cel-tui/core";

interface ToggleGroupProps {
  options: string[];
  onSelect: (value: string) => void;
  activeColor?: Color;
}

interface ToggleGroupInstance {
  (): ContainerNode;
  reset(): void;
}

function ToggleGroup(props: ToggleGroupProps): ToggleGroupInstance {
  const { options, onSelect, activeColor = "cyan" } = props;
  let activeIndex = 0;

  function handleKey(key: string): void {
    if (key === "left" && activeIndex > 0) {
      activeIndex--;
      cel.render();
    } else if (key === "right" && activeIndex < options.length - 1) {
      activeIndex++;
      cel.render();
    } else if (key === "enter") {
      onSelect(options[activeIndex]!);
    }
  }

  function render(): ContainerNode {
    return HStack(
      { focusable: true, onKeyPress: handleKey, gap: 1 },
      options.map((opt, i) =>
        Text(` ${opt} `, {
          fgColor: i === activeIndex ? "black" : undefined,
          bgColor: i === activeIndex ? activeColor : undefined,
        }),
      ),
    );
  }

  render.reset = () => {
    activeIndex = 0;
  };
  return render as ToggleGroupInstance;
}

// Usage — create once, call each render
const formatToggle = ToggleGroup({
  options: ["JSON", "YAML", "TOML"],
  onSelect: (fmt) => {
    format = fmt;
    cel.render();
  },
});

cel.viewport(() =>
  VStack({ height: "100%" }, [Text("Output format:"), formatToggle()]),
);
```

Key points:

- **Create once** outside `cel.viewport()`. The closure captures mutable state.
- **Call each render** inside `cel.viewport()` — the function builds a fresh node tree from current state.
- **`cel.render()`** is importable from `@cel-tui/core` — stateful components call it after internal state changes to trigger re-renders.
- **Key forwarding** — `findKeyPressHandler` returns the innermost handler and stops. If your component uses `onKeyPress`, accept an `onKeyPress` prop from the user and call it for keys you don't handle, so parent shortcuts still work.
- **`.reset()`** or other methods — attach to the render function (functions are objects in JS) to expose imperative control.

This is the pattern used by `Select` from `@cel-tui/components`.

For the full specification, see the [cel-tui spec](https://raw.githubusercontent.com/sacenox/cel-tui/main/spec.md).
