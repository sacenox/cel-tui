# cel-tui — TODO

Remaining work, known bugs, and planned improvements.

## Legend

- 🔧 Bug / spec violation
- ❌ Not yet implemented
- 💡 Future enhancement

---

## Bugs / Spec Violations

- 🔧 **TextInput cursor movement doesn't handle multi-codepoint graphemes** — `deleteBackward`/`deleteForward` in `text-edit.ts` operate on single string indices. For multi-codepoint characters (emoji ZWJ sequences, combining marks), this leaves the cursor mid-grapheme. `moveCursor` has the same issue.

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

- ❌ **No docs for uncontrolled scroll** — All examples/docs use controlled scroll (`scrollOffset` + `onScroll`). The spec's uncontrolled pattern should be shown in SKILL.md and api.md.
