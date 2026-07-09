# cel-tui Specification

## Overview

cel-tui is a TypeScript TUI framework built around a declarative functional API, ultra-fast rendering, and a concise developer experience. Layout is inspired by CSS Flexbox, using composable horizontal and vertical stacks as the core container primitives.

---

## API Surface

### Entrypoint

```ts
cel.init(terminal, options?: {
  theme?: Theme;
  kittyKeyboard?: KittyKeyboardOptions;
})
cel.viewport(render: () => Node | Node[])
cel.render()
cel.redraw()
cel.setTheme(theme: Theme)
cel.setTitle(title: string)
cel.stop()
```

`cel.init` attaches the terminal, configures terminal input/output modes,
selects the initial theme, and optionally requests Kitty progressive keyboard
flags. `cel.stop` detaches the terminal and restores the terminal state.

`cel.viewport` sets the render function that returns the UI tree. Accepts a single layer or an array of layers. Each layer is a container with full viewport dimensions, laid out independently. When multiple layers are provided, they are composited bottom-to-top (array index = z-order). Setting the viewport triggers the first render.

`cel.render` requests a re-render. Batched via `process.nextTick()` — multiple calls within the same tick produce a single render. Call this after state changes.

`cel.redraw` requests a batched **full redraw**. It still re-evaluates the
viewport, but discards the differential-render baseline and re-emits every
cell. Use it after terminal resume or external screen corruption.

`cel.setTheme(theme)` replaces the active runtime theme and automatically
requests a full redraw. A normal cell diff cannot detect that the rendering of
an unchanged palette slot changed, so theme replacement always invalidates the
full frame.

State is fully external to the framework. Use any state management approach — plain variables, classes, libraries. The framework just calls the render function and renders the returned tree.

### Terminal Title

```ts
cel.setTitle(title: string)
```

Sets the terminal window or tab title as an imperative side effect. This is **global terminal state**, not part of the declarative render tree, so it should be called directly when the title needs to change.

The framework emits a best-effort terminal title request using an OSC title sequence. Support varies by terminal emulator, multiplexer, and remote environment — some hosts may ignore it, reinterpret it, or map it to a pane/window title instead.

**Semantics:**

- Later calls replace the previous title set by the app.
- Repeating the same sanitized title is a no-op.
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

| System                     | Description                                                  |
| -------------------------- | ------------------------------------------------------------ |
| Flexbox layout engine      | Sizing, alignment, gap                                       |
| Overflow & scrolling       | `overflow: "hidden" \| "scroll"`, scrollbar                  |
| Layering                   | Multiple viewport layers, composited bottom-to-top           |
| Mouse/scroll hit detection | Pointer-driven, topmost layer first, innermost-first routing |
| Focus management           | Keyboard-driven, for `TextInput` and clickable containers    |
| Keyboard input             | Kitty-first input with tmux/legacy compatibility             |

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

