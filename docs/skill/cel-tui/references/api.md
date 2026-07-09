# cel-tui API Reference

## Framework lifecycle

```ts
cel.init(new ProcessTerminal(), {
  theme?: Theme,
  kittyKeyboard?: KittyKeyboardOptions,
});
cel.viewport(() => tree); // or () => [layer1, layer2]
cel.render();
cel.redraw();
cel.setTheme(theme);
cel.setTitle("My App");
cel.stop();
```

- `cel.viewport` sets the render function and triggers the first render.
- `cel.render()` requests a batched re-render after external state changes.
- `cel.redraw()` requests a batched full-frame redraw and bypasses the cell-diff baseline.
- `cel.setTheme(theme)` replaces the active runtime theme and automatically redraws the full frame.
- `cel.setTitle(title)` writes a best-effort terminal title request. Control characters are stripped from `title`, and `cel.stop()` does not restore the previous title automatically.
- `cel.stop()` restores terminal state (raw mode, keyboard protocol, mouse tracking, alternate screen).

## Container Props

All props accepted by `VStack` and `HStack`:

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
  scrollbarStyle,         // { thumb?: { char?, ...StyleProps }, track?: { char?, ...StyleProps } }
  scrollStep,             // number (mouse wheel step in cells; default adaptive)
  scrollOffset,           // number (controlled scroll)
  onScroll,               // ScrollHandler; return false to keep bubbling
  flexWrap,               // "nowrap" (default) | "wrap" (HStack only)

  // Styling (inherited by descendants)
  bold, italic, underline,// boolean
  fgColor, bgColor,       // Color ("color00"–"color15")
  focusStyle,             // StyleProps — overrides when focused

  // Interaction
  stateKey,               // string | number — stable framework state identity
  onClick,                // () => void
  focusable,              // boolean (TextInput defaults true; containers with onClick do too)
  focused,                // boolean (controlled — omit for uncontrolled)
  autoFocus,              // boolean — seed active-layer focus once per mount
  onFocus,                // ({ reason }) => void — reason includes "auto" | "tab" | "shift+tab" | "click" | "escape"
  onBlur,                 // ({ reason }) => void — reason includes "auto" | "tab" | "shift+tab" | "click" | "escape"
  onKeyPress,             // (key: string, event: KeyEvent) => boolean | void — return false to keep bubbling
}
```

## Measurement Helpers

```ts
measureContentHeight(node, { width }); // number
```

- Measures a node tree's **intrinsic content height** at the provided wrapping width.
- This is a content-measurement helper, not a viewport/clipping helper.
- The provided `width` is authoritative — use the actual width the subtree wraps at.
- Main use case: prepend-style scrollback, where older content is inserted above the current viewport and the app needs to preserve the viewport anchor.

```ts
const addedHeight = measureContentHeight(
  VStack({}, olderMessages.map(renderMessage)),
  { width: historyContentWidth },
);

scrollOffset += addedHeight;
```

Measure the content subtree you are adding. If a wrapper's visible height is controlled by `height`, `flex`, or percentage sizing, measure the content inside that wrapper instead. For padded content, pass the outer width when measuring the padded container itself, or the inner content width when measuring its children directly.

## Scroll

Scroll supports **uncontrolled** (default) and **controlled** modes, mirroring the focus model:

```ts
// Uncontrolled — framework manages scroll position. Mouse wheel just works.
VStack({ overflow: "scroll", scrollbar: true }, [...items]);

// Controlled — app owns scroll state.
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

- Scroll direction follows the container’s main axis: VStack → vertical, HStack → horizontal.
- Scroll is pointer-driven (mouse wheel), not focus-driven. A user can type in a focused widget while scrolling a different container.
- Mouse wheel scrolling uses an adaptive default step based on the scroll target's visible main-axis viewport size: `floor(viewportMainAxis / 3)`, clamped to `3..8`.
- Set `scrollStep` to override the mouse wheel step for a specific scrollable or `TextInput`.
- In controlled mode, the UI only moves when the app passes the updated `scrollOffset` back. `onScroll` fires with the clamped new offset and the maximum offset (content size minus viewport size). Return exactly `false` to decline handling and continue to the next scrollable ancestor; any other return value consumes the scroll. Pass `Infinity` as `scrollOffset` to mean "scroll to end" (clamped during rendering and hit testing). `scrollStep` affects mouse wheel input only.

