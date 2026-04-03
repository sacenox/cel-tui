# cel-tui Specification

## Overview

cel-tui is a TypeScript TUI framework built around a declarative functional API, ultra-fast rendering, and a concise developer experience. Layout is inspired by CSS Flexbox, using composable horizontal and vertical stacks as the core container primitives.

---

## API Surface

### Primitives

| Category    | Primitive                 | Description                                        |
| ----------- | ------------------------- | -------------------------------------------------- |
| Layout      | `VStack(props, children)` | Vertical stack — children laid out top to bottom   |
| Layout      | `HStack(props, children)` | Horizontal stack — children laid out left to right |
| Content     | `Text(content, props?)`   | Styled text content                                |
| Interactive | `TextInput(props)`        | Editable text field                                |

### Systems

| System                     | Description                                 |
| -------------------------- | ------------------------------------------- |
| Flexbox layout engine      | Sizing, alignment, gap                      |
| Overflow & scrolling       | `overflow: "hidden" \| "scroll"`, scrollbar |
| Mouse scroll hit detection | Pointer-driven, innermost scrollable wins   |
| Focus management           | Keyboard-driven, for `TextInput`            |

---

## Layout Model

### Core Containers

- **VStack** — vertical stack, children laid out top to bottom (`flex-direction: column`)
- **HStack** — horizontal stack, children laid out left to right (`flex-direction: row`)

Containers are arbitrarily nestable: `HStack > VStack > HStack > ...`

### API Shape

Declarative and functional:

```ts
VStack(props, children);
HStack(props, children);
```

### Container Props

Shared by both VStack and HStack:

| Prop             | Type                         | Description                                     |
| ---------------- | ---------------------------- | ----------------------------------------------- |
| `width`          | `number \| string`           | Fixed cells or percentage (`"50%"`)             |
| `height`         | `number \| string`           | Fixed cells or percentage (`"100%"`)            |
| `flex`           | `number`                     | Flex grow factor, proportional to siblings      |
| `minWidth`       | `number`                     | Minimum width constraint                        |
| `maxWidth`       | `number`                     | Maximum width constraint                        |
| `minHeight`      | `number`                     | Minimum height constraint                       |
| `maxHeight`      | `number`                     | Maximum height constraint                       |
| `padding`        | `{ x?: number, y?: number }` | Internal padding (cells)                        |
| `gap`            | `number`                     | Spacing between children (cells)                |
| `justifyContent` | `string`                     | Distribute children along the main axis         |
| `alignItems`     | `string`                     | Align children along the cross axis             |
| `overflow`       | `"hidden" \| "scroll"`       | Content overflow behavior (default: `"hidden"`) |
| `scrollbar`      | `boolean`                    | Show scrollbar indicator                        |
| `scrollOffset`   | `number`                     | Scroll position in cells (controlled)           |
| `onScroll`       | `(offset: number) => void`   | Called on scroll input                          |
| `onClick`        | `() => void`                 | Called on mouse click or Enter when focused     |
| `focusable`      | `boolean`                    | Opt out of focus (default: `true` if `onClick`) |
| `focused`        | `boolean`                    | Whether this element is focused (controlled)    |
| `onFocus`        | `() => void`                 | Called when element receives focus              |
| `onBlur`         | `() => void`                 | Called when element loses focus                 |

### Sizing

Four sizing strategies, inspired by CSS Flexbox:

| Strategy       | Example                          | Description                   |
| -------------- | -------------------------------- | ----------------------------- |
| **Intrinsic**  | _(no sizing props set)_          | Size to fit content (default) |
| **Fixed**      | `width: 30, height: 10`          | Exact cell count              |
| **Flex**       | `flex: 1`, `flex: 2`             | Proportional to siblings      |
| **Percentage** | `width: "50%"`, `height: "100%"` | Relative to parent            |

Constraints via `minWidth`, `maxWidth`, `minHeight`, `maxHeight`.

**Intrinsic sizing:** A container with no explicit `width`/`height`/`flex`/percentage sizes to fit its children. Leaf nodes (Text, TextInput) compute intrinsic height from content and wrapping at the given width.

**Sizing priority:** Intrinsic and fixed sizes are allocated first, then remaining space is distributed among flex/percentage children.

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

## Rounding Strategy

Terminals operate on integer cell coordinates. When dividing space among flex/percentage children produces fractional values, a deterministic rounding strategy is needed.

> **TODO:** Define rounding approach (e.g., largest remainder method).

---

## Overflow & Scrolling

### Overflow Modes

```ts
VStack({ overflow: "hidden" }); // clip content (default)
VStack({ overflow: "scroll" }); // enable scrolling
```

### Scrollbar

Optional visual scrollbar indicator:

```ts
VStack({ overflow: "scroll", scrollbar: true });
```

### Scroll Direction

Follows the container's main axis:

- VStack with `overflow: "scroll"` → vertical scroll
- HStack with `overflow: "scroll"` → horizontal scroll

### Scroll Position

Scroll is **controlled only** — the app owns the scroll state.