| Prop             | Type                                                                                 | Description                                                                          |
| ---------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `stateKey`       | `string \| number`                                                                   | Stable identity for framework-managed node state                                     |
| `width`          | `SizeValue`                                                                          | Fixed cells or percentage (`"50%"`)                                                  |
| `height`         | `SizeValue`                                                                          | Fixed cells or percentage (`"100%"`)                                                 |
| `flex`           | `number`                                                                             | Flex grow factor, proportional to siblings                                           |
| `minWidth`       | `number`                                                                             | Minimum width constraint                                                             |
| `maxWidth`       | `number`                                                                             | Maximum width constraint                                                             |
| `minHeight`      | `number`                                                                             | Minimum height constraint                                                            |
| `maxHeight`      | `number`                                                                             | Maximum height constraint                                                            |
| `padding`        | `{ x?: number, y?: number }`                                                         | Internal padding (cells)                                                             |
| `gap`            | `number`                                                                             | Spacing between children (cells)                                                     |
| `justifyContent` | `"start" \| "end" \| "center" \| "space-between"`                                    | Distribute children along the main axis                                              |
| `alignItems`     | `"start" \| "end" \| "center" \| "stretch"`                                          | Align children along the cross axis                                                  |
| `flexWrap`       | `"nowrap" \| "wrap"`                                                                 | Wrap children to next line (HStack only)                                             |
| `overflow`       | `"hidden" \| "scroll"`                                                               | Content overflow behavior (default: `"hidden"`)                                      |
| `scrollbar`      | `boolean`                                                                            | Show scrollbar indicator                                                             |
| `scrollbarStyle` | `{ thumb?: ScrollbarPartStyle, track?: ScrollbarPartStyle }`                         | Customize scrollbar characters and styles                                            |
| `scrollStep`     | `number`                                                                             | Mouse wheel step in cells (default: adaptive)                                        |
| `scrollOffset`   | `number`                                                                             | Scroll position in cells (controlled)                                                |
| `onScroll`       | `ScrollHandler`                                                                      | Called on scroll input. Return `false` to keep bubbling.                             |
| `onClick`        | `() => void`                                                                         | Called on mouse click or Enter when focused                                          |
| `focusable`      | `boolean`                                                                            | Focus traversal/click opt-out (TextInput defaults `true`; containers when `onClick`) |
| `focused`        | `boolean`                                                                            | Whether this element is focused (controlled)                                         |
| `autoFocus`      | `boolean`                                                                            | Seed focus once when mounted in the active layer                                     |
| `onFocus`        | `(event: { reason: "auto" \| "tab" \| "shift+tab" \| "click" \| "escape" }) => void` | Called when element receives focus                                                   |
| `onBlur`         | `(event: { reason: "auto" \| "tab" \| "shift+tab" \| "click" \| "escape" }) => void` | Called when element loses focus                                                      |
| `focusStyle`     | `StyleProps`                                                                         | Style overrides applied when focused                                                 |
| `onKeyPress`     | `(key: string, event: KeyEvent) => boolean \| void`                                  | Key event handler. Return `false` to keep bubbling.                                  |

`ScrollHandler` is `((offset: number, maxOffset: number) => void) | ((offset: number, maxOffset: number) => boolean)`. Only an exact `false` return continues propagation to the next scrollable ancestor; any other return value consumes the scroll event. The union preserves source compatibility for legacy void callbacks whose expression bodies incidentally return another value.

### Stateful Node Identity

`stateKey` gives a container or TextInput a stable identity for state owned by
the framework: uncontrolled focus, uncontrolled container scroll, and
TextInput cursor/scroll state. Keys are strings or numbers and must be unique
among the stateful nodes mounted in the viewport at the same time.

State follows a key when siblings are inserted, removed, or reordered and when
the render function creates fresh props and callback objects. A key that is
absent for a complete rendered frame is unmounted: its framework state is
discarded, and later reuse starts a new lifecycle. Controlled props remain the
source of truth regardless of `stateKey`.

For source compatibility, an omitted `stateKey` retains the existing
fallbacks: TextInput state follows its `onChange` function reference,
uncontrolled scroll follows structural position, and uncontrolled focus
follows traversal position. Dynamic/stateful collections should use explicit
keys rather than relying on those fallbacks.

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

This guarantees the total always sums exactly to the available space. Equal
remainders are resolved deterministically in document order.

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

`scrollbarStyle` customizes the thumb and track independently. Each `char`
must be exactly one terminal column; style fields use normal `StyleProps`:

```ts
VStack({
  overflow: "scroll",
  scrollbar: true,
  scrollbarStyle: {
    thumb: { char: "█", fgColor: "color06", bold: true },
    track: { char: "·", fgColor: "color08" },
  },
});
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

For containers, `onScroll` may return `false` to decline handling and continue scroll propagation to the next scrollable ancestor. Any other return value (`undefined`, `true`, or no return) consumes the scroll event and stops propagation, preserving backward compatibility with existing void handlers.

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

Values exceeding the maximum scroll offset are clamped during rendering and hit testing — passing `Infinity` means "scroll to the end". This enables patterns like sticky-bottom scroll:

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

### Variable-height VirtualList

`@cel-tui/components` provides `VirtualList` for collections that are too long
to materialize and lay out on every render. It is a factory: create one callable
instance per mounted list, then call that instance from the viewport render
function with the current items and exact viewport dimensions.

```ts
const messages = VirtualList<Message>({
  itemKey: (message) => message.id,
  renderItem: (message) => Text(message.body, { wrap: "word" }),
  estimatedItemHeight: 3,
  overscan: 8, // cells before and after the viewport
  defaultStickToBottom: true,
});