## Text Props

```ts
Text("content", {
  repeat: "fill" | number, // Repeat to fill width or N times
  wrap: "none" | "word", // Default "none", hard-clips at edge
  bold,
  italic,
  underline, // boolean
  fgColor,
  bgColor, // Color ("color00"–"color15")
});
```

Colors: 16 numbered palette slots — `"color00"` through `"color15"`. Mapped to ANSI 16 by default; custom themes can remap to different ANSI indices or 24-bit true color. Omit a color prop for the terminal default.

## TextInput Props

```ts
TextInput({
  value, // string (controlled)
  onChange, // (value: string) => void
  cursor, // number (optional controlled UTF-16 grapheme-boundary offset)
  onCursorChange, // (cursor: number) => void
  cursorStyle, // "block" | "bar" | "underline" (default: "block")
  onKeyPress, // (key: string, event: KeyEvent) => boolean | void — return false to prevent default editing action
  placeholder, // Text() node shown when empty
  // + TextInputBaseProps: stateKey, sizing, styling, focus,
  //   onKeyPress, and scrollStep (no child-layout/container-scroll props)
});
```

Use `stateKey` for TextInputs created with inline callbacks or rendered in
dynamic collections. Providing `cursor` opts into controlled caret state;
cursor updates are clamped backward to grapheme boundaries and reported via
`onCursorChange`.

TextInput participates in Tab traversal and mouse focus by default. Pass
`focusable: false` for a display-only or programmatically controlled input;
explicit `focused: true` can still activate it.

`cursorStyle` keeps the painted fallback and native blinking terminal cursor
in sync. Runtime cleanup restores the terminal's configured default shape.

Enter inserts a newline by default. Use `onKeyPress` to intercept keys before editing:

```ts
// Enter submits instead of inserting newline
TextInput({
  value: input,
  onChange: handleChange,
  onKeyPress: (key) => {
    if (key === "enter") {
      handleSend();
      return false;
    }
  },
});
```

When focused, TextInput consumes insertable text plus editing/navigation keys, including readline-style shortcuts: `ctrl+a` / `ctrl+e`, `alt+b` / `alt+f`, `ctrl+left` / `ctrl+right`, `ctrl+w`, and `alt+d`. Word movement and deletion are whitespace-delimited, and `up` / `down` navigate visual wrapped lines. The stored scroll offset is clamped every render; when focused, the viewport adjusts further only as needed to keep the cursor visible after edits, cursor movement, mouse wheel scrolling, or reflow/resize. Other modifier combos and non-insertable control keys bubble. Key strings are semantic identifiers for handlers, not necessarily the exact inserted text — uppercase `A` normalizes to key `"a"` while still inserting `"A"`.

## Sizing Strategies

Containers accept 4 sizing strategies:

```ts
VStack({}, []); // Intrinsic — size to fit content (default)
VStack({ width: 30, height: 10 }, []); // Fixed — exact cell count
VStack({ flex: 1 }, []); // Flex — proportional to siblings
VStack({ width: "50%", height: "100%" }, []); // Percentage — relative to parent
```

Constraints: `minWidth`, `maxWidth`, `minHeight`, `maxHeight`.

Text has no sizing props — parent controls the box, height is intrinsic (content + wrapping).

TextInput accepts container sizing props (`flex`, `width`, `height`, `padding`, `maxHeight`, etc.) plus container scroll props like `scrollStep` for mouse wheel behavior.

## Key Format

All lowercase, modifiers joined by `+`: `"ctrl+s"`, `"ctrl+shift+n"`, `"escape"`, `"enter"`, `"alt+up"`, `"f1"`. Framework normalizes modifier order.

cel-tui is **Kitty-first** and works well in `tmux` with `set -s extended-keys on`. Recoverable legacy forms normalize to the same key strings, but historically collapsed collisions (`ctrl+i` vs `tab`, `ctrl+m` vs `enter`, `ctrl+[` vs `escape`) remain limited by what the host terminal or multiplexer reports.

Advanced reporting uses Kitty's actual independent flags, not numbered levels:

