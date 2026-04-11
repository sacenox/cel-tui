# cel-tui Specification

## Overview

cel-tui is a TypeScript TUI framework built around a declarative functional API, ultra-fast rendering, and a concise developer experience. Layout is inspired by CSS Flexbox, using composable horizontal and vertical stacks as the core container primitives.

---

## API Surface

### Entrypoint

```ts
cel.viewport(render: () => Node | Node[])
cel.render()
cel.setTitle(title: string)
```

`cel.viewport` sets the render function that returns the UI tree. Accepts a single layer or an array of layers. Each layer is a container with full viewport dimensions, laid out independently. When multiple layers are provided, they are composited bottom-to-top (array index = z-order). Setting the viewport triggers the first render.

`cel.render` requests a re-render. Batched via `process.nextTick()` — multiple calls within the same tick produce a single render. Call this after state changes.

State is fully external to the framework. Use any state management approach — plain variables, classes, libraries. The framework just calls the render function and renders the returned tree.

### Terminal Title

```ts
cel.setTitle(title: string)
```

Sets the terminal window or tab title as an imperative side effect. This is **global terminal state**, not part of the declarative render tree, so it should be called directly when the title needs to change.

The framework emits a best-effort terminal title request using an OSC title sequence. Support varies by terminal emulator, multiplexer, and remote environment — some hosts may ignore it, reinterpret it, or map it to a pane/window title instead.

**Semantics:**

- Later calls replace the previous title set by the app.
- `title` is treated as plain text. Control characters are stripped before writing the sequence.
- The framework does **not** automatically restore the previous terminal title on `cel.stop()`.

### Measurement Helpers

```ts
measureContentHeight(node: Node, options: { width: number }): number
```

Measures a node tree's **intrinsic content height** in terminal cells when wrapped within the provided width. The measurement walks downward from the given node and follows the same content rules as layout: text wrapping, padding, gap, intrinsic container sizing, fixed-size descendants, wrapping HStacks, and TextInput content height.

This helper is for **content subtrees** whose height is not externally constrained. Typical use cases: scrollback/message history chunks, prepend-anchor preservation, markdown blocks, and any other intrinsically sized content. It is **not** a viewport measurement API — if a container's visible height is determined by `height`, `flex`, or percentage sizing, measure the content subtree inside that container instead.

`width` should be the actual wrapping width for the node being measured. If you measure a padded container, pass its outer width so the helper can account for that container's own padding. If you measure the children inside a padded container directly, pass the inner content width.

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
| Keyboard input             | Kitty-first input with tmux/legacy compatibility          |

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

| Prop             | Type                                          | Description                                         |
| ---------------- | --------------------------------------------- | --------------------------------------------------- |
| `width`          | `number \| string`                            | Fixed cells or percentage (`"50%"`)                 |
| `height`         | `number \| string`                            | Fixed cells or percentage (`"100%"`)                |
| `flex`           | `number`                                      | Flex grow factor, proportional to siblings          |
| `minWidth`       | `number`                                      | Minimum width constraint                            |
| `maxWidth`       | `number`                                      | Maximum width constraint                            |
| `minHeight`      | `number`                                      | Minimum height constraint                           |
| `maxHeight`      | `number`                                      | Maximum height constraint                           |
| `padding`        | `{ x?: number, y?: number }`                  | Internal padding (cells)                            |
| `gap`            | `number`                                      | Spacing between children (cells)                    |
| `justifyContent` | `string`                                      | Distribute children along the main axis             |
| `alignItems`     | `string`                                      | Align children along the cross axis                 |
| `flexWrap`       | `"nowrap" \| "wrap"`                          | Wrap children to next line (HStack only)            |
| `overflow`       | `"hidden" \| "scroll"`                        | Content overflow behavior (default: `"hidden"`)     |
| `scrollbar`      | `boolean`                                     | Show scrollbar indicator                            |
| `scrollStep`     | `number`                                      | Mouse wheel step in cells (default: adaptive)       |
| `scrollOffset`   | `number`                                      | Scroll position in cells (controlled)               |
| `onScroll`       | `(offset: number, maxOffset: number) => void` | Called on scroll input                              |
| `onClick`        | `() => void`                                  | Called on mouse click or Enter when focused         |
| `focusable`      | `boolean`                                     | Opt out of focus (default: `true` if `onClick`)     |
| `focused`        | `boolean`                                     | Whether this element is focused (controlled)        |
| `onFocus`        | `() => void`                                  | Called when element receives focus                  |
| `onBlur`         | `() => void`                                  | Called when element loses focus                     |
| `focusStyle`     | `StyleProps`                                  | Style overrides applied when focused                |
| `onKeyPress`     | `(key: string) => boolean \| void`            | Key event handler. Return `false` to keep bubbling. |

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

