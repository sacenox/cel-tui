---
name: cel-tui
description: Build terminal user interfaces with cel-tui, a TypeScript TUI framework. Use when the user wants to create a TUI app, build a terminal UI, render text in the terminal, create a CLI with interactive elements, build a chat interface, text editor, or any interactive terminal application. Triggers include "build a TUI", "terminal UI", "interactive CLI", "text-based interface", "render to terminal", or any task requiring a programmatic terminal user interface.
license: MIT
compatibility: Requires Bun runtime and a terminal supporting the Kitty keyboard protocol and SGR mouse mode.
metadata:
  author: sacenox
  version: "0.3.0"
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
      onKeyPress: (key) => {
        if (key === "ctrl+q") {
          cel.stop();
          process.exit();
        }
      },
    },
    [
      Text("My App", { bold: true, fgColor: "color06" }),
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

Containers accept sizing (`width`, `height`, `flex`, `"50%"`, `minWidth`/`maxWidth`), layout (`padding`, `gap`, `justifyContent`, `alignItems`, `flexWrap`), scroll (`overflow: "scroll"`, `scrollbar`, `scrollStep`, `scrollOffset`, `onScroll`), styling (`fgColor`, `bgColor`, `bold`, `focusStyle`), and interaction (`onClick`, `focusable`, `focused`, `onKeyPress`). Colors are numbered palette slots (`"color00"`–`"color15"`), mapped to ANSI 16 by default. Custom themes can remap slots to different ANSI indices or 24-bit true color via `cel.init(terminal, { theme })`.

Read [references/api.md](references/api.md) for the full props listing, sizing strategies, text props, and component reference.

## Common Patterns

### Spacer, divider, button

```ts
HStack({ height: 1 }, [Text("left"), VStack({ flex: 1 }, []), Text("right")]);
Text("─", { repeat: "fill", fgColor: "color08" });
HStack(
  {
    onClick: handleClick,
    focusStyle: { bgColor: "color06", fgColor: "color00" },
  },
  [Text(" Send ", { bold: true })],
);
```

### Scrollable list

Scroll is **uncontrolled by default** — the framework manages scroll position internally. Mouse wheel just works:

```ts
VStack({ overflow: "scroll", scrollbar: true }, [...items]);
```

Mouse wheel scrolling uses an **adaptive step** by default based on the scroll target's visible main-axis viewport size:

- `floor(viewportMainAxis / 3)`
- clamped to `3..8`

Override it with `scrollStep` when a view should scroll faster or slower:

```ts
VStack({ overflow: "scroll", scrollbar: true, scrollStep: 6 }, [...items]);
```

Provide `scrollOffset` + `onScroll` to opt into **controlled mode** — you own the state:

```ts
let offset = 0;

VStack(
  {
    overflow: "scroll",
    scrollbar: true,
    scrollOffset: offset,
    onScroll: (newOffset, maxOffset) => {
      offset = newOffset;
      cel.render();
    },
  },
  [...items],
);
```

Controlled mode enables patterns like auto-scroll to bottom on new content. `scrollStep` affects mouse wheel input only — not programmatic `scrollOffset` updates.

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
            VStack(
              { width: 40, height: 10, bgColor: "color08", fgColor: "color07" },
              [...modalContent],
            ),
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
VStack({ fgColor: "color07", bgColor: "color04" }, [
  Text("inherits color07 on color04"),
  Text("explicit color02", { fgColor: "color02" }),
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
});

// ctrl+q lives on the root — Select returns false for unrecognized
// keys, so they bubble up automatically.
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
    [mySelect()],
  ),
);
mySelect.reset(); // clear filter/highlight programmatically
```

## Gotchas

- **State is external** — the framework has no state. Mutate variables then call `cel.render()`.
- **Text is a pure leaf** — no sizing props, no children. Parent controls the box.
- **TextInput consumes editing keys** when focused (printable chars, arrows, backspace, Enter, Tab). Enter inserts a newline by default. Use `onKeyPress` on TextInput to intercept keys before editing — return `false` to prevent the default action (e.g., intercept Enter for submit). Modifier combos (`ctrl+s`) are not editing keys and bubble up through ancestors via `onKeyPress`.
- **Escape unfocuses** the current element. Tab/Shift+Tab traverses focusable elements (wraps around). After Escape, traversal continues from where focus was lost.
- **Enter activates** a focused container's `onClick`. If no `onClick`, Enter reaches `onKeyPress`.
- **`focusable: true`** without `onClick` makes a container keyboard-focusable (receives `onKeyPress` events via Tab). Used by stateful components like `Select`.
- **Innermost handler wins** — for `onClick` and `onScroll`. For `onKeyPress`, keys **bubble up** through ancestors: return `false` from a handler to let the key continue to the next ancestor. Returning `void`/`undefined` consumes the key (stops bubbling). This is backward-compatible.
- **Mouse wheel step is adaptive by default** — scrollable containers and `TextInput` use `floor(viewportMainAxis / 3)`, clamped to `3..8`. Set `scrollStep` to override it for a specific view.
- **Container `bgColor`** fills the rect with opaque background before painting children. Always pair `bgColor` with `fgColor` for contrast — terminal default fg is designed for the terminal default bg, not for arbitrary palette backgrounds.
- **Colors are numbered slots** (`"color00"`–`"color15"`), not names. The default theme maps to ANSI 16. Omit `fgColor`/`bgColor` for terminal defaults (guaranteed readable across themes).
- **`repeat: "fill"` in HStack** gets width 0 (intrinsic width is 0). Workaround: wrap in `VStack({ flex: 1 }, [Text(" ", { repeat: "fill" })])`.
- **Crash cleanup** — terminal state is restored on SIGINT, SIGTERM, uncaughtException.
- **Always call `cel.stop()` before `process.exit()`** — restores raw mode, mouse tracking, and alternate screen.
- **Kitty keyboard protocol required** — the framework requires the Kitty keyboard protocol (level 1). All modifier combos (`alt+x`, `ctrl+plus`, `shift+enter`) are fully supported. The terminal must support this protocol (Kitty, WezTerm, Ghostty, foot, Alacritty, Windows Terminal). macOS Terminal.app and older xterm are not supported.
- **Button limitations** — `Button` from `@cel-tui/components` does not forward container sizing props (`width`, `height`, `flex`, `minWidth`, etc.). It supports styling (`fgColor`, `bgColor`, `bold`, etc.), `focusStyle`, `focused`, `onFocus`, `onBlur`, `onKeyPress`, and `padding`. For full layout control, use `HStack` + `Text` directly.

## Composing Components

Stateless components are plain functions returning `Node` trees — prefer this pattern. When a component needs internal state across renders, use a factory function that returns a callable instance. Read [references/composing-components.md](references/composing-components.md) for full patterns and examples.

For the full framework specification, see the [cel-tui spec](https://raw.githubusercontent.com/sacenox/cel-tui/main/spec.md).