```ts
cel.init(new ProcessTerminal(), {
  kittyKeyboard: {
    reportEventTypes: true,
    reportAlternateKeys: true,
    reportAllKeys: true,
    reportAssociatedText: true,
  },
});

VStack({
  onKeyPress: (key, event) => {
    log(event.eventType, key, event.text, event.baseLayoutKey);
  },
});
```

Release events reach handlers but never trigger editing, activation, traversal,
or Escape blur. `reportAssociatedText` automatically enables all-key reporting.
If `reportAllKeys` is requested without associated text, the terminal no longer
sends insertable text, so TextInput deliberately does not synthesize it from a
physical key code. Legacy events report `"press"` and false for modifier state
the host did not encode.

## Pre-made Components

```ts
import {
  Spacer,
  Divider,
  Button,
  Select,
  VirtualList,
  Spinner,
  createTicker,
  VDivider,
  Markdown,
  createSyntaxHighlight,
  SyntaxHighlight,
} from "@cel-tui/components";

Spacer(); // VStack({ flex: 1 }, [])
Divider(); // Text("─", { repeat: "fill" })
Divider({ char: "═", fgColor: "color08" });
Button("[OK]", { onClick: handleOk });
Button("✕", { onClick: handleClose, focusable: false });
// Button accepts: onClick, focusable, focused, onFocus, onBlur, focusStyle,
// onKeyPress, padding, bold, fgColor, bgColor, italic, underline.
// Note: Button does not forward container sizing props (width, height, flex).
// For full layout control, use HStack + Text directly.
```

### Spinner and managed animation

`Spinner()` returns an inert callable instance. Start it only while animation
is useful, and dispose it when its owner is removed:

```ts
const loading = Spinner({
  maxFps: 12,
  fgColor: "color06",
  frames: ["⠋", "⠙", "⠹", "⠸"],
});

loading.start();
cel.viewport(() => HStack({ gap: 1 }, [loading(), Text("Loading...")]));

loading.stop(); // pause and retain the current frame
loading.reset(); // return to frame zero and render
loading.dispose(); // permanently release timer callbacks
```

Frames are padded to a stable terminal width by default. The callable accepts
per-render `TextProps` overrides and exposes `.current`, `.frame`, `.running`,
and `.disposed`. `autoStart: true` is available when immediate scheduling is
explicitly desired.

For arbitrary external animation state, use the same rate-limited scheduler:

```ts
const ticker = createTicker({
  maxFps: 20,
  onTick: ({ deltaMs, elapsedMs, frame }) =>
    updateAnimation({
      deltaMs,
      elapsedMs,
      frame,
    }),
});

ticker.start();
ticker.stop();
ticker.dispose();
```

Construction schedules no work. Delayed frames are skipped, never replayed in
a burst, and each successful tick requests one batched `cel.render()`.

### Select (filterable list)

`Select()` creates a callable component instance backed by a real `TextInput`.
Query editing therefore preserves exact case and spaces, deletes whole
graphemes, supports cursor/readline navigation, and inserts bracketed paste as
one edit. Up/Down navigate filtered rows, PageUp/PageDown jump by one visible
page, Enter selects, and Escape calls `onCancel` when supplied. Home/End and
Left/Right edit the query cursor.

The small static-list API remains uncontrolled by default:

```ts
const mySelect = Select({
  items: ["apple", "banana", "cherry"],
  onSelect: (value) => {
    chosen = value;
    cel.render();
  },
  placeholder: "search fruits...",
  maxVisible: 8,
});

// Non-editing shortcuts bubble through the TextInput to the root.
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
    [Text("Pick a fruit:"), mySelect()],
  ),
);

// Reset state programmatically
mySelect.reset();
```

Core props are `items`, `onSelect`, `initialQuery`, controlled `query` /
`onQueryChange`, `initialHighlightIndex`, controlled `highlightIndex` /
`onHighlightChange`, controlled query `cursor` / `onCursorChange`, `onCancel`,
`filter`, and `renderRow`. Display props include `placeholder`, `searchLabel`,
`emptyLabel`, `maxVisible`, `indicator`, and `highlightColor`; focus/layout/style
props include `stateKey`, `autoFocus`, `focused`, `focusable`, `onFocus`,
`onBlur`, `focusStyle`, `onKeyPress`, `width`, `height`, `flex`, `fgColor`, and
`bgColor`.

