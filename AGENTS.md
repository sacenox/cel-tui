# cel-tui — Agent Guide

## What is this?

cel-tui is a TypeScript TUI framework built around a declarative functional API, ultra-fast rendering, and a concise developer experience. Read `spec.md` for the full specification.

## Project Structure

Bun monorepo with three packages:

```
packages/
  types/        — Shared type definitions (Color, ContainerProps, TextProps, Node, etc.)
  core/         — Framework engine (primitives, layout, rendering, input handling)
  components/   — Pre-made components built with core (Button, Spacer, Divider, etc.)
```

Dependency chain: `components → core → types`

## Key Design Decisions

- **4 primitives only:** VStack, HStack (layout), Text (content leaf), TextInput (editable container)
- **State is external:** The framework has no state management. `cel.viewport(() => tree)` sets a render function, `cel.render()` requests re-evaluation. Apps use whatever state approach they want.
- **Uncontrolled by default, controlled opt-in:** Focus and scroll are framework-managed by default. Providing `focused` or `scrollOffset` explicitly switches to controlled mode (app owns the state). Value (`value`/`onChange`) on TextInput is always controlled.
- **Style inheritance:** Containers propagate style props (fgColor, bgColor, bold, italic, underline) to descendants. Explicit props on a node always override inherited values. Container `bgColor` fills the rect with opaque background before painting children.
- **focusStyle:** Containers accept `focusStyle: StyleProps` — style overrides applied when focused, participating in inheritance.
- **TextInput is a container:** Accepts sizing props (flex, width, height, padding, min/max constraints) but has no children — its content is the `value` prop. Scroll is always framework-managed (follows cursor + responds to mouse wheel).
- **Text is a pure leaf:** No sizing props, no children. Parent controls the box. Height is intrinsic (from content + wrapping).
- **Cell buffer rendering:** Layout writes to a 2D grid of styled cells, not raw strings. Clipping and layer compositing are cell writes. Diff against previous buffer for minimal terminal output.
- **Reactive rendering:** `cel.render()` batches via `process.nextTick()`. No fixed FPS.
- **Layers:** `cel.viewport(() => [layer1, layer2])` — array of independent viewport-sized trees, composited bottom-to-top. Conditional inclusion = show/hide.
- **Key bubbling:** Unconsumed keys bubble up from focused element through ancestors. Root `onKeyPress` = global handler.
- **Hit detection:** Topmost layer first, deepest node at (x,y), walk up to find handler. Innermost wins for scroll, click, keys.

## Implementation Status

All core systems from the spec are implemented and tested:

- **Layout engine** — flexbox sizing (fixed, intrinsic, flex, percentage), constraints, gap, padding, justifyContent, alignItems, largest-remainder rounding
- **Rendering** — cell buffer, ANSI emitter with SGR styling, synchronized output (CSI 2026), differential rendering (emitDiff), full clear on resize
- **Painting** — grapheme-aware text rendering (CJK/emoji via visibleWidth), overflow clipping via clip rect propagation, scroll content offsetting, scrollbar indicators, container bgColor fill, style inheritance, focusStyle overrides
- **Input** — key parsing/normalization, SGR mouse events (with batched event support), hit detection, click/scroll routing, focus traversal (Tab/Shift+Tab/Escape/Enter) with uncontrolled and controlled modes, onKeyPress bubbling from focused element through ancestors
- **TextInput** — text editing, cursor movement, cursor persistence across re-renders (keyed on onChange), auto-scroll to keep cursor visible, placeholder rendering
- **Layering** — multi-layer compositing, transparency, topmost-layer input priority
- **Terminal** — crash cleanup (SIGINT/SIGTERM/uncaughtException), resize clear

See `TODO.md` for remaining spec violations and future work.

## Runtime

- **Bun** for package management and running TypeScript
- **TypeScript** with strict mode, ESNext target, bundler module resolution

## Commands

```bash
bun install              # install workspace dependencies
bun run <file.ts>        # run any TypeScript file directly
bun run check            # biome lint + import sorting
bun run check:fix        # biome auto-fix
bun run format           # prettier format check
bun run format:fix       # prettier auto-fix
bun run typecheck        # tsc --noEmit type checking
bun run docs             # generate HTML + Markdown docs into docs/
```

## Visual Testing with tmux

Use a tmux session to run examples and visually inspect rendered output:

```bash
# Create a session (set size to simulate a terminal window)
tmux new-session -d -s cel -x 80 -y 24

# Run an example
tmux send-keys -t cel "cd /home/xonecas/src/cel-tui && bun run examples/hello.ts" Enter

# Wait for render, then capture the screen contents
sleep 1; tmux capture-pane -t cel -p

# Send keystrokes (e.g., Ctrl+Q to quit)
tmux send-keys -t cel C-q

# Resize the window to test different terminal sizes
tmux resize-window -t cel -x 60 -y 20

# Kill the session when done
tmux kill-session -t cel
```