```ts
VStack({
  overflow: "scroll",
  scrollOffset: offset,
  onScroll: (newOffset) => {
    offset = newOffset;
  },
});
```

The framework never mutates scroll position internally. Mouse wheel events fire `onScroll` with the new offset; the UI only moves when the app passes the updated `scrollOffset` back. This enables patterns like auto-scroll to bottom on new content.

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

### Architecture Requirements

- Each node stores its **absolute screen rect** after layout
- The layout tree supports **bottom-up traversal** (child → parent)
- Hit testing: given `(x, y)` → return the deepest node at that position

### Click

Click uses the same hit model as scroll: mouse click position is mapped to the deepest node, then walks up the ancestor chain to find the nearest container with `onClick`. **Innermost clickable container wins.**

### Text Selection

Native terminal text selection (click-drag to highlight/copy) is handled by the terminal emulator, not the framework. With SGR mouse mode enabled, most terminals support **Shift+click/drag** to bypass application mouse capture and use native selection. This is standard behavior across terminal applications (vim, tmux, etc.).

---

## Focus Model

Focus is **keyboard-driven** and separate from scroll. Focus state is **controlled** — the app owns which element is focused.

- Focus is for interactive widgets (TextInput) and clickable containers (with `onClick`)
- Scroll does not require focus
- A user can type in a focused widget while scrolling a different container with the mouse

### Focusable Elements

Focus is implicit — no `focusable` prop needed for the common case:

- **TextInput** — always focusable
- **Container with `onClick`** — focusable by default, opt out with `focusable: false`

### Traversal

**Escape** unfocuses the current element. **Tab / Shift+Tab** moves focus to the next/previous focusable element in document order (depth-first tree traversal).

When a TextInput is focused, all keys (including Tab) go to the input. Press Escape first to leave the input, then Tab to traverse. This avoids the Tab conflict with text editing.

### Activation

When a clickable container is focused, **Enter** fires its `onClick`.

### Mouse Interaction

Clicking a focusable element also focuses it. This bridges the keyboard and mouse models — click a TextInput to start typing, click a button to focus it.

### Controlled Focus

The app owns focus state via `focused`, `onFocus`, and `onBlur` props on focusable elements:

```ts
TextInput({
  value: text,
  onChange: handleChange,
  focused: isFocused,
  onFocus: () => {
    isFocused = true;
  },
  onBlur: () => {
    isFocused = false;
  },
});
```

Only one element can be focused at a time. The app is responsible for ensuring this — if multiple elements set `focused: true`, the first in document order wins.

---

## Primitives

### Text

Styled text leaf node. No children, no sizing props — the parent container controls the box.

```ts
Text(content: string, props?: TextProps)
```

**Sizing behavior:**

- Width: always parent-assigned
- Height: intrinsic — computed from content, newlines, and word-wrapping at the given width

#### Props

| Prop     | Type               | Description                          |
| -------- | ------------------ | ------------------------------------ |
| `repeat` | `number \| "fill"` | Repeat content N times or fill width |
| `wrap`   | `"none" \| "word"` | Wrapping mode (default: `"none"`)    |

Text also accepts the shared styling props (see Styling Props below).

#### Repeat

```ts
Text("─", { repeat: "fill" }); // repeat to fill available width
Text("─", { repeat: 20 }); // repeat exactly 20 times
```

`repeat` takes a number or `"fill"`. When set, wrapping is ignored.

#### Wrapping

| Mode           | Description                                                     |
| -------------- | --------------------------------------------------------------- |
| `wrap: "none"` | No wrapping (default). Content is hard-clipped at the box edge. |
| `wrap: "word"` | Word-wrap to fit available width. Affects computed height.      |

Whitespace is always preserved. `\n` in content produces explicit line breaks.

---

### TextInput

Multi-line editable text field. Leaf node — no children, no sizing props. Fills parent like Text.

```ts
TextInput(props: TextInputProps)
```

**Sizing behavior:**

- Width: always parent-assigned
- Height: intrinsic — computed from content word-wrapping at the given width

When content exceeds the parent's box, TextInput scrolls internally. Internal scroll is framework-managed — the view follows the cursor automatically.

#### Props

| Prop          | Type                      | Description                                        |
| ------------- | ------------------------- | -------------------------------------------------- |
| `value`       | `string`                  | Current text content (controlled)                  |
| `onChange`    | `(value: string) => void` | Called on text change                              |
| `onSubmit`    | `() => void`              | Called on submit key                               |
| `submitKey`   | `string`                  | Key combo that fires onSubmit (default: `"enter"`) |
| `placeholder` | `Text`                    | Text node shown when value is empty                |
| `focused`     | `boolean`                 | Whether this input is focused (controlled)         |
| `onFocus`     | `() => void`              | Called when input receives focus                   |
| `onBlur`      | `() => void`              | Called when input loses focus                      |

Word-wrap is always on. Cursor position is framework-managed.

TextInput also accepts the shared styling props (see Styling Props below).

#### Growing / Shrinking Pattern