Rich items separate their display label, selected value, and filter text:

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

Async and multi-pane apps can pass a controlled model on every render. The
factory configuration retains callbacks and presentation while current data
stays external:

```ts
let items = [];
let query = "";
let cursor = 0;
let highlightIndex = 0;

const picker = Select({
  items,
  autoFocus: true,
  onQueryChange: (next) => (query = next),
  onCursorChange: (next) => (cursor = next),
  onHighlightChange: (next) => (highlightIndex = next),
  onSelect: openModel,
  onCancel: closePicker,
  filter: (candidates, search) =>
    candidates.filter((item) => item.filterText.includes(search)),
  renderRow: (item, { highlighted, indicator }) =>
    Text(`${highlighted ? indicator : " "} ${item.label}`),
});

cel.viewport(() => picker({ items, query, cursor, highlightIndex }));
```

`picker.update({ items, query, cursor, highlightIndex })` updates the
uncontrolled fallback imperatively and schedules a render. `picker.getState()`
returns the latest rendered snapshot, including normalized and filtered items.

### VirtualList (variable-height windowing)

`VirtualList(options)` returns a callable instance. Create one instance per
mounted list and call it inside `cel.viewport()` with the current collection and
exact viewport dimensions:

```ts
const history = VirtualList<Message>({
  itemKey: (message) => message.id,
  renderItem: (message) =>
    VStack({ gap: 1 }, [
      Text(message.author, { bold: true }),
      Text(message.body, { wrap: "word" }),
    ]),
  estimatedItemHeight: 4,
  itemVersion: (message) => message.revision,
  gap: 1,
  overscan: 12,
  maxCachedItems: 2048,
  maxRenderedItems: 512,
  defaultStickToBottom: true,
});

cel.viewport(() =>
  history({
    items: messages,
    width: conversationWidth,
    height: conversationHeight,
    scrollbar: true,
  }),
);
```

Construction options:

- `itemKey(item, index)` — required `string | number` identity; duplicate keys
  throw.
- `renderItem(item, index)` — required row renderer, called only for the active
  measurement/window set. Rows should use intrinsic or fixed height rather than
  viewport-relative main-axis sizing.
- `estimatedItemHeight` — positive cell height or `(item, index, width)`
  function; default `1`.
- `itemVersion` — height-cache revision; defaults to the item value/reference.
- `gap` — cells between rows; default `0`.
- `overscan` — extra cells before and after the viewport; default `4`.
- `maxCachedItems` — bounded retained measurements; default `2048`.
- `maxRenderedItems` — hard item-node bound; default `512`.
- `defaultScrollOffset` / `defaultStickToBottom` — initial uncontrolled state.

Render props require `items`, numeric `width`, and numeric `height`. Normal
container style/focus/scrollbar props are forwarded. Per-render `gap` and
`overscan` override the factory defaults.

- Omit `scrollOffset` for instance-managed scrolling; provide it for controlled
  mode. Controlled `Infinity` preserves the core "scroll to end" convention.
- `stickToBottom` controls sticky state; omit it to use the instance-managed
  default. `onStickToBottomChange` reports wheel transitions.
- `onScroll(offset, maxOffset, reason)` receives `"input"` for wheel requests
  and `"anchor"` for keyed layout compensation. Returning exactly `false`
  bubbles only an input event.
- The first visible key retains its screen position across prepend, removal,
  reorder, and measured-height changes. Cold rows use estimates until measured.
- Changing `width` clears measured heights so wrapped rows reflow.

Instance methods are `.getState()`, `.reset()`, `.invalidate(key?)`,
`.scrollTo(offset)`, `.scrollToEnd()`, and `.dispose()`. All mutation methods
except `.dispose()` request a batched render. `.dispose()` eagerly clears the
bounded cache and state; the callable can be reused as a fresh instance.

### VDivider (vertical divider)

```ts
import { VDivider } from "@cel-tui/components";

// Separate columns in an HStack
HStack({ height: "100%" }, [
  VStack({ flex: 1 }, [Text("left pane")]),
  VDivider({ fgColor: "color08" }),
  VStack({ flex: 1 }, [Text("right pane")]),
]);

// Custom character
VDivider({ char: "║", fgColor: "color08" });
```

