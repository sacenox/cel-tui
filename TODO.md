# cel-tui — TODO

Remaining work, known bugs, and planned improvements.

## Legend

- 🔧 Bug / spec violation
- ❌ Not yet implemented
- 💡 Future enhancement

---

## Bugs / Spec Violations

- 🔧 **TextInput cursor movement doesn't handle multi-codepoint graphemes** — `deleteBackward`/`deleteForward` in `text-edit.ts` operate on single string indices. For multi-codepoint characters (emoji ZWJ sequences, combining marks), this leaves the cursor mid-grapheme. `moveCursor` has the same issue.

- 🔧 **Controlled-focus TextInput traps Tab traversal** — When a controlled-focus TextInput (`focused` prop provided) is the first focusable element, Tab from unfocused state always focuses it. Once focused, Tab is consumed as an editing key. Escape unfocuses it, but the next Tab re-focuses it again — the user can never Tab past it to reach subsequent focusable elements. Visible in `examples/pet.ts` on the create screen: the name TextInput prevents keyboard access to the Create Pet button. Possible fixes: (1) make Escape+Tab advance past the previously-focused element, (2) let controlled-focus elements participate differently in traversal ordering, or (3) add a dedicated "skip" key.

- 🔧 **Scrollbar thumb position ignores padding** — `paintScrollbar` in `paint.ts` computes `maxOffset = contentHeight - rect.height` without accounting for container padding, while the scroll clamping logic uses `contentHeight + padY - rect.height`. For padded scrollable containers the thumb position is slightly off.

- 🔧 **Duplicate max scroll offset calculation** — `getMaxScrollOffset` in `cel.ts` and `computeMaxScrollOffset` in `paint.ts` implement the same logic. Should be extracted to a shared function.

---

## API Improvements

- ❌ **`repeat: "fill"` should claim flex space in HStack** — `Text(" ", { repeat: "fill" })` inside an HStack gets width 0 because its intrinsic width is 0 and no flex distributes remaining space. The workaround is `VStack({ flex: 1 }, [Text(" ", { repeat: "fill" })])`, which is non-obvious. Fix: either make `repeat: "fill"` imply flex behavior in the layout engine, or document the workaround prominently. The former is preferred.

## Not Yet Implemented

- ❌ Bracketed paste mode support

- ❌ **Markdown inline styling** — The `Markdown` component strips inline formatting (`**bold**`, `*italic*`, `` `code` ``, `[links](url)`) to plain text. With `flexWrap: "wrap"` on HStack (now implemented), the component can split inline spans at word boundaries into individual `Text` nodes and wrap them in `HStack({ flexWrap: "wrap" })`. The framework handles line wrapping; the component handles word splitting.

## Future Enhancements

- 💡 Additional example apps (text editor from spec reference example)
- 💡 `overflow: "hidden"` as explicit prop (currently all containers clip by default, which matches the spec's default behavior, but the prop value is not checked)
- 💡 Higher Kitty protocol levels — key-release events (level 2), associated text (level 3), and full event types (level 4) for advanced input patterns (games, physical key layout awareness)