This lets you see exactly what the user sees — rendered cells, alignment, clipping, colors — without needing a real interactive terminal.

**Caveat:** tmux `send-keys -H` injects raw bytes one event at a time, but real terminals batch multiple mouse events into a single stdin chunk. Always verify mouse/scroll behavior in a real terminal, not just tmux.

## Spec

The `spec.md` file is the source of truth for all API design decisions. Always read it before making changes to core framework behavior.

## Testing Strategy

Use `bun test` (built-in test runner, no extra deps). Test files live next to source as `*.test.ts`.

**TDD for pure logic** — write tests first for:

- Character width (`visibleWidth`, grapheme segmentation, ANSI stripping)
- Cell buffer (write, read, diff)
- Layout engine (input tree + available space → output rects)
- Painting/clipping (node + rect → cell buffer contents)
- Hit detection (position → node lookup)
- Focus/key routing (key events → correct handler)

**Integration tests with mock terminal** for:

- Terminal I/O (assert emitted ANSI sequences against an in-memory buffer)
- End-to-end pipeline (`cel.viewport` → rendered output)

## Commit Format

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>
```

**Types:** `feat`, `fix`, `test`, `refactor`, `docs`, `chore`, `style`

**Scopes:** `types`, `core`, `components`, `spec`, or omit for repo-wide changes.

**Examples:**

```
feat(core): implement visibleWidth with grapheme segmentation
test(core): add character width tests for CJK, emoji, ANSI
docs(spec): define Text primitive styling and wrapping
chore: scaffold monorepo with types, core, components packages
```

## Runtime

**Always use `bun` and `bunx` instead of `node`, `npm`, `npx`, or `yarn`.** This is a Bun monorepo — all scripts, package management, and execution should go through Bun.

## Architecture Notes

- `cel.ts` — Framework entrypoint. Owns render loop, input dispatch, focus management. `cel.init(terminal)` starts, `cel.viewport(fn)` sets render function, `cel.render()` requests re-render, `cel.stop()` restores terminal. Mouse input handles batched SGR events (terminals often send multiple events in a single data chunk).
- `layout.ts` — Flexbox engine. `layout(root, width, height)` → `LayoutNode` tree with absolute screen rects.
- `paint.ts` — Paints `LayoutNode` tree into `CellBuffer`. Handles clip rects, scroll offsets, scrollbars, grapheme-aware text rendering, TextInput cursor/scroll state, container bgColor fill, style inheritance threading, focusStyle resolution.
- `emitter.ts` — `emitBuffer()` for full renders, `emitDiff()` for differential. Both wrap in CSI 2026 synchronized output.
- `hit-test.ts` — `hitTest(root, x, y)` → path from root to deepest node. `findClickHandler`, `findScrollTarget`, `findKeyPressHandler`, `collectFocusable` walk paths.
- `keys.ts` — `parseKey(data)` normalizes terminal input to canonical key strings. `isEditingKey()` identifies keys consumed by TextInput.
- `width.ts` — `visibleWidth(str)` measures terminal column width. Fast ASCII path, grapheme segmentation, East Asian width, ANSI stripping, LRU cache.
- `terminal.ts` — `ProcessTerminal` (real I/O, raw mode, SGR mouse, crash cleanup) and `MockTerminal` (testing).

## Updating gh-pages

The `gh-pages` branch tracks generated API docs (`docs/html/`, `docs/md/`) and an `index.html` for GitHub Pages. To update it after changes land on `main`:

```bash
git checkout gh-pages
git merge main              # resolve any conflicts, keeping docs tracked
bun run docs                # regenerate API docs
git add -A
git commit -m "docs: regenerate API docs from latest main"
git push
git checkout main
```

**Key differences on gh-pages:**

- `.gitignore` does **not** exclude `docs/html/` or `docs/md/` (they're committed)
- `.prettierignore` includes `docs/html` and `docs/md` (generated files fail format checks otherwise)

## Destructive Actions

**Never use `git checkout` or `git restore` on files you have modified.** A single `git checkout <file>` will silently discard all uncommitted changes in that file — including unrelated work. If you need to revert a specific edit, use `edit` to undo just that change. If you must use git to undo something, `git stash` first so the work can be recovered.

More generally: before running any command that could destroy uncommitted work (`git checkout`, `git reset --hard`, `git clean`, `rm` on source files), stop and consider whether there are unsaved changes at risk. If in doubt, `git stash` or `git diff --stat` first.

## Conventions

- All code is TypeScript with strict mode
- Primitives are functions that return typed Node objects (not classes)
- Components in `packages/components/` are plain functions using core primitives
- Key format: all lowercase, modifiers joined by `+` (e.g., `"ctrl+shift+s"`)
- Colors: ANSI base 16 only (Color type in types package)
