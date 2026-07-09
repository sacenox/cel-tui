# cel-tui — TODO

There are currently no known open items. The mini-coder integration findings
and former future enhancements were completed in the 2026-07-09 quality pass.
Add newly reproduced issues or measured opportunities here rather than relying
on undocumented workarounds.

## Completed quality pass

### Core runtime and interaction

- ✅ **Runtime theme replacement and explicit full redraw** — `cel.setTheme()`
  replaces the palette and schedules a full frame; `cel.redraw()` repairs
  terminal resume/external corruption without private buffer access. Full
  redraws also restore the SGR baseline and native cursor state.
- ✅ **Stable identity for stateful nodes** — viewport-global `stateKey`
  identities retain TextInput cursor/scroll, uncontrolled container scroll,
  and per-layer focus through callback recreation, insertion, and reordering.
  Duplicate keys fail deterministically, node-kind changes remount, and absence
  for one successful frame releases keyed state. Legacy callback/path/index
  fallbacks remain available.
- ✅ **Layer-aware initial focus** — `autoFocus` seeds the active topmost layer
  once per mounted identity with reason `"auto"`, does not reclaim after
  Escape, and allows underlying focus to resume after a modal disappears.
- ✅ **Observable and controllable TextInput cursor** — `cursor` and
  `onCursorChange` expose controlled UTF-16 offsets, clamp backward to grapheme
  boundaries, preserve batched editing, and honor programmatic value/cursor
  updates together on the next render.
- ✅ **True no-op terminal output** — identical buffers and cursor state emit
  no bytes, while cursor-only changes still emit. `cel.setTitle()` suppresses
  duplicate sanitized titles and resets its cache across runtime lifecycles.

### Long-lived and streaming views

- ✅ **Variable-height VirtualList** — the callable keyed component measures
  visible variable-height rows, uses prefix sums/binary search and bounded
  overscan, supports controlled or internal scrolling, sticky bottom,
  first-visible anchor compensation, width/version invalidation, imperative
  navigation, and eager bounded-cache release. A 5,000-row same-process
  regression measured 134.39 ms unvirtualized versus 2.170 ms virtualized
  (98.4% reduction, 61.9× speedup), with the returned row tree hard-bounded.
- ✅ **SyntaxHighlight identity and cache scaling** —
  `createSyntaxHighlight()` owns one isolated append stream and exposes
  `.dispose()`. Direct calls use a bounded exact-render LRU with no content-
  prefix identity guessing; custom theme/color caches are bounded. Crossing
  the former four-entry cliff at five snippets improved from 1.7105 ms to
  0.0082 ms per frame (99.5%).

### Components

- ✅ **Markdown heading inline styling** — `#`, `##`, and `###` headings retain
  their heading style while composing bold, italic, inline-code, and link
  spans in wrapping rows; plain headings retain the compact Text path.
- ✅ **Native palette-slot syntax themes** — compatible TextMate registrations
  remain supported, while native `baseStyle` / `scopeStyles` preserve
  `color00`–`color15` references and explicit false style values. Runtime
  palette replacement changes emitted RGB without re-highlighting.
- ✅ **TextInput-backed Select / Combobox** — Select now uses exact TextInput
  text and cursor behavior (case, spaces, grapheme deletion, readline editing,
  batched input, bracketed paste), plus initial/controlled query, cursor, and
  highlight state, updateable items, cancel handling, custom filtering/rows,
  and the compatible callable static-list API.
- ✅ **Spinner and managed animation** — configurable `Spinner()` instances and
  `createTicker()` provide explicit maximum cadence, drift-safe skipped frames,
  start/stop/reset/dispose lifecycles, stable frame width, and no permanent
  framework FPS loop. The hello/chat examples no longer duplicate spinner
  arrays, intervals, render calls, or cleanup.

### Former future enhancements

- ✅ **Cursor shape customization** — TextInput `cursorStyle` supports
  `"block"`, `"bar"`, and `"underline"` in both the painted fallback and
  native DECSCUSR cursor; shape-only diffs and terminal cleanup are covered.
- ✅ **Scrollbar styling** — `scrollbarStyle` customizes single-cell thumb and
  track characters plus normal terminal style props, with width validation.
- ✅ **Explicit hidden overflow** — `overflow: "hidden"` is specified as the
  default clipping mode and has a deterministic explicit-prop regression test.
- ✅ **Advanced Kitty keyboard reporting** — the API uses Kitty's actual
  independent progressive-enhancement flags (not fictional numbered levels)
  for event phases, alternate/layout keys, all-key reporting, and associated
  text. `onKeyPress(key, event)` exposes typed metadata; release events never
  edit, activate, traverse, or blur; mixed tmux/legacy streams remain accepted.

## Verification snapshot

- `bun test`: 720 tests, 16,441 assertions
- `bun run typecheck`
- `bun run check`
- `bun run format`
- `bun run prepublish-check`
- `bun run docs`: clean HTML and Markdown generation, no warnings
- `bun run bench:regression`: all fixed-work cases complete with raw JSON
- `examples/hello.ts`: visually smoke-tested in an 80×24 tmux pane

Detailed benchmark methodology and snapshots live in `benchmarks/RESULTS.md`.