cel.viewport(() =>
  messages({
    items,
    width: terminalWidth,
    height: conversationHeight,
    scrollbar: true,
  }),
);
```

The component's virtualization contract is:

- Item keys are `string | number`, must be unique within the list, and carry
  measured height plus viewport anchoring across insertions, removals, and
  reordering.
- Cold rows use a positive cell-height estimate (optionally computed from the
  item, index, and current width). Rows in the visible window plus cell-based overscan are rendered and measured with
  `measureContentHeight`; top and bottom spacer nodes represent the rest.
- `maxRenderedItems` is a hard returned-tree bound, including for zero-height
  rows or extreme overscan. `maxCachedItems` bounds retained measurements.
- Omitting `scrollOffset` uses instance-managed scrolling. Supplying it opts
  into controlled scrolling. `onScroll(offset, maxOffset, reason)` receives
  `"input"` for wheel requests and `"anchor"` when layout compensation changes
  the effective offset. Returning exactly `false` bubbles only input events.
- Sticky-bottom state can be instance-managed (`defaultStickToBottom`) or
  controlled (`stickToBottom`). Wheel input away from the end disables the
  uncontrolled sticky state; appends remain pinned while it is active. As with
  core scroll containers, a controlled `scrollOffset: Infinity` also means
  "pin to the current end" on every render.
- The first visible keyed row and its screen position are retained when rows
  are prepended, removed, reordered, or remeasured. A bounded batch of newly
  prepended rows is measured immediately; cold rows converge from their
  estimates as they enter the measurement window.
- A width change clears all measured heights so wrapped content reflows.
  Immutable item replacement invalidates the affected key by default;
  `itemVersion` supports mutable models and `.invalidate(key?)` provides an
  imperative escape hatch.
- `.reset()`, `.scrollTo()`, `.scrollToEnd()`, and `.invalidate()` request a
  render. `.dispose()` eagerly releases retained state when the view is
  permanently removed; the callable can be reused afterward as a fresh list.

---

## Scroll Input Model

Scroll is **pointer-driven**, not focus-driven. Mouse wheel events are routed spatially based on cursor position.

### Hit Detection

1. Terminal reports mouse position via SGR mouse mode
2. Starting from the **topmost layer**, find the deepest node at `(x, y)`
3. If the layer has a node at that position, it handles the event. Otherwise, try the next layer down.
4. For scroll: walk up the ancestor chain from the deepest hit node, considering scrollable nodes innermost-first (containers with `overflow: "scroll"`, or TextInput)
5. For click: walk up to find the nearest container with `onClick`

### Nested Scrollable Containers

Wheel events start at the deepest scrollable ancestor of the hit target. For scrollable containers, if the container's `onScroll` returns `false`, the event continues to the next scrollable ancestor. Otherwise, that first target handles the event and propagation stops. Existing void `onScroll` handlers preserve current behavior because `undefined` consumes the event.

TextInput participates as a scrollable target with framework-managed scroll, but it does not expose `onScroll`; once a TextInput is the scroll target, it handles wheel input directly.

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

- **TextInput** — focusable by default, opt out with `focusable: false`
- **Container with `onClick`** — focusable by default, opt out with `focusable: false`

### Traversal

**Escape** behaves like a normal key first: it bubbles through `onKeyPress` handlers, and if it remains unconsumed the framework unfocuses the current element. **Tab / Shift+Tab** moves focus to the next/previous focusable element in document order (depth-first tree traversal).

When a TextInput is focused, insertable text and text-editing keys go to the input. This includes arrows, backspace, delete, Enter, Tab, plus readline-style shortcuts: `ctrl+a` / `ctrl+e` for start/end, `alt+b` / `alt+f` and `ctrl+left` / `ctrl+right` for whitespace-delimited word movement, and `ctrl+w` / `alt+d` for whitespace-delimited word deletion. `up` and `down` follow the input's visual wrapped lines, not just newline-separated hard lines. Other modifier combos (e.g., `ctrl+s`) are not consumed by TextInput and bubble up. The TextInput's `onKeyPress` handler fires before editing — returning `false` prevents the default action for that key, letting the app override any key's behavior, including Escape blur. Legacy control-byte encodings are normalized when possible, so recoverable shortcuts still bubble in environments like `tmux`. If no handler consumes it, press Escape to leave the input, then Tab to traverse.

### Uncontrolled Focus

**Uncontrolled** (default) — the framework manages focus internally. Tab, Shift+Tab, Escape, and mouse clicks just work with no app-side state:

```ts
HStack({ onClick: handleAction }, [Text("[ Action ]", { bold: true })]);
```

The framework tracks which element is focused. `onFocus` and `onBlur` are optional notification callbacks — they fire when focus changes, include a `{ reason }` object (`"auto" | "tab" | "shift+tab" | "click" | "escape"`), and are not required for focus to work.

Set `autoFocus: true` to seed uncontrolled focus once when that identity first
mounts in the active topmost layer. If multiple elements request it, the first
in document order wins. Covered layers do not claim focus. Escape does not let
the hint reclaim focus on later renders; removing the identity for a complete
rendered frame resets the hint's lifecycle. When a modal layer disappears, the
underlying layer's previous focus is restored without firing focus callbacks:

```ts
HStack(
  {
    onClick: handleAction,
    onFocus: ({ reason }) => addLog(`button focused via ${reason}`),
    onBlur: ({ reason }) => addLog(`button blurred via ${reason}`),
  },
  [Text("[ Action ]", { bold: true })],
);
```

### Controlled Focus

**Controlled** — when `focused` is explicitly provided, the app owns the focus state. The framework calls `onFocus` and `onBlur` with a `{ reason }` object, but does not move focus until the app updates `focused`:

```ts
TextInput({
  value: text,
  onChange: handleChange,
  focused: isEditorFocused,
  onFocus: ({ reason }) => {
    addLog(`focused via ${reason}`);
    isEditorFocused = true;
  },
  onBlur: ({ reason }) => {
    addLog(`blurred via ${reason}`);
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

**Why:** Kitty's baseline disambiguation flag fixes modifier collisions while
its independent progressive-enhancement flags can add event phases, alternate
keys, all-key reporting, and associated text. These are flags, not numbered
protocol levels. Real-world hosts may still preserve only part of the protocol,
so the decoder always accepts mixed Kitty and recoverable legacy forms.

**Support targets:**

- **First-class:** native Kitty-compatible terminals (Kitty, WezTerm, Ghostty, foot, Alacritty, Windows Terminal 1.25+, and others)
- **First-class:** `tmux` with `set -s extended-keys on`
- **Best effort:** legacy terminals or multiplexers that do not preserve Kitty distinctions

**Lifecycle:**

1. `cel.init()` pushes Kitty's baseline disambiguation flag (`CSI > 1 u`) and bracketed paste mode (`CSI ? 2004 h`). `kittyKeyboard` init options add progressive-enhancement bits to the pushed value
2. The input decoder accepts a mixed stream of:
   - Kitty `CSI key:alternate-keys ; modifiers:event-type ; text-codepoints u`
   - legacy CSI letter / tilde sequences for arrows, Home/End, Delete, PageUp/Down, and function keys
   - raw printable text
   - legacy ASCII control bytes for recoverable `ctrl+letter` shortcuts
   - recoverable ESC-prefixed Alt combinations
3. `cel.stop()` pops the keyboard mode (`CSI < u`) and disables bracketed paste mode (`CSI ? 2004 l`), restoring the terminal's previous state

```ts
cel.init(new ProcessTerminal(), {
  kittyKeyboard: {
    reportEventTypes: true,
    reportAlternateKeys: true,
    reportAllKeys: true,
    reportAssociatedText: true,
  },
});
```

The options map directly to Kitty's official flags: event types (`2`),
alternate keys (`4`), all keys as CSI-u (`8`), and associated text (`16`).
Baseline disambiguation (`1`) is always present. Associated text is undefined
without all-key reporting in Kitty, so cel-tui automatically enables bit `8`
when `reportAssociatedText` is requested.

`reportAllKeys` intentionally stops the terminal from sending ordinary text
bytes. Callers that still want TextInput insertion must also request
`reportAssociatedText`; cel-tui does not guess layout/IME output from a physical
key code. Event phases for ordinary text keys likewise require all-key
reporting. Flags unsupported or stripped by the host simply fall back to the
mixed baseline/legacy decoder.

**Stream model:** Terminals and multiplexers may batch multiple keyboard and mouse sequences into a single stdin chunk. The framework treats stdin as a stream and decodes all events in order.

**Baseline details:** With only disambiguation enabled, unmodified special keys with well-known legacy encodings (Tab, Enter, Escape, Backspace) may still arrive as single-byte legacy input. Modified variants use structured sequences when the host preserves them. The parser handles both forms.

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

`onKeyPress` receives `(key, event)`. `event` exposes `eventType`
(`"press" | "repeat" | "release"`), exact associated `text`, the main
`codePoint`, optional `shiftedKey` / `baseLayoutKey`, and reported modifier
state. Legacy events report `eventType: "press"`; modifier fields unavailable
from the legacy bytes are false, and repeat phase/physical layout cannot be
reconstructed after the host discards them.

### Key Event Flow

1. **Topmost layer** receives the key event
2. A **release** event is offered to `onKeyPress` handlers but skips every
   framework default action: no focus traversal, activation, TextInput edit,
   cursor movement, or Escape blur
3. If a **TextInput** is focused:
   - If the TextInput has `onKeyPress`, call it first. If `onKeyPress` returns `false`, the key's **default TextInput action** is prevented — no character insertion, no cursor movement, and no Escape blur. The key is consumed.
   - Otherwise, the TextInput processes insertable text, editing/navigation keys (arrows, backspace, delete, Enter, Tab), and these modifier-based editing shortcuts: `ctrl+a` / `ctrl+e`, `alt+b` / `alt+f`, `ctrl+left` / `ctrl+right`, `ctrl+w`, and `alt+d`. Word movement and deletion use whitespace-delimited boundaries, and `up` / `down` navigate visual wrapped lines. Other modifier combos (e.g., `ctrl+s`) and non-insertable control keys are not editing keys and pass through.
4. If a **clickable container** is focused, Enter press/repeat fires `onClick`. Other keys pass through.
5. Unconsumed keys **bubble up** through ancestors — each `onKeyPress` handler in the ancestor chain is called from innermost to root.
6. A handler that returns `false` signals the key was **not consumed** — bubbling continues to the next ancestor. Any other return (`undefined`, `true`, or no return) **stops bubbling** (backward-compatible: existing `void` handlers consume by default).
7. The root container's `onKeyPress` acts as the global key handler — it receives keys that bubble all the way up.
8. After bubbling, framework default actions run for still-unconsumed press/repeat events. Today that means: if `escape` is still unconsumed and an element is focused, the framework blurs it.

### Key Format

All lowercase, modifiers joined by `+` in canonical order `ctrl+alt+shift+super+hyper+meta+<key>`:

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

**Modifiers in key strings:** `ctrl`, `alt`, `shift`, `super`, `hyper`, `meta`.
The `event.modifiers` object also reports `capsLock` and `numLock` state.

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

Multi-line editable text container. Accepts the explicit `TextInputBaseProps`
subset of container props but has no children — its content is the editable
`value`. Scroll is always uncontrolled (framework-managed): the stored offset
is clamped every render, mouse wheel input adjusts it, and focused inputs
further adjust only as needed to keep the cursor visible.

```ts
TextInput(props: TextInputProps)
```

#### Props

`TextInputBaseProps` includes `stateKey`, sizing (`width`, `height`, `flex`,
`min*`, `max*`, `padding`), styling, focus (`focusable`, `focused`, `autoFocus`,
`onFocus`, `onBlur`, `focusStyle`), key routing (`onKeyPress`), and wheel step
(`scrollStep`). It deliberately excludes child layout, container scroll state,
scrollbar, and click-activation props. TextInput's behavior-specific props are:

| Prop             | Type                                                | Description                                                                                             |
| ---------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `value`          | `string`                                            | Current text content (controlled)                                                                       |
| `onChange`       | `(value: string) => void`                           | Called on text change                                                                                   |
| `cursor`         | `number`                                            | Controlled UTF-16 cursor offset, clamped backward to a grapheme boundary                                |
| `onCursorChange` | `(cursor: number) => void`                          | Called when editing or navigation requests a cursor change                                              |
| `cursorStyle`    | `"block" \| "bar" \| "underline"`                   | Painted and native terminal cursor shape. Defaults to `"block"`                                         |
| `onKeyPress`     | `(key: string, event: KeyEvent) => boolean \| void` | Key handler, fires before editing. Return `false` to prevent the default TextInput action for that key. |
| `placeholder`    | `TextNode`                                          | Text node shown when value is empty (pass a `Text()` call)                                              |

Word-wrap is always on. Cursor position is uncontrolled by default. Providing
`cursor` switches it to controlled mode; editing and navigation call
`onCursorChange`, and the app must update `cursor`. Offsets use JavaScript
UTF-16 string indices but are clamped backward to grapheme boundaries so an
emoji, ZWJ sequence, or combining sequence is never split. Programmatic value
and cursor updates are applied together on the next render; without controlled
`cursor`, external value changes preserve the internal cursor relative to the
unchanged prefix/suffix.

`cursorStyle` controls both cursor representations: the cell-buffer fallback
and the native blinking terminal cursor selected with DECSCUSR. `"block"`
inverts the current cell, `"bar"` paints a vertical bar, and `"underline"`
underlines the current cell. Terminal cleanup restores the user's default
cursor shape.

TextInput scroll follows one rule: clamp the stored offset every render, then if the input is focused, adjust further only as needed to keep the cursor visible after edits, cursor movement, mouse wheel scrolling, or reflow/resize. Supported editing shortcuts include `ctrl+a` / `ctrl+e`, `alt+b` / `alt+f`, `ctrl+left` / `ctrl+right`, `ctrl+w`, and `alt+d`; word movement and deletion use whitespace-delimited boundaries, and `up` / `down` navigate visual wrapped lines. In bracketed paste mode, pasted text is inserted literally at the cursor as one batch edit: one `onChange`, no `onKeyPress`, newlines and tabs preserved.

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

Replace the active theme later with `cel.setTheme(nextTheme)`. Theme changes
automatically perform a full redraw, including when the logical cell buffer is
unchanged. If an application mutates a theme object in place, call
`cel.setTheme(theme)` again or `cel.redraw()` to invalidate the terminal frame.

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

Animation is an explicit component-level lifecycle, never a permanent framework
loop. `createTicker({ maxFps, onTick })` schedules nothing until `.start()`,
requests at most one batched render per tick, skips delayed frames instead of
replaying a catch-up burst, and can be paused with `.stop()` or permanently
released with `.dispose()`. `Spinner()` builds on this scheduler and is likewise
inert unless `.start()` or the explicit `autoStart` option is used.

`cel.redraw()` uses the same batching mechanism but forces the next frame to be
emitted in full. `cel.setTheme()` schedules this full-redraw path automatically.
If a differential frame has no changed cells and no cursor change, the renderer
emits no terminal bytes.

### Synchronized Output

All screen updates are wrapped in **CSI 2026** (`\x1b[?2026h` to begin, `\x1b[?2026l` to end). The terminal holds display updates until the end marker, producing atomic flicker-free screen refreshes.

### Differential Rendering

Three strategies, selected automatically:

| Strategy           | When            | Description                                    |
| ------------------ | --------------- | ---------------------------------------------- |
| **Full + clear**   | Terminal resize | Clear the display, re-render everything        |
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
          onFocus: ({ reason }) => {
            addLog(`editor focused via ${reason}`);
            editorFocused = true;
          },
          onBlur: ({ reason }) => {
            addLog(`editor blurred via ${reason}`);
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
