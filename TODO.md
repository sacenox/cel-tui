# cel-tui — TODO

What's implemented, what's missing, and what needs hardening. Reference `spec.md` for full design.

## Legend

- ✅ Implemented and tested
- 🔧 Partially implemented (basic version exists, needs work)
- ❌ Not yet implemented

---

## Layout Engine

- ✅ Fixed sizing (`width: 30, height: 10`)
- ✅ Intrinsic sizing (containers fit children, Text height from content)
- ✅ Flex distribution with largest remainder rounding
- ✅ Percentage sizing (`width: "50%"`)
- ✅ Constraints (`minWidth`, `maxWidth`, `minHeight`, `maxHeight`)
- ✅ Gap spacing between children
- ✅ Padding (`{ x, y }`)
- ❌ `justifyContent` — positions are computed but alignment offsets not applied (`"start"`, `"end"`, `"center"`, `"space-between"`)
- ❌ `alignItems` — cross-axis alignment not applied (`"start"`, `"end"`, `"center"`, `"stretch"`)

## Rendering

- ✅ Cell buffer (2D grid, get/set/fill/clear/resize/diff/isEmpty)
- ✅ ANSI emitter (SGR colors, bold/italic/underline, synchronized output CSI 2026)
- ✅ Reactive rendering (`cel.render()` batched via `process.nextTick`)
- ✅ Full render on first paint, cursor home positioning
- 🔧 Differential rendering — `CellBuffer.diff()` exists but `cel.ts` always does full redraws (doesn't use diff to skip unchanged cells)
- ❌ Full clear + re-render on terminal resize (currently re-renders but doesn't clear scrollback)

## Painting

- ✅ Text painting (content, newlines, styling)
- ✅ Text `repeat: "fill"` and `repeat: <number>`
- ✅ Text `wrap: "word"` (basic word-wrap)
- ✅ Hard clipping at rect boundaries
- ✅ TextInput painting (value, placeholder, cursor via color inversion)
- 🔧 Text wrapping and layout use `string.length` for width — should use `visibleWidth()` for correct CJK/emoji handling
- ❌ Overflow clipping (`overflow: "hidden"`) — children aren't clipped to parent bounds
- ❌ Scroll rendering (`overflow: "scroll"`) — content offset not applied during painting
- ❌ Scrollbar rendering (`scrollbar: true`)

## Input

- ✅ Key parsing (ASCII, control chars, CSI sequences, arrow keys, function keys)
- ✅ Key normalization (canonical modifier order)
- ✅ Mouse event parsing (SGR mode: click, scroll-up, scroll-down)
- ✅ Hit detection (point → deepest node path)
- ✅ Click routing (innermost `onClick` wins)
- ✅ Scroll routing (innermost scrollable, fires `onScroll`)
- ✅ Key routing to `onKeyPress` handlers
- ✅ TextInput key consumption (editing keys consumed, modifiers bubble)
- 🔧 `onKeyPress` bubbling — currently only checks the root container, should walk up from focused element through all ancestors
- ❌ Focus traversal (Tab/Shift+Tab cycling through focusable elements)
- ❌ Escape to unfocus
- ❌ Enter to activate focused clickable container
- ❌ Mouse click focusing (clicking a focusable element should fire `onFocus`)
- ❌ `onFocus`/`onBlur` callbacks not fired by framework

## Layer Compositing

- ✅ Multiple layers paint bottom-to-top
- ✅ Transparency (empty cells in upper layer show lower layer)
- ✅ Topmost layer receives input events first
- ✅ Conditional layers (show/hide via array inclusion)

## TextInput

- ✅ Text editing (insert, delete backward/forward)
- ✅ Cursor movement (left/right/up/down/home/end)
- ✅ Vertical navigation across lines
- ✅ `onChange` fires on edits
- ✅ `onSubmit` fires on `submitKey`
- ✅ Placeholder rendering
- ✅ Cursor display (inverted colors)
- 🔧 Cursor state uses `WeakMap` keyed on props — works for single render but may lose cursor position across re-renders since props objects are recreated each frame
- ❌ Framework-managed scroll (auto-scroll to keep cursor visible)
- ❌ Mouse wheel scroll inside TextInput

## Terminal

- ✅ `ProcessTerminal` (raw mode, SGR mouse, cursor hide/show)
- ✅ `MockTerminal` (captured output, simulated input/resize)
- ❌ Restore terminal state on crash/unhandled exception (cleanup handler)
- ❌ Bracketed paste mode support
- ❌ Kitty keyboard protocol detection

## Pre-made Components

- ✅ `Spacer` — `VStack({ flex: 1 }, [])`
- ✅ `Divider` — `Text(char, { repeat: "fill" })`
- ✅ `Button` — `HStack({ onClick }, [Text(label)])`

## Developer Experience

- ✅ JSDoc on all public types, interfaces, and functions
- ✅ TypeDoc generation (HTML + Markdown)
- ✅ Agent Skills file (`docs/skill/cel-tui/SKILL.md`)
- ✅ AGENTS.md for onboarding
- ❌ Example apps that fully work end-to-end (`examples/hello.ts` needs alignment)

---

## Priority Order

Suggested order to tackle remaining work:

1. **`justifyContent` + `alignItems`** — unblocks the hello example and any centered layout
2. **`visibleWidth` integration** — text measurement in layout + paint should use grapheme-aware width
3. **Overflow clipping** — parent bounds must clip children (`overflow: "hidden"`)
4. **Scroll rendering** — `overflow: "scroll"` offsets content, scrollbar indicator
5. **Differential rendering** — use `CellBuffer.diff()` to emit only changed cells
6. **Focus system** — Tab traversal, Escape unfocus, Enter activate, onFocus/onBlur
7. **`onKeyPress` full bubbling** — walk up from focused element, not just root
8. **TextInput cursor persistence** — stable identity across re-renders
9. **TextInput auto-scroll** — scroll to keep cursor visible
10. **Terminal hardening** — crash cleanup, bracketed paste, resize clear