### Flex Wrap

HStack supports `flexWrap: "wrap"` to flow children onto multiple rows when they exceed the container width, like CSS `flex-wrap: wrap`.

```ts
HStack({ flexWrap: "wrap", gap: 1 }, [
  VStack({ width: 30, height: 2 }, [Text("A")]),
  VStack({ width: 30, height: 2 }, [Text("B")]),
  VStack({ width: 30, height: 2 }, [Text("C")]),
]);
```

In an 80-column container: A and B fit on row 1 (60 ≤ 80), C wraps to row 2.

**Wrapping rules:**

- Children are placed left-to-right. When adding the next child (plus gap) would exceed the available width, a new row begins.
- A child wider than the container still gets its own row (never split across rows).
- `gap` applies between items within a row **and** between rows.
- `flexWrap` is only meaningful on HStack. VStack ignores it.

**Per-row layout:**

Each row is an independent flex context:

- **Row height** = tallest child in that row.
- **Flex distribution** — flex children share remaining space within their row.
- **`justifyContent`** — applied per row.
- **`alignItems`** — applied per row (children aligned within their row's height).

**Intrinsic sizing:**

A wrapping HStack with no explicit height sizes to fit all rows:

```
intrinsic height = sum of row heights + gap × (number of rows − 1)
```

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
  onScroll: (newOffset, maxOffset) => {
    offset = newOffset;
  },
}, [...])
```

In controlled mode, mouse wheel events fire `onScroll` with the new offset and maximum offset (total content size minus viewport size); the UI only moves when the app passes the updated `scrollOffset` back.

### Scroll Step

Mouse wheel scrolling moves by a configurable **step size** measured in cells along the container's main axis.

- `scrollStep` sets the step explicitly.
- When omitted, the framework uses an adaptive default based on the viewport size of the scroll target:
  - `floor(viewportMainAxis / 3)`
  - clamped to the range `3..8`

Examples:

- height `3` viewport → step `3`
- height `12` viewport → step `4`
- height `30` viewport → step `8`

This applies to both controlled and uncontrolled scrollable containers, and to `TextInput` mouse wheel scrolling. It affects **mouse wheel input only** — not programmatic `scrollOffset` updates or TextInput cursor-follow behavior.

Values exceeding the maximum scroll offset are clamped during rendering — passing `Infinity` means "scroll to the end". This enables patterns like sticky-bottom scroll:

```ts
let offset = 0;
let stickToBottom = true;

VStack({
  overflow: "scroll",
  scrollOffset: stickToBottom ? Infinity : offset,
  onScroll: (newOffset, maxOffset) => {
    offset = newOffset;
    stickToBottom = newOffset >= maxOffset;
  },
}, [...])
```

While `stickToBottom` is true, `Infinity` is clamped to the current maximum on each render — new content automatically scrolls into view. When the user scrolls up, `stickToBottom` becomes false and the explicit offset takes over. Scrolling back to the bottom re-enables sticky mode.

For prepend-style scrollback, apps can preserve the current viewport anchor by measuring the height of the newly inserted content and increasing `scrollOffset` by that amount:

```ts
const addedHeight = measureContentHeight(
  VStack({}, olderMessages.map(renderMessage)),
  { width: historyContentWidth },
);

