# cel-tui Specification

## Overview

cel-tui is a TypeScript TUI framework built around a declarative functional API, ultra-fast rendering, and a concise developer experience. Layout is inspired by CSS Flexbox, using composable horizontal and vertical stacks as the core container primitives.

---

## API Surface

cel-tui ships with a minimal set of primitives. The v1 scope is guided by what's needed to build a functional agentic chat UI.

### Primitives

| Category | Primitive | Description |
|---|---|---|
| Layout | `VStack(props, children)` | Vertical stack — children laid out top to bottom |
| Layout | `HStack(props, children)` | Horizontal stack — children laid out left to right |
| Content | `Text(content, props?)` | Styled text content |
| Content | `Box(props, children)` | Bordered container |
| Interactive | `TextInput(props)` | Editable text field |
| Utility | `Spacer()` | Flex-filling empty space, pushes siblings apart |
| Utility | `Divider(props?)` | Horizontal or vertical line separator |

### Systems

| System | Scope | Status |
|---|---|---|
| Flexbox layout engine | Sizing, alignment, gap | v1 |
| Overflow & scrolling | `overflow: "hidden" \| "scroll"`, scrollbar | v1 |
| Mouse scroll hit detection | Pointer-driven, innermost scrollable wins | v1 |
| Focus management | Keyboard-driven, for `TextInput` | v1 |
| Mouse click hit detection | For interactive elements | v1 |
| Scroll bubble-on-boundary | Nested scrollable overflow | Deferred |
| `overflow: "auto"` | Conditional scrollbar | Deferred |
| `overflowX` / `overflowY` | Independent axis control | Deferred |

---

## Layout Model

### Core Containers

- **VStack** — vertical stack, children laid out top to bottom (`flex-direction: column`)
- **HStack** — horizontal stack, children laid out left to right (`flex-direction: row`)

Containers are arbitrarily nestable: `HStack > VStack > HStack > ...`

### API Shape

Declarative and functional:

```ts
VStack(props, children)
HStack(props, children)
```

### Sizing

Three sizing strategies, inspired by CSS Flexbox:

| Strategy | Example | Description |
|---|---|---|
| **Fixed** | `width: 30, height: 10` | Exact cell count |
| **Flex** | `flex: 1`, `flex: 2` | Proportional to siblings |
| **Percentage** | `width: "50%"`, `height: "100%"` | Relative to parent |

Constraints via `minWidth`, `maxWidth`, `minHeight`, `maxHeight`.

**Sizing priority:** Fixed sizes are allocated first, then remaining space is distributed among flex/percentage children.

### Gap

Cell-based spacing between children:

```ts
HStack({ gap: 1 }, [...])
```

### Alignment

Inspired by Flexbox:

- `justifyContent` — distribute children along the main axis
- `alignItems` — align children along the cross axis

---

## Overflow & Scrolling

### Overflow Modes

```ts
VStack({ overflow: "hidden" })   // clip content (default)
VStack({ overflow: "scroll" })   // enable scrolling
```

Future additions: `"visible"`, `"auto"` (scrollbar only when content overflows).

### Scrollbar

Optional visual scrollbar indicator:

```ts
VStack({ overflow: "scroll", scrollbar: true })
```

### Scroll Direction

Follows the container's main axis:

- VStack with `overflow: "scroll"` → vertical scroll
- HStack with `overflow: "scroll"` → horizontal scroll

Future: independent `overflowX` / `overflowY` properties.

### Scroll Position

Controlled via `scrollOffset` prop and event callbacks.

---

## Scroll Input Model

Scroll is **pointer-driven**, not focus-driven. Mouse wheel events are routed spatially based on cursor position.

### Hit Detection

1. Terminal reports mouse position via SGR mouse mode
2. Map the `(x, y)` coordinate to the deepest node in the layout tree at that position
3. Walk up the ancestor chain to find the nearest container with `overflow: "scroll"`
4. That container handles the scroll event

### Nested Scrollable Containers

**Innermost scrollable wins.** The deepest scrollable ancestor of the hit target handles the event.

