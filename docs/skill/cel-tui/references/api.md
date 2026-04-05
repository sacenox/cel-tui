# cel-tui API Reference

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
  scrollOffset,           // number (controlled scroll)
  onScroll,               // (offset: number) => void

  // Styling (inherited by descendants)
  bold, italic, underline,// boolean
  fgColor, bgColor,       // Color ("color00"–"color15")
  focusStyle,             // StyleProps — overrides when focused

  // Interaction
  onClick,                // () => void
  focusable,              // boolean (default true if onClick set, or set true explicitly)
  focused,                // boolean (controlled — omit for uncontrolled)
  onFocus,                // () => void
  onBlur,                 // () => void
  onKeyPress,             // (key: string) => boolean | void — return false to keep bubbling
}
```

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
    onScroll: (newOffset) => {
      offset = newOffset;
      cel.render();
    },
  },
  [...items],
);
```

- Scroll direction follows the container’s main axis: VStack → vertical, HStack → horizontal.
- Scroll is pointer-driven (mouse wheel), not focus-driven. A user can type in a focused widget while scrolling a different container.
- In controlled mode, the UI only moves when the app passes the updated `scrollOffset` back. `onScroll` fires with the clamped new offset.

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

Colors: 16 numbered palette slots — `"color00"` through `"color15"`. Mapped to ANSI 16 by default; custom themes can remap to 256-color or true color. Omit a color prop for the terminal default.

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

TextInput accepts container sizing props (`flex`, `width`, `height`, `padding`, `maxHeight`, etc.).

## Key Format

All lowercase, modifiers joined by `+`: `"ctrl+s"`, `"ctrl+shift+n"`, `"escape"`, `"enter"`, `"alt+up"`, `"f1"`. Framework normalizes modifier order.

## Pre-made Components

```ts
import { Spacer, Divider, Button, Select } from "@cel-tui/components";

Spacer(); // VStack({ flex: 1 }, [])
Divider(); // Text("─", { repeat: "fill" })
Divider({ char: "═", fgColor: "color08" });
Button("[OK]", { onClick: handleOk });
Button("✕", { onClick: handleClose, focusable: false });
// Button accepts: onClick, bold, fgColor, bgColor, focusable, focusStyle
// Note: Button does not forward container sizing props.
// For full control, use HStack + Text directly.
```

### Select (filterable list)

Select props: `items`, `onSelect`, `placeholder` (default `"type to filter..."`), `maxVisible` (default `10`), `indicator` (default `"›"`), `highlightColor` (default `"color06"`), `onKeyPress` (composed with internal handler), plus container/style props: `width`, `height`, `flex`, `fgColor`, `bgColor`, `focused`, `focusable`, `onFocus`, `onBlur`, `focusStyle`.

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

// Select returns false for unrecognized keys, so they bubble to root.
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