### Markdown (rendered markdown)

Returns an array of nodes — spread into a container's children:

````ts
import { Markdown } from "@cel-tui/components";

VStack(
  { flex: 1, overflow: "scroll", padding: { x: 1 } },
  Markdown("# Hello\n\nSome **bold** text.\n\n```js\nconst x = 1;\n```"),
);
````

Custom theme for markdown styling:

```ts
Markdown(content, {
  theme: {
    heading1: { bold: true, fgColor: "color05" },
    codeBlock: { bgColor: "color08" },
    bold: { bold: true, fgColor: "color03" },
  },
});
```

Streaming works naturally — append chunks and call `cel.render()`. Unclosed blocks are handled gracefully.
Inline bold, italic, code, and link styles are preserved in headings, paragraphs, list items, and blockquotes; the surrounding block style remains inherited.

### SyntaxHighlight (rendered code)

Returns a `VStack` — place it directly in a container's children:

```ts
import {
  createSyntaxHighlight,
  SyntaxHighlight,
  type SyntaxHighlightNativeTheme,
} from "@cel-tui/components";

VStack({ flex: 1, overflow: "scroll", padding: { x: 1 } }, [
  SyntaxHighlight(code, "typescript"),
]);

SyntaxHighlight(code, "javascript", { theme: "dark-plus" });

const nativeTheme = {
  baseStyle: { fgColor: "color07" },
  scopeStyles: {
    keyword: { fgColor: "color12", bold: true },
    comment: { fgColor: "color08", italic: false },
    string: { fgColor: "color10" },
  },
} satisfies SyntaxHighlightNativeTheme;

SyntaxHighlight(code, "typescript", { theme: nativeTheme });

const highlightMessage = createSyntaxHighlight(); // create once per snippet
highlightMessage(streamedCode, "typescript");
highlightMessage.dispose(); // optional eager release when permanently removed
```

- Signature: `SyntaxHighlight(content, language, props?)`
- Stateful factory: `createSyntaxHighlight()` returns a callable with the same signature plus `.dispose()`
- `language` accepts registered `clew` language ids (`typescript` / `javascript` families plus `python` / `py`, `bash`, `json`, `markdown`, and `diff` / `patch` right now)
- `props.theme` accepts the built-in presets (`"default"`, `"dark-plus"`) or a theme registration targeting canonical `clew` scopes
- Compatible TextMate fields remain available: `fg`, `bg`, and `tokenColors` accept hex colors and quantize them to the nearest palette slot
- Native `baseStyle` and `scopeStyles` fields accept cel-tui `StyleProps` directly, preserve `color00`–`color15`, and follow later `cel.setTheme()` palette changes without re-highlighting
- When both forms are present, native fields take precedence property-by-property; explicit `false` values clear inherited `bold`, `italic`, or `underline`
- Uses a terminal-friendly ANSI 16 fallback theme by default
- Highlighting is synchronous at the component boundary; unsupported languages render plain text
- Direct calls use a bounded exact-render cache and never infer snippet identity from content prefixes
- A callable instance owns one isolated `clew` stream: append-only updates reuse it, while non-append edits replay only that snippet

## Theme

The default theme maps 16 color slots to ANSI palette indices. Custom themes remap to different ANSI indices or 24-bit hex:

```ts
import { cel, ProcessTerminal, type Theme } from "@cel-tui/core";

const mocha: Theme = {
  color00: "#1e1e2e",
  color01: "#f38ba8",
  color02: "#a6e3a1",
  color03: "#f9e2af",
  color04: "#89b4fa",
  color05: "#cba6f7",
  color06: "#94e2d5",
  color07: "#cdd6f4",
  color08: "#45475a",
  color09: "#f38ba8",
  color10: "#a6e3a1",
  color11: "#f9e2af",
  color12: "#89b4fa",
  color13: "#cba6f7",
  color14: "#94e2d5",
  color15: "#bac2de",
};

cel.init(new ProcessTerminal(), { theme: mocha });
```

App code uses `"color00"`–`"color15"` regardless of theme. The mapping is a rendering concern.