scrollOffset += addedHeight;
```

`historyContentWidth` is the width the inserted content actually wraps at. For a padded scroll container, that usually means the container's inner content width.

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

When a TextInput is focused, insertable text and text-editing keys go to the input. This includes arrows, backspace, delete, Enter, Tab, plus readline-style shortcuts: `ctrl+a` / `ctrl+e` for start/end, `alt+b` / `alt+f` and `ctrl+left` / `ctrl+right` for whitespace-delimited word movement, and `ctrl+w` / `alt+d` for whitespace-delimited word deletion. `up` and `down` follow the input's visual wrapped lines, not just newline-separated hard lines. Other modifier combos (e.g., `ctrl+s`) are not consumed by TextInput and bubble up. The TextInput's `onKeyPress` handler fires before editing — returning `false` prevents the default action, letting the app override any key's behavior. Legacy control-byte encodings are normalized when possible, so recoverable shortcuts still bubble in environments like `tmux`. Press Escape to leave the input, then Tab to traverse.

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
    focusStyle: { bgColor: "color06", fgColor: "color00" },
  },
  [Text("[ Action ]", { bold: true })],
);
```

When this element receives focus, the container background becomes color06 and descendant Text nodes that don't set their own `fgColor` inherit color00. When focus leaves, the normal styles resume and text returns to the terminal default foreground.

`focusStyle` works in both uncontrolled and controlled modes.

---

## Key Handling

Key events are routed through the focus and layer system, then bubble up the tree.

### Kitty-First Keyboard Input

