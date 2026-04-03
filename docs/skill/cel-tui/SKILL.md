---
name: cel-tui
description: Build terminal user interfaces with cel-tui, a TypeScript TUI framework. Use when the user wants to create a TUI app, build a terminal UI, render text in the terminal, create a CLI with interactive elements, build a chat interface, text editor, or any interactive terminal application. Triggers include "build a TUI", "terminal UI", "interactive CLI", "text-based interface", "render to terminal", or any task requiring a programmatic terminal user interface.
license: MIT
compatibility: Requires Bun runtime and a terminal with SGR mouse mode support.
metadata:
  author: sacenox
  version: "0.0.1"
---

# Building TUIs with cel-tui

cel-tui is a TypeScript TUI framework with a declarative functional API, flexbox layout, and cell-buffer rendering. It has 4 primitives and external state management.

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
        focused: true,
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
  onClick,                // () => void
  focusable,              // boolean (default true if onClick set)
  focused,                // boolean (controlled)
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
  focused, // boolean (controlled)
  onFocus,
  onBlur, // () => void
  // + all container sizing props
  // + all styling props (bold, fgColor, etc.)
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

### Button

```ts
HStack({ onClick: handleClick }, [
  Text("[Send]", { bold: true, fgColor: "cyan" }),
]);
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

Return an array from the render function. Layers composite bottom-to-top:

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
          [VStack({ width: 40, height: 10 }, [...modalContent])],
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

### Focus (controlled)

```ts
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

## Key Format

All lowercase, modifiers joined by `+`: `"ctrl+s"`, `"ctrl+shift+n"`, `"escape"`, `"enter"`, `"alt+up"`, `"f1"`. Framework normalizes modifier order.

## Key Rules

- **State is external** — framework has no state. Call `cel.render()` after changes.
- **Text is a leaf** — no sizing props, no children. Parent controls the box.
- **TextInput is a container** — accepts sizing props but no children.
- **No style inheritance** — every node sets its own styles explicitly.
- **Escape unfocuses** the current element.
- **Tab/Shift+Tab** traverses focusable elements in document order (wraps around).
- **Enter** activates a focused clickable container (fires onClick).
- **TextInput consumes editing keys** when focused (printable chars, arrows, backspace, delete). Modifier combos (ctrl+s) bubble up through ancestors via onKeyPress.
- **Mouse click** on a focusable element fires onFocus (and onBlur on previous).
- **Innermost wins** — for click, scroll, and key handlers.
- **Differential rendering** — only changed cells are emitted after the first render.
- **Crash cleanup** — terminal state is restored on SIGINT, SIGTERM, uncaughtException.

## Pre-made Components

```ts
import { Spacer, Divider, Button } from "@cel-tui/components";

Spacer(); // VStack({ flex: 1 }, [])
Divider(); // Text("─", { repeat: "fill" })
Divider({ char: "═", fgColor: "brightBlack" });
Button("[OK]", { onClick: handleOk });
Button("✕", { onClick: handleClose, focusable: false });
```

For the full specification, see the [cel-tui spec](https://raw.githubusercontent.com/sacenox/cel-tui/main/spec.md).
