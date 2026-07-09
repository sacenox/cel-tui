# Migrating from 0.8.x to 0.9.0

`0.9.0` is a breaking minor release while cel-tui is pre-1.0. Upgrade every
installed `@cel-tui/*` package together:

```bash
bun add @cel-tui/core@0.9.0 @cel-tui/components@0.9.0 @cel-tui/clew@0.9.0 @cel-tui/types@0.9.0
```

## Required changes

### Use only supported `TextInput` props

`TextInputProps` now uses an explicit `TextInputBaseProps` allowlist. It no
longer accepts child-layout props (`gap`, `justifyContent`, `alignItems`,
`flexWrap`), container scroll props (`overflow`, `scrollOffset`, `scrollbar`,
`scrollbarStyle`, `onScroll`), or `onClick`.

Move child layout and click handling to a wrapping `VStack` or `HStack`.
TextInput scrolling remains framework-managed; use `scrollStep` to customize
mouse-wheel movement.

### Make controlled scrolling explicit

Scroll ownership is now determined only by `scrollOffset`. An `onScroll`
callback without `scrollOffset` observes an uncontrolled container; after the
callback accepts the event, the framework updates its own offset.

```ts
let offset = 0;

VStack(
  {
    overflow: "scroll",
    scrollOffset: offset,
    onScroll: (nextOffset) => {
      offset = nextOffset;
      cel.render();
    },
  },
  children,
);
```

Return exactly `false` from `onScroll` to reject that target and bubble to the
next scrollable ancestor.

### Replace cell mutation with `CellBuffer.set()`

`Cell` fields and `EMPTY_CELL` are readonly. Replace in-place mutation:

```ts
const cell = buffer.get(x, y);
buffer.set(x, y, { ...cell, char: "X" });
```

### Stop using private `cel` test hooks

The public `cel` value is now typed as `Cel`; `_getBuffer()` and `_flush()` are
no longer part of the package API. Test through `MockTerminal`, `CellBuffer`,
and the public emitter functions. Use `cel.redraw()` for a forced full frame
and `cel.setTheme()` for runtime palette changes.

## Behavior to review

- `onKeyPress` now receives `(key, event)`. Existing one-argument handlers are
  valid. If Kitty event-type reporting is enabled, release events reach handlers
  but never trigger framework editing, focus, activation, or blur actions.
- If enabling `kittyKeyboard.reportAllKeys`, also enable
  `reportAssociatedText` when TextInputs must insert typed text. Associated-text
  reporting implies all-key reporting.
- `FocusChangeReason` includes `"auto"`. Add it to exhaustive switches when
  using `autoFocus`.
- `TextInput({ focusable: false })` now prevents both Tab traversal and mouse
  focus. Remove the prop if the previous ignored behavior was intentional.
- Focus belongs to the active topmost layer. Add a unique `stateKey` to
  stateful nodes that can reorder or recreate callbacks so focus, scroll, and
  TextInput state follow the logical node.
- `Select` is now backed by `TextInput`: queries preserve exact case and spaces,
  cursor editing is grapheme-aware, and Home/End move the query cursor instead
  of jumping through results. The callable `select()` form and one-argument
  `onSelect(value)` callbacks remain valid; the callback may also receive the
  normalized item.
- Syntax theme registrations are readonly values. Replace a theme object to
  change it rather than mutating it. Direct `SyntaxHighlight()` calls remain
  valid; use one `createSyntaxHighlight()` instance per append-heavy snippet
  and call `.dispose()` when it is no longer needed.
- `ClewToken.start` and `.end` are UTF-16 code-unit offsets. They can be passed
  directly to JavaScript `slice()` and `substring()`. Corrected stable patches
  and Bash tokenization may also update exact token snapshots.
- Low-level ANSI and layout snapshots may change: full frames establish an SGR
  reset baseline, and corrected wrapping, clipping, and wide-cell handling can
  alter previously invalid output. Rebaseline only after checking the rendered
  result.

Custom `Terminal` adapters may accept the new optional third argument to
`start(onInput, onResize, options)` and forward `options.kittyKeyboard` when
they support Kitty progressive-enhancement flags. `ProcessTerminal` now cleans
up and then terminates normally on SIGINT/SIGTERM; use an app-owned shutdown
path with `cel.stop()` when graceful work must finish first.
