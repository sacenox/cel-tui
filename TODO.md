# cel-tui — TODO

What remains before cel-tui can honestly be called complete and stable.

## Current state

- Core systems from the spec are implemented.
- The repo is currently green: `bun run typecheck`, `bun test`, `bun run check`, and `bun run format` pass.
- Remaining work is no longer broad feature work. The open gaps are a short list of correctness bugs, behavior-contract gaps, and docs/capability mismatches.

## Legend

- 🔧 Bug / spec violation
- ❌ Not yet implemented
- 💡 Future enhancement

---

## Blockers to calling the framework complete and stable

### Correctness / stability bugs

- 🔧 **Flex sizing can overflow or underfill after min/max clamping** — Flex children are sized once, then clamped, but leftover or overflow space is not redistributed. This can produce rows whose child widths sum larger or smaller than the container. Fix in both the normal and wrapping HStack layout paths, with regression tests for overflow and underfill cases.

- 🔧 **Hit testing does not clamp controlled scroll offsets** — Painting clamps `scrollOffset` to the valid max, but hit testing currently reads raw values. A container rendered at `scrollOffset: Infinity` or any over-max offset can paint the right content while clicks and scroll targeting miss it. Fix by clamping in the hit-test scroll resolver path and add tests for sticky-bottom / over-max controlled offsets.

- 🔧 **`ProcessTerminal` leaks process-level crash handlers across start/stop cycles** — `uncaughtException` and `unhandledRejection` handlers are registered with inline callbacks and never removed. Fix by storing/removing bound handlers so repeated `cel.init()` / `cel.stop()` cycles stay clean.

### API / behavior contract gaps

- ❌ **Focus callbacks need reason metadata** — `onFocus`/`onBlur` currently expose only that focus changed, not why. Controlled-focus apps still can't distinguish blur caused by `Escape` from blur caused by Tab traversal, mouse clicks, overlay changes, or other focus transitions.

- ❌ **Define TextInput scroll semantics for cursor-follow and resize** — After the text layout refactor, the framework now has one canonical visual wrapping model, but the behavior contract around TextInput scrolling is still implicit. In particular: when a user has manually scrolled away from the cursor, what actions should re-enable automatic cursor-follow? And when a TextInput changes height because of intrinsic growth/shrink or `maxHeight` clamping, should the existing scroll offset be preserved, clamped, or adjusted to keep the cursor/viewport anchored? Fix: write down the intended model in the spec and make implementation/tests match it.

- ❌ **`repeat: "fill"` should claim flex space in HStack** — `Text(" ", { repeat: "fill" })` inside an HStack gets width 0 because its intrinsic width is 0 and no flex distributes remaining space. The workaround is `VStack({ flex: 1 }, [Text(" ", { repeat: "fill" })])`, which is non-obvious. Fix: either make `repeat: "fill"` imply flex behavior in the layout engine, or document the workaround prominently. The former is preferred.

### Capability / docs mismatches to clean up before calling it stable

- 🔧 **`clew` over-claims `tsx` / `jsx` support** — `tsx` and `jsx` are currently listed as supported TypeScript-family ids, but JSX tokenization is still wrong in real cases (for example, tag boundaries and closing tags get misclassified as operators / regexp-like tokens). Fix: make the TypeScript tokenizer variant-aware for JSX/TSX, or remove those ids until the support is real.

- 🔧 **`Select` over-claims ANSI-styled labels** — The component docs say item labels can include ANSI styling, but the current text pipeline treats those bytes as visible content rather than styling. Fix: either remove the claim or add real ANSI-aware rendering for Select labels.

## Open, but not blocking “stable”

- ❌ **Markdown heading inline styling** — Headings (`#`, `##`, `###`) still strip inline formatting to plain text. Paragraphs, list items, and blockquotes already render inline formatting via wrapping HStack. This is real missing functionality, but not a stability blocker.

## Post-stability enhancements

- 💡 **Cursor style/shape customization** — TextInput currently renders the cursor as an inverted cell (block cursor). There's no way to choose bar (`│` between characters), underline, or custom cursor characters. A `cursorStyle` prop on TextInput (`"block" | "bar" | "underline"`) would cover the common cases. The native terminal cursor shape could also be set via DECSCUSR (`CSI q`) sequences to match.

- 💡 **Scrollbar styling** — Scrollbar characters (`┃`/`│` vertical, `━`/`─` horizontal) and colors are hardcoded in `paintScrollbar`. A `scrollbarStyle` prop on containers (or a global theme option) would allow customizing thumb/track characters and colors.

- 💡 `overflow: "hidden"` as explicit prop (currently all containers clip by default, which matches the spec's default behavior, but the prop value is not checked)
- 💡 Higher Kitty protocol levels — key-release events (level 2), associated text (level 3), and full event types (level 4) for advanced input patterns (games, physical key layout awareness)
