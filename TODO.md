# cel-tui — TODO

Open work that remains after the stability pass.

## Current state

- Core systems from the spec are implemented.
- The current repo state is green: `bun run typecheck`, `bun test`, `bun run check`, and `bun run format` pass.
- The previous stability blockers have been addressed: flex redistribution now respects constraints, scroll hit testing clamps like paint, ProcessTerminal cleans up crash listeners, focus callbacks include reasons, TextInput scroll behavior is specified and aligned, `repeat: "fill"` claims horizontal flex space, and the known docs/capability overclaims were removed.
- There are no known blockers left for honestly calling the framework stable.

## Legend

- ❌ Not yet implemented
- 💡 Future enhancement

---

## Open, but not blocking stability

- ❌ **Markdown heading inline styling** — Headings (`#`, `##`, `###`) still strip inline formatting to plain text. Paragraphs, list items, and blockquotes already render inline formatting via wrapping HStack. This is real missing functionality, but not a stability blocker.

## Future enhancements

- 💡 **Cursor style/shape customization** — TextInput currently renders the cursor as an inverted cell (block cursor). There's no way to choose bar (`│` between characters), underline, or custom cursor characters. A `cursorStyle` prop on TextInput (`"block" | "bar" | "underline"`) would cover the common cases. The native terminal cursor shape could also be set via DECSCUSR (`CSI q`) sequences to match.

- 💡 **Scrollbar styling** — Scrollbar characters (`┃`/`│` vertical, `━`/`─` horizontal) and colors are hardcoded in `paintScrollbar`. A `scrollbarStyle` prop on containers (or a global theme option) would allow customizing thumb/track characters and colors.

- 💡 `overflow: "hidden"` as explicit prop (currently all containers clip by default, which matches the spec's default behavior, but the prop value is not checked)
- 💡 Higher Kitty protocol levels — key-release events (level 2), associated text (level 3), and full event types (level 4) for advanced input patterns (games, physical key layout awareness)
