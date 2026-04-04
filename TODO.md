# cel-tui — TODO

Remaining work, known bugs, and planned improvements.

## Legend

- 🔧 Bug / spec violation
- ❌ Not yet implemented
- 💡 Future enhancement

---

## Bugs & Spec Violations

- ✅ **Tab key consumed by TextInput when focused** — Fixed. Tab/Shift+Tab focus traversal is now skipped when a TextInput is focused. Tab inserts `\t` as an editing key. Press Escape first, then Tab to traverse.

- ✅ **Mouse wheel scroll inside TextInput** — Fixed. Scroll events targeting a TextInput now update its framework-managed scroll offset directly, instead of requiring `onScroll`/`overflow: "scroll"` container props.

- ✅ **Batched mouse events dropped** — Fixed. Real terminals send multiple SGR mouse events in a single stdin data chunk (e.g., 3 scroll events concatenated). The parser expected one event per chunk and silently dropped batched input. Now scans for all events in the chunk and processes each one, with scroll offset accumulation for controlled scroll.

## API Improvements

- ❌ **`bgColor` on containers** — Containers (VStack/HStack) have no background color. This forces manual per-row fills with `HStack({}, [Text(...), VStack({ flex: 1 }, [Text(" ", { repeat: "fill", bgColor })])])` to create solid panels, modals, or sidebars. Fix: add `bgColor` to `ContainerProps`. Paint should fill the container rect with bgColor before painting children. Single biggest DX win from the pet example.

- ❌ **Upgrade `Button` component with focus support** — `Button` from `@cel-tui/components` only passes `onClick` and `focusable` to the underlying HStack. It doesn't support `focused`/`onFocus`/`onBlur`, making it useless for keyboard navigation. Every focusable button in the pet example required 5 inline props. Fix: add `focused`, `onFocus`, `onBlur`, and a `name` prop to `ButtonProps`, and forward them to the HStack.

- ❌ **Uncontrolled focus option** — Focus is always controlled (app owns the state via `focused`/`onFocus`/`onBlur`). This creates significant boilerplate — every focusable element needs a state variable, an onFocus setter, an onBlur guard, and a `cel.render()` call. The framework should support uncontrolled focus by default (framework tracks focus internally, Tab/Shift+Tab/Escape just work), with controlled as an opt-in when `focused` is explicitly provided. Mirrors the uncontrolled/controlled scroll pattern.

- ❌ **`repeat: "fill"` should claim flex space in HStack** — `Text(" ", { repeat: "fill" })` inside an HStack gets width 0 because its intrinsic width is 0 and no flex distributes remaining space. The workaround is `VStack({ flex: 1 }, [Text(" ", { repeat: "fill" })])`, which is non-obvious. Fix: either make `repeat: "fill"` imply flex behavior in the layout engine, or document the workaround prominently. The former is preferred.

- ❌ **`VDivider` component** — Drawing a vertical divider requires `VStack({ width: 1, height: "100%" }, [Text("│", { repeat: "fill" })])`. A `VDivider({ char, fgColor })` component would match the existing horizontal `Divider` and reduce boilerplate.

## Not Yet Implemented

- ❌ Bracketed paste mode support
- ❌ Kitty keyboard protocol detection

## Future Enhancements

- 💡 Style context / theming — a way to set default styles for a subtree without inheritance. Deferred until the core is more battle-tested.
- 💡 Additional example apps (chat UI, text editor from spec reference examples)
- 💡 `overflow: "hidden"` as explicit prop (currently all containers clip by default, which matches the spec's default behavior, but the prop value is not checked)