Because TextInput has intrinsic height, a parent with `maxHeight` creates a naturally growing input:

```ts
VStack({ maxHeight: 10 }, [
  TextInput({ value, onChange, onSubmit, submitKey: "ctrl+enter" }),
]);
```

- 1 line of text → parent height is 1
- 5 lines → parent height is 5
- 15 lines → parent height is 10 (capped), internal scroll kicks in

---

### Styling Props

Shared by Text and TextInput:

| Prop        | Type      | Description      |
| ----------- | --------- | ---------------- |
| `bold`      | `boolean` | Bold weight      |
| `italic`    | `boolean` | Italic style     |
| `underline` | `boolean` | Underlined text  |
| `fgColor`   | `Color`   | Foreground color |
| `bgColor`   | `Color`   | Background color |

**Colors:** ANSI base 16 — `"black"`, `"red"`, `"green"`, `"yellow"`, `"blue"`, `"magenta"`, `"cyan"`, `"white"`, and their bright variants (`"brightRed"`, `"brightGreen"`, etc.).

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
    VStack({ flex: 1 }),
    Text("model: gpt", { fgColor: "brightBlack" }),
  ]),

  // Message history
  VStack({ flex: 1, overflow: "scroll", scrollbar: true, padding: { x: 1 } }, [
    ...messages.map((msg) =>
      VStack({ gap: 0 }, [
        Text(`${msg.role === "user" ? "▶" : "▷"} ${msg.role}:`, {
          bold: msg.role === "user",
          fgColor: msg.role === "user" ? "blue" : "green",
        }),
        ...msg.blocks.map((block) => Text(`  ${block.content}`)),
      ]),
    ),
  ]),

  // Input area
  HStack({ maxHeight: 10, padding: { x: 1 }, gap: 1 }, [
    Text(">"),
    VStack({ flex: 1 }, [
      TextInput({
        value: input,
        onChange: handleChange,
        placeholder: Text("type a message...", { fgColor: "brightBlack" }),
        onSubmit: handleSend,
      }),
    ]),
  ]),
]);
```

---

## Reference Example: Text Editor

```
┌──────────────┬───────────────────────────────┐
│ files/       │ main.ts                       │
│  ▸ main.ts   │                               │
│    utils.ts  │ import { foo } from "./utils"; │
│    test.ts   │                               │
│              │ function main() {             │
│              │   console.log(foo());         │
│              │ }                             │
│              │                               │
│              │                               │
├──────────────┴───────────────────────────────┤
│ main.ts  Ln 3, Col 1         TypeScript  ✓   │
└──────────────────────────────────────────────┘
```

```ts
HStack({ height: "100%" }, [
  // Sidebar
  VStack(
    {
      width: 20,
      overflow: "scroll",
      scrollOffset: sidebarScroll,
      onScroll: (o) => {
        sidebarScroll = o;
      },
    },
    [
      Text("files/", { bold: true }),
      ...files.map((file) =>
        HStack(
          {
            onClick: () => selectFile(file),
            focusable: false,
          },
          [
            Text(
              `${file === activeFile ? "▸" : " "} ${file.name}`,
              file === activeFile
                ? { fgColor: "cyan", bgColor: "brightBlack" }
                : {},
            ),
          ],
        ),
      ),
    ],
  ),

  // Main area
  VStack({ flex: 1 }, [
    // Tab bar
    HStack({ height: 1 }, [
      Text(` ${activeFile.name} `, { bold: true, bgColor: "brightBlack" }),
      Text(" ", { repeat: "fill" }),
    ]),

    // Editor
    TextInput({
      value: activeFile.content,
      onChange: handleEdit,
      focused: editorFocused,
      onFocus: () => {
        editorFocused = true;
      },
      onBlur: () => {
        editorFocused = false;
      },
    }),

    // Status bar
    HStack({ height: 1 }, [
      Text(` ${activeFile.name}`, { fgColor: "white", bgColor: "blue" }),
      Text(`  Ln ${cursor.line}, Col ${cursor.col}`, {
        fgColor: "white",
        bgColor: "blue",
      }),
      Text(" ", { repeat: "fill", bgColor: "blue" }),
      Text(`TypeScript  ✓ `, { fgColor: "white", bgColor: "blue" }),
    ]),
  ]),
]);
```

---

## Open Questions

- [x] `Text` styling props and text wrapping
- [x] `TextInput` props, cursor, and submit behavior
- [x] Focus traversal and keybinding model
- [x] Controlled vs uncontrolled scroll position
- [ ] Layering for interactive components, like modals and autocomplete interactions.
- [x] Clickable areas/containers. Could be it's own primitive or a prop in the containers.
- [ ] Rounding strategy for fractional cell division
- [ ] Handling different width characters and ANSI escapes sequences when computing sizes.
- [ ] Flicker free rendering strategy. Reactive or FPS based? Diff rendering?

## Things to keep in mind for the rendering discussion

- Differential Rendering: Three-strategy rendering system that only updates what changed
- Synchronized Output: Uses CSI 2026 for atomic screen updates (no flicker)
