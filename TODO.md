# cel-tui — TODO

Remaining work, known bugs, and planned improvements.

## Legend

- 🔧 Bug / spec violation
- ❌ Not yet implemented
- 💡 Future enhancement

---

## API Improvements

- ❌ **Upgrade `Button` component** — `Button` from `@cel-tui/components` doesn't forward `focusStyle`, `fgColor`, `bgColor`, or other container/style props to the underlying HStack. With uncontrolled focus and focusStyle now available, Button should accept these to be useful for keyboard navigation without inline HStack wrappers.

- ❌ **`repeat: "fill"` should claim flex space in HStack** — `Text(" ", { repeat: "fill" })` inside an HStack gets width 0 because its intrinsic width is 0 and no flex distributes remaining space. The workaround is `VStack({ flex: 1 }, [Text(" ", { repeat: "fill" })])`, which is non-obvious. Fix: either make `repeat: "fill"` imply flex behavior in the layout engine, or document the workaround prominently. The former is preferred.

- ❌ **`VDivider` component** — Drawing a vertical divider requires `VStack({ width: 1, height: "100%" }, [Text("│", { repeat: "fill" })])`. A `VDivider({ char, fgColor })` component would match the existing horizontal `Divider` and reduce boilerplate.

- ❌ **`onKeyPress` bubbling through component boundaries** — `findKeyPressHandler` returns the innermost handler and stops. Unhandled keys don't bubble to parent `onKeyPress` handlers. This means every stateful component with `onKeyPress` needs to manually forward unrecognized keys (e.g., `Select` accepts an `onKeyPress` prop and calls it for keys it doesn't consume). A framework-level fix — such as a "return false to keep bubbling" convention or a `consumed` return value from handlers — would eliminate this boilerplate and let components compose naturally without worrying about swallowing parent shortcuts.

## Not Yet Implemented

- ❌ Alt key combos (`alt+x`) — `parseKey` doesn't handle ESC-prefixed sequences as alt modifiers. The spec lists `"alt+up"` as a valid key format.
- ❌ `"plus"` as a named key — the spec mentions `"ctrl+plus"` but `+` is the modifier separator and needs special handling.
- ❌ Bracketed paste mode support
- ❌ Kitty keyboard protocol detection

## Future Enhancements

- 💡 Additional example apps (chat UI, text editor from spec reference examples)
- 💡 `overflow: "hidden"` as explicit prop (currently all containers clip by default, which matches the spec's default behavior, but the prop value is not checked)
