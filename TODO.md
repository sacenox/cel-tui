# cel-tui — TODO

Remaining work, known bugs, and planned improvements.

## Legend

- 🔧 Bug / spec violation
- ❌ Not yet implemented
- 💡 Future enhancement

---

## API Improvements

- ❌ **Focus callbacks need reason metadata** — `onFocus`/`onBlur` currently expose only that focus changed, not why. Controlled-focus apps can't distinguish blur caused by `Escape` from blur caused by Tab traversal, mouse clicks, overlay changes, or other focus transitions, which forces awkward workarounds for behaviors like "Escape blurs first, second Escape triggers a global action".

- ❌ **Define TextInput scroll semantics for cursor-follow and resize** — After the text layout refactor, the framework now has one canonical visual wrapping model, but the behavior contract around TextInput scrolling still needs to be specified. In particular: when a user has manually scrolled away from the cursor, what actions should re-enable automatic cursor-follow (typing, cursor movement, focus changes, programmatic value changes)? And when a TextInput changes height because of intrinsic growth/shrink or `maxHeight` clamping, should the existing scroll offset be preserved, clamped, or adjusted to keep the cursor/viewport anchored? Fix: write down the intended model in the spec and make implementation/tests match it.

- ❌ **`repeat: "fill"` should claim flex space in HStack** — `Text(" ", { repeat: "fill" })` inside an HStack gets width 0 because its intrinsic width is 0 and no flex distributes remaining space. The workaround is `VStack({ flex: 1 }, [Text(" ", { repeat: "fill" })])`, which is non-obvious. Fix: either make `repeat: "fill"` imply flex behavior in the layout engine, or document the workaround prominently. The former is preferred.

## Not Yet Implemented

- ❌ **Markdown heading inline styling** — Headings (`#`, `##`, `###`) still strip inline formatting to plain text. Since headings are short and single-line, this is low priority. Paragraphs, list items, and blockquotes now render inline formatting via wrapping HStack.

## Future Enhancements

- 💡 **Cursor style/shape customization** — TextInput currently renders the cursor as an inverted cell (block cursor). There's no way to choose bar (`│` between characters), underline, or custom cursor characters. A `cursorStyle` prop on TextInput (`"block" | "bar" | "underline"`) would cover the common cases. The native terminal cursor shape could also be set via DECSCUSR (`CSI q`) sequences to match.

- 💡 **Scrollbar styling** — Scrollbar characters (`┃`/`│` vertical, `━`/`─` horizontal) and colors are hardcoded in `paintScrollbar`. A `scrollbarStyle` prop on containers (or a global theme option) would allow customizing thumb/track characters and colors. Currently the only two visual elements the framework doesn't support styling.

- 💡 `overflow: "hidden"` as explicit prop (currently all containers clip by default, which matches the spec's default behavior, but the prop value is not checked)
- 💡 Higher Kitty protocol levels — key-release events (level 2), associated text (level 3), and full event types (level 4) for advanced input patterns (games, physical key layout awareness)