cel-tui enables the [Kitty keyboard protocol](https://sw.kovidgoyal.net/kitty/keyboard-protocol/) and treats it as the preferred source of key identity, but it does **not** assume stdin becomes a pure Kitty-only stream. The framework must work well in both native Kitty-compatible terminals and in `tmux` with `set -s extended-keys on`, where input may arrive as a mixture of Kitty sequences and legacy encodings.

**Why:** Kitty level 1 remains the best available terminal keyboard protocol because it disambiguates modifier combos that legacy encodings collapse. However, real-world hosts — especially terminal multiplexers — may preserve some keys as legacy bytes or translate only part of the stream. The input layer therefore uses Kitty when available and accepts recoverable legacy forms for compatibility.

**Support targets:**

- **First-class:** native Kitty-compatible terminals (Kitty, WezTerm, Ghostty, foot, Alacritty, Windows Terminal, and others)
- **First-class:** `tmux` with `set -s extended-keys on`
- **Best effort:** legacy terminals or multiplexers that do not preserve Kitty distinctions

**Lifecycle:**

1. `cel.init()` enables Kitty keyboard protocol **level 1** (`CSI > 1 u`) and bracketed paste mode (`CSI ? 2004 h`), and sets a push flag so the keyboard mode is restored on exit
2. The input decoder accepts a mixed stream of:
   - Kitty `CSI unicode-codepoint ; modifiers u`
   - legacy CSI letter / tilde sequences for arrows, Home/End, Delete, PageUp/Down, and function keys
   - raw printable text
   - legacy ASCII control bytes for recoverable `ctrl+letter` shortcuts
   - recoverable ESC-prefixed Alt combinations
3. `cel.stop()` pops the keyboard mode (`CSI < u`) and disables bracketed paste mode (`CSI ? 2004 l`), restoring the terminal's previous state

**Stream model:** Terminals and multiplexers may batch multiple keyboard and mouse sequences into a single stdin chunk. The framework treats stdin as a stream and decodes all events in order.

**Level 1 details:** At Kitty level 1, unmodified special keys with well-known legacy encodings (Tab, Enter, Escape, Backspace) may still arrive as single-byte legacy input. Modified variants use structured sequences when the host preserves them. The parser must handle both forms.

**tmux compatibility:** In `tmux`, even with extended keys enabled, some shortcuts may still arrive in legacy form rather than Kitty-normalized form. cel-tui treats this as a supported environment, not an error case: recoverable legacy encodings should normalize to the same key strings as native Kitty input.

**Unavoidable ambiguity:** Some legacy encodings are indistinguishable once a host has collapsed them. For example, `Ctrl+I` vs `Tab`, `Ctrl+M` vs `Enter`, and `Ctrl+[` vs `Escape` cannot be recovered if the terminal or multiplexer emits only the shared legacy byte. In those cases the framework uses the legacy key meaning (`tab`, `enter`, `escape`) and cannot infer the modifier combo.

### Bracketed Paste Mode

cel-tui enables bracketed paste mode so the terminal wraps pasted content with `CSI 200~` and `CSI 201~`. This lets the framework distinguish paste from typing and prevents pasted bytes from being mis-decoded as keyboard sequences.

**Paste stream model:** The paste start marker, payload, and end marker may be split across multiple stdin chunks. The input layer must track paste state across chunks and wait for the closing marker before ending the paste.

**Paste semantics:**

- Inside a bracketed paste region, bytes are treated as literal pasted content until `CSI 201~` arrives. Kitty key decoding, legacy key parsing, and ESC-prefixed Alt handling do not run on the payload.
- Newlines, tabs, spaces, and repeated characters are preserved exactly as pasted.
- If a TextInput is focused, the full pasted payload is inserted at the cursor as a single batch edit. `onChange` fires once with the final value, then cursor-follow and scroll updates apply to the post-paste state.
- Bracketed paste is **not** a key event. `onKeyPress` handlers are not called for the paste markers or for the pasted text itself.
- If no TextInput is focused, pasted text is ignored by the framework.

**Fallback:** If the terminal or multiplexer ignores bracketed paste mode and emits only raw text, the framework cannot distinguish paste from typing; that input falls back to the normal mixed-stream keyboard path.

> **Future enhancement:** Higher protocol levels enable key-release events (`level 2`), associated text reporting (`level 3`), and full key event types (`level 4`). These would enable held-key detection for game-like UIs, distinguishing physical key layout from logical input, and other advanced input patterns. The framework may adopt higher levels in the future.

### Key Event Flow

1. **Topmost layer** receives the key event
2. If a **TextInput** is focused:
   - If the TextInput has `onKeyPress`, call it first. If `onKeyPress` returns `false`, the key's **default editing action is prevented** — no character insertion, no cursor movement, nothing. The key is consumed.
   - Otherwise, the TextInput processes insertable text, editing/navigation keys (arrows, backspace, delete, Enter, Tab), and these modifier-based editing shortcuts: `ctrl+a` / `ctrl+e`, `alt+b` / `alt+f`, `ctrl+left` / `ctrl+right`, `ctrl+w`, and `alt+d`. Word movement and deletion use whitespace-delimited boundaries, and `up` / `down` navigate visual wrapped lines. Other modifier combos (e.g., `ctrl+s`) and non-insertable control keys are not editing keys and pass through.
3. If a **clickable container** is focused, Enter fires `onClick`. Other keys pass through.
4. Unconsumed keys **bubble up** through ancestors — each `onKeyPress` handler in the ancestor chain is called from innermost to root.
5. A handler that returns `false` signals the key was **not consumed** — bubbling continues to the next ancestor. Any other return (`undefined`, `true`, or no return) **stops bubbling** (backward-compatible: existing `void` handlers consume by default).
6. The root container's `onKeyPress` acts as the global key handler — it receives keys that bubble all the way up.

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
"shift+enter"
```

**Modifiers:** `ctrl`, `alt`, `shift`

**Named keys:** `escape`, `enter`, `tab`, `backspace`, `delete`, `space`, `plus`, `up`, `down`, `left`, `right`, `home`, `end`, `pageup`, `pagedown`, `f1`–`f12`

**Printable characters:** lowercase letter or character itself — `"a"`, `"1"`, `"/"`

The framework normalizes modifier order, so `"shift+ctrl+s"` and `"ctrl+shift+s"` both match.

Key strings are semantic identifiers for handlers, not necessarily the exact text inserted into a TextInput. For example, pressing uppercase `A` normalizes to key `"a"` while still inserting `"A"` into the input.

When the host preserves Kitty modifier data, all modifier combinations are fully supported — including `alt+<key>`, `ctrl+plus`, `shift+enter`, and other combos that are ambiguous or impossible in legacy terminal encoding. In compatibility paths, recoverable legacy forms normalize to the same key strings, but historically ambiguous collisions (for example `ctrl+i` vs `tab`) remain limited by what the terminal or multiplexer reports.

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
      VStack({ width: 40, height: 15, bgColor: "color08" }, [
        Text("Are you sure?"),
        HStack({ gap: 1 }, [
          HStack(
            {
              onClick: handleYes,
              bgColor: "color08",
              focusStyle: { bgColor: "color02" },
            },
            [Text(" Yes ", { bold: true })],
          ),
          HStack(
            {
              onClick: handleNo,
              bgColor: "color08",
              focusStyle: { bgColor: "color01" },
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

Container sizing props (`width`, `height`, `flex`, `min*`, `max*`, `padding`), focus props (`focused`, `onFocus`, `onBlur`, `focusStyle`), styling props, wheel scroll prop (`scrollStep`), and:

| Prop          | Type                               | Description                                                                                                                        |
| ------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `value`       | `string`                           | Current text content (controlled)                                                                                                  |
| `onChange`    | `(value: string) => void`          | Called on text change                                                                                                              |
| `onKeyPress`  | `(key: string) => boolean \| void` | Key handler, fires before editing. Receives normalized semantic key strings. Return `false` to prevent the default editing action. |
| `placeholder` | `TextNode`                         | Text node shown when value is empty (pass a `Text()` call)                                                                         |

Word-wrap is always on. Cursor position is framework-managed. Supported editing shortcuts include `ctrl+a` / `ctrl+e`, `alt+b` / `alt+f`, `ctrl+left` / `ctrl+right`, `ctrl+w`, and `alt+d`; word movement and deletion use whitespace-delimited boundaries, and `up` / `down` navigate visual wrapped lines. In bracketed paste mode, pasted text is inserted literally at the cursor as one batch edit: one `onChange`, no `onKeyPress`, newlines and tabs preserved.

#### Growing / Shrinking Pattern

Without explicit height, TextInput uses intrinsic sizing (content height). Combined with `maxHeight`, this creates a naturally growing input:

```ts
TextInput({
  maxHeight: 10,
  value,
  onChange,
  onKeyPress: (key) => {
    if (key === "ctrl+enter") {
      handleSubmit();
      return false;
    }
  },
});
```

- 1 line of text → height is 1
- 5 lines → height is 5
- 15 lines → height is 10 (capped), internal scroll kicks in

---

## Styling

### Color System

cel-tui exposes **16 numbered color slots** — `"color00"` through `"color15"`. These are abstract palette references, not color names. The framework never uses names like "white" or "black" because those imply absolute colors and are easily confused with the terminal's default foreground and background.

The **default theme** maps these slots 1:1 to the terminal's ANSI 16 palette:

| Slot        | Default ANSI mapping | Slot        | Default ANSI mapping     |
| ----------- | -------------------- | ----------- | ------------------------ |
| `"color00"` | ANSI 0 (black)       | `"color08"` | ANSI 8 (bright black)    |
| `"color01"` | ANSI 1 (red)         | `"color09"` | ANSI 9 (bright red)      |
| `"color02"` | ANSI 2 (green)       | `"color10"` | ANSI 10 (bright green)   |
| `"color03"` | ANSI 3 (yellow)      | `"color11"` | ANSI 11 (bright yellow)  |
| `"color04"` | ANSI 4 (blue)        | `"color12"` | ANSI 12 (bright blue)    |
| `"color05"` | ANSI 5 (magenta)     | `"color13"` | ANSI 13 (bright magenta) |
| `"color06"` | ANSI 6 (cyan)        | `"color14"` | ANSI 14 (bright cyan)    |
| `"color07"` | ANSI 7 (white)       | `"color15"` | ANSI 15 (bright white)   |

With the default theme, the app automatically inherits whatever terminal color scheme the user has configured — Solarized, Gruvbox, Dracula, etc. Switch themes in the terminal, and every color in the UI updates. No application-side configuration needed.

#### Theme override

A **theme** is a mapping from the 16 color slots to rendering output. The default theme maps to ANSI SGR codes. A custom theme can remap any slot to different ANSI palette indices, 24-bit hex values, or a mix of both:

```ts
// Custom theme — remap slots to true color
const myTheme: Theme = {
  color00: "#1e1e2e",
  color01: "#f38ba8",
  color02: "#a6e3a1",
  // ... remaining slots
};

cel.init(terminal, { theme: myTheme });
```

App code uses the same `"color00"`–`"color15"` values regardless of what theme is active. The theme is a rendering concern, not an app logic concern.

#### Terminal defaults

The terminal's **default foreground and background are not palette colors** — they are a separate pair, chosen by the terminal theme to always contrast with each other. Omitting `fgColor` (leaving it `undefined`) emits no SGR color code, so the terminal uses its default foreground. This is the only way to guarantee readable text across both dark and light themes. The same applies to `bgColor`.

**Guidelines:**

- **Normal text** — don't set `fgColor` or `bgColor`. Let the terminal defaults handle contrast.
- **Semantic accents** — use palette colors for meaning: `"color06"` for highlights, `"color01"` for errors, `"color08"` for dimmed/muted text.
- **Badges and chips** — when setting `bgColor`, always pair it with an explicit `fgColor` so both sides are controlled (e.g., `bgColor: "color04"`, `fgColor: "color00"`).

For more background on terminal color complexity, see [Terminal colours are tricky](https://jvns.ca/blog/2024/10/01/terminal-colours/) by Julia Evans.

### Style Props

| Prop        | Type      | Description      |
| ----------- | --------- | ---------------- |
| `bold`      | `boolean` | Bold weight      |
| `italic`    | `boolean` | Italic style     |
| `underline` | `boolean` | Underlined text  |
| `fgColor`   | `Color`   | Foreground color |
| `bgColor`   | `Color`   | Background color |

**Colors:** 16 numbered palette slots — `"color00"` through `"color15"`. These are abstract references resolved through the active theme. With the default theme, they map to the terminal's ANSI 16 palette. Omitting a color prop means "use the terminal default."

Style props are accepted by Text, TextInput, and containers (VStack, HStack).

### Style Inheritance

Containers propagate their styles to descendants. A child node inherits the nearest ancestor's style values, unless it sets a value explicitly. Explicit props always win.

```ts
VStack({ fgColor: "color06" }, [
  Text("inherits color06 on terminal default bg"),
  Text("explicit color02", { fgColor: "color02" }),
  VStack({ fgColor: "color01" }, [
    Text("inherits color01"),
    Text("explicit color03", { fgColor: "color03" }),
  ]),
]);
```

Resolution order for each style prop: **node's own prop → nearest ancestor → terminal default**.

### Container Background

When a container has `bgColor` (explicitly or via inheritance), the framework fills the container's rect with that color before painting children. This provides solid backgrounds for panels, modals, and sidebars without manual fill workarounds.

When setting `bgColor`, always pair it with an explicit `fgColor` to ensure contrast across themes:

```ts
VStack({ bgColor: "color04", fgColor: "color07", padding: { x: 1 } }, [
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
    bgColor: "color08",
    focusStyle: { bgColor: "color06", fgColor: "color00" },
  },
  [Text(" Send ", { bold: true })],
);
```

When focused: background is color06, Text inherits `fgColor: "color00"`. When not focused: background is color08, Text inherits the terminal default foreground.

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
      onKeyPress: (key) => {
        if (key === "ctrl+q") process.exit();
      },
    },
    [
      // Header
      HStack({ height: 1, padding: { x: 1 } }, [
        Text("Agent Name", { bold: true }),
        VStack({ flex: 1 }),
        Text("model: gpt", { fgColor: "color08" }),
      ]),

      // Message history
      VStack(
        { flex: 1, overflow: "scroll", scrollbar: true, padding: { x: 1 } },
        [
          ...messages.map((msg) =>
            VStack({ gap: 0 }, [
              Text(`${msg.role === "user" ? "▶" : "▷"} ${msg.role}:`, {
                bold: msg.role === "user",
                fgColor: msg.role === "user" ? "color04" : "color02",
              }),
              Text(`  ${msg.content}`),
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
          placeholder: Text("type a message...", { fgColor: "color08" }),
          onKeyPress: (key) => {
            if (key === "enter") {
              handleSend();
              return false;
            }
          },
        }),
        HStack(
          {
            onClick: handleSend,
            bgColor: "color08",
            focusStyle: { bgColor: "color06", fgColor: "color00" },
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
          onScroll: (newOffset) => {
            sidebarScroll = newOffset;
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
                    ? { fgColor: "color06", bgColor: "color08" }
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
          Text(` ${activeFile.name} `, { bold: true, bgColor: "color08" }),
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
        HStack({ height: 1, bgColor: "color04" }, [
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
