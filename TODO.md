# cel-tui — TODO

Remaining work, known bugs, and planned improvements.

## Legend

- 🔧 Bug / spec violation
- ❌ Not yet implemented
- 💡 Future enhancement

---

## Bugs / Spec Violations

- 🔧 **Uncontrolled container scroll is broken** — `VStack({ overflow: "scroll" }, [...])` without `onScroll` silently drops scroll events. In `cel.ts`, the check `"onScroll" in props` fails when the user omits the callback. The spec says uncontrolled scroll should "just work". Fix: check `props.overflow === "scroll"` instead. No existing tests cover this case.

- 🔧 **Wide character (CJK/emoji) rendering broken in emitter** — `paintLineGraphemes` writes wide chars to the cell buffer but never writes a continuation marker to the second cell. The emitter iterates every cell sequentially, so the empty cell at position x+1 overwrites the right half of the wide char. The `CellBuffer` doc says wide chars use continuation markers, but paint never writes them and the emitter never skips them. Paint tests pass because they only check buffer contents, not emitted ANSI.

- 🔧 **Hit testing ignores scroll offsets** — `hitTest()` uses original layout rects, not scroll-adjusted positions. Clicking on items in a scrolled container hits the wrong node (pre-scroll position). `shiftLayoutNode` only adjusts rects during painting, not in `currentLayouts` used by hit detection.

- 🔧 **TextInput padding accepted but never applied** — `TextInputProps extends ContainerProps` accepts `padding`, but `layout.ts` treats TextInput as a leaf node (no padding subtraction). `paintTextInput` also ignores padding. The spec says TextInput accepts "Container sizing props (width, height, flex, min\*, max\*, padding)".

- 🔧 **TextInput placeholder doesn't inherit styles** — `paintTextInput` passes `props.placeholder.props` directly to `paintText`, bypassing the TextInput's resolved inherited styles. A placeholder without explicit `fgColor` won't inherit from parent containers, unlike all other nodes.

- 🔧 **Key bubbling spuriously consumes keys** — When all `onKeyPress` handlers in the bubbling chain return `false`, the key is still treated as consumed (triggers render, returns early) due to `if (consumed || handlers.length > 0)`. Per spec, `false` means not consumed. Causes unnecessary re-renders.

- 🔧 **`getMaxScrollOffset` doesn't account for padding** — The max scroll offset calculation uses raw child rects relative to the container rect but doesn't subtract padding. Scrollable containers with padding allow scrolling past content.

- 🔧 **TextInput cursor movement doesn't handle multi-codepoint graphemes** — `deleteBackward`/`deleteForward` in `text-edit.ts` operate on single string indices. For multi-codepoint characters (emoji ZWJ sequences, combining marks), this leaves the cursor mid-grapheme. `moveCursor` has the same issue.

- 🔧 **Spec reference example inconsistency** — The chat example uses `msg.blocks.map(...)` but message construction only sets `content`, not `blocks`.

---

## API Improvements

- ❌ **Upgrade `Button` component** — `Button` from `@cel-tui/components` doesn't forward `focusStyle`, `fgColor`, `bgColor`, or other container/style props to the underlying HStack. With uncontrolled focus and focusStyle now available, Button should accept these to be useful for keyboard navigation without inline HStack wrappers.

- ❌ **`repeat: "fill"` should claim flex space in HStack** — `Text(" ", { repeat: "fill" })` inside an HStack gets width 0 because its intrinsic width is 0 and no flex distributes remaining space. The workaround is `VStack({ flex: 1 }, [Text(" ", { repeat: "fill" })])`, which is non-obvious. Fix: either make `repeat: "fill"` imply flex behavior in the layout engine, or document the workaround prominently. The former is preferred.

- ❌ **`VDivider` component** — Drawing a vertical divider requires `VStack({ width: 1, height: "100%" }, [Text("│", { repeat: "fill" })])`. A `VDivider({ char, fgColor })` component would match the existing horizontal `Divider` and reduce boilerplate.

## Not Yet Implemented

- ❌ Bracketed paste mode support

## Future Enhancements

- 💡 Additional example apps (chat UI, text editor from spec reference examples)
- 💡 `overflow: "hidden"` as explicit prop (currently all containers clip by default, which matches the spec's default behavior, but the prop value is not checked)
- 💡 Higher Kitty protocol levels — key-release events (level 2), associated text (level 3), and full event types (level 4) for advanced input patterns (games, physical key layout awareness)

---

## Documentation Gaps

- 🔧 **Duplicate JSDoc** — `paintLineGraphemes` in `paint.ts` has its doc comment written twice.
- ❌ **No docs for uncontrolled scroll** — All examples/docs use controlled scroll (`scrollOffset` + `onScroll`). The spec's uncontrolled pattern isn't shown anywhere.
