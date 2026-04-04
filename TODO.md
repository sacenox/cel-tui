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

---

## API Improvements

- ❌ **`repeat: "fill"` should claim flex space in HStack** — `Text(" ", { repeat: "fill" })` inside an HStack gets width 0 because its intrinsic width is 0 and no flex distributes remaining space. The workaround is `VStack({ flex: 1 }, [Text(" ", { repeat: "fill" })])`, which is non-obvious. Fix: either make `repeat: "fill"` imply flex behavior in the layout engine, or document the workaround prominently. The former is preferred.

## Not Yet Implemented

- ❌ **`Markdown` component** — Depends on yoctomarkdown exposing an ANSI-free token API (`BlockToken`/`InlineSpan` types). Once available, the `Markdown(content, props?)` component in `@cel-tui/components` maps tokens to cel-tui Nodes. See `packages/components/src/markdown.ts`. Tracked upstream in yoctomarkdown.

- ❌ Bracketed paste mode support

## Future Enhancements

- 💡 Additional example apps (chat UI, text editor from spec reference examples)
- 💡 `overflow: "hidden"` as explicit prop (currently all containers clip by default, which matches the spec's default behavior, but the prop value is not checked)
- 💡 Higher Kitty protocol levels — key-release events (level 2), associated text (level 3), and full event types (level 4) for advanced input patterns (games, physical key layout awareness)