Future: bubble-on-boundary behavior (inner container scrolls to its limit, then event bubbles to the next scrollable ancestor).

### Architecture Requirements

- Each node stores its **absolute screen rect** after layout
- The layout tree supports **bottom-up traversal** (child → parent)
- Hit testing: given `(x, y)` → return the deepest node at that position

---

## Focus Model

Focus is **keyboard-driven** and separate from scroll.

- Focus is for interactive widgets (text inputs, buttons, selectable lists)
- Scroll does not require focus
- A user can type in a focused widget while scrolling a different container with the mouse

> **TODO:** Define focus traversal, focus trapping, and keybinding model.

---

## Primitives

### Text

> **TODO:** Define styling props (bold, dim, color, etc.) and text wrapping behavior.

### Box

> **TODO:** Define border styles, padding model, and box-sizing behavior.

### TextInput

> **TODO:** Define props (placeholder, value, onSubmit, onChange), cursor behavior, and focus interaction.

### Spacer

A zero-content element with `flex: 1`. Used to push siblings apart within a stack.

```ts
HStack({ height: 1 }, [
  Text("left"),
  Spacer(),
  Text("right"),
])
```

### Divider

> **TODO:** Define orientation (auto from parent axis?), character style, and sizing.

---

## Reference Example: Agentic Chat UI

```
┌──────────────────────────────────────────────┐
│ Agent Name                        model: gpt │
├──────────────────────────────────────────────┤
│ ▶ User: What files are in this dir?          │
│                                              │
│ ▷ Agent: I'll check that for you.            │
│   ┌──────────────────────────────┐           │
│   │ $ ls -la                     │           │
│   │ file1.ts                     │           │
│   │ file2.ts                     │           │
│   │ README.md                    │           │
│   └──────────────────────────────┘           │
│   Found 3 files.                             │
│                                              │
│ ▶ User: Delete file2.ts                      │
│                                              │
│ ▷ Agent: Running...  ⠋                       │
├──────────────────────────────────────────────┤
│ > type a message...                    [Send]│
└──────────────────────────────────────────────┘
```

```ts
VStack({ height: "100%" }, [

  // Header
  HStack({ height: 1, padding: { x: 1 } }, [
    Text("Agent Name", { bold: true }),
    Spacer(),
    Text("model: gpt", { dim: true }),
  ]),

  Divider(),

  // Message history
  VStack({ flex: 1, overflow: "scroll", scrollbar: true, padding: { x: 1 } }, [
    ...messages.map(msg =>
      VStack({ gap: 0 }, [
        Text(`${msg.role === "user" ? "▶" : "▷"} ${msg.role}:`, {
          bold: msg.role === "user",
          color: msg.role === "user" ? "blue" : "green",
        }),
        ...msg.blocks.map(block =>
          block.type === "code"
            ? Box({ border: "round", marginLeft: 2 }, [
                Text(block.content, { dim: true }),
              ])
            : Text(block.content, { marginLeft: 2 }),
        ),
      ]),
    ),
  ]),

  Divider(),

  // Input area
  HStack({ height: 1, padding: { x: 1 }, gap: 1 }, [
    Text(">"),
    TextInput({
      flex: 1,
      placeholder: "type a message...",
      onSubmit: handleSend,
    }),
  ]),

])
```

---

## Rounding Strategy

Terminals operate on integer cell coordinates. When dividing space among flex/percentage children produces fractional values, a deterministic rounding strategy is needed.

> **TODO:** Define rounding approach (e.g., largest remainder method).

---

## Open Questions

- [ ] Flex wrap support — defer to post-v1?
- [ ] Borders/padding — part of the container or a separate `Box` wrapper?
- [ ] `overflow: "auto"` — show scrollbar only when content overflows
- [ ] `overflowX` / `overflowY` — independent axis control
- [ ] Scroll bubble-on-boundary behavior for nested scrollables
- [ ] Focus traversal and keybinding model
- [ ] Controlled vs uncontrolled scroll position
- [ ] `Text` styling props and text wrapping
- [ ] `Box` border styles and padding model
- [ ] `TextInput` props, cursor, and submit behavior
- [ ] `Divider` orientation and styling
