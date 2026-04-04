# cel-tui Specification

## Overview

cel-tui is a TypeScript TUI framework built around a declarative functional API, ultra-fast rendering, and a concise developer experience. Layout is inspired by CSS Flexbox, using composable horizontal and vertical stacks as the core container primitives.

---

## API Surface

### Entrypoint

```ts
cel.viewport(render: () => Node | Node[])
cel.render()
```

`cel.viewport` sets the render function that returns the UI tree. Accepts a single layer or an array of layers. Each layer is a container with full viewport dimensions, laid out independently. When multiple layers are provided, they are composited bottom-to-top (array index = z-order). Setting the viewport triggers the first render.

`cel.render` requests a re-render. Batched via `process.nextTick()` — multiple calls within the same tick produce a single render. Call this after state changes.

State is fully external to the framework. Use any state management approach — plain variables, classes, libraries. The framework just calls the render function and renders the returned tree.

### Primitives

| Category  | Primitive                 | Description                                        |
| --------- | ------------------------- | -------------------------------------------------- |
| Layout    | `VStack(props, children)` | Vertical stack — children laid out top to bottom   |
| Layout    | `HStack(props, children)` | Horizontal stack — children laid out left to right |
| Content   | `Text(content, props?)`   | Styled text content                                |
| Container | `TextInput(props)`        | Editable text container                            |

### Systems

| System                     | Description                                               |
| -------------------------- | --------------------------------------------------------- |
| Flexbox layout engine      | Sizing, alignment, gap                                    |
| Overflow & scrolling       | `overflow: "hidden" \| "scroll"`, scrollbar               |
| Layering                   | Multiple viewport layers, composited bottom-to-top        |
| Mouse/scroll hit detection | Pointer-driven, topmost layer first, innermost node wins  |
| Focus management           | Keyboard-driven, for `TextInput` and clickable containers |

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

