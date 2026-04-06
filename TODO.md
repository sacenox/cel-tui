# cel-tui — TODO

Remaining work, known bugs, and planned improvements.

## Legend

- 🔧 Bug / spec violation
- ❌ Not yet implemented
- 💡 Future enhancement

---

## Bugs / Spec Violations

- 🔧 **Mouse wheel scrolling is too slow for scrollable containers** — high priority. Scroll handling in `cel.ts` applies a hardcoded `delta` of `±1` cell per wheel event for both controlled and uncontrolled scrollables. That makes long logs and transcripts tedious to navigate, and apps using the documented sticky-bottom chat pattern inherit the sluggish behavior unchanged. Fix: introduce a larger default wheel step and/or a configurable scroll-step API, then add tests covering multi-line movement per wheel event.

- 🔧 **Streaming wrapped Markdown with inline formatting can corrupt until rendering settles** — high priority. The risky behavior is in `packages/components/src/markdown.ts`: plain paragraphs render as a single `Text(..., { wrap: "word" })`, but formatted paragraphs/list items/blockquote content render as `HStack({ flexWrap: "wrap" })` trees built from split inline spans. During streaming, partial markdown can change shape across renders (for example plain text becoming a formatted span once closing markers arrive), forcing repeated live reflow of wrapped HStack trees. Apps report that the display can look corrupted at wrap boundaries during streaming and then self-correct once the final render shape stabilizes. Fix: reproduce with a minimal streaming testcase around inline formatting crossing wrap boundaries, then harden the diff/render path and add regression coverage for repeated re-renders of wrapped formatted Markdown.

- 🔧 **Scrollbar thumb position ignores padding** — `paintScrollbar` in `paint.ts` computes `maxOffset = contentHeight - rect.height` without accounting for container padding, while the scroll clamping logic uses `contentHeight + padY - rect.height`. For padded scrollable containers the thumb position is slightly off.

- 🔧 **Duplicate max scroll offset calculation** — `getMaxScrollOffset` in `cel.ts` and `computeMaxScrollOffset` in `paint.ts` implement the same logic. Should be extracted to a shared function.

- 🔧 **Key events leak through layers** — When no element is focused and the topmost layer's root has no `onKeyPress`, `handleKeyEvent` falls through to lower layers. Mouse input stops at the topmost layer with a node at the event position, but keyboard input doesn't follow the same rule. A modal overlay without its own root `onKeyPress` would leak keys to the base layer, breaking the "events target the topmost layer" principle.

- 🔧 **`space-between` + `gap` double-spaces children** — When both `justifyContent: "space-between"` and `gap` are set, children get `gap` spacing plus the distributed remaining space on top. The remaining-space calculation subtracts `totalGap` first, then `space-between` distributes what's left as extra gap — so the effective gap is `gap + betweenGaps[i]`. CSS flex doesn't stack `space-between` on top of `gap` this way. The spec doesn't define this interaction.

---

## API Improvements

- ❌ **Define TextInput scroll semantics for cursor-follow and resize** — After the text layout refactor, the framework now has one canonical visual wrapping model, but the behavior contract around TextInput scrolling still needs to be specified. In particular: when a user has manually scrolled away from the cursor, what actions should re-enable automatic cursor-follow (typing, cursor movement, focus changes, programmatic value changes)? And when a TextInput changes height because of intrinsic growth/shrink or `maxHeight` clamping, should the existing scroll offset be preserved, clamped, or adjusted to keep the cursor/viewport anchored? Fix: write down the intended model in the spec and make implementation/tests match it.

- ❌ **`repeat: "fill"` should claim flex space in HStack** — `Text(" ", { repeat: "fill" })` inside an HStack gets width 0 because its intrinsic width is 0 and no flex distributes remaining space. The workaround is `VStack({ flex: 1 }, [Text(" ", { repeat: "fill" })])`, which is non-obvious. Fix: either make `repeat: "fill"` imply flex behavior in the layout engine, or document the workaround prominently. The former is preferred.

## Not Yet Implemented

- ❌ Bracketed paste mode support

- ❌ **Markdown heading inline styling** — Headings (`#`, `##`, `###`) still strip inline formatting to plain text. Since headings are short and single-line, this is low priority. Paragraphs, list items, and blockquotes now render inline formatting via wrapping HStack.

## Toolchain

- 🔧 **Biome formatter clashes with Prettier on generic type arguments** — When a chained `.method<TypeArgs>(longString)` call exceeds `lineWidth`, biome's formatter breaks at the function args `(` while prettier breaks at the type args `<`. They never converge. Current config has biome formatter enabled (`indentStyle: "space"`), which means both formatters fight on this pattern. Fix: either disable biome's formatter (set `formatter.enabled: false` — `organizeImports` still works as an error under `assist`) and let prettier own all formatting, or drop prettier for TS files entirely. The mini-coder repo chose the former approach successfully.

## Future Enhancements

- 💡 **Cursor style/shape customization** — TextInput currently renders the cursor as an inverted cell (block cursor). There's no way to choose bar (`│` between characters), underline, or custom cursor characters. A `cursorStyle` prop on TextInput (`"block" | "bar" | "underline"`) would cover the common cases. The native terminal cursor shape could also be set via DECSCUSR (`CSI q`) sequences to match.

- 💡 **Scrollbar styling** — Scrollbar characters (`┃`/`│` vertical, `━`/`─` horizontal) and colors are hardcoded in `paintScrollbar`. A `scrollbarStyle` prop on containers (or a global theme option) would allow customizing thumb/track characters and colors. Currently the only two visual elements the framework doesn't support styling.

- 💡 **Textarea component** (`packages/components`) — A higher-level wrapper around TextInput that handles the autogrowing pattern out of the box. Props like `maxLines`, `minLines`, and `placeholder` would cover the common chat-input / form-field use case without requiring the `HStack + flex + maxHeight` boilerplate. Could also include optional line-count display and character limit.

- 💡 **Editor component** (`packages/components`) — A TextInput with a line-number gutter, built as a component. Would compose an HStack with a fixed-width line-number column (styled, right-aligned) alongside a flex TextInput, keeping scroll synchronized. Useful for code/config editing use cases like the markdown editor example.

- 💡 Additional example apps (text editor from spec reference example)
- 💡 `overflow: "hidden"` as explicit prop (currently all containers clip by default, which matches the spec's default behavior, but the prop value is not checked)
- 💡 Higher Kitty protocol levels — key-release events (level 2), associated text (level 3), and full event types (level 4) for advanced input patterns (games, physical key layout awareness)