Shared by both VStack and HStack. Containers also accept styling props (see [Styling](#styling)).

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
| `focusStyle`     | `StyleProps`                 | Style overrides applied when focused            |
| `onKeyPress`     | `(key: string) => void`      | Called on key event (bubbles up from focus)     |

### Sizing

Four sizing strategies, inspired by CSS Flexbox:

| Strategy       | Example                          | Description                   |
| -------------- | -------------------------------- | ----------------------------- |
| **Intrinsic**  | _(no sizing props set)_          | Size to fit content (default) |
| **Fixed**      | `width: 30, height: 10`          | Exact cell count              |
| **Flex**       | `flex: 1`, `flex: 2`             | Proportional to siblings      |
| **Percentage** | `width: "50%"`, `height: "100%"` | Relative to parent            |

Constraints via `minWidth`, `maxWidth`, `minHeight`, `maxHeight`.

**Intrinsic sizing:** A container with no explicit `width`/`height`/`flex`/percentage sizes to fit its children. Leaf nodes (Text) and TextInput compute intrinsic height from content and wrapping at the given width.

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

Terminals operate on integer cell coordinates. When dividing space among flex/percentage children produces fractional values, the **Largest Remainder Method** is used:

1. Floor all computed sizes
2. Calculate the remaining cells (available space minus sum of floored values)
3. Distribute remaining cells one-by-one to children with the largest fractional remainders

Example: 80 columns, three `flex: 1` children (80 ÷ 3 = 26.667 each):

- Floor: 26, 26, 26 = 78
- Remaining: 2 cells
- All fractional parts are equal (0.667), first two children receive +1
- Result: 27, 27, 26

This guarantees the total always sums exactly to the available space, with no order bias.

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

Scroll supports both **uncontrolled** and **controlled** modes, determined by whether `scrollOffset` is provided:

**Uncontrolled** (default) — the framework manages scroll position internally. Mouse wheel just works:

```ts
VStack({ overflow: "scroll" }, [...])
```

**Controlled** — the app owns the scroll state. Enables patterns like auto-scroll to bottom on new content:

```ts
VStack({
  overflow: "scroll",
  scrollOffset: offset,
  onScroll: (newOffset) => {
    offset = newOffset;
  },
}, [...])
```

In controlled mode, mouse wheel events fire `onScroll` with the new offset; the UI only moves when the app passes the updated `scrollOffset` back.

---

## Scroll Input Model

Scroll is **pointer-driven**, not focus-driven. Mouse wheel events are routed spatially based on cursor position.

### Hit Detection

1. Terminal reports mouse position via SGR mouse mode
2. Starting from the **topmost layer**, find the deepest node at `(x, y)`
3. If the layer has a node at that position, it handles the event. Otherwise, try the next layer down.
4. For scroll: walk up the ancestor chain to find the nearest scrollable node (container with `overflow: "scroll"`, or TextInput)
5. For click: walk up to find the nearest container with `onClick`

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

Focus is **keyboard-driven** and separate from scroll. It supports both **uncontrolled** and **controlled** modes, determined by whether `focused` is provided. This mirrors the scroll model.

- Focus is for interactive widgets (TextInput) and clickable containers (with `onClick`)
- Scroll does not require focus
- A user can type in a focused widget while scrolling a different container with the mouse

### Focusable Elements

Focus is implicit — no `focusable` prop needed for the common case:

- **TextInput** — always focusable
- **Container with `onClick`** — focusable by default, opt out with `focusable: false`

### Traversal

**Escape** unfocuses the current element. **Tab / Shift+Tab** moves focus to the next/previous focusable element in document order (depth-first tree traversal).

When a TextInput is focused, text-editing keys (printable characters, arrows, backspace, Tab) go to the input. Modifier combos (e.g., `ctrl+s`) are not consumed by TextInput and bubble up. Press Escape to leave the input, then Tab to traverse.

### Uncontrolled Focus

**Uncontrolled** (default) — the framework manages focus internally. Tab, Shift+Tab, Escape, and mouse clicks just work with no app-side state:

```ts
HStack({ onClick: handleAction }, [Text("[ Action ]", { bold: true })]);
```

The framework tracks which element is focused. `onFocus` and `onBlur` are optional notification callbacks — they fire when focus changes but are not required for focus to work:

```ts
HStack(
  {
    onClick: handleAction,
    onFocus: () => addLog("button focused"),
    onBlur: () => addLog("button blurred"),
  },
  [Text("[ Action ]", { bold: true })],
);
```

### Controlled Focus

**Controlled** — when `focused` is explicitly provided, the app owns the focus state. The framework calls `onFocus` and `onBlur` but does not move focus until the app updates `focused`:

```ts
TextInput({
  value: text,
  onChange: handleChange,
  focused: isEditorFocused,
  onFocus: () => {
    isEditorFocused = true;
  },
  onBlur: () => {
    isEditorFocused = false;
  },
});
```

Only one element can be focused at a time. In controlled mode, the app is responsible for ensuring this — if multiple elements set `focused: true`, the first in document order wins.

### Focus Style

The `focusStyle` prop provides visual feedback when an element is focused. It accepts a `StyleProps` object whose values override the element's normal styles while focused:

```ts
HStack(
  {
    onClick: handleAction,
    bgColor: "black",
    fgColor: "white",
    focusStyle: { bgColor: "cyan", fgColor: "black" },
  },
  [Text("[ Action ]", { bold: true })],
);
```

When this element receives focus, the container background becomes cyan and descendant Text nodes that don't set their own `fgColor` inherit black instead of white. When focus leaves, the normal styles resume.

`focusStyle` works in both uncontrolled and controlled modes.

---

## Key Handling

Key events are routed through the focus and layer system, then bubble up the tree.

### Key Event Flow

1. **Topmost layer** receives the key event
2. If a **TextInput** is focused, it consumes text-editing keys (printable characters, arrows, backspace, Tab). Modifier combos pass through.
3. If a **clickable container** is focused, Enter fires `onClick`. Other keys pass through.
4. Unconsumed keys **bubble up** through ancestors — the nearest `onKeyPress` handler in the ancestor chain handles it.
5. The root container's `onKeyPress` acts as the global key handler.

### Key Format

All lowercase, modifiers joined by `+` in canonical order `ctrl+alt+shift+<key>`:

```
"ctrl+s"
"ctrl+shift+n"
"escape"
"enter"
"alt+up"
"f1"
"ctrl+plus"
```

**Modifiers:** `ctrl`, `alt`, `shift`

**Named keys:** `escape`, `enter`, `tab`, `backspace`, `delete`, `space`, `plus`, `up`, `down`, `left`, `right`, `home`, `end`, `pageup`, `pagedown`, `f1`–`f12`

**Printable characters:** lowercase letter or character itself — `"a"`, `"1"`, `"/"`

The framework normalizes modifier order, so `"shift+ctrl+s"` and `"ctrl+shift+s"` both match.

### Activation

When a clickable container is focused, **Enter** fires its `onClick`.

### Mouse Interaction

Clicking a focusable element also focuses it. This bridges the keyboard and mouse models — click a TextInput to start typing, click a button to focus it.

---

## Layering

Layering enables modals, dropdowns, and overlay UI. Each layer is an independent layout tree with full viewport dimensions.

```ts
// Single layer — most apps
cel.viewport(() =>
  VStack({ height: "100%" }, [...])
)

// Multiple layers — ordered bottom-to-top
cel.viewport(() => [
  VStack({ height: "100%" }, [...mainUI]),
  VStack({ height: "100%" }, [...modalUI]),
])
```

**Compositing:** Layers are rendered bottom-to-top. Cells without content in a higher layer are transparent — the lower layer shows through.

**Input:** Events target the topmost layer that has a node at the event position. This naturally blocks input to lower layers when a modal or overlay is present.

**Modal backdrop pattern:** A full-viewport container on the top layer captures all input, preventing interaction with the base UI:

```ts
cel.viewport(() => [
  VStack({ height: "100%" }, [...mainUI]),
  VStack(
    {
      height: "100%",
      justifyContent: "center",
      alignItems: "center",
      onClick: dismissModal,
    },
    [
      VStack({ width: 40, height: 15, bgColor: "black" }, [
        Text("Are you sure?"),
        HStack({ gap: 1 }, [
          HStack(
            {
              onClick: handleYes,
              bgColor: "brightBlack",
              focusStyle: { bgColor: "green" },
            },
            [Text(" Yes ", { bold: true })],
          ),
          HStack(
            {
              onClick: handleNo,
              bgColor: "brightBlack",
              focusStyle: { bgColor: "red" },
            },
            [Text(" No ", { bold: true })],
          ),
        ]),
      ]),
    ],
  ),
]);
```

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

Text also accepts styling props (see [Styling](#styling)).

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

Multi-line editable text container. Accepts container props and styling props but has no children — its content is the editable `value`. Scroll is always uncontrolled (framework-managed: follows cursor and responds to mouse wheel).

```ts
TextInput(props: TextInputProps)
```

#### Props

Container sizing props (`width`, `height`, `flex`, `min*`, `max*`, `padding`), focus props (`focused`, `onFocus`, `onBlur`, `focusStyle`), styling props, and:

| Prop          | Type                      | Description                                        |
| ------------- | ------------------------- | -------------------------------------------------- |
| `value`       | `string`                  | Current text content (controlled)                  |
| `onChange`    | `(value: string) => void` | Called on text change                              |
| `onSubmit`    | `() => void`              | Called on submit key                               |
| `submitKey`   | `string`                  | Key combo that fires onSubmit (default: `"enter"`) |
| `placeholder` | `Text`                    | Text node shown when value is empty                |

Word-wrap is always on. Cursor position is framework-managed.

#### Growing / Shrinking Pattern

Without explicit height, TextInput uses intrinsic sizing (content height). Combined with `maxHeight`, this creates a naturally growing input:

```ts
TextInput({
  maxHeight: 10,
  value,
  onChange,
  onSubmit,
  submitKey: "ctrl+enter",
});
```

- 1 line of text → height is 1
- 5 lines → height is 5
- 15 lines → height is 10 (capped), internal scroll kicks in

---

## Styling

### Style Props

| Prop        | Type      | Description      |
| ----------- | --------- | ---------------- |
| `bold`      | `boolean` | Bold weight      |
| `italic`    | `boolean` | Italic style     |
| `underline` | `boolean` | Underlined text  |
| `fgColor`   | `Color`   | Foreground color |
| `bgColor`   | `Color`   | Background color |

**Colors:** ANSI base 16 — `"black"`, `"red"`, `"green"`, `"yellow"`, `"blue"`, `"magenta"`, `"cyan"`, `"white"`, and their bright variants (`"brightRed"`, `"brightGreen"`, etc.).

Style props are accepted by Text, TextInput, and containers (VStack, HStack).

### Style Inheritance

Containers propagate their styles to descendants. A child node inherits the nearest ancestor's style values, unless it sets a value explicitly. Explicit props always win.

```ts
VStack({ fgColor: "white", bgColor: "black" }, [
  Text("inherits white on black"),
  Text("explicit green on black", { fgColor: "green" }),
  VStack({ fgColor: "cyan" }, [
    Text("inherits cyan on black"),
    Text("explicit red on black", { fgColor: "red" }),
  ]),
]);
```

Resolution order for each style prop: **node's own prop → nearest ancestor → terminal default**.

### Container Background

When a container has `bgColor` (explicitly or via inheritance), the framework fills the container's rect with that color before painting children. This provides solid backgrounds for panels, modals, and sidebars without manual fill workarounds.

```ts
VStack({ bgColor: "blue", fgColor: "white", padding: { x: 1 } }, [
  Text("Status bar content"),
  Text(" ", { repeat: "fill" }),
  Text("Right side"),
]);
```

### Focus Style

The `focusStyle` prop on containers and TextInput overrides styles while the element is focused. Overridden values participate in inheritance — descendants see the focused values as their inherited defaults.

```ts
HStack(
  {
    onClick: handleSend,
    bgColor: "brightBlack",
    fgColor: "white",
    focusStyle: { bgColor: "cyan", fgColor: "black" },
  },
  [Text(" Send ", { bold: true })],
);
```

When focused: background is cyan, Text inherits `fgColor: "black"`. When not focused: background is brightBlack, Text inherits `fgColor: "white"`.

---

## Character Width

Terminal cells are monospaced, but not all characters occupy one cell. Correct width measurement is critical for layout, wrapping, truncation, and cursor positioning.

### Width Rules

| Category                    | Width | Examples                                           |
| --------------------------- | ----- | -------------------------------------------------- |
| Printable ASCII (0x20–0x7E) | 1     | `a`, `Z`, `#`, ` `                                 |
| East Asian wide (CJK)       | 2     | `世`, `界`, `！`                                   |
| Emoji (RGI)                 | 2     | `😀`, `👨‍👩‍👧`                                         |
| Zero-width                  | 0     | Control chars, combining marks, default ignorables |
| ANSI escape sequences       | 0     | `\x1b[31m`, `\x1b[0m`                              |

### Measurement Strategy

1. **Fast ASCII path** — if the entire string is printable ASCII, width = `string.length`. No segmentation needed. This is the hot path.
2. **Grapheme segmentation** — `Intl.Segmenter` with `granularity: "grapheme"` to handle multi-codepoint characters (emoji with ZWJ, skin tones, combining marks).
3. **East Asian width lookup** — per-codepoint lookup for CJK full-width characters (via `get-east-asian-width` or equivalent).
4. **ANSI stripping** — escape sequences (CSI, OSC, APC) are stripped before measuring.
5. **Caching** — LRU cache for non-ASCII width results.

---

## Rendering

### Cell Buffer

The rendering pipeline uses a 2D **cell buffer** — a grid matching the terminal dimensions where each cell stores:

- Character (grapheme cluster)
- Foreground color
- Background color
- Style flags (bold, italic, underline)

The layout engine writes styled cells into the buffer. This makes clipping trivial (don't write outside the rect), and layer compositing trivial (higher layers overwrite lower layers, empty cells are transparent).

### Pipeline

1. **Layout** — flexbox engine computes absolute screen rects for all nodes
2. **Paint** — each node writes styled cells into the buffer within its rect
3. **Composite** — layers are painted bottom-to-top into the final buffer
4. **Diff** — compare new buffer against previous buffer
5. **Emit** — generate ANSI sequences for changed cells, write in a single batched call

### Reactive Rendering

Rendering is **reactive**, not FPS-based. `cel.render()` batches via `process.nextTick()` — multiple calls within the same tick produce a single render. Terminal resize also triggers a re-render automatically. No fixed frame rate, no wasted renders.

### Synchronized Output

All screen updates are wrapped in **CSI 2026** (`\x1b[?2026h` to begin, `\x1b[?2026l` to end). The terminal holds display updates until the end marker, producing atomic flicker-free screen refreshes.

### Differential Rendering

Three strategies, selected automatically:

| Strategy           | When            | Description                                    |
| ------------------ | --------------- | ---------------------------------------------- |
| **Full + clear**   | Terminal resize | Clear scrollback, re-render everything         |
| **Full, no clear** | First render    | Output everything to clean screen              |
| **Differential**   | Most renders    | Compare buffers, only emit changed cells/lines |

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
// State
let messages = [];
let input = "";

function handleChange(value) {
  input = value;
  cel.render();
}

function handleSend() {
  messages.push({ role: "user", content: input });
  input = "";
  cel.render();
}

// UI
cel.viewport(() =>
  VStack(
    {
      height: "100%",
      fgColor: "white",
      onKeyPress: (key) => {
        if (key === "ctrl+q") process.exit();
      },
    },
    [
      // Header
      HStack({ height: 1, padding: { x: 1 } }, [
        Text("Agent Name", { bold: true }),
        VStack({ flex: 1 }),
        Text("model: gpt", { fgColor: "brightBlack" }),
      ]),

      // Message history
      VStack(
        { flex: 1, overflow: "scroll", scrollbar: true, padding: { x: 1 } },
        [
          ...messages.map((msg) =>
            VStack({ gap: 0 }, [
              Text(`${msg.role === "user" ? "▶" : "▷"} ${msg.role}:`, {
                bold: msg.role === "user",
                fgColor: msg.role === "user" ? "blue" : "green",
              }),
              ...msg.blocks.map((block) => Text(`  ${block.content}`)),
            ]),
          ),
        ],
      ),

      // Input area
      HStack({ padding: { x: 1 }, gap: 1 }, [
        Text(">"),
        TextInput({
          flex: 1,
          maxHeight: 10,
          value: input,
          onChange: handleChange,
          placeholder: Text("type a message...", { fgColor: "brightBlack" }),
          onSubmit: handleSend,
        }),
        HStack(
          {
            onClick: handleSend,
            bgColor: "brightBlack",
            focusStyle: { bgColor: "cyan", fgColor: "black" },
          },
          [Text("[Send]", { bold: true })],
        ),
      ]),
    ],
  ),
);
```

---

## Reference Example: Text Editor

```
┌──────────────┬───────────────────────────────┐
│ files/       │ main.ts                       │
│  ▸ main.ts   │                               │
│    utils.ts  │ import { foo } from "./utils";│
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
cel.viewport(() =>
  HStack(
    {
      height: "100%",
      onKeyPress: (key) => {
        if (key === "ctrl+q") process.exit();
        if (key === "ctrl+s") saveFile();
      },
    },
    [
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

        // Editor — controlled focus (app manages when editor is focused)
        TextInput({
          flex: 1,
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
        HStack({ height: 1, bgColor: "blue", fgColor: "white" }, [
          Text(` ${activeFile.name}`),
          Text(`  Ln ${cursor.line}, Col ${cursor.col}`),
          Text(" ", { repeat: "fill" }),
          Text(`TypeScript  ✓ `),
        ]),
      ]),
    ],
  ),
);
```
